import { describe, expect, it } from 'vitest'
import { normalizeQuestionsForImport, validateQuestions } from './schema'

const base = {
  module: 'JS基础',
  difficulty: 2,
  question: '什么是闭包？',
  answer: '函数与其词法环境的组合。',
}

describe('normalizeQuestionsForImport', () => {
  it('returns non-array input unchanged', () => {
    expect(normalizeQuestionsForImport({ a: 1 })).toEqual({ a: 1 })
  })

  it('trims existing ids and defaults tags to an empty array', () => {
    const [item] = normalizeQuestionsForImport([{ ...base, id: '  q-1  ' }]) as Record<
      string,
      unknown
    >[]
    expect(item.id).toBe('q-1')
    expect(item.tags).toEqual([])
  })

  it('generates stable ids for items without one', () => {
    const first = normalizeQuestionsForImport([base]) as { id: string }[]
    const second = normalizeQuestionsForImport([base]) as { id: string }[]
    expect(first[0].id).toMatch(/^auto-1-/)
    expect(first[0].id).toBe(second[0].id)
  })

  it('generates different ids for different content', () => {
    const [a, b] = normalizeQuestionsForImport([base, { ...base, question: '另一题' }]) as {
      id: string
    }[]
    expect(a.id).not.toBe(b.id)
  })
})

describe('validateQuestions', () => {
  it('rejects a non-array top level', () => {
    const result = validateQuestions({})
    expect(result.valid).toHaveLength(0)
    expect(result.errors[0].index).toBe(-1)
  })

  it('splits valid and invalid entries with field paths in messages', () => {
    const data = normalizeQuestionsForImport([
      base,
      { ...base, difficulty: 5 },
      { ...base, answer: '' },
    ])
    const result = validateQuestions(data)
    expect(result.valid).toHaveLength(1)
    expect(result.errors.map((e) => e.index)).toEqual([1, 2])
    expect(result.errors[0].message).toContain('difficulty')
    expect(result.errors[1].message).toContain('answer')
  })
})
