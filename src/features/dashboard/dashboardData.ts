import { toDateKey } from '@/lib/date'
import type { Question, QuestionNote, StudyRecordMap } from '@/types'

const DAY = 24 * 60 * 60 * 1000

export interface ProgressCounts {
  total: number
  mastered: number
  review: number
  unlearned: number
  masteredThisWeek: number
}

/** Status counts over the visible questions only. */
export function progressCounts(
  questions: Question[],
  records: StudyRecordMap,
  now: number,
): ProgressCounts {
  let mastered = 0
  let review = 0
  let masteredThisWeek = 0
  for (const question of questions) {
    const record = records[question.id]
    if (record?.status === 'mastered') {
      mastered++
      if (now - record.lastUpdated < 7 * DAY) masteredThisWeek++
    } else if (record?.status === 'review') {
      review++
    }
  }
  return {
    total: questions.length,
    mastered,
    review,
    unlearned: questions.length - mastered - review,
    masteredThisWeek,
  }
}

export interface ModuleProgress {
  moduleKey: string
  /** Display name. */
  module: string
  total: number
  mastered: number
  review: number
}

/**
 * Per-module progress in the order the questions come in. The library already sorts
 * questions by bank and module order, so this is the order modules are shown everywhere.
 */
export function moduleProgress(questions: Question[], records: StudyRecordMap): ModuleProgress[] {
  const stats = new Map<string, ModuleProgress>()
  for (const question of questions) {
    let entry = stats.get(question.moduleKey)
    if (!entry) {
      entry = {
        moduleKey: question.moduleKey,
        module: question.module,
        total: 0,
        mastered: 0,
        review: 0,
      }
      stats.set(question.moduleKey, entry)
    }
    entry.total++
    const status = records[question.id]?.status
    if (status === 'mastered') entry.mastered++
    else if (status === 'review') entry.review++
  }
  return [...stats.values()]
}

/** The question the user touched most recently, if it is still visible. */
export function lastStudiedQuestion(
  questions: Question[],
  records: StudyRecordMap,
): Question | undefined {
  const byId = new Map(questions.map((q) => [q.id, q]))
  let latest: { question: Question; at: number } | undefined
  for (const record of Object.values(records)) {
    const question = byId.get(record.questionId)
    if (question && (!latest || record.lastUpdated > latest.at)) {
      latest = { question, at: record.lastUpdated }
    }
  }
  return latest?.question
}

export interface ActivityDay {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

/**
 * Activity per day for the last `weeks` weeks, ending today, oldest first.
 * iFace stores only the latest mark per question, so this counts each question's most recent
 * mark plus note edits — an approximation of real activity.
 */
export function activityCalendar(
  records: StudyRecordMap,
  notes: QuestionNote[],
  now: number,
  weeks = 24,
): ActivityDay[] {
  const counts = new Map<string, number>()
  const bump = (time: number) => {
    const key = toDateKey(time)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  for (const record of Object.values(records)) bump(record.lastUpdated)
  for (const note of notes) bump(note.updatedAt)

  const today = new Date(now)
  today.setHours(12, 0, 0, 0)
  // Align the grid so the last column ends on today's weekday (columns are Mon–Sun).
  const weekday = (today.getDay() + 6) % 7
  const days = weeks * 7 - (6 - weekday)
  const result: ActivityDay[] = []
  const max = Math.max(1, ...counts.values())
  for (let i = days - 1; i >= 0; i--) {
    const date = toDateKey(today.getTime() - i * DAY)
    const count = counts.get(date) ?? 0
    const level =
      count === 0 ? 0 : (Math.min(4, Math.ceil((count / max) * 4)) as ActivityDay['level'])
    result.push({ date, count, level })
  }
  return result
}

export function greeting(hour: number): string {
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 13) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

/** Rough time estimate: about 1.5 minutes per question. */
export function estimateMinutes(questionCount: number): number {
  return Math.max(1, Math.round(questionCount * 1.5))
}
