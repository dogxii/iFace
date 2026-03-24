import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

// ─── Streak / Gamification ────────────────────────────────────────────────────

export interface StreakData {
  currentStreak: number // consecutive questions answered today
  bestStreak: number // all-time best streak in a single session
  todayCount: number // total questions marked today
  lastActivityDate: string // ISO date string "YYYY-MM-DD"
}

const STREAK_KEY = 'iface_streak'

// ─── Daily Goal ───────────────────────────────────────────────────────────────

export const DAILY_GOAL_MIN = 5
export const DAILY_GOAL_MAX = 50
export const DAILY_GOAL_DEFAULT = 10

const DAILY_GOAL_KEY = 'iface_daily_goal'

function loadDailyGoal(): number {
  try {
    const v = localStorage.getItem(DAILY_GOAL_KEY)
    if (v) {
      const n = parseInt(v, 10)
      if (!Number.isNaN(n) && n >= DAILY_GOAL_MIN && n <= DAILY_GOAL_MAX) return n
    }
  } catch {}
  return DAILY_GOAL_DEFAULT
}

function saveDailyGoal(n: number): void {
  try {
    localStorage.setItem(DAILY_GOAL_KEY, String(n))
  } catch {}
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (raw) {
      const parsed: StreakData = JSON.parse(raw)
      // Reset today's count if it's a new day
      if (parsed.lastActivityDate !== todayStr()) {
        return { ...parsed, currentStreak: 0, todayCount: 0, lastActivityDate: todayStr() }
      }
      return parsed
    }
  } catch {}
  return { currentStreak: 0, bestStreak: 0, todayCount: 0, lastActivityDate: todayStr() }
}

function saveStreak(data: StreakData): void {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(data))
  } catch {}
}

// ─── Study Mode ───────────────────────────────────────────────────────────────

export type StudyMode =
  | 'answer-first' // 先作答，再展开参考答案（默认）
  | 'answer-alongside' // 边看答案边做笔记
  | 'memory-only' // 纯记忆模式，不作答直接翻答案

const STUDY_MODE_KEY = 'iface_study_mode'

function loadStudyMode(): StudyMode {
  try {
    const v = localStorage.getItem(STUDY_MODE_KEY)
    if (v === 'answer-first' || v === 'answer-alongside' || v === 'memory-only') return v
  } catch {}
  return 'answer-first'
}

function saveStudyMode(mode: StudyMode): void {
  try {
    localStorage.setItem(STUDY_MODE_KEY, mode)
  } catch {}
}

// ─── Hidden Categories ────────────────────────────────────────────────────────

const HIDDEN_CATEGORIES_KEY = 'iface_hidden_categories'

function loadHiddenCategories(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_CATEGORIES_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return new Set<string>(arr)
    }
  } catch {}
  return new Set<string>()
}

function saveHiddenCategories(s: Set<string>): void {
  try {
    localStorage.setItem(HIDDEN_CATEGORIES_KEY, JSON.stringify([...s]))
  } catch {}
}

import {
  clearAllStudyRecords,
  deleteStudyRecord,
  getAllStudyRecords,
  putStudyRecord,
} from '@/lib/db'
import { invalidateDailyCache } from '@/lib/questionLoader'
import type { StudyRecord, StudyRecordMap, StudyStatus } from '@/types'

// ─── Theme ────────────────────────────────────────────────────────────────────

const THEME_KEY = 'iface_theme'

function loadTheme(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function saveTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {}
}

function applyThemeToDom(theme: 'light' | 'dark'): void {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// ─── State ────────────────────────────────────────────────────────────────────

interface StoreState {
  records: StudyRecordMap
  theme: 'light' | 'dark'
  studyMode: StudyMode
  streak: StreakData
  dailyGoal: number
  hiddenCategories: Set<string>
  initialized: boolean
}

type Action =
  | {
      type: 'INIT'
      records: StudyRecordMap
      theme: 'light' | 'dark'
      studyMode: StudyMode
      streak: StreakData
      dailyGoal: number
    }
  | { type: 'SET_RECORD'; record: StudyRecord }
  | { type: 'DELETE_RECORD'; questionId: string }
  | { type: 'RESET_RECORDS' }
  | { type: 'SET_THEME'; theme: 'light' | 'dark' }
  | { type: 'SET_STUDY_MODE'; studyMode: StudyMode }
  | { type: 'SET_DAILY_GOAL'; dailyGoal: number }
  | { type: 'INCREMENT_STREAK' }
  | { type: 'RESET_STREAK' }
  | { type: 'SET_HIDDEN_CATEGORIES'; hiddenCategories: string[] }

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'INIT':
      return {
        ...state,
        records: action.records,
        theme: action.theme,
        studyMode: action.studyMode,
        streak: action.streak,
        dailyGoal: action.dailyGoal,
        initialized: true,
      }
    case 'SET_HIDDEN_CATEGORIES':
      return { ...state, hiddenCategories: new Set(action.hiddenCategories) }
    case 'SET_RECORD':
      return {
        ...state,
        records: {
          ...state.records,
          [action.record.questionId]: action.record,
        },
      }
    case 'DELETE_RECORD': {
      const next = { ...state.records }
      delete next[action.questionId]
      return { ...state, records: next }
    }
    case 'RESET_RECORDS':
      return { ...state, records: {} }
    case 'SET_THEME':
      return { ...state, theme: action.theme }
    case 'SET_STUDY_MODE':
      return { ...state, studyMode: action.studyMode }
    case 'INCREMENT_STREAK': {
      const today = todayStr()
      const prev = state.streak
      const newStreak: StreakData = {
        currentStreak: prev.lastActivityDate === today ? prev.currentStreak + 1 : 1,
        bestStreak: Math.max(
          prev.bestStreak,
          prev.lastActivityDate === today ? prev.currentStreak + 1 : 1,
        ),
        todayCount: prev.lastActivityDate === today ? prev.todayCount + 1 : 1,
        lastActivityDate: today,
      }
      saveStreak(newStreak)
      return { ...state, streak: newStreak }
    }
    case 'RESET_STREAK': {
      const reset: StreakData = {
        currentStreak: 0,
        bestStreak: state.streak.bestStreak,
        todayCount: 0,
        lastActivityDate: todayStr(),
      }
      saveStreak(reset)
      return { ...state, streak: reset }
    }
    case 'SET_DAILY_GOAL':
      saveDailyGoal(action.dailyGoal)
      return { ...state, dailyGoal: action.dailyGoal }
    default:
      return state
  }
}

