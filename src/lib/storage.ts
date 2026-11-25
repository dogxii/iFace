/**
 * Central registry and safe accessors for everything iFace keeps in localStorage.
 *
 * All keys are listed here so backups, migrations and debugging have one place to look.
 * Accessors never throw: storage can be unavailable (private mode, quota, SSR).
 */

export const STORAGE_KEYS = {
  theme: 'iface_theme',
  studyMode: 'iface_study_mode',
  answerNavigationMode: 'iface_answer_navigation_mode',
  mobileQuestionNav: 'iface_mobile_question_nav_enabled',
  aiFabVisible: 'iface_ai_fab_visible',
  streak: 'iface_streak',
  dailyGoal: 'iface_daily_goal',
  aiConfig: 'iface_ai_config',
  aiSessions: 'iface_ai_sessions',
  githubToken: 'iface_gh_token',
  onboardingDone: 'iface_onboarding_done_v1',
  sidebarWidth: 'iface_sidebar_width',
  sidebarCollapsed: 'iface_sidebar_collapsed',
  sidePanelWidth: 'iface_side_panel_width',
  noteDraft: 'iface_note_draft',
  modulePanelPinned: 'iface_module_panel_pinned',
  modulePanelWidth: 'iface_module_panel_width',
} as const

/**
 * Prefix for unsent form drafts (AI tools, JD match, mock interview setup, import paste…),
 * one key per form: `iface_draft:<scope>`. Local to this browser; not backed up or synced.
 */
const DRAFT_KEY_PREFIX = 'iface_draft:'

export type StorageKey =
  | (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
  | `${typeof DRAFT_KEY_PREFIX}${string}`

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readString(key: StorageKey): string | null {
  try {
    return store()?.getItem(key) ?? null
  } catch {
    return null
  }
}

/** Read a string value, falling back unless it is one of `allowed`. */
export function readEnum<T extends string>(key: StorageKey, allowed: readonly T[], fallback: T): T {
  const value = readString(key)
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

export function readBoolean(key: StorageKey, fallback: boolean): boolean {
  const value = readString(key)
  if (value === '1') return true
  if (value === '0') return false
  return fallback
}

export function readInt(key: StorageKey, fallback: number, min: number, max: number): number {
  const value = readString(key)
  if (value === null) return fallback
  const n = Number.parseInt(value, 10)
  return Number.isNaN(n) || n < min || n > max ? fallback : n
}

/** Read JSON, returning `fallback` if missing, unparsable or rejected by `parse`. */
export function readJSON<T>(key: StorageKey, parse: (value: unknown) => T | null, fallback: T): T {
  const raw = readString(key)
  if (raw === null) return fallback
  try {
    return parse(JSON.parse(raw)) ?? fallback
  } catch {
    return fallback
  }
}

export function writeString(key: StorageKey, value: string): void {
  try {
    store()?.setItem(key, value)
  } catch {
    // Quota exceeded or storage disabled — the in-memory state stays authoritative.
  }
}

export function writeBoolean(key: StorageKey, value: boolean): void {
  writeString(key, value ? '1' : '0')
}

export function writeJSON(key: StorageKey, value: unknown): void {
  writeString(key, JSON.stringify(value))
}

export function removeKey(key: StorageKey): void {
  try {
    store()?.removeItem(key)
  } catch {}
}

const draftKey = (scope: string): StorageKey => `${DRAFT_KEY_PREFIX}${scope}`

/** Read a form draft saved under `iface_draft:<scope>`, or null. */
export function readDraft(scope: string): unknown {
  return readJSON(draftKey(scope), (value) => value, null)
}

export function writeDraft(scope: string, value: unknown): void {
  writeJSON(draftKey(scope), value)
}

export function removeDraft(scope: string): void {
  removeKey(draftKey(scope))
}
