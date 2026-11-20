import { describe, expect, it } from 'vitest'
import type { StudyRecord } from '@/types'
import {
  buildStatusRecord,
  clampDailyGoal,
  countStatuses,
  dueRecords,
  emptyStreak,
  estimateDaysLeft,
  incrementStreak,
  isDueForReview,
  nextReviewAt,
  parseStreak,
  resetStreak,
  reviewIntervalDays,
  rollStreakToToday,
  weakRecords,
} from './studyLogic'

const rec = (questionId: string, status: StudyRecord['status'], lastUpdated = 0): StudyRecord => ({
  questionId,
  status,
  lastUpdated,
  reviewCount: 0,
})

describe('streak', () => {
  it('counts consecutive marks on the same day and tracks the best run', () => {
    let s = emptyStreak('2026-11-20')
    s = incrementStreak(s, '2026-11-20')
    s = incrementStreak(s, '2026-11-20')
    expect(s).toMatchObject({ currentStreak: 2, bestStreak: 2, todayCount: 2 })
    s = resetStreak(s, '2026-11-20')
    expect(s).toMatchObject({ currentStreak: 0, bestStreak: 2, todayCount: 0 })
  })

  it('starts over on a new day but keeps the best streak', () => {
    const s = incrementStreak(
      { currentStreak: 5, bestStreak: 5, todayCount: 7, lastActivityDate: '2026-11-19' },
      '2026-11-20',
    )
    expect(s).toEqual({
      currentStreak: 1,
      bestStreak: 5,
      todayCount: 1,
      lastActivityDate: '2026-11-20',
    })
  })

  it('rolls stored counters to today without touching same-day data', () => {
    const stored = {
      currentStreak: 3,
      bestStreak: 4,
      todayCount: 6,
      lastActivityDate: '2026-11-19',
    }
    expect(rollStreakToToday(stored, '2026-11-19')).toBe(stored)
    expect(rollStreakToToday(stored, '2026-11-20')).toMatchObject({
      currentStreak: 0,
      todayCount: 0,
      bestStreak: 4,
    })
  })

  it('rejects malformed stored streaks', () => {
    expect(parseStreak(null)).toBeNull()
    expect(parseStreak({ currentStreak: '1' })).toBeNull()
    expect(
      parseStreak({ currentStreak: 1, bestStreak: 2, todayCount: 3, lastActivityDate: 'd' }),
    ).toEqual({
      currentStreak: 1,
      bestStreak: 2,
      todayCount: 3,
      lastActivityDate: 'd',
    })
  })
})

describe('buildStatusRecord', () => {
  it('increments reviewCount once per session for review marks', () => {
    const first = buildStatusRecord(undefined, 'q', 'review', false, 1)
    expect(first.reviewCount).toBe(1)
    const again = buildStatusRecord(first, 'q', 'review', true, 2)
    expect(again.reviewCount).toBe(1)
    const nextSession = buildStatusRecord(again, 'q', 'review', false, 3)
    expect(nextSession.reviewCount).toBe(2)
  })

  it('keeps reviewCount when marking mastered and stamps the time', () => {
    const existing = { ...rec('q', 'review'), reviewCount: 3 }
    expect(buildStatusRecord(existing, 'q', 'mastered', false, 42)).toEqual({
      questionId: 'q',
      status: 'mastered',
      lastUpdated: 42,
      reviewCount: 3,
    })
  })
})

describe('derived queries', () => {
  const records = {
    a: rec('a', 'mastered'),
    b: rec('b', 'review', 20),
    c: rec('c', 'review', 10),
  }

  it('counts statuses overall and for a subset', () => {
    expect(countStatuses(records)).toEqual({ unlearned: 0, mastered: 1, review: 2 })
    expect(countStatuses(records, ['a', 'x'])).toEqual({ unlearned: 1, mastered: 1, review: 0 })
  })

  it('lists weak records oldest first', () => {
    expect(weakRecords(records).map((r) => r.questionId)).toEqual(['c', 'b'])
  })

  it('estimates remaining days', () => {
    expect(estimateDaysLeft(records, 21, 10)).toBe(2)
    expect(estimateDaysLeft(records, 1, 10)).toBe(0)
  })

  it('clamps the daily goal', () => {
    expect(clampDailyGoal(1)).toBe(5)
    expect(clampDailyGoal(12.4)).toBe(12)
    expect(clampDailyGoal(99)).toBe(50)
  })
})

describe('spaced review', () => {
  const DAY = 86_400_000
  it('schedules review questions for the next day and mastered ones on a growing interval', () => {
    expect(reviewIntervalDays({ status: 'review', reviewCount: 5 })).toBe(1)
    expect(reviewIntervalDays({ status: 'mastered', reviewCount: 0 })).toBe(7)
    expect(reviewIntervalDays({ status: 'mastered', reviewCount: 2 })).toBe(30)
    expect(reviewIntervalDays({ status: 'mastered', reviewCount: 9 })).toBe(60)
    expect(reviewIntervalDays({ status: 'unlearned', reviewCount: 0 })).toBeNull()
  })

  it('lists due records, most overdue first', () => {
    const now = 100 * DAY
    const records = {
      a: { questionId: 'a', status: 'review' as const, lastUpdated: now - 2 * DAY, reviewCount: 1 },
      b: { questionId: 'b', status: 'review' as const, lastUpdated: now - DAY / 2, reviewCount: 1 },
      c: {
        questionId: 'c',
        status: 'mastered' as const,
        lastUpdated: now - 10 * DAY,
        reviewCount: 0,
      },
      d: {
        questionId: 'd',
        status: 'mastered' as const,
        lastUpdated: now - 10 * DAY,
        reviewCount: 1,
      },
    }
    expect(isDueForReview(records.b, now)).toBe(false)
    expect(dueRecords(records, now).map((r) => r.questionId)).toEqual(['c', 'a'])
    expect(nextReviewAt(records.d)).toBe(now + 4 * DAY)
  })
})
