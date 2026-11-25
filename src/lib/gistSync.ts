/**
 * gistSync.ts — Cloud sync via a private GitHub Gist (`iface-backup.json`).
 *
 * What is synced (v9, iFace 2.0):
 *
 *   records          — study records in a compact columnar encoding (see below)
 *   questionNotes, questionAnswerAnnotations, questionAnswerOverrides, questionFlags
 *                    — user-authored data, for every question
 *   aiSessions       — AI chat history (no API keys or provider settings)
 *   banks            — local banks as `iface-bank@1` snapshots. Official and installed
 *                      banks are never uploaded: every device installs them itself.
 *
 * Question ids are bank-scoped (`iface.frontend:js-001`, `local.mine-ab12:q-1`), so data
 * matches across devices as long as the same banks are installed.
 *
 * Merging: every item is merged by its own timestamp (newer wins); nothing is deleted.
 * Local banks merge by `updatedAt`, whole bank at a time.
 *
 * ── Compact record encoding ────────────────────────────────────────────────
 *
 *   { ids: string[], statuses: number[] (0 unlearned, 1 mastered, 2 review),
 *     times: number[] (seconds), counts: number[] (reviewCount) }
 *
 * ── Versions ──────────────────────────────────────────────────────────────
 *
 *   v1–v8  iFace 1.x: unprefixed ids, imported questions as `customQuestions`.
 *          Upgraded on read by `compat/legacy15`.
 *   v9     iFace 2.0: bank-scoped ids, local banks as snapshots.
 */

import { upgradeLegacyData } from '@/compat/legacy15/data'
import { officialKeysByLegacyId } from '@/compat/legacy15/run'
import type { AISession } from '@/store/useAIStore'
import type {
  QuestionAnswerAnnotation,
  QuestionAnswerOverride,
  QuestionFlag,
  QuestionNote,
  StudyRecord,
} from '@/types'
import { dataReady } from './banks/boot'
import { type BankSnapshot, isBankSnapshot } from './banks/package'
import {
  bulkPutQuestionAnswerAnnotations,
  bulkPutQuestionAnswerOverrides,
  bulkPutQuestionFlags,
  bulkPutQuestionNotes,
  bulkPutStudyRecords,
  getAllQuestionAnswerAnnotations,
  getAllQuestionAnswerOverrides,
  getAllQuestionFlags,
  getAllQuestionNotes,
  getAllStudyRecords,
} from './db'
import { collectBanks, restoreBanks } from './localBackupIO'

// ─── Constants ────────────────────────────────────────────────────────────────

const GIST_FILENAME = 'iface-backup.json'
const GIST_DESCRIPTION = 'iFace study progress backup (auto-generated)'

const BACKUP_VERSION = 9
const MINIMUM_SUPPORTED_VERSION = 1

const GH_API = 'https://api.github.com'

/** sessionStorage key — avoids re-paginating gist list on every push/pull */
const GIST_ID_CACHE_KEY = 'iface_gist_id'

// ─── Status codec ─────────────────────────────────────────────────────────────

const STATUS_ENCODE: Record<string, number> = {
  unlearned: 0,
  mastered: 1,
  review: 2,
}

const STATUS_DECODE: Record<number, StudyRecord['status']> = {
  0: 'unlearned',
  1: 'mastered',
  2: 'review',
}

// ─── Compact record column format ─────────────────────────────────────────────

interface CompactRecords {
  /** question IDs */
  ids: string[]
  /** 0=unlearned 1=mastered 2=review */
  statuses: number[]
  /** Unix seconds (÷1000 from ms timestamp) */
  times: number[]
  /** reviewCount */
  counts: number[]
}

function encodeRecords(records: StudyRecord[]): CompactRecords {
  const ids: string[] = []
  const statuses: number[] = []
  const times: number[] = []
  const counts: number[] = []

  for (const r of records) {
    ids.push(r.questionId)
    statuses.push(STATUS_ENCODE[r.status] ?? 0)
    times.push(Math.floor(r.lastUpdated / 1000))
    counts.push(r.reviewCount)
  }

  return { ids, statuses, times, counts }
}

function decodeRecords(compact: CompactRecords): StudyRecord[] {
  const { ids, statuses, times, counts } = compact
  const len = ids.length
  const records: StudyRecord[] = []

  for (let i = 0; i < len; i++) {
    records.push({
      questionId: ids[i],
      status: STATUS_DECODE[statuses[i]] ?? 'unlearned',
      lastUpdated: (times[i] ?? 0) * 1000,
      reviewCount: counts[i] ?? 0,
    })
  }

  return records
}

