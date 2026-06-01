/**
 * gistSync.ts — Cloud sync via GitHub Gist
 *
 * ── Design philosophy ──────────────────────────────────────────────────────
 *
 * Built-in questions (625 items, ~1.3 MB) are NEVER uploaded.
 * They live in /public/questions/ and are fetched fresh on every device.
 * The app already has all built-in question text locally; there is zero value
 * in backing them up and it wastes ~95% of the Gist quota.
 *
 * What we DO back up (target: < 100 KB for a heavy user):
 *
 *   studyRecords     — { questionId, status, lastUpdated, reviewCount }[]
 *                      ~94 bytes each × 625 questions = ~57 KB worst case
 *                      Encoded in a compact columnar format (see below).
 *
 *   customQuestions  — Only user-imported questions (those with q.source set).
 *                      Built-in questions are identified by their stable IDs
 *                      and excluded.
 *
 *   questionNotes    — User-written notes and AI-generated review snippets.
 *                      These are authored content, so they are backed up for
 *                      both built-in and custom questions.
 *
 *   questionAnswerOverrides
 *                    — User-authored replacement reference answers for built-in
 *                      and custom questions. Original question objects remain
 *                      untouched.
 *
 *   aiSessions       — AI chat history for each question. API keys and model
 *                      settings are NOT included; only conversation content is
 *                      synced.
 *
 *   questionFlags    — Per-question markers such as starred/重点题.
 *                      These are tiny tombstone-capable rows so unstar actions
 *                      can also win during multi-device merges.
 *
 *   categoryMap      — Only non-builtin (custom) categories.
 *                      Built-in categories are re-seeded locally on load.
 *
 *   customSources    — string[] of user-imported source names.
 *
 * ── Compact record encoding ────────────────────────────────────────────────
 *
 * Instead of storing an array of JSON objects for study records we use a
 * columnar encoding that cuts the payload by ~60%:
 *
 *   {
 *     ids:      string[]   — questionId for each record
 *     statuses: number[]   — 0=unlearned 1=mastered 2=review
 *     times:    number[]   — lastUpdated as seconds since epoch (÷1000)
 *     counts:   number[]   — reviewCount
 *   }
 *
 * Compared with the object-per-record format:
 *   Object format:  94 bytes × 625 = 58 750 bytes
 *   Columnar format: ~35 bytes × 625 = ~22 000 bytes   (estimated)
 *
 * ── ID stability ──────────────────────────────────────────────────────────
 *
 * Built-in question IDs follow a stable naming convention:
 *   js-001 … js-065, react-001, go-basics-001, etc.
 *
 * Custom questions get the prefix  custom_<source>_<originalId>
 * (stamped in importCustomQuestions in questionLoader.ts).
 *
 * A question is considered "built-in" if its ID does NOT start with
 * "custom_".  This lets us filter without maintaining a separate allowlist.
 *
 * ── Version history ───────────────────────────────────────────────────────
 *
 *   v1  initial release — full question objects included in backup
 *   v2  attempted fix — still included full question objects
 *   v3  this version — records-only, compact columnar encoding
 *       Readers also accept v1/v2 (decoded to the same GistBackup shape).
 *   v4  adds per-question notes
 *   v5  adds AI chat sessions
 *   v6  adds per-question flags
 *   v7  adds custom per-question reference answers
 */

import type { AISession } from '@/store/useAIStore'
import type {
  Question,
  QuestionAnswerOverride,
  QuestionFlag,
  QuestionNote,
  StudyRecord,
} from '@/types'
import {
  bulkPutQuestionAnswerOverrides,
  bulkPutQuestionFlags,
  bulkPutQuestionNotes,
  bulkPutQuestions,
  bulkPutStudyRecords,
  type CategoryMap,
  DEFAULT_CATEGORY_MAP,
  getAllQuestionAnswerOverrides,
  getAllQuestionFlags,
  getAllQuestionNotes,
  getAllQuestions,
  getAllStudyRecords,
  getCategoryMap,
  getCustomSources,
  META_KEYS,
  saveCategoryMap,
  setMeta,
} from './db'

// ─── Constants ────────────────────────────────────────────────────────────────

