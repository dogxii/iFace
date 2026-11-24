/**
 * Pure study-state logic shared by the study store. No storage, no React, no dates
 * other than the ones passed in — so every rule here is unit-testable.
 */

import { toDateKey } from '@/lib/date'
import type { StudyRecord, StudyRecordMap, StudyStatus } from '@/types'

export interface StreakData {
  currentStreak: number // consecutive questions answered today
  bestStreak: number // all-time best streak in a single session
  todayCount: number // total questions marked today
  lastActivityDate: string // ISO date string "YYYY-MM-DD"
}

export const DAILY_GOAL_MIN = 5
export const DAILY_GOAL_MAX = 50
export const DAILY_GOAL_DEFAULT = 10

export { toDateKey }

export function emptyStreak(today: string): StreakData {
  return { currentStreak: 0, bestStreak: 0, todayCount: 0, lastActivityDate: today }
}

/** Reset the per-day counters when the stored streak belongs to an earlier day. */
export function rollStreakToToday(streak: StreakData, today: string): StreakData {
  if (streak.lastActivityDate === today) return streak
  return { ...streak, currentStreak: 0, todayCount: 0, lastActivityDate: today }
}

export function incrementStreak(streak: StreakData, today: string): StreakData {
  const sameDay = streak.lastActivityDate === today
  const current = sameDay ? streak.currentStreak + 1 : 1
  return {
    currentStreak: current,
    bestStreak: Math.max(streak.bestStreak, current),
    todayCount: sameDay ? streak.todayCount + 1 : 1,
    lastActivityDate: today,
  }
}

export function resetStreak(streak: StreakData, today: string): StreakData {
  return { ...emptyStreak(today), bestStreak: streak.bestStreak }
}

export function clampDailyGoal(n: number): number {
  return Math.max(DAILY_GOAL_MIN, Math.min(DAILY_GOAL_MAX, Math.round(n)))
}

export function parseStreak(value: unknown): StreakData | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  if (
    typeof v.currentStreak !== 'number' ||
    typeof v.bestStreak !== 'number' ||
    typeof v.todayCount !== 'number' ||
    typeof v.lastActivityDate !== 'string'
  ) {
    return null
  }
  return {
    currentStreak: v.currentStreak,
    bestStreak: v.bestStreak,
    todayCount: v.todayCount,
    lastActivityDate: v.lastActivityDate,
  }
}

/**
 * Build the record written when a question is marked.
 * `reviewCount` only grows the first time a question is marked "review" in a page session,
 * so pressing the button repeatedly does not inflate it.
 */
export function buildStatusRecord(
  existing: StudyRecord | undefined,
  questionId: string,
  status: StudyStatus,
  alreadyCountedThisSession: boolean,
  now: number,
): StudyRecord {
  let reviewCount = existing?.reviewCount ?? 0
  if (status === 'review') {
    reviewCount = alreadyCountedThisSession ? (existing?.reviewCount ?? 1) : reviewCount + 1
  }
  return { questionId, status, lastUpdated: now, reviewCount }
}

export interface StatusCounts {
  unlearned: number
  mastered: number
  review: number
}

/** Count statuses over all records, or over the given question ids (missing → unlearned). */
export function countStatuses(
  records: StudyRecordMap,
  questionIds?: readonly string[],
): StatusCounts {
  const counts: StatusCounts = { unlearned: 0, mastered: 0, review: 0 }
  if (questionIds) {
    for (const id of questionIds) counts[records[id]?.status ?? 'unlearned']++
  } else {
    for (const record of Object.values(records)) counts[record.status]++
  }
  return counts
}

export function weakRecords(records: StudyRecordMap): StudyRecord[] {
  return Object.values(records)
    .filter((record) => record.status === 'review')
    .sort((a, b) => a.lastUpdated - b.lastUpdated)
}

export function estimateDaysLeft(
  records: StudyRecordMap,
  totalQuestions: number,
  dailyCount: number = DAILY_GOAL_DEFAULT,
): number {
  const mastered = countStatuses(records).mastered
  const remaining = totalQuestions - mastered
  return remaining <= 0 ? 0 : Math.ceil(remaining / Math.max(1, dailyCount))
}

// ─── Spaced review ─────────────────────────────────────────────────────────────
// Derived from existing record fields only (status, reviewCount, lastUpdated) so no
// stored data changes. "review" questions come back the next day; mastered questions
// come back after a growing interval.

const DAY_MS = 24 * 60 * 60 * 1000
export const MASTERED_INTERVAL_DAYS = [7, 14, 30, 60] as const

export function reviewIntervalDays(
  record: Pick<StudyRecord, 'status' | 'reviewCount'>,
): number | null {
  if (record.status === 'review') return 1
  if (record.status === 'mastered') {
    const step = Math.min(Math.max(record.reviewCount, 0), MASTERED_INTERVAL_DAYS.length - 1)
    return MASTERED_INTERVAL_DAYS[step]
  }
  return null
}

export function nextReviewAt(record: StudyRecord): number | null {
  const days = reviewIntervalDays(record)
  return days === null ? null : record.lastUpdated + days * DAY_MS
}

export function isDueForReview(record: StudyRecord, now: number): boolean {
  const at = nextReviewAt(record)
  return at !== null && at <= now
}

/** Records due for review, most overdue first. */
export function dueRecords(records: StudyRecordMap, now: number): StudyRecord[] {
  return Object.values(records)
    .filter((record) => isDueForReview(record, now))
    .sort((a, b) => (nextReviewAt(a) ?? 0) - (nextReviewAt(b) ?? 0))
}

// ─── Theme ────────────────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark'
/** What the user picked; `system` follows the OS appearance. */
export type ThemePreference = Theme | 'system'

export function parseThemePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): Theme {
  if (preference === 'system') return systemDark ? 'dark' : 'light'
  return preference
}