// ─── Merge helpers ────────────────────────────────────────────────────────────

function mergeByTimestamp<T>(
  localItems: T[],
  remoteItems: T[],
  getId: (item: T) => string,
  getTimestamp: (item: T) => number,
): { items: T[]; remoteApplied: number } {
  const merged = new Map<string, T>()
  let remoteApplied = 0

  for (const item of localItems) {
    merged.set(getId(item), item)
  }

  for (const remoteItem of remoteItems) {
    const id = getId(remoteItem)
    const localItem = merged.get(id)
    if (!localItem || getTimestamp(remoteItem) > getTimestamp(localItem)) {
      merged.set(id, remoteItem)
      remoteApplied++
    }
  }

  return { items: [...merged.values()], remoteApplied }
}

function normalizeSyncData(data: Partial<SyncData>): SyncData {
  const list = <T>(value: T[] | undefined): T[] => (Array.isArray(value) ? value : [])
  return {
    studyRecords: list(data.studyRecords),
    questionNotes: list(data.questionNotes),
    questionAnswerAnnotations: list(data.questionAnswerAnnotations),
    questionAnswerOverrides: list(data.questionAnswerOverrides),
    questionFlags: list(data.questionFlags),
    aiSessions: list(data.aiSessions),
    banks: list(data.banks).filter(isBankSnapshot),
  }
}

const EMPTY_STATS: SyncMergeStats = {
  remoteRecordsApplied: 0,
  remoteNotesApplied: 0,
  remoteAnswerAnnotationsApplied: 0,
  remoteAnswerOverridesApplied: 0,
  remoteFlagsApplied: 0,
  remoteAISessionsApplied: 0,
  remoteBanksApplied: 0,
}

function mergeSyncData(
  local: SyncData,
  remote: GistBackup | null,
): {
  backup: SyncData
  stats: SyncMergeStats
  /** Remote banks that are newer than (or missing from) the local ones. */
  remoteBanks: BankSnapshot[]
} {
  const localData = normalizeSyncData(local)
  const remoteData = remote ? normalizeSyncData(remote) : null

  if (!remoteData) return { backup: localData, stats: EMPTY_STATS, remoteBanks: [] }

  const records = mergeByTimestamp(
    localData.studyRecords,
    remoteData.studyRecords,
    (record) => record.questionId,
    (record) => record.lastUpdated,
  )
  const notes = mergeByTimestamp(
    localData.questionNotes,
    remoteData.questionNotes,
    (note) => note.questionId,
    (note) => note.updatedAt,
  )
  const answerOverrides = mergeByTimestamp(
    localData.questionAnswerOverrides,
    remoteData.questionAnswerOverrides,
    (override) => override.questionId,
    (override) => override.updatedAt,
  )
  const answerAnnotations = mergeByTimestamp(
    localData.questionAnswerAnnotations,
    remoteData.questionAnswerAnnotations,
    (annotation) => annotation.id,
    (annotation) => annotation.updatedAt,
  )
  const aiSessions = mergeByTimestamp(
    localData.aiSessions,
    remoteData.aiSessions,
    (session) => session.questionId,
    (session) => session.updatedAt,
  )
  const flags = mergeByTimestamp(
    localData.questionFlags,
    remoteData.questionFlags,
    (flag) => flag.questionId,
    (flag) => flag.updatedAt,
  )
  const banks = mergeByTimestamp(
    localData.banks,
    remoteData.banks,
    (bank) => bank.id,
    (bank) => bank.updatedAt,
  )
  const localBankUpdated = new Map(localData.banks.map((bank) => [bank.id, bank.updatedAt]))
  const remoteBanks = remoteData.banks.filter(
    (bank) => bank.updatedAt > (localBankUpdated.get(bank.id) ?? Number.NEGATIVE_INFINITY),
  )

  return {
    backup: {
      studyRecords: records.items,
      questionNotes: notes.items,
      questionAnswerAnnotations: answerAnnotations.items,
      questionAnswerOverrides: answerOverrides.items,
      questionFlags: flags.items,
      aiSessions: aiSessions.items,
      banks: banks.items,
    },
    stats: {
      remoteRecordsApplied: records.remoteApplied,
      remoteNotesApplied: notes.remoteApplied,
      remoteAnswerAnnotationsApplied: answerAnnotations.remoteApplied,
      remoteAnswerOverridesApplied: answerOverrides.remoteApplied,
      remoteFlagsApplied: flags.remoteApplied,
      remoteAISessionsApplied: aiSessions.remoteApplied,
      remoteBanksApplied: banks.remoteApplied,
    },
    remoteBanks,
  }
}

