/**
 * gistSync.ts
 *
 * Sync iFace study progress and custom question banks to/from a private
 * GitHub Gist named "iface-backup.json".
 *
 * Data shape stored in the Gist:
 * {
 *   version: 2,
 *   exportedAt: "<ISO timestamp>",
 *   studyRecords: StudyRecord[],
 *   customQuestions: Question[],   // only questions with a source field
 *   categoryMap: CategoryMap,
 *   customSources: string[],
 * }
 *
 * Key design decisions:
 *  - Version is MINIMUM_SUPPORTED_VERSION..BACKUP_VERSION — we read any version
 *    in that range and silently migrate forward on next push.
 *  - Gist ID is cached in sessionStorage so repeated push/pull in the same tab
 *    don't burn extra API calls on list pagination.
 *  - Truncated files are fetched via the per-file raw endpoint on the GitHub API
 *    (not gist.githubusercontent.com) to avoid CORS preflight failures.
 *  - JSON is stored minified (no indentation) to minimise file size and reduce
 *    the chance of hitting GitHub's 1 MB truncation threshold.
 */

import type { Question, StudyRecord } from "@/types";
import type { CategoryMap } from "@/lib/db";

// ─── Constants ────────────────────────────────────────────────────────────────

const GIST_FILENAME = "iface-backup.json";
const GIST_DESCRIPTION = "iFace study progress backup (auto-generated)";

/** Current schema version written by this code. */
const BACKUP_VERSION = 2;

/** Oldest version we can still read (v1 has the same shape, just different number). */
const MINIMUM_SUPPORTED_VERSION = 1;

const GH_API = "https://api.github.com";

/** sessionStorage key for the cached Gist ID. */
const GIST_ID_CACHE_KEY = "iface_gist_id";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GistBackup {
  version: number;
  exportedAt: string;
  studyRecords: StudyRecord[];
  /** Only user-imported (custom) questions; built-in ones are re-fetched locally */
  customQuestions: Question[];
  categoryMap: CategoryMap;
  customSources: string[];
}

export interface SyncResult {
  ok: boolean;
  error?: string;
  /** ISO timestamp of the backup that was just written/read */
  exportedAt?: string;
  /** Number of study records in the backup */
  recordCount?: number;
  /** Number of custom questions in the backup */
  questionCount?: number;
}

interface GistFile {
  filename: string;
  /** Inline content — only present and complete when truncated === false */
  content?: string;
  truncated?: boolean;
  raw_url?: string;
}

interface GistListItem {
  id: string;
  description: string;
  files: Record<string, { filename: string } | null>;
}

interface GistResponse {
  id: string;
  description: string;
  files: Record<string, GistFile | null>;
  updated_at: string;
  html_url: string;
}

// ─── Session-level Gist ID cache ──────────────────────────────────────────────

function getCachedGistId(): string | null {
  try {
    return sessionStorage.getItem(GIST_ID_CACHE_KEY);
  } catch {
    return null;
  }
}

function setCachedGistId(id: string): void {
  try {
    sessionStorage.setItem(GIST_ID_CACHE_KEY, id);
  } catch {}
}

function clearCachedGistId(): void {
  try {
    sessionStorage.removeItem(GIST_ID_CACHE_KEY);
  } catch {}
}

// ─── GitHub API helpers ───────────────────────────────────────────────────────

/** Base headers for all GitHub API calls (JSON envelope). */
function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/**
 * Thin fetch wrapper for the GitHub REST API.
 * Throws a descriptive Error on non-2xx responses.
 * Returns `undefined` for 204 No Content.
 */