// ─── Singleton broadcast channel (cross-tab sync) ────────────────────────────

let channel: BroadcastChannel | null = null
try {
  channel = new BroadcastChannel('iface_store')
} catch {
  // BroadcastChannel not supported (e.g. Safari < 15.4)
}

// ─── Global listener registry (multiple hook instances on same page) ──────────

const _listeners = new Set<(action: Action) => void>()

function broadcast(action: Action) {
  for (const fn of _listeners) fn(action)
  try {
    channel?.postMessage(action)
  } catch {}
}

// ─── Session Review Guard (module-level, shared across all hook instances) ────
// Tracks which questionIds have already had reviewCount incremented in the
// current browser session visit. Cleared per question when navigating away.

const _sessionReviewed = new Set<string>()

/** Call this when leaving a question page to reset its session review guard. */
export function clearSessionReview(questionId: string) {
  _sessionReviewed.delete(questionId)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStudyStore() {
  const [state, dispatch] = useReducer(reducer, {
    records: {},
    theme: loadTheme(),
    studyMode: loadStudyMode(),
    streak: loadStreak(),
    dailyGoal: loadDailyGoal(),
    hiddenCategories: loadHiddenCategories(),
    initialized: false,
  })

  // Keep a stable ref so callbacks don't go stale
  const stateRef = useRef(state)
  stateRef.current = state

  // ── Initialize from IndexedDB ──
  useEffect(() => {
    const theme = loadTheme()
    applyThemeToDom(theme)

    const studyMode = loadStudyMode()
    const streak = loadStreak()
    const dailyGoal = loadDailyGoal()
    getAllStudyRecords().then((records) => {
      const map: StudyRecordMap = {}
      for (const r of records) map[r.questionId] = r
      dispatch({ type: 'INIT', records: map, theme, studyMode, streak, dailyGoal })
    })
  }, [])

  // ── Register as a global listener (sync across hook instances on same page) ──
  useEffect(() => {
    const listener = (action: Action) => dispatch(action)
    _listeners.add(listener)
    return () => {
      _listeners.delete(listener)
    }
  }, [])

  // ── Cross-tab sync via BroadcastChannel ──
  useEffect(() => {
    if (!channel) return
    const handler = (e: MessageEvent<Action>) => dispatch(e.data)
    channel.addEventListener('message', handler)
    return () => channel?.removeEventListener('message', handler)
  }, [])

  // ─── Actions ────────────────────────────────────────────────────────────────

  const setStatus = useCallback(async (questionId: string, status: StudyStatus) => {
    const existing = stateRef.current.records[questionId]

    // Only increment reviewCount the first time this question is marked
    // in the current page session (prevents multi-press inflation).
    const alreadyCountedThisSession = _sessionReviewed.has(questionId)
    let newReviewCount: number
    if (status === 'review') {
      if (!alreadyCountedThisSession) {
        newReviewCount = (existing?.reviewCount ?? 0) + 1
        _sessionReviewed.add(questionId)
      } else {
        newReviewCount = existing?.reviewCount ?? 1
      }
    } else {
      // mastered / unlearned — never increment
      newReviewCount = existing?.reviewCount ?? 0
    }

    const record: StudyRecord = {
      questionId,
      status,
      lastUpdated: Date.now(),
      reviewCount: newReviewCount,
    }
    // Optimistic update first
    const action: Action = { type: 'SET_RECORD', record }
    broadcast(action)
    // Persist
    await putStudyRecord(record)
    await invalidateDailyCache()
  }, [])

  const clearRecord = useCallback(async (questionId: string) => {
    const action: Action = { type: 'DELETE_RECORD', questionId }
    broadcast(action)
    await deleteStudyRecord(questionId)
  }, [])

  const resetAll = useCallback(async () => {
    const action: Action = { type: 'RESET_RECORDS' }
    broadcast(action)
    await clearAllStudyRecords()
    await invalidateDailyCache()
  }, [])

  const setTheme = useCallback((theme: 'light' | 'dark') => {
    saveTheme(theme)
    applyThemeToDom(theme)
    const action: Action = { type: 'SET_THEME', theme }
    broadcast(action)
  }, [])

  const setStudyMode = useCallback((mode: StudyMode) => {
    saveStudyMode(mode)
    const action: Action = { type: 'SET_STUDY_MODE', studyMode: mode }
    broadcast(action)
  }, [])

  const incrementStreak = useCallback(() => {
    const action: Action = { type: 'INCREMENT_STREAK' }
    broadcast(action)
  }, [])

  const resetStreak = useCallback(() => {
    const action: Action = { type: 'RESET_STREAK' }
    broadcast(action)
  }, [])

  const setDailyGoal = useCallback((n: number) => {
    const clamped = Math.max(DAILY_GOAL_MIN, Math.min(DAILY_GOAL_MAX, Math.round(n)))
    const action: Action = { type: 'SET_DAILY_GOAL', dailyGoal: clamped }
    broadcast(action)
  }, [])

  const toggleCategoryVisibility = useCallback((categoryName: string) => {
    const next = new Set(stateRef.current.hiddenCategories)
    if (next.has(categoryName)) {
      next.delete(categoryName)
    } else {
      next.add(categoryName)
    }
    saveHiddenCategories(next)
    const action: Action = { type: 'SET_HIDDEN_CATEGORIES', hiddenCategories: [...next] }
    broadcast(action)
  }, [])

  const isCategoryHidden = useCallback(
    (categoryName: string): boolean => stateRef.current.hiddenCategories.has(categoryName),
    [],
  )

  const toggleTheme = useCallback(() => {
    const next = stateRef.current.theme === 'light' ? 'dark' : 'light'
    saveTheme(next)
    applyThemeToDom(next)
    const action: Action = { type: 'SET_THEME', theme: next }
    broadcast(action)
  }, [])

  // ─── Queries (pure, derived from state) ─────────────────────────────────────

  const getStatus = useCallback(
    (questionId: string): StudyStatus =>
      stateRef.current.records[questionId]?.status ?? 'unlearned',
    [],
  )

  const getRecord = useCallback(
    (questionId: string): StudyRecord | undefined => stateRef.current.records[questionId],
    [],
  )

  // ── Derived counts computed directly from reactive state (not stateRef) ──
  // These are plain values, not callbacks, so components can use them directly
  // as useMemo / useEffect dependencies and re-render when records change.
  const statusCounts = useMemo(() => {
    const counts = { unlearned: 0, mastered: 0, review: 0 }
    for (const r of Object.values(state.records)) {
      counts[r.status]++
    }
    return counts
  }, [state.records])

  // Keep the callback form for compatibility (e.g. QuestionDetail, WeakPoints)
  const getStatusCounts = useCallback((questionIds?: string[]) => {
    if (!questionIds) {
      // Re-derive from current state so callers that call this inside a
      // useEffect/useMemo also get a fresh value.
      const counts = { unlearned: 0, mastered: 0, review: 0 }
      for (const r of Object.values(stateRef.current.records)) {
        counts[r.status]++
      }
      return counts
    }
    const counts = { unlearned: 0, mastered: 0, review: 0 }
    for (const id of questionIds) {
      const status = stateRef.current.records[id]?.status ?? 'unlearned'
      counts[status]++
    }
    return counts
  }, [])

  const getWeakQuestions = useCallback((): StudyRecord[] => {
    return Object.values(stateRef.current.records)
      .filter((r) => r.status === 'review')
      .sort((a, b) => a.lastUpdated - b.lastUpdated)
  }, [])

  const getEstimatedDays = useCallback(
    (totalQuestions: number, dailyCount = DAILY_GOAL_DEFAULT): number => {
      const mastered = Object.values(stateRef.current.records).filter(
        (r) => r.status === 'mastered',
      ).length
      const remaining = totalQuestions - mastered
      return remaining <= 0 ? 0 : Math.ceil(remaining / dailyCount)
    },
    [],
  )

  return {
    records: state.records,
    theme: state.theme,
    studyMode: state.studyMode,
    streak: state.streak,
    dailyGoal: state.dailyGoal,
    hiddenCategories: state.hiddenCategories,
    initialized: state.initialized,

    // Derived reactive values (safe as useMemo/useEffect deps)
    statusCounts,

    // Actions
    setStatus,
    clearRecord,
    resetAll,
    setTheme,
    toggleTheme,
    setStudyMode,
    setDailyGoal,
    incrementStreak,
    resetStreak,
    toggleCategoryVisibility,

    // Queries
    getStatus,
    getRecord,
    getStatusCounts,
    getWeakQuestions,
    getEstimatedDays,
    isCategoryHidden,
  }
}
