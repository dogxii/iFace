import { describe, expect, it } from 'vitest'
import type { CategoryMap } from './db'
import { filterVisibleQuestions, getHiddenModules } from './questionVisibility'

const categories = {
  前端: { modules: ['JS基础', 'React'] },
  Golang: { modules: ['并发'] },
} as unknown as CategoryMap

describe('question visibility', () => {
  it('collects modules of hidden categories only', () => {
    expect([...getHiddenModules(categories, new Set(['Golang']))]).toEqual(['并发'])
    expect(getHiddenModules(categories, new Set()).size).toBe(0)
  })

  it('filters out questions in hidden modules', () => {
    const questions = [{ module: 'React' }, { module: '并发' }, { module: '自定义' }]
    expect(filterVisibleQuestions(questions, new Set(['并发']))).toEqual([
      { module: 'React' },
      { module: '自定义' },
    ])
  })

  it('returns the same array when nothing is hidden', () => {
    const questions = [{ module: 'React' }]
    expect(filterVisibleQuestions(questions, new Set())).toBe(questions)
  })
})