function syncResultFromBackup(
  backup: SyncData,
  exportedAt: string,
  stats?: SyncMergeStats,
): SyncResult {
  return {
    ok: true,
    exportedAt,
    recordCount: backup.studyRecords.length,
    bankCount: backup.banks.length,
    noteCount: backup.questionNotes.length,
    answerAnnotationCount: backup.questionAnswerAnnotations.length,
    answerOverrideCount: backup.questionAnswerOverrides.length,
    questionFlagCount: backup.questionFlags.filter((flag) => flag.starred).length,
    aiSessionCount: backup.aiSessions.length,
    aiSessions: backup.aiSessions,
    mergedRemoteRecordCount: stats?.remoteRecordsApplied,
    mergedRemoteNoteCount: stats?.remoteNotesApplied,
    mergedRemoteAnswerAnnotationCount: stats?.remoteAnswerAnnotationsApplied,
    mergedRemoteAnswerOverrideCount: stats?.remoteAnswerOverridesApplied,
    mergedRemoteQuestionFlagCount: stats?.remoteFlagsApplied,
    mergedRemoteAISessionCount: stats?.remoteAISessionsApplied,
    mergedRemoteBankCount: stats?.remoteBanksApplied,
  }
}

// ─── Payload types ────────────────────────────────────────────────────────────

/** Shape written to / read from Gist (v9) */
interface GistPayloadV9 {
  version: 9
  exportedAt: string
  records: CompactRecords
  questionNotes: QuestionNote[]
  questionAnswerAnnotations: QuestionAnswerAnnotation[]
  questionAnswerOverrides: QuestionAnswerOverride[]
  questionFlags: QuestionFlag[]
  aiSessions: AISession[]
  /** Local banks only. */
  banks: BankSnapshot[]
}

// ─── Public types ─────────────────────────────────────────────────────────────

/** Normalised backup data, whatever version was read. */
export interface GistBackup extends SyncData {
  version: number
  exportedAt: string
}

export interface SyncData {
  studyRecords: StudyRecord[]
  questionNotes: QuestionNote[]
  questionAnswerAnnotations: QuestionAnswerAnnotation[]
  questionAnswerOverrides: QuestionAnswerOverride[]
  questionFlags: QuestionFlag[]
  aiSessions: AISession[]
  banks: BankSnapshot[]
}

export interface SyncResult {
  ok: boolean
  error?: string
  exportedAt?: string
  recordCount?: number
  bankCount?: number
  noteCount?: number
  answerAnnotationCount?: number
  answerOverrideCount?: number
  questionFlagCount?: number
  aiSessionCount?: number
  aiSessions?: AISession[]
  mergedRemoteRecordCount?: number
  mergedRemoteNoteCount?: number
  mergedRemoteAnswerAnnotationCount?: number
  mergedRemoteAnswerOverrideCount?: number
  mergedRemoteQuestionFlagCount?: number
  mergedRemoteAISessionCount?: number
  mergedRemoteBankCount?: number
  /** Remote banks that could not be restored. */
  failedBanks?: string[]
}

export interface SyncMergeStats {
  remoteRecordsApplied: number
  remoteNotesApplied: number
  remoteAnswerAnnotationsApplied: number
  remoteAnswerOverridesApplied: number
  remoteFlagsApplied: number
  remoteAISessionsApplied: number
  remoteBanksApplied: number
}

export function buildGistBackupPayload(
  backup: SyncData,
  exportedAt = new Date().toISOString(),
): GistPayloadV9 {
  const data = normalizeSyncData(backup)
  return {
    version: BACKUP_VERSION,
    exportedAt,
    records: encodeRecords(data.studyRecords),
    questionNotes: data.questionNotes,
    questionAnswerAnnotations: data.questionAnswerAnnotations,
    questionAnswerOverrides: data.questionAnswerOverrides,
    questionFlags: data.questionFlags,
    aiSessions: data.aiSessions,
    banks: data.banks,
  }
}

