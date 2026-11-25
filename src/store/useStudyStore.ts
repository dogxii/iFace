/**
 * Study store — a single app-wide zustand store for study records and study preferences.
 *
 * - Records live in IndexedDB and are loaded once (`initStudyStore`), then kept in memory.
 * - Preferences live in localStorage and are written by a store subscription, so the
 *   state transitions themselves stay pure (see `studyLogic.ts`).
 * - Changes are mirrored to other tabs through a BroadcastChannel.
 *
 * `useStudyStore()` keeps the pre-v1.5 hook API so existing pages work unchanged; new code
 * should prefer `useStudyState(selector)` to subscribe to just what it needs.
 */
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { dataSource } from '@/data/source'
import { dataReady } from '@/lib/banks/boot'
import { invalidateDailyCache } from '@/lib/dailyRecommendations'
import { studyRecordEvents } from '@/lib/db'
import {
  readBoolean,
  readEnum,
  readInt,
  readJSON,
  readString,
  STORAGE_KEYS,
  writeBoolean,
  writeJSON,
  writeString,
} from '@/lib/storage'
import type { StudyRecord, StudyRecordMap, StudyStatus } from '@/types'
import {
  buildStatusRecord,
  clampDailyGoal,
  countStatuses,
  DAILY_GOAL_DEFAULT,
  DAILY_GOAL_MAX,
  DAILY_GOAL_MIN,
  emptyStreak,
  estimateDaysLeft,
  incrementStreak as nextStreakAfterMark,
  resetStreak as nextStreakAfterReset,
  parseStreak,
  parseThemePreference,
  resolveTheme,
  rollStreakToToday,
  type StatusCounts,
  type StreakData,
  type ThemePreference,
  toDateKey,
  weakRecords,
} from './studyLogic'

export {
  DAILY_GOAL_DEFAULT,
  DAILY_GOAL_MAX,
  DAILY_GOAL_MIN,
  type StatusCounts,
  type StreakData,
  type ThemePreference,
}

export type StudyMode =
  | 'answer-first' // 先作答，再展开参考答案（默认）
  | 'answer-alongside' // 边看答案边做笔记
  | 'memory-only' // 纯记忆模式，不作答直接翻答案

export type AnswerNavigationMode = 'answer' | 'check'

const STUDY_MODES: readonly StudyMode[] = ['answer-first', 'answer-alongside', 'memory-only']
const ANSWER_NAV_MODES: readonly AnswerNavigationMode[] = ['answer', 'check']

// ─── Persisted preferences ────────────────────────────────────────────────────

