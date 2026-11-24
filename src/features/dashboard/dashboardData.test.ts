import { describe, expect, it } from 'vitest'
import type { CategoryMap } from '@/lib/db'
import type { Question, StudyRecordMap } from '@/types'
import {
  activityCalendar,
  greeting,
  idsInModuleOrder,
  lastStudiedQuestion,
  moduleProgress,
  progressCounts,
} from './dashboardData'

const q = (id: string, module: string): Question => ({
  id,
  module,
  difficulty: 1,
  question: id,
  answer: '',
  tags: [],
})

const NOW = new Date(2026, 10, 20, 15).getTime()
const DAY = 86_400_000
const questions = [q('a', 'React'), q('b', 'React'), q('c', 'Go'), q('d', 'Custom')]
const records: StudyRecordMap = {
  a: { questionId: 'a', status: 'mastered', lastUpdated: NOW - 2 * DAY, reviewCount: 0 },
  b: { questionId: 'b', status: 'review', lastUpdated: NOW - DAY, reviewCount: 1 },
  c: { questionId: 'c', status: 'mastered', lastUpdated: NOW - 30 * DAY, reviewCount: 0 },
  hidden: { questionId: 'hidden', status: 'mastered', lastUpdated: NOW, reviewCount: 0 },
}

describe('dashboard data', () => {
  it('orders daily candidates by module display order, keeping order within a module', () => {
    const mixed = [q('agent-1', 'Agent'), q('js-2', 'JS'), q('js-1', 'JS'), q('x', 'Custom')]
    expect(idsInModuleOrder(mixed, ['JS', 'Agent'])).toEqual(['js-2', 'js-1', 'agent-1', 'x'])
  })

  it('counts progress over visible questions only', () => {
    expect(progressCounts(questions, records, NOW)).toEqual({
      total: 4,
      mastered: 2,
      review: 1,
      unlearned: 1,
      masteredThisWeek: 1,
    })
  })

  it('orders modules by category order and skips hidden categories', () => {
    const categories = {
      Go: { name: 'Go', modules: ['Go'], builtin: true, order: 2 },
      前端: { name: '前端', modules: ['React'], builtin: true, order: 1 },
      Java: { name: 'Java', modules: ['Spring'], builtin: true, order: 3 },
    } as CategoryMap
    const result = moduleProgress(questions, records, categories, new Set(['Java']))
    expect(result.map((m) => m.module)).toEqual(['React', 'Go', 'Custom'])
    expect(result[0]).toEqual({ module: 'React', total: 2, mastered: 1, review: 1 })
  })

  it('finds the most recently studied visible question', () => {
    expect(lastStudiedQuestion(questions, records)?.id).toBe('b')
    expect(lastStudiedQuestion([], records)).toBeUndefined()
  })

  it('builds an activity calendar ending today', () => {
    const days = activityCalendar(
      records,
      [{ questionId: 'a', content: 'x', createdAt: 0, updatedAt: NOW }],
      NOW,
      4,
    )
    expect(days.at(-1)?.date).toBe('2026-11-20')
    expect(days.at(-1)?.count).toBe(2) // hidden record + note today
    expect(days.at(-1)?.level).toBe(4)
    expect(days.find((d) => d.date === '2026-11-19')?.count).toBe(1)
    // 4 weeks, last column partially filled up to Friday (Mon-based weeks)
    expect(days).toHaveLength(4 * 7 - 2)
  })

  it('greets by time of day', () => {
    expect(greeting(8)).toBe('早上好')
    expect(greeting(15)).toBe('下午好')
    expect(greeting(22)).toBe('晚上好')
  })
})