const GIST_FILENAME = 'iface-backup.json'
const GIST_DESCRIPTION = 'iFace study progress backup (auto-generated)'

const BACKUP_VERSION = 7
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

function mergeById<T>(
  localItems: T[],
  remoteItems: T[],
  getId: (item: T) => string,
): { items: T[]; remoteAdded: number } {
  const merged = new Map<string, T>()
  let remoteAdded = 0

  for (const item of localItems) {
    merged.set(getId(item), item)
  }

  for (const remoteItem of remoteItems) {
    const id = getId(remoteItem)
    if (!merged.has(id)) {
      merged.set(id, remoteItem)
      remoteAdded++
    }
  }

  return { items: [...merged.values()], remoteAdded }
}

function mergeStringList(
  localItems: string[],
  remoteItems: string[],
): {
  items: string[]
  remoteAdded: number
} {
  const merged = new Set(localItems)
  let remoteAdded = 0

  for (const item of remoteItems) {
    if (!merged.has(item)) {
      merged.add(item)
      remoteAdded++
    }
  }

  return { items: [...merged], remoteAdded }
}

function mergeCategoryMaps(
  localCategories: CategoryMap,
  remoteCategories: CategoryMap,
): { categories: CategoryMap; remoteAdded: number } {
  const merged: CategoryMap = { ...localCategories }
  let remoteAdded = 0

  for (const [key, remoteEntry] of Object.entries(remoteCategories)) {
    const localEntry = merged[key]
    if (!localEntry) {
      merged[key] = remoteEntry
      remoteAdded++
      continue
    }

    const moduleSet = new Set(localEntry.modules)
    const sizeBefore = moduleSet.size
    for (const moduleName of remoteEntry.modules) {
      moduleSet.add(moduleName)
    }
    if (moduleSet.size > sizeBefore) {
      merged[key] = { ...localEntry, modules: [...moduleSet] }
      remoteAdded++
    }
  }

  return { categories: merged, remoteAdded }
}

function normalizeSyncData(data: Partial<SyncData>): SyncData {
  return {
    studyRecords: Array.isArray(data.studyRecords) ? data.studyRecords : [],
    questionNotes: Array.isArray(data.questionNotes) ? data.questionNotes : [],
    questionAnswerOverrides: Array.isArray(data.questionAnswerOverrides)
      ? data.questionAnswerOverrides
      : [],
    questionFlags: Array.isArray(data.questionFlags) ? data.questionFlags : [],
    aiSessions: Array.isArray(data.aiSessions) ? data.aiSessions : [],
    customQuestions: Array.isArray(data.customQuestions) ? data.customQuestions : [],
    customCategories:
      data.customCategories && typeof data.customCategories === 'object'
        ? data.customCategories
        : {},
    customSources: Array.isArray(data.customSources) ? data.customSources : [],
  }
}