export function serializeGistBackup(backup: SyncData, exportedAt?: string): string {
  return JSON.stringify(buildGistBackupPayload(backup, exportedAt))
}

// ─── GitHub API types ─────────────────────────────────────────────────────────

interface GistListItem {
  id: string
  description: string
  files: Record<string, { filename: string } | null>
}

interface GistFile {
  filename: string
  content?: string
  truncated?: boolean
  raw_url?: string
}

interface GistResponse {
  id: string
  description: string
  files: Record<string, GistFile | null>
  updated_at: string
  html_url: string
}

// ─── Session Gist ID cache ────────────────────────────────────────────────────

function getCachedGistId(): string | null {
  try {
    return sessionStorage.getItem(GIST_ID_CACHE_KEY)
  } catch {
    return null
  }
}

function setCachedGistId(id: string): void {
  try {
    sessionStorage.setItem(GIST_ID_CACHE_KEY, id)
  } catch {}
}

function clearCachedGistId(): void {
  try {
    sessionStorage.removeItem(GIST_ID_CACHE_KEY)
  } catch {}
}

// ─── GitHub API helpers ───────────────────────────────────────────────────────

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

/**
 * Thin fetch wrapper around the GitHub REST API.
 * Throws a descriptive Error on non-2xx.  Returns undefined for 204.
 */
