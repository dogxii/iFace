import { describe, expect, it } from 'vitest'
import type { Question, QuestionNote, StudyRecordMap } from '@/types'
import {
  buildListParams,
  hasActiveFilters,
  noteSnippet,
  parseListQuery,
  relativeTime,
  runListQuery,
} from './listQuery'

const q = (
  id: string,
  module: string,
  difficulty: 1 | 2 | 3,
  question: string,
  tags: string[] = [],
): Question => ({
  id,
  module,
  difficulty,
  question,
  answer: '',
  tags,
})
const questions = [
  q('a', 'React', 1, 'useEffect 的执行时机', ['hooks']),
  q('b', 'React', 3, 'Fiber 架构是什么'),
  q('c', 'Go', 2, 'channel 的底层结构', ['并发']),
]
const records: StudyRecordMap = {
  a: { questionId: 'a', status: 'mastered', lastUpdated: 10, reviewCount: 0 },
  c: { questionId: 'c', status: 'review', lastUpdated: 20, reviewCount: 1 },
}
const notes = new Map<string, QuestionNote>([
  ['b', { questionId: 'b', content: '## 要点\n可中断的**记忆**渲染', createdAt: 0, updatedAt: 5 }],
])
const ctx = { records, notes, starred: new Set(['c']) }

describe('list query params', () => {
  it('round-trips through the URL and ignores invalid values', () => {
    const params = new URLSearchParams(
      'module=React,Go&difficulty=1,9&status=review,bogus&starred=1&q= fiber &sort=nope',
    )
    const query = parseListQuery(params)
    expect(query).toEqual({
      modules: ['React', 'Go'],
      difficulties: [1],
      statuses: ['review'],
      starredOnly: true,
      notesOnly: false,
      search: ' fiber ',
      sort: 'default',
    })
    expect(buildListParams(query).toString()).toBe(
      'module=React%2CGo&difficulty=1&status=review&starred=1&q=fiber',
    )
    expect(hasActiveFilters(parseListQuery(new URLSearchParams('sort=module')))).toBe(false)
  })
})

describe('runListQuery', () => {
  const base = parseListQuery(new URLSearchParams())

  it('filters by module, difficulty, status and flags', () => {
    expect(
      runListQuery(questions, { ...base, modules: ['React'] }, ctx).questions.map((x) => x.id),
    ).toEqual(['a', 'b'])
    expect(
      runListQuery(questions, { ...base, difficulties: [2, 3] }, ctx).questions.map((x) => x.id),
    ).toEqual(['b', 'c'])
    expect(
      runListQuery(questions, { ...base, statuses: ['unlearned'] }, ctx).questions.map((x) => x.id),
    ).toEqual(['b'])
    expect(
      runListQuery(questions, { ...base, starredOnly: true }, ctx).questions.map((x) => x.id),
    ).toEqual(['c'])
    expect(
      runListQuery(questions, { ...base, notesOnly: true }, ctx).questions.map((x) => x.id),
    ).toEqual(['b'])
  })

  it('searches questions, tags and notes, reporting note hits', () => {
    expect(
      runListQuery(questions, { ...base, search: 'HOOKS' }, ctx).questions.map((x) => x.id),
    ).toEqual(['a'])
    const viaNote = runListQuery(questions, { ...base, search: '记忆' }, ctx)
    expect(viaNote.questions.map((x) => x.id)).toEqual(['b'])
    expect(viaNote.noteHits.get('b')).toBe('要点 可中断的 记忆 渲染')
  })

  it('sorts by difficulty and recency', () => {
    expect(
      runListQuery(questions, { ...base, sort: 'difficulty-desc' }, ctx).questions.map((x) => x.id),
    ).toEqual(['b', 'c', 'a'])
    expect(
      runListQuery(questions, { ...base, sort: 'recent' }, ctx).questions.map((x) => x.id),
    ).toEqual(['c', 'a', 'b'])
  })
})

describe('helpers', () => {
  it('builds note snippets around the keyword', () => {
    expect(noteSnippet('`code` text', '')).toBe('code text')
    expect(noteSnippet(`${'前'.repeat(60)}关键词${'后'.repeat(100)}`, '关键词')).toMatch(
      /^…前+关键词后+…$/,
    )
  })

  it('formats relative times', () => {
    const now = new Date(2026, 10, 20, 12).getTime()
    expect(relativeTime(now - 10_000, now)).toBe('刚刚')
    expect(relativeTime(now - 3 * 3_600_000, now)).toBe('3 小时前')
    expect(relativeTime(now - 30 * 3_600_000, now)).toBe('昨天')
    expect(relativeTime(now - 5 * 86_400_000, now)).toBe('5 天前')
    expect(relativeTime(new Date(2026, 9, 2).getTime(), now)).toBe('10月2日')
  })
})