function mergeSyncData(
  local: SyncData,
  remote: GistBackup | null,
): {
  backup: SyncData
  stats: SyncMergeStats
} {
  const localData = normalizeSyncData(local)
  const remoteData = remote ? normalizeSyncData(remote) : null

  if (!remoteData) {
    return {
      backup: localData,
      stats: {
        remoteRecordsApplied: 0,
        remoteNotesApplied: 0,
        remoteAnswerOverridesApplied: 0,
        remoteFlagsApplied: 0,
        remoteAISessionsApplied: 0,
        remoteQuestionsAdded: 0,
        remoteSourcesAdded: 0,
        remoteCategoriesAdded: 0,
      },
    }
  }

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
  const questions = mergeById(
    localData.customQuestions,
    remoteData.customQuestions,
    (question) => question.id,
  )
  const sources = mergeStringList(localData.customSources, remoteData.customSources)
  const categories = mergeCategoryMaps(localData.customCategories, remoteData.customCategories)

  return {
    backup: {
      studyRecords: records.items,
      questionNotes: notes.items,
      questionAnswerOverrides: answerOverrides.items,
      questionFlags: flags.items,
      aiSessions: aiSessions.items,
      customQuestions: questions.items,
      customCategories: categories.categories,
      customSources: sources.items,
    },
    stats: {
      remoteRecordsApplied: records.remoteApplied,
      remoteNotesApplied: notes.remoteApplied,
      remoteAnswerOverridesApplied: answerOverrides.remoteApplied,
      remoteFlagsApplied: flags.remoteApplied,
      remoteAISessionsApplied: aiSessions.remoteApplied,
      remoteQuestionsAdded: questions.remoteAdded,
      remoteSourcesAdded: sources.remoteAdded,
      remoteCategoriesAdded: categories.remoteAdded,
    },
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
    questionCount: backup.customQuestions.length,
    noteCount: backup.questionNotes.length,
    answerOverrideCount: backup.questionAnswerOverrides.length,
    questionFlagCount: backup.questionFlags.filter((flag) => flag.starred).length,
    aiSessionCount: backup.aiSessions.length,
    aiSessions: backup.aiSessions,
    mergedRemoteRecordCount: stats?.remoteRecordsApplied,
    mergedRemoteNoteCount: stats?.remoteNotesApplied,
    mergedRemoteAnswerOverrideCount: stats?.remoteAnswerOverridesApplied,
    mergedRemoteQuestionFlagCount: stats?.remoteFlagsApplied,
    mergedRemoteAISessionCount: stats?.remoteAISessionsApplied,
    mergedRemoteQuestionCount: stats?.remoteQuestionsAdded,
    mergedRemoteSourceCount: stats?.remoteSourcesAdded,
    mergedRemoteCategoryCount: stats?.remoteCategoriesAdded,
  }
}

// ─── Payload types ────────────────────────────────────────────────────────────

/** Shape written to / read from Gist (v7) */
interface GistPayloadV7 {
  version: 7
  exportedAt: string
  /** Compact columnar study records */
  records: CompactRecords
  /** User-authored notes for built-in and custom questions */
  questionNotes: QuestionNote[]
  /** Custom reference answers for built-in and custom questions */
  questionAnswerOverrides: QuestionAnswerOverride[]
  /** Per-question flags such as starred/重点题 */
  questionFlags: QuestionFlag[]
  /** AI chat history, without API keys or provider config */
  aiSessions: AISession[]
  /** User-imported questions only (no built-in question text) */
  customQuestions: Question[]
  /** Non-builtin categories only */
  customCategories: CategoryMap
  customSources: string[]
}

/** Legacy v6 shape */
interface GistPayloadV6 {
  version: 6
  exportedAt: string
  /** Compact columnar study records */
  records: CompactRecords
  /** User-authored notes for built-in and custom questions */
  questionNotes: QuestionNote[]
  /** Per-question flags such as starred/重点题 */
  questionFlags: QuestionFlag[]
  /** AI chat history, without API keys or provider config */
  aiSessions: AISession[]
  /** User-imported questions only (no built-in question text) */
  customQuestions: Question[]
  /** Non-builtin categories only */
  customCategories: CategoryMap
  customSources: string[]
}

/** Legacy v4 shape */
interface GistPayloadV4 {
  version: 4
  exportedAt: string
  /** Compact columnar study records */
  records: CompactRecords
  /** User-authored notes for built-in and custom questions */
  questionNotes: QuestionNote[]
  /** User-imported questions only (no built-in question text) */
  customQuestions: Question[]
  /** Non-builtin categories only */
  customCategories: CategoryMap
  customSources: string[]
}

/** Legacy v5 shape */
interface GistPayloadV5 {
  version: 5
  exportedAt: string
  /** Compact columnar study records */
  records: CompactRecords
  /** User-authored notes for built-in and custom questions */
  questionNotes: QuestionNote[]
  /** AI chat history, without API keys or provider config */
  aiSessions: AISession[]
  /** User-imported questions only (no built-in question text) */
  customQuestions: Question[]
  /** Non-builtin categories only */
  customCategories: CategoryMap
  customSources: string[]
}

/** Legacy v3 shape */
interface GistPayloadV3 {
  version: 3
  exportedAt: string
  /** Compact columnar study records */
  records: CompactRecords
  /** User-imported questions only (no built-in question text) */
  customQuestions: Question[]
  /** Non-builtin categories only */
  customCategories: CategoryMap
  customSources: string[]
}

