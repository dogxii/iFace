import { isDueForReview, weakRecords } from '@/store/studyLogic'
import type { Question, StudyRecord, StudyRecordMap } from '@/types'

export interface WeakItem {
  question: Question
  record: StudyRecord
  due: boolean
}

export type WeakSort = 'oldest' | 'newest' | 'most-reviewed' | 'difficulty'

export const WEAK_SORT_OPTIONS: { value: WeakSort; label: string }[] = [
  { value: 'oldest', label: '最久未复习' },
  { value: 'newest', label: '最近标记' },
  { value: 'most-reviewed', label: '复习次数最多' },
  { value: 'difficulty', label: '难度从高到低' },
]

/** Questions marked "review" that still exist in the bank, oldest first. */
export function buildWeakItems(
  questions: Question[],
  records: StudyRecordMap,
  now: number,
): WeakItem[] {
  const byId = new Map(questions.map((q) => [q.id, q]))
  const items: WeakItem[] = []
  for (const record of weakRecords(records)) {
    const question = byId.get(record.questionId)
    if (question) items.push({ question, record, due: isDueForReview(record, now) })
  }
  return items
}

export function countByModule(items: WeakItem[]): { module: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const { question } of items) {
    counts.set(question.module, (counts.get(question.module) ?? 0) + 1)
  }
  return [...counts]
    .map(([module, count]) => ({ module, count }))
    .sort((a, b) => b.count - a.count || a.module.localeCompare(b.module, 'zh-CN'))
}

export function sortWeakItems(items: WeakItem[], sort: WeakSort): WeakItem[] {
  const sorted = [...items]
  switch (sort) {
    case 'oldest':
      return sorted.sort((a, b) => a.record.lastUpdated - b.record.lastUpdated)
    case 'newest':
      return sorted.sort((a, b) => b.record.lastUpdated - a.record.lastUpdated)
    case 'most-reviewed':
      return sorted.sort(
        (a, b) =>
          b.record.reviewCount - a.record.reviewCount ||
          a.record.lastUpdated - b.record.lastUpdated,
      )
    case 'difficulty':
      return sorted.sort(
        (a, b) =>
          b.question.difficulty - a.question.difficulty ||
          a.record.lastUpdated - b.record.lastUpdated,
      )
  }
}

export interface WeakStats {
  total: number
  due: number
  avgReviewCount: number
  oldest: number | null
}

export function weakStats(items: WeakItem[]): WeakStats {
  if (items.length === 0) return { total: 0, due: 0, avgReviewCount: 0, oldest: null }
  let reviews = 0
  let due = 0
  let oldest = Number.POSITIVE_INFINITY
  for (const { record, due: isDue } of items) {
    reviews += record.reviewCount
    if (isDue) due += 1
    oldest = Math.min(oldest, record.lastUpdated)
  }
  return { total: items.length, due, avgReviewCount: reviews / items.length, oldest }
}

/** Days needed to clear the list at the given daily pace. */
export function daysToClear(count: number, perDay: number): number {
  return count <= 0 ? 0 : Math.ceil(count / Math.max(1, perDay))
}