async function ghFetch<T>(
  token: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${GH_API}${path}`, {
    ...options,
    headers: {
      ...ghHeaders(token),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let detail = body;
    try {
      const j = JSON.parse(body);
      detail = j?.message ?? body;
    } catch {}
    throw new Error(`GitHub API ${res.status}: ${detail}`);
  }

  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// ─── Gist lookup ──────────────────────────────────────────────────────────────

/**
 * Find the iFace backup Gist ID.
 * Checks sessionStorage cache first, then paginates through the user's gists.
 * Returns null if not found.
 */
export async function findBackupGistId(token: string): Promise<string | null> {
  const cached = getCachedGistId();
  if (cached) return cached;

  for (let page = 1; page <= 10; page++) {
    const gists = await ghFetch<GistListItem[]>(
      token,
      `/gists?per_page=30&page=${page}`,
    );

    if (!Array.isArray(gists) || gists.length === 0) break;

    for (const gist of gists) {
      if (gist.files && GIST_FILENAME in gist.files) {
        setCachedGistId(gist.id);
        return gist.id;
      }
    }

    if (gists.length < 30) break;
  }

  return null;
}

// ─── Raw content fetcher ──────────────────────────────────────────────────────

/**
 * Fetch the raw text content of a specific file inside a Gist via the GitHub
 * REST API — NOT via gist.githubusercontent.com.
 *
 * Background: gist.githubusercontent.com (the static CDN) rejects browser CORS
 * preflight requests (OPTIONS) that carry an Authorization header, resulting in
 * ERR_FAILED even with a valid token. This happens whenever `file.truncated` is
 * true (files > ~1 MB). The GitHub REST API at api.github.com does support CORS
 * with Authorization headers, so we use it instead.
 *
 * The `Accept: application/vnd.github.raw+json` media type on a
 * GET /gists/{gist_id} request makes GitHub return the full JSON response (not
 * a single raw file). For a per-file raw body we must hit:
 *
 *   GET /gists/{gist_id}/raw/{filename}  — unfortunately this endpoint doesn't
 *   exist in the GitHub REST API v3.
 *
 * The correct approach is to re-GET /gists/{gist_id} — GitHub returns the full
 * (non-truncated) file content in the normal JSON response when the file is
 * small enough, but for large files it sets `truncated: true` and omits
 * `content`. In that edge case we must use the `raw_url` but strip the
 * Authorization header (public raw URLs don't need auth and don't trigger
 * preflight):
 *
 *   • Private Gists: raw_url embeds an auth token in the query string —
 *     no Authorization header needed, so NO preflight is triggered.
 *   • The fetch is a simple GET with no custom headers → no preflight → CORS ok.
 *
 * This is the only reliable cross-browser solution without a server proxy.
 */
async function fetchTruncatedContent(
  token: string,
  gistId: string,
  rawUrl: string,
): Promise<string> {
  // Strategy 1: fetch raw_url WITHOUT Authorization header.
  // For private gists the raw_url already embeds a short-lived token in its
  // query string, so no auth header is required. No custom header → no CORS
  // preflight → no ERR_FAILED.
  try {
    const res = await fetch(rawUrl);
    if (res.ok) return res.text();
  } catch {
    // fall through to strategy 2
  }

  // Strategy 2: re-fetch the gist via the REST API asking for a fresh
  // response — sometimes GitHub returns the full content on a second try
  // (e.g. the file was right at the boundary). We try without the raw
  // media type first to get the normal JSON envelope.
  const freshGist = await ghFetch<GistResponse>(token, `/gists/${gistId}`);
  const freshFile = freshGist.files[GIST_FILENAME];
  if (freshFile && !freshFile.truncated && freshFile.content) {
    return freshFile.content;
  }

  throw new Error(
    "Gist file is too large to fetch (>1 MB). " +
    "Please delete the cloud backup and create a new one — " +
    "built-in questions are not included in backups, " +
    "only your study records and custom questions.",
  );
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Load the backup from the user's private Gist.
 * Returns null if no backup Gist exists yet.
 * Throws on network errors or unreadable data (caller should catch).
 */
export async function loadFromGist(token: string): Promise<GistBackup | null> {
  const gistId = await findBackupGistId(token);
  if (!gistId) return null;

  const gist = await ghFetch<GistResponse>(token, `/gists/${gistId}`);

  const file = gist.files[GIST_FILENAME];
  if (!file) return null;

  let rawContent: string;

  if (file.truncated) {
    if (!file.raw_url) {
      throw new Error("Gist file is truncated but raw_url is missing");
    }
    rawContent = await fetchTruncatedContent(token, gistId, file.raw_url);
  } else {
    rawContent = file.content ?? "";
  }

  if (!rawContent.trim()) {
    throw new Error("Gist backup file is empty");
  }

  let parsed: GistBackup;
  try {
    parsed = JSON.parse(rawContent) as GistBackup;
  } catch {
    throw new Error("Backup file contains invalid JSON — it may be corrupted");
  }

  // Version gate: accept v1..vCURRENT, reject anything newer (future-proofing)
  // and anything older than the minimum we support.
  const v = parsed.version ?? 0;
  if (v < MINIMUM_SUPPORTED_VERSION) {
    throw new Error(
      `Backup version ${v} is too old to read (minimum: ${MINIMUM_SUPPORTED_VERSION})`,
    );
  }
  if (v > BACKUP_VERSION) {
    throw new Error(
      `Backup version ${v} was created by a newer version of iFace. ` +
      `Please update the app and try again.`,
    );
  }

  // Normalise missing fields for forward/backward compat
  return {
    version: v,
    exportedAt: parsed.exportedAt ?? new Date().toISOString(),
    studyRecords: Array.isArray(parsed.studyRecords) ? parsed.studyRecords : [],
    customQuestions: Array.isArray(parsed.customQuestions) ? parsed.customQuestions : [],
    categoryMap: parsed.categoryMap && typeof parsed.categoryMap === "object"
      ? parsed.categoryMap
      : {},
    customSources: Array.isArray(parsed.customSources) ? parsed.customSources : [],
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Save the backup to the user's private Gist.
 * Creates a new Gist on first use; patches the existing one on subsequent saves.
 * JSON is stored minified (no extra whitespace) to keep file size small.
 */
export async function saveToGist(
  token: string,
  backup: Omit<GistBackup, "version" | "exportedAt">,
): Promise<SyncResult> {
  try {
    const payload: GistBackup = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      ...backup,
    };

    // Minified JSON — no indent — keeps size small, reduces truncation risk
    const content = JSON.stringify(payload);

    const gistId = await findBackupGistId(token);

    if (gistId) {
      await ghFetch<GistResponse>(token, `/gists/${gistId}`, {
        method: "PATCH",
        body: JSON.stringify({
          description: GIST_DESCRIPTION,
          files: { [GIST_FILENAME]: { content } },
        }),
      });
    } else {
      const created = await ghFetch<GistResponse>(token, "/gists", {
        method: "POST",
        body: JSON.stringify({
          description: GIST_DESCRIPTION,
          public: false,
          files: { [GIST_FILENAME]: { content } },
        }),
      });
      // Cache the new ID immediately
      if (created?.id) setCachedGistId(created.id);
    }

    return {
      ok: true,
      exportedAt: payload.exportedAt,
      recordCount: payload.studyRecords.length,
      questionCount: payload.customQuestions.length,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete the backup Gist entirely.
 * Also clears the session cache so the next push creates a fresh Gist.
 */
export async function deleteBackupGist(token: string): Promise<SyncResult> {
  try {
    const gistId = await findBackupGistId(token);
    if (!gistId) return { ok: true };

    await ghFetch<void>(token, `/gists/${gistId}`, { method: "DELETE" });
    clearCachedGistId();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── High-level wrappers used by the UI ──────────────────────────────────────

/**
 * Collect all local data and push to Gist.
 */
export async function pushToGist(token: string): Promise<SyncResult> {
  try {
    const {
      getAllStudyRecords,
      getAllQuestions,
      getCustomSources,
      getCategoryMap,
    } = await import("@/lib/db");

    const [studyRecords, allQuestions, customSources, categoryMap] =
      await Promise.all([
        getAllStudyRecords(),
        getAllQuestions(),
        getCustomSources(),
        getCategoryMap(),
      ]);

    // Only backup user-imported questions (those with a source field set)
    const customQuestions = allQuestions.filter((q) => !!q.source);

    return saveToGist(token, {
      studyRecords,
      customQuestions,
      categoryMap,
      customSources,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Pull backup from Gist and merge into local DB.
 *
 * Merge strategy:
 *  - studyRecords   : full replace (cloud is source of truth for progress)
 *  - customQuestions: upsert (add new, update existing)
 *  - customSources  : replace
 *  - categoryMap    : replace (only non-builtin parts are in the backup)
 *
 * Returns null  → no backup exists yet (not an error)
 * Returns result.ok === false → something went wrong (show error to user)
 */
export async function pullFromGist(token: string): Promise<SyncResult | null> {
  try {
    const backup = await loadFromGist(token);
    if (!backup) return null;

    const {
      bulkPutStudyRecords,
      bulkPutQuestions,
      setMeta,
      META_KEYS,
      saveCategoryMap,
      getCategoryMap,
      DEFAULT_CATEGORY_MAP,
    } = await import("@/lib/db");

    const ops: Promise<unknown>[] = [];

    // Always restore study records
    ops.push(bulkPutStudyRecords(backup.studyRecords));

    // Restore custom questions
    if (backup.customQuestions.length > 0) {
      ops.push(bulkPutQuestions(backup.customQuestions));
    }

    // Restore custom source list
    if (backup.customSources && backup.customSources.length > 0) {
      ops.push(setMeta(META_KEYS.CUSTOM_SOURCES, backup.customSources));
    }

    // Restore category map: merge backup's custom categories on top of
    // the current builtin defaults so we never lose builtin categories.
    if (backup.categoryMap && Object.keys(backup.categoryMap).length > 0) {
      const currentMap = await getCategoryMap();
      // Start from current builtins, overlay everything from backup
      const merged = { ...DEFAULT_CATEGORY_MAP };
      for (const [key, entry] of Object.entries(backup.categoryMap)) {
        if (!merged[key]) {
          // It's a custom category — take it from the backup
          merged[key] = entry;
        } else {
          // It's a builtin — preserve builtin flag but merge module list
          merged[key] = {
            ...merged[key],
            // add any extra modules the backup has that builtins don't
            modules: [
              ...new Set([
                ...merged[key].modules,
                ...(entry.modules ?? []),
              ]),
            ],
          };
        }
      }
      // Also preserve any categories that exist locally but not in backup
      for (const [key, entry] of Object.entries(currentMap)) {
        if (!merged[key]) merged[key] = entry;
      }
      ops.push(saveCategoryMap(merged));
    }

    await Promise.all(ops);

    return {
      ok: true,
      exportedAt: backup.exportedAt,
      recordCount: backup.studyRecords.length,
      questionCount: backup.customQuestions.length,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