/** Legacy v1/v2 shape — full question objects included */
interface GistPayloadLegacy {
  version: 1 | 2
  exportedAt?: string
  studyRecords?: StudyRecord[]
  customQuestions?: Question[]
  categoryMap?: CategoryMap
  customSources?: string[]
}

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * Normalised backup data — this is what the rest of the app deals with,
 * regardless of which on-disk version was read.
 */
export interface GistBackup {
  version: number
  exportedAt: string
  studyRecords: StudyRecord[]
  questionNotes: QuestionNote[]
  questionAnswerOverrides: QuestionAnswerOverride[]
  questionFlags: QuestionFlag[]
  aiSessions: AISession[]
  customQuestions: Question[]
  /** Full category map (custom categories only; builtins restored locally) */
  customCategories: CategoryMap
  customSources: string[]
}

export interface SyncResult {
  ok: boolean
  error?: string
  exportedAt?: string
  recordCount?: number
  questionCount?: number
  noteCount?: number
  answerOverrideCount?: number
  questionFlagCount?: number
  aiSessionCount?: number
  aiSessions?: AISession[]
  mergedRemoteRecordCount?: number
  mergedRemoteNoteCount?: number
  mergedRemoteAnswerOverrideCount?: number
  mergedRemoteQuestionFlagCount?: number
  mergedRemoteAISessionCount?: number
  mergedRemoteQuestionCount?: number
  mergedRemoteSourceCount?: number
  mergedRemoteCategoryCount?: number
}

interface SyncMergeStats {
  remoteRecordsApplied: number
  remoteNotesApplied: number
  remoteAnswerOverridesApplied: number
  remoteFlagsApplied: number
  remoteAISessionsApplied: number
  remoteQuestionsAdded: number
  remoteSourcesAdded: number
  remoteCategoriesAdded: number
}

export type SyncData = Omit<GistBackup, 'version' | 'exportedAt'>
export type { SyncMergeStats }

