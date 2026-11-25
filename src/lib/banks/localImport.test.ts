import { describe, expect, it } from 'vitest'
import { emptyLocalBank, fitQuestion, type ImportQuestion, mergeIntoBank } from './localImport'

const item = (overrides: Partial<ImportQuestion> = {}): ImportQuestion => ({
  module: 'React',
  difficulty: 2,
  question: 'useEffect 什么时候执行？',
  answer: '渲染提交之后。',
  tags: ['hooks'],
  ...overrides,
})

describe('fitQuestion', () => {
  it('rejects invalid difficulty and empty text', () => {
    expect(fitQuestion(item({ difficulty: 4 }), 'a')).toEqual({
      error: 'difficulty 只能是 1、2 或 3',
    })
    expect(fitQuestion(item({ answer: '  ' }), 'a')).toEqual({ error: '答案不能为空' })
  })

  it('trims tags and source to the package limits', () => {
    const tags = Array.from({ length: 12 }, (_, i) => `t${i}`)
    const result = fitQuestion(item({ tags: [...tags, 't0', ' '], source: 'x'.repeat(40) }), 'a')
    if ('error' in result) throw new Error(result.error)
    expect(result.question.tags).toHaveLength(10)
    expect(result.question.source).toHaveLength(30)
    expect(result.warnings).toHaveLength(1)
  })
})

describe('mergeIntoBank', () => {
  it('creates modules by name and gives questions stable ids', () => {
    const result = mergeIntoBank(emptyLocalBank('面经'), [
      item(),
      item({ module: '网络', question: 'TCP 三次握手？', answer: '同步序号。' }),
      item({ id: 'My Own_ID', question: '自带 id', answer: 'a' }),
    ])
    expect(result.added).toBe(3)
    expect(result.errors).toEqual([])
    expect(result.bank.modules.map((mod) => [mod.id, mod.name, mod.questions.length])).toEqual([
      ['react', 'React', 2],
      ['m2', '网络', 1],
    ])
    expect(result.bank.modules[0].questions[1].id).toBe('my-own_id')
    expect(result.bank.modules[0].questions[0].id).toMatch(/^q-[a-z0-9]+$/)
    expect(result.bank.questionCount).toBe(3)
  })

  it('updates questions with the same id or the same text instead of duplicating', () => {
    const first = mergeIntoBank(emptyLocalBank('x'), [item(), item({ id: 'k', question: 'Q2' })])
    const second = mergeIntoBank(first.bank, [
      item({ question: ' useEffect   什么时候执行？', answer: '新答案' }),
      item({ id: 'k', module: '其他', question: 'Q2 改', answer: 'b' }),
    ])
    expect(second.added).toBe(0)
    expect(second.updated).toBe(2)
    expect(second.bank.questionCount).toBe(2)
    expect(second.bank.modules.map((mod) => mod.name)).toEqual(['React', '其他'])
    expect(second.bank.modules[0].questions[0].answer).toBe('新答案')
    expect(second.bank.modules[1].questions[0]).toMatchObject({ id: 'k', question: 'Q2 改' })
  })

  it('reports invalid questions by index and keeps the rest', () => {
    const result = mergeIntoBank(emptyLocalBank('x'), [item({ difficulty: 0 }), item()])
    expect(result.errors).toEqual([{ index: 0, message: 'difficulty 只能是 1、2 或 3' }])
    expect(result.added).toBe(1)
  })
})
