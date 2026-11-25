import { describe, expect, it } from 'vitest'
import type { Question, StudyRecordMap } from '@/types'
import { buildWeakItems, countByModule, daysToClear, sortWeakItems, weakStats } from './weakPoints'

const DAY = 86_400_000
const NOW = 100 * DAY

function q(id: string, module: string, difficulty: 1 | 2 | 3): Question {
  return {
    id,
    moduleKey: `b/${module}`,
    module,
    difficulty,
    question: id,
    answer: '',
    tags: [],
  } as unknown as Question
}

const questions = [q('a', 'React', 1), q('b', 'React', 3), q('c', 'CSS', 2), q('d', 'CSS', 1)]
const records: StudyRecordMap = {
  a: { questionId: 'a', status: 'review', lastUpdated: NOW - 3 * DAY, reviewCount: 1 },
  b: { questionId: 'b', status: 'review', lastUpdated: NOW - 2 * 3_600_000, reviewCount: 4 },
  c: { questionId: 'c', status: 'review', lastUpdated: NOW - 5 * DAY, reviewCount: 0 },
  d: { questionId: 'd', status: 'mastered', lastUpdated: NOW - 30 * DAY, reviewCount: 2 },
  gone: { questionId: 'gone', status: 'review', lastUpdated: NOW, reviewCount: 0 },
}

describe('weak points', () => {
  const items = buildWeakItems(questions, records, NOW)

  it('keeps only existing review questions, oldest first, with due flags', () => {
    expect(items.map((i) => i.question.id)).toEqual(['c', 'a', 'b'])
    expect(items.map((i) => i.due)).toEqual([true, true, false])
  })

  it('counts modules by size', () => {
    expect(countByModule(items)).toEqual([
      { moduleKey: 'b/React', module: 'React', count: 2 },
      { moduleKey: 'b/CSS', module: 'CSS', count: 1 },
    ])
  })

  it('sorts by each mode', () => {
    const ids = (sort: Parameters<typeof sortWeakItems>[1]) =>
      sortWeakItems(items, sort).map((i) => i.question.id)
    expect(ids('newest')).toEqual(['b', 'a', 'c'])
    expect(ids('most-reviewed')).toEqual(['b', 'a', 'c'])
    expect(ids('difficulty')).toEqual(['b', 'c', 'a'])
  })

  it('summarises the list', () => {
    expect(weakStats(items)).toEqual({
      total: 3,
      due: 2,
      avgReviewCount: 5 / 3,
      oldest: NOW - 5 * DAY,
    })
    expect(weakStats([])).toEqual({ total: 0, due: 0, avgReviewCount: 0, oldest: null })
  })

  it('estimates days to clear', () => {
    expect(daysToClear(23, 10)).toBe(3)
    expect(daysToClear(0, 10)).toBe(0)
  })
})