export function buildGistBackupPayload(
  backup: SyncData,
  exportedAt = new Date().toISOString(),
): GistPayloadV7 {
  const data = normalizeSyncData(backup)
  return {
    version: BACKUP_VERSION,
    exportedAt,
    records: encodeRecords(data.studyRecords),
    questionNotes: data.questionNotes,
    questionAnswerOverrides: data.questionAnswerOverrides,
    questionFlags: data.questionFlags,
    aiSessions: data.aiSessions,
    customQuestions: data.customQuestions,
    customCategories: data.customCategories,
    customSources: data.customSources,
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

/**
 * Parse raw JSON text → GistBackup, handling v1 through the current version.
 * Throws on invalid JSON, unsupported version, or missing required fields.
 */
function parsePayload(raw: string): GistBackup {
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

  // ── v3 / v4 / v5 / v6 / v7 ──
  if (v === 3 || v === 4 || v === 5 || v === 6 || v === 7) {
    const p = data as unknown as
      | GistPayloadV3
      | GistPayloadV4
      | GistPayloadV5
      | GistPayloadV6
      | GistPayloadV7
    const compact = p.records
    const studyRecords =
      compact && Array.isArray(compact.ids) && compact.ids.length > 0 ? decodeRecords(compact) : []

    return {
      version: v,
      exportedAt: typeof p.exportedAt === 'string' ? p.exportedAt : new Date().toISOString(),
      studyRecords,
      questionNotes:
        v === 4 && Array.isArray((p as GistPayloadV4).questionNotes)
          ? (p as GistPayloadV4).questionNotes
          : (v === 5 || v === 6 || v === 7) &&
              Array.isArray((p as GistPayloadV5 | GistPayloadV6 | GistPayloadV7).questionNotes)
            ? (p as GistPayloadV5 | GistPayloadV6 | GistPayloadV7).questionNotes
            : [],
      questionAnswerOverrides:
        v === 7 && Array.isArray((p as GistPayloadV7).questionAnswerOverrides)
          ? (p as GistPayloadV7).questionAnswerOverrides
          : [],
      questionFlags:
        (v === 6 || v === 7) && Array.isArray((p as GistPayloadV6 | GistPayloadV7).questionFlags)
          ? (p as GistPayloadV6 | GistPayloadV7).questionFlags
          : [],
      aiSessions:
        (v === 5 || v === 6 || v === 7) &&
        Array.isArray((p as GistPayloadV5 | GistPayloadV6 | GistPayloadV7).aiSessions)
          ? (p as GistPayloadV5 | GistPayloadV6 | GistPayloadV7).aiSessions
          : [],
      customQuestions: Array.isArray(p.customQuestions) ? p.customQuestions : [],
      customCategories:
        p.customCategories && typeof p.customCategories === 'object'
          ? (p.customCategories as CategoryMap)
          : {},
      customSources: Array.isArray(p.customSources) ? p.customSources : [],
    }
  }

  // ── v1 / v2 (legacy) — full question objects present ──
  {
    const p = data as unknown as GistPayloadLegacy
    const studyRecords = Array.isArray(p.studyRecords) ? p.studyRecords : []

    // Separate custom questions from built-in ones.
    // Built-in IDs do NOT start with "custom_".
    const allBacked = Array.isArray(p.customQuestions) ? p.customQuestions : []
    const customQuestions = allBacked.filter(
      (q) => typeof q.id === 'string' && q.id.startsWith('custom_'),
    )

    // Extract only non-builtin categories from the legacy categoryMap
    const rawMap =
      p.categoryMap && typeof p.categoryMap === 'object' ? (p.categoryMap as CategoryMap) : {}
    const customCategories: CategoryMap = {}
    for (const [key, entry] of Object.entries(rawMap)) {
      if (!entry.builtin) customCategories[key] = entry
    }

    return {
      version: v,
      exportedAt: typeof p.exportedAt === 'string' ? p.exportedAt : new Date().toISOString(),
      studyRecords,
      questionNotes: [],
      questionAnswerOverrides: [],
      questionFlags: [],
      aiSessions: [],
      customQuestions,
      customCategories,
      customSources: Array.isArray(p.customSources) ? p.customSources : [],
    }
  }
}

export function parseGistBackupPayload(raw: string): GistBackup {
  return parsePayload(raw)
}

export function mergeGistBackupData(
  local: SyncData,
  remote: GistBackup | null,
): { backup: SyncData; stats: SyncMergeStats } {
  return mergeSyncData(local, remote)
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Load and parse the backup from the user's private Gist.
 * Returns null if no backup Gist exists yet.
 * Throws on network errors or unreadable data.
 */
export async function loadFromGist(token: string): Promise<GistBackup | null> {
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

  return parsePayload(rawContent)
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Build the v6 payload from the provided data and save it to Gist.
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

/**
 * Collect local data and push to Gist.
 *
 * Only uploads:
 *   • Study records for ALL questions (built-in and custom)
 *   • Question notes for ALL questions (user-authored content)
 *   • Custom answer overrides for ALL questions
 *   • AI sessions for ALL questions (conversation content only)
 *   • Custom (user-imported) question objects
 *   • Custom (user-created) categories
 *   • Custom source names
 *
 * Built-in question text is NEVER uploaded — it's always fetched from
 * /public/questions/ locally, keeping the backup tiny.
 */
export async function pushToGist(token: string, aiSessions: AISession[] = []): Promise<SyncResult> {
  try {
    const [
      studyRecords,
      questionNotes,
      questionAnswerOverrides,
      questionFlags,
      allQuestions,
      customSources,
      categoryMap,
    ] = await Promise.all([
      getAllStudyRecords(),
      getAllQuestionNotes(),
      getAllQuestionAnswerOverrides(),
      getAllQuestionFlags(),
      getAllQuestions(),
      getCustomSources(),
      getCategoryMap(),
    ])

    // Only back up user-imported questions (id starts with "custom_")
    const customQuestions = allQuestions.filter(
      (q) => typeof q.id === 'string' && q.id.startsWith('custom_'),
    )

    // Only back up non-builtin categories
    const customCategories: CategoryMap = {}
    for (const [key, entry] of Object.entries(categoryMap)) {
      if (!entry.builtin) customCategories[key] = entry
    }

    const localBackup: SyncData = {
      studyRecords,
      questionNotes,
      questionAnswerOverrides,
      questionFlags,
      aiSessions,
      customQuestions,
      customCategories,
      customSources,
    }

    // Load existing cloud data before writing so a second device's newer
    // records or notes are preserved instead of being overwritten by this push.
    const remoteBackup = await loadFromGist(token)
    const merged = mergeSyncData(localBackup, remoteBackup)

    const result = await saveBackupToGist(token, merged.backup, merged.stats)

    if (result.ok) {
      await Promise.all([
        bulkPutStudyRecords(merged.backup.studyRecords),
        bulkPutQuestionNotes(merged.backup.questionNotes),
        bulkPutQuestionAnswerOverrides(merged.backup.questionAnswerOverrides),
        bulkPutQuestionFlags(merged.backup.questionFlags),
        merged.backup.customQuestions.length > 0
          ? bulkPutQuestions(merged.backup.customQuestions)
          : Promise.resolve(),
        setMeta(META_KEYS.CUSTOM_SOURCES, merged.backup.customSources),
        saveCategoryMap({ ...DEFAULT_CATEGORY_MAP, ...merged.backup.customCategories }),
      ])
    }

    return result
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Pull backup from Gist and merge into local DB.
 *
 * Merge strategy:
 *   studyRecords     — merge by lastUpdated (newer wins)
 *   questionNotes    — merge by updatedAt (newer wins)
 *   questionAnswerOverrides — merge by updatedAt (newer wins)
 *   aiSessions       — merge by updatedAt (newer wins)
 *   customQuestions  — union by id (never delete existing ones)
 *   customSources    — union
 *   categoryMap      — overlay merged custom categories on top of builtins
 *
 * Returns null  → no backup exists yet (not an error; caller should be silent)
 * Returns { ok: false } → error; show message to user
 */
export async function pullFromGist(
  token: string,
  localAISessions: AISession[] = [],
): Promise<SyncResult | null> {
  try {
    const backup = await loadFromGist(token)
    if (!backup) return null

    const ops: Promise<unknown>[] = []

    const [
      localRecords,
      localNotes,
      localAnswerOverrides,
      localFlags,
      allQuestions,
      localSources,
      currentMap,
    ] = await Promise.all([
      getAllStudyRecords(),
      getAllQuestionNotes(),
      getAllQuestionAnswerOverrides(),
      getAllQuestionFlags(),
      getAllQuestions(),
      getCustomSources(),
      getCategoryMap(),
    ])

    const localCustomQuestions = allQuestions.filter(
      (q) => typeof q.id === 'string' && q.id.startsWith('custom_'),
    )
    const localCustomCategories: CategoryMap = {}
    for (const [key, entry] of Object.entries(currentMap)) {
      if (!entry.builtin) localCustomCategories[key] = entry
    }

    const merged = mergeSyncData(
      {
        studyRecords: localRecords,
        questionNotes: localNotes,
        questionAnswerOverrides: localAnswerOverrides,
        questionFlags: localFlags,
        aiSessions: localAISessions,
        customQuestions: localCustomQuestions,
        customCategories: localCustomCategories,
        customSources: localSources,
      },
      backup,
    )

    ops.push(bulkPutStudyRecords(merged.backup.studyRecords))
    ops.push(bulkPutQuestionNotes(merged.backup.questionNotes))
    ops.push(bulkPutQuestionAnswerOverrides(merged.backup.questionAnswerOverrides))
    ops.push(bulkPutQuestionFlags(merged.backup.questionFlags))

    if (merged.backup.customQuestions.length > 0) {
      ops.push(bulkPutQuestions(merged.backup.customQuestions))
    }

    ops.push(setMeta(META_KEYS.CUSTOM_SOURCES, merged.backup.customSources))
    ops.push(saveCategoryMap({ ...DEFAULT_CATEGORY_MAP, ...merged.backup.customCategories }))

    await Promise.all(ops)

    return syncResultFromBackup(merged.backup, backup.exportedAt, merged.stats)
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