async function ghFetch<T>(token: string, path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GH_API}${path}`, {
    ...options,
    headers: {
      ...ghHeaders(token),
      ...(options.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    let detail = body
    try {
      const j = JSON.parse(body)
      detail = j?.message ?? body
    } catch {}
    throw new Error(`GitHub API ${res.status}: ${detail}`)
  }

  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

// ─── Gist lookup ──────────────────────────────────────────────────────────────

/**
 * Find the iFace backup Gist ID.
 * Checks session cache first; falls back to paginating the user's gist list.
 */
export async function findBackupGistId(token: string): Promise<string | null> {
  const cached = getCachedGistId()
  if (cached) return cached

  for (let page = 1; page <= 10; page++) {
    const gists = await ghFetch<GistListItem[]>(token, `/gists?per_page=30&page=${page}`)

    if (!Array.isArray(gists) || gists.length === 0) break

    for (const gist of gists) {
      if (gist.files && GIST_FILENAME in gist.files) {
        setCachedGistId(gist.id)
        return gist.id
      }
    }

    if (gists.length < 30) break
  }

  return null
}

// ─── Truncated content fetcher ────────────────────────────────────────────────

/**
 * Fetch the raw content of a truncated Gist file.
 *
 * WHY NOT fetch(raw_url, { headers: { Authorization } })?
 *   gist.githubusercontent.com (the static CDN) rejects browser CORS
 *   preflight (OPTIONS) for requests that carry custom headers →
 *   ERR_FAILED even with a valid token.
 *
 * SOLUTION:
 *   Private Gist raw_urls already embed a short-lived access token in
 *   their query string, so we can fetch them WITHOUT an Authorization
 *   header.  No custom header → no preflight → no CORS failure.
 *
 * With the new v3 compact format the backup is ~20–60 KB so truncation
 * (GitHub threshold: ~1 MB) should almost never occur.  This code is a
 * safety net for unusual edge cases (e.g. thousands of custom questions).
 */
async function fetchTruncatedContent(
  token: string,
  gistId: string,
  rawUrl: string,
): Promise<string> {
  // Strategy 1: fetch raw_url without Authorization (no preflight)
  try {
    const res = await fetch(rawUrl)
    if (res.ok) return res.text()
  } catch {
    // fall through
  }

  // Strategy 2: re-fetch the gist via REST API — sometimes a second
  // request returns the full content when the file is near the boundary
  const freshGist = await ghFetch<GistResponse>(token, `/gists/${gistId}`)
  const freshFile = freshGist.files[GIST_FILENAME]
  if (freshFile && !freshFile.truncated && freshFile.content) {
    return freshFile.content
  }

  throw new Error(
    'Backup file exceeds 1 MB and cannot be fetched due to browser CORS ' +
      'restrictions on the GitHub CDN. Delete the cloud backup and create a ' +
      'new one — with the v3 compact format this should no longer occur.',
  )
}

// ─── Payload parser / normaliser ──────────────────────────────────────────────

const array = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

/**
 * Parse raw JSON text → GistBackup, handling v1 through the current version.
 * `officialKeys` (old official id → new key) upgrades 1.x payloads; see
 * `officialKeysByLegacyId`.
 */
function parsePayload(raw: string, officialKeys: ReadonlyMap<string, string>): GistBackup {
  if (!raw.trim()) throw new Error('Backup file is empty')

  let data: Record<string, unknown>
  try {
    data = JSON.parse(raw) as Record<string, unknown>
  } catch {
    throw new Error('Backup file contains invalid JSON — it may be corrupted')
  }

  const v = typeof data.version === 'number' ? data.version : 0

  if (v < MINIMUM_SUPPORTED_VERSION) {
    throw new Error(
      `Backup version ${v} is too old (minimum supported: ${MINIMUM_SUPPORTED_VERSION}). ` +
        'Please create a new backup.',
    )
  }
  if (v > BACKUP_VERSION) {
    throw new Error(
      `Backup version ${v} was created by a newer version of iFace — please update the app.`,
    )
  }

  const exportedAt =
    typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString()
  const compact = data.records as CompactRecords | undefined
  const studyRecords =
    v >= 3
      ? compact && Array.isArray(compact.ids) && compact.ids.length > 0
        ? decodeRecords(compact)
        : []
      : array<StudyRecord>(data.studyRecords)

  const current = {
    studyRecords,
    questionNotes: array<QuestionNote>(data.questionNotes),
    questionAnswerAnnotations: array<QuestionAnswerAnnotation>(data.questionAnswerAnnotations),
    questionAnswerOverrides: array<QuestionAnswerOverride>(data.questionAnswerOverrides),
    questionFlags: array<QuestionFlag>(data.questionFlags),
    aiSessions: array<AISession>(data.aiSessions),
  }

  if (v === BACKUP_VERSION) {
    return {
      version: v,
      exportedAt,
      ...current,
      banks: array<unknown>(data.banks).filter(isBankSnapshot),
    }
  }

  // COMPAT: remove after 2027-06-30 — 1.x payloads (v1–v8) carry imported questions as `customQuestions`.
  const exportedTime = Date.parse(exportedAt)
  const upgraded = upgradeLegacyData(
    {
      ...current,
      questions: array<{ id?: unknown }>(data.customQuestions).filter(
        (q) => typeof q.id === 'string' && q.id.startsWith('custom_'),
      ),
      mockInterviews: [],
    },
    officialKeys,
    Number.isNaN(exportedTime) ? Date.now() : exportedTime,
  )
  return {
    version: v,
    exportedAt,
    studyRecords: upgraded.studyRecords,
    questionNotes: upgraded.questionNotes,
    questionAnswerAnnotations: upgraded.questionAnswerAnnotations,
    questionAnswerOverrides: upgraded.questionAnswerOverrides,
    questionFlags: upgraded.questionFlags,
    aiSessions: upgraded.aiSessions,
    banks: upgraded.banks,
  }
}

export function parseGistBackupPayload(
  raw: string,
  officialKeys: ReadonlyMap<string, string> = new Map(),
): GistBackup {
  return parsePayload(raw, officialKeys)
}

export function mergeGistBackupData(
  local: SyncData,
  remote: GistBackup | null,
): { backup: SyncData; stats: SyncMergeStats; remoteBanks: BankSnapshot[] } {
  return mergeSyncData(local, remote)
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Load and parse the backup from the user's private Gist.
 * Returns null if no backup Gist exists yet.
 * Throws on network errors or unreadable data.
 */
export async function loadFromGist(
  token: string,
  officialKeys: ReadonlyMap<string, string> = new Map(),
): Promise<GistBackup | null> {
  const gistId = await findBackupGistId(token)
  if (!gistId) return null

  const gist = await ghFetch<GistResponse>(token, `/gists/${gistId}`)

  const file = gist.files[GIST_FILENAME]
  if (!file) return null

  let rawContent: string

  if (file.truncated) {
    if (!file.raw_url) throw new Error('Gist file is truncated but raw_url is missing')
    rawContent = await fetchTruncatedContent(token, gistId, file.raw_url)
  } else {
    rawContent = file.content ?? ''
  }

  return parsePayload(rawContent, officialKeys)
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Build the payload from the provided data and save it to Gist.
 * Creates a new Gist on first use; PATCHes the existing one on subsequent calls.
 * JSON is minified (no indentation) to minimise file size.
 */
export async function saveBackupToGist(
  token: string,
  backup: SyncData,
  stats?: SyncMergeStats,
): Promise<SyncResult> {
  try {
    // Minified — no indentation — keeps file size small
    const payload = buildGistBackupPayload(backup)
    const content = serializeGistBackup(backup, payload.exportedAt)

    const gistId = await findBackupGistId(token)

    if (gistId) {
      await ghFetch<GistResponse>(token, `/gists/${gistId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          description: GIST_DESCRIPTION,
          files: { [GIST_FILENAME]: { content } },
        }),
      })
    } else {
      const created = await ghFetch<GistResponse>(token, '/gists', {
        method: 'POST',
        body: JSON.stringify({
          description: GIST_DESCRIPTION,
          public: false,
          files: { [GIST_FILENAME]: { content } },
        }),
      })
      if (created?.id) setCachedGistId(created.id)
    }

    return syncResultFromBackup(backup, payload.exportedAt, stats)
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete the backup Gist entirely.
 * Clears the session cache so the next push creates a fresh Gist.
 */
