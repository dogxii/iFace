import { describe, expect, it } from 'vitest'
import type { Question, StudyRecordMap } from '@/types'
import { buildSession, sessionPool } from './sessionBuilder'

const DAY = 86_400_000
const NOW = 100 * DAY
const q = (id: string, module: string, difficulty: 1 | 2 | 3 = 1): Question => ({
  id,
  module,
  difficulty,
  question: id,
  answer: '',
  tags: [],
})
const questions = [q('a', 'React'), q('b', 'React', 2), q('c', 'Go'), q('d', 'Go', 3)]
const records: StudyRecordMap = {
  b: { questionId: 'b', status: 'review', lastUpdated: NOW - 3 * DAY, reviewCount: 1 },
  c: { questionId: 'c', status: 'mastered', lastUpdated: NOW - 30 * DAY, reviewCount: 0 },
  d: { questionId: 'd', status: 'review', lastUpdated: NOW - 5 * DAY, reviewCount: 2 },
}

describe('sessionPool', () => {
  const base = { modules: [], difficulty: 'all' as const, status: 'all' as const }
  it('filters by module, difficulty and status', () => {
    expect(
      sessionPool(questions, records, { ...base, modules: ['Go'] }, NOW).map((x) => x.id),
    ).toEqual(['c', 'd'])
    expect(
      sessionPool(questions, records, { ...base, difficulty: 2 }, NOW).map((x) => x.id),
    ).toEqual(['b'])
    expect(
      sessionPool(questions, records, { ...base, status: 'unmastered' }, NOW).map((x) => x.id),
    ).toEqual(['a', 'b', 'd'])
    expect(
      sessionPool(questions, records, { ...base, status: 'unlearned' }, NOW).map((x) => x.id),
    ).toEqual(['a'])
  })

  it('selects questions due for spaced review', () => {
    expect(
      sessionPool(questions, records, { ...base, status: 'due' }, NOW).map((x) => x.id),
    ).toEqual(['b', 'c', 'd'])
  })
})

describe('buildSession', () => {
  it('puts review questions first, oldest first, then bank order', () => {
    expect(buildSession(questions, records, { size: 'all', shuffle: false })).toEqual([
      'd',
      'b',
      'a',
      'c',
    ])
    expect(buildSession(questions, records, { size: 10, shuffle: false })).toHaveLength(4)
  })

  it('limits and shuffles deterministically with an injected random source', () => {
    const ids = buildSession(questions, records, { size: 2, shuffle: true }, () => 0)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
  })
})
