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
 */

import type { CategoryMap } from '@/lib/db'
import type { Question, StudyRecord } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const GIST_FILENAME = 'iface-backup.json'
const GIST_DESCRIPTION = 'iFace study progress backup (auto-generated)'

const BACKUP_VERSION = 3
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

// ─── Payload types ────────────────────────────────────────────────────────────

/** Shape written to / read from Gist (v3) */
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
 * Parse raw JSON text → GistBackup, handling v1/v2/v3.
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

  // ── v3 ──
  if (v === 3) {
    const p = data as unknown as GistPayloadV3
    const compact = p.records
    const studyRecords =
      compact && Array.isArray(compact.ids) && compact.ids.length > 0 ? decodeRecords(compact) : []

    return {
      version: 3,
      exportedAt: typeof p.exportedAt === 'string' ? p.exportedAt : new Date().toISOString(),
      studyRecords,
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
      customQuestions,
      customCategories,
      customSources: Array.isArray(p.customSources) ? p.customSources : [],
    }
  }
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
 * Build the v3 payload from the provided data and save it to Gist.
 * Creates a new Gist on first use; PATCHes the existing one on subsequent calls.
 * JSON is minified (no indentation) to minimise file size.
 */
async function writeToGist(
  token: string,
  backup: Omit<GistBackup, 'version' | 'exportedAt'>,
): Promise<SyncResult> {
  try {
    const payload: GistPayloadV3 = {
      version: 3,
      exportedAt: new Date().toISOString(),
      records: encodeRecords(backup.studyRecords),
      customQuestions: backup.customQuestions,
      customCategories: backup.customCategories,
      customSources: backup.customSources,
    }

    // Minified — no indentation — keeps file size small
    const content = JSON.stringify(payload)

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

    return {
      ok: true,
      exportedAt: payload.exportedAt,
      recordCount: backup.studyRecords.length,
      questionCount: backup.customQuestions.length,
    }
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
 *   • Custom (user-imported) question objects
 *   • Custom (user-created) categories
 *   • Custom source names
 *
 * Built-in question text is NEVER uploaded — it's always fetched from
 * /public/questions/ locally, keeping the backup tiny.
 */
export async function pushToGist(token: string): Promise<SyncResult> {
  try {
    const { getAllStudyRecords, getAllQuestions, getCustomSources, getCategoryMap } = await import(
      '@/lib/db'
    )

    const [studyRecords, allQuestions, customSources, categoryMap] = await Promise.all([
      getAllStudyRecords(),
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

    return writeToGist(token, {
      studyRecords,
      customQuestions,
      customCategories,
      customSources,
    })
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
 *   studyRecords     — full replace (cloud is source of truth for progress)
 *   customQuestions  — upsert (add/update; never delete existing ones)
 *   customSources    — replace
 *   categoryMap      — overlay custom categories on top of local builtins
 *
 * Returns null  → no backup exists yet (not an error; caller should be silent)
 * Returns { ok: false } → error; show message to user
 */
export async function pullFromGist(token: string): Promise<SyncResult | null> {
  try {
    const backup = await loadFromGist(token)
    if (!backup) return null

    const {
      bulkPutStudyRecords,
      bulkPutQuestions,
      setMeta,
      META_KEYS,
      getCategoryMap,
      saveCategoryMap,
      DEFAULT_CATEGORY_MAP,
    } = await import('@/lib/db')

    const ops: Promise<unknown>[] = []

    // Always restore study records (replace strategy)
    ops.push(bulkPutStudyRecords(backup.studyRecords))

    // Upsert custom questions
    if (backup.customQuestions.length > 0) {
      ops.push(bulkPutQuestions(backup.customQuestions))
    }

    // Restore custom source list
    if (backup.customSources && backup.customSources.length > 0) {
      ops.push(setMeta(META_KEYS.CUSTOM_SOURCES, backup.customSources))
    }

    // Merge categories: start from local builtins, overlay backup's custom cats
    if (Object.keys(backup.customCategories).length > 0) {
      const currentMap = await getCategoryMap()

      // Begin with a fresh copy of the builtin defaults
      const merged = { ...DEFAULT_CATEGORY_MAP }

      // Overlay any custom categories from the backup
      for (const [key, entry] of Object.entries(backup.customCategories)) {
        // Never overwrite a builtin with a custom entry
        if (!merged[key]) {
          merged[key] = entry
        }
      }

      // Preserve any custom categories that exist locally but not in the backup
      // (so a device-specific import isn't wiped on pull)
      for (const [key, entry] of Object.entries(currentMap)) {
        if (!merged[key]) merged[key] = entry
      }

      ops.push(saveCategoryMap(merged))
    }

    await Promise.all(ops)

    return {
      ok: true,
      exportedAt: backup.exportedAt,
      recordCount: backup.studyRecords.length,
      questionCount: backup.customQuestions.length,
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