export async function deleteBackupGist(token: string): Promise<SyncResult> {
  try {
    const gistId = await findBackupGistId(token)
    if (!gistId) return { ok: true }

    await ghFetch<void>(token, `/gists/${gistId}`, { method: 'DELETE' })
    clearCachedGistId()
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── High-level wrappers used by the UI ───────────────────────────────────────

async function collectLocalSyncData(aiSessions: AISession[]): Promise<SyncData> {
  const [
    studyRecords,
    questionNotes,
    questionAnswerAnnotations,
    questionAnswerOverrides,
    questionFlags,
    { banks },
  ] = await Promise.all([
    getAllStudyRecords(),
    getAllQuestionNotes(),
    getAllQuestionAnswerAnnotations(),
    getAllQuestionAnswerOverrides(),
    getAllQuestionFlags(),
    collectBanks(),
  ])
  return {
    studyRecords,
    questionNotes,
    questionAnswerAnnotations,
    questionAnswerOverrides,
    questionFlags,
    aiSessions,
    banks,
  }
}

/** Writes the merged data locally; remote banks newer than the local copy are restored. */
async function applyMerged(
  merged: ReturnType<typeof mergeSyncData>,
): Promise<{ failedBanks: string[] }> {
  await Promise.all([
    bulkPutStudyRecords(merged.backup.studyRecords),
    bulkPutQuestionNotes(merged.backup.questionNotes),
    bulkPutQuestionAnswerAnnotations(merged.backup.questionAnswerAnnotations),
    bulkPutQuestionAnswerOverrides(merged.backup.questionAnswerOverrides),
    bulkPutQuestionFlags(merged.backup.questionFlags),
  ])
  const { failed } = await restoreBanks(merged.remoteBanks, [])
  return { failedBanks: failed }
}

/** Waits for start-up (official banks, 1.x migration) and maps 1.x official ids. */
async function prepare(): Promise<ReadonlyMap<string, string>> {
  await dataReady()
  return officialKeysByLegacyId()
}

/** Collect local data, merge it with the cloud copy and push the result. */
export async function pushToGist(token: string, aiSessions: AISession[] = []): Promise<SyncResult> {
  try {
    const officialKeys = await prepare()
    const localData = await collectLocalSyncData(aiSessions)
    // Load existing cloud data before writing so a second device's newer
    // records or notes are preserved instead of being overwritten by this push.
    const remoteBackup = await loadFromGist(token, officialKeys)
    const merged = mergeSyncData(localData, remoteBackup)

    const result = await saveBackupToGist(token, merged.backup, merged.stats)
    if (!result.ok) return result
    const { failedBanks } = await applyMerged(merged)
    return failedBanks.length > 0 ? { ...result, failedBanks } : result
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Pull the cloud copy and merge it into local data (newer wins per item; nothing is deleted).
 *
 * Returns null  → no backup exists yet (not an error; caller should be silent)
 * Returns { ok: false } → error; show message to user
 */
export async function pullFromGist(
  token: string,
  localAISessions: AISession[] = [],
): Promise<SyncResult | null> {
  try {
    const backup = await loadFromGist(token, await prepare())
    if (!backup) return null

    const merged = mergeSyncData(await collectLocalSyncData(localAISessions), backup)
    const { failedBanks } = await applyMerged(merged)
    const result = syncResultFromBackup(merged.backup, backup.exportedAt, merged.stats)
    return failedBanks.length > 0 ? { ...result, failedBanks } : result
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