interface Preferences {
  theme: ThemePreference
  studyMode: StudyMode
  answerNavigationMode: AnswerNavigationMode
  mobileQuestionNavEnabled: boolean
  aiFabVisible: boolean
  streak: StreakData
  dailyGoal: number
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

function systemDark(): boolean {
  try {
    return window.matchMedia(DARK_QUERY).matches
  } catch {
    return false
  }
}

function loadPreferences(): Preferences {
  const today = toDateKey()
  return {
    theme: parseThemePreference(readString(STORAGE_KEYS.theme)),
    studyMode: readEnum(STORAGE_KEYS.studyMode, STUDY_MODES, 'answer-first'),
    answerNavigationMode: readEnum(STORAGE_KEYS.answerNavigationMode, ANSWER_NAV_MODES, 'answer'),
    mobileQuestionNavEnabled: readBoolean(STORAGE_KEYS.mobileQuestionNav, true),
    aiFabVisible: readBoolean(STORAGE_KEYS.aiFabVisible, true),
    streak: rollStreakToToday(
      readJSON(STORAGE_KEYS.streak, parseStreak, emptyStreak(today)),
      today,
    ),
    dailyGoal: readInt(STORAGE_KEYS.dailyGoal, DAILY_GOAL_DEFAULT, DAILY_GOAL_MIN, DAILY_GOAL_MAX),
  }
}

function persistPreferences(next: Preferences, prev: Preferences): void {
  if (next.theme !== prev.theme) writeString(STORAGE_KEYS.theme, next.theme)
  if (next.studyMode !== prev.studyMode) writeString(STORAGE_KEYS.studyMode, next.studyMode)
  if (next.answerNavigationMode !== prev.answerNavigationMode) {
    writeString(STORAGE_KEYS.answerNavigationMode, next.answerNavigationMode)
  }
  if (next.mobileQuestionNavEnabled !== prev.mobileQuestionNavEnabled) {
    writeBoolean(STORAGE_KEYS.mobileQuestionNav, next.mobileQuestionNavEnabled)
  }
  if (next.aiFabVisible !== prev.aiFabVisible)
    writeBoolean(STORAGE_KEYS.aiFabVisible, next.aiFabVisible)
  if (next.streak !== prev.streak) writeJSON(STORAGE_KEYS.streak, next.streak)
  if (next.dailyGoal !== prev.dailyGoal) writeString(STORAGE_KEYS.dailyGoal, String(next.dailyGoal))
}

/** Apply the theme preference to the page, resolving `system` against the OS appearance. */
function syncTheme(): void {
  if (typeof document === 'undefined') return
  const dark = resolveTheme(useStudyState.getState().theme, systemDark()) === 'dark'
  document.documentElement.classList.toggle('dark', dark)
}

// ─── Cross-tab sync ───────────────────────────────────────────────────────────

type SyncMessage =
  | { type: 'record'; record: StudyRecord }
  | { type: 'delete-record'; questionId: string }
  | { type: 'reset-records' }
  | { type: 'reload-records' }
  | { type: 'preferences'; patch: Partial<Preferences> }

let channel: BroadcastChannel | null = null
try {
  channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('iface_store')
} catch {
  channel = null
}

function post(message: SyncMessage): void {
  try {
    channel?.postMessage(message)
  } catch {}
}

// ─── Session review guard ─────────────────────────────────────────────────────
// Question ids whose reviewCount was already incremented during this page visit.

const sessionReviewed = new Set<string>()

/** Call this when leaving a question page to reset its session review guard. */
export function clearSessionReview(questionId: string): void {
  sessionReviewed.delete(questionId)
}

// ─── Store ────────────────────────────────────────────────────────────────────

export interface StudyState extends Preferences {
  records: StudyRecordMap
  statusCounts: StatusCounts
  initialized: boolean
}

export interface StudyActions {
  setStatus: (questionId: string, status: StudyStatus) => Promise<void>
  clearRecord: (questionId: string) => Promise<void>
  /** Put records back exactly as given (e.g. to undo a status change). */
  restoreRecords: (records: StudyRecord[]) => Promise<void>
  resetAll: () => Promise<void>
  reloadRecords: () => Promise<void>
  setTheme: (theme: ThemePreference) => void
  setStudyMode: (mode: StudyMode) => void
  setAnswerNavigationMode: (mode: AnswerNavigationMode) => void
  setMobileQuestionNavEnabled: (enabled: boolean) => void
  setAiFabVisible: (visible: boolean) => void
  setDailyGoal: (n: number) => void
  incrementStreak: () => void
  resetStreak: () => void
  getStatus: (questionId: string) => StudyStatus
  getRecord: (questionId: string) => StudyRecord | undefined
  getStatusCounts: (questionIds?: string[]) => StatusCounts
  getWeakQuestions: () => StudyRecord[]
  getEstimatedDays: (totalQuestions: number, dailyCount?: number) => number
}

function withRecords(records: StudyRecordMap) {
  return { records, statusCounts: countStatuses(records) }
}

export const useStudyState = create<StudyState & StudyActions>()((set, get) => {
  const setPreferences = (patch: Partial<Preferences>, broadcast = true) => {
    set(patch)
    if (patch.theme) syncTheme()
    if (broadcast) post({ type: 'preferences', patch })
  }

  return {
    ...loadPreferences(),
    ...withRecords({}),
    initialized: false,

    async setStatus(questionId, status) {
      const record = buildStatusRecord(
        get().records[questionId],
        questionId,
        status,
        sessionReviewed.has(questionId),
        Date.now(),
      )
      if (status === 'review') sessionReviewed.add(questionId)
      set(withRecords({ ...get().records, [questionId]: record }))
      post({ type: 'record', record })
      await dataSource().records.put(record)
      await invalidateDailyCache()
    },

    async restoreRecords(restored) {
      if (restored.length === 0) return
      const next = { ...get().records }
      for (const record of restored) next[record.questionId] = record
      set(withRecords(next))
      for (const record of restored) {
        post({ type: 'record', record })
        await dataSource().records.put(record)
      }
      await invalidateDailyCache()
    },

    async clearRecord(questionId) {
      const next = { ...get().records }
      delete next[questionId]
      set(withRecords(next))
      post({ type: 'delete-record', questionId })
      await dataSource().records.remove(questionId)
    },

    async resetAll() {
      set(withRecords({}))
      post({ type: 'reset-records' })
      await dataSource().records.clear()
      await invalidateDailyCache()
    },

    async reloadRecords() {
      const list = await dataSource().records.list()
      const records: StudyRecordMap = {}
      for (const record of list) records[record.questionId] = record
      set({ ...withRecords(records), initialized: true })
    },

    setTheme: (theme) => setPreferences({ theme }),
    setStudyMode: (studyMode) => setPreferences({ studyMode }),
    setAnswerNavigationMode: (answerNavigationMode) => setPreferences({ answerNavigationMode }),
    setMobileQuestionNavEnabled: (mobileQuestionNavEnabled) =>
      setPreferences({ mobileQuestionNavEnabled }),
    setAiFabVisible: (aiFabVisible) => setPreferences({ aiFabVisible }),
    setDailyGoal: (n) => setPreferences({ dailyGoal: clampDailyGoal(n) }),

    incrementStreak: () =>
      setPreferences({ streak: nextStreakAfterMark(get().streak, toDateKey()) }),
    resetStreak: () => setPreferences({ streak: nextStreakAfterReset(get().streak, toDateKey()) }),

    getStatus: (questionId) => get().records[questionId]?.status ?? 'unlearned',
    getRecord: (questionId) => get().records[questionId],
    getStatusCounts: (questionIds) => countStatuses(get().records, questionIds),
    getWeakQuestions: () => weakRecords(get().records),
    getEstimatedDays: (totalQuestions, dailyCount) =>
      estimateDaysLeft(get().records, totalQuestions, dailyCount),
  }
})

// Persist preferences whenever they change (in this tab or from another tab).
useStudyState.subscribe((state, prev) => persistPreferences(state, prev))

// ─── One-time initialisation ──────────────────────────────────────────────────

let initPromise: Promise<void> | null = null

/** Load records from IndexedDB and wire up sync listeners. Safe to call repeatedly. */
export function initStudyStore(): Promise<void> {
  if (initPromise) return initPromise

  syncTheme()
  try {
    window.matchMedia(DARK_QUERY).addEventListener('change', syncTheme)
  } catch {
    // No matchMedia (e.g. tests): explicit light / dark still applies.
  }

  channel?.addEventListener('message', (event: MessageEvent<SyncMessage>) => {
    const message = event.data
    const state = useStudyState.getState()
    switch (message.type) {
      case 'record':
        useStudyState.setState(
          withRecords({ ...state.records, [message.record.questionId]: message.record }),
        )
        break
      case 'delete-record': {
        const next = { ...state.records }
        delete next[message.questionId]
        useStudyState.setState(withRecords(next))
        break
      }
      case 'reset-records':
        useStudyState.setState(withRecords({}))
        break
      case 'reload-records':
        void state.reloadRecords()
        break
      case 'preferences': {
        const patch = message.patch
        useStudyState.setState(patch)
        if (patch.theme) syncTheme()
        break
      }
    }
  })

  // Bulk writes (backup import, Gist pull, migrations) bypass the store — reload after them.
  studyRecordEvents.addEventListener('replaced', () => {
    void useStudyState.getState().reloadRecords()
    post({ type: 'reload-records' })
  })

  // Records are keyed by question id, which the 2.0 migration may still be rewriting.
  initPromise = dataReady().then(() => useStudyState.getState().reloadRecords())
  return initPromise
}

// ─── Compatibility hook ───────────────────────────────────────────────────────

/**
 * Pre-v1.5 API: returns all state plus actions. Re-renders on any study-state change,
 * like the old hook did. Prefer `useStudyState(selector)` in new code.
 */
export function useStudyStore() {
  return useStudyState(useShallow((state) => state))
}
