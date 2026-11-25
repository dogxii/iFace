import { describe, expect, it } from 'vitest'
import type { Question } from '@/types'
import { filterCommands, searchQuestions } from './paletteSearch'

function q(id: string, question: string, tags: string[] = [], module = 'JS基础'): Question {
  return { id, question, tags, module, difficulty: 1, answer: '' } as unknown as Question
}

const BANK = [
  q('js-001', '什么是闭包？', ['闭包', '作用域']),
  q('js-002', '闭包和内存泄漏有什么关系？', ['闭包']),
  q('react-001', 'React Hooks 的规则是什么？', ['Hooks'], 'React'),
  q('go-001', 'Goroutine 和线程的区别', ['并发'], 'Go基础'),
]

describe('searchQuestions', () => {
  it('returns nothing for an empty query', () => {
    expect(searchQuestions(BANK, '   ')).toEqual([])
  })

  it('ranks an exact id above everything else', () => {
    expect(searchQuestions(BANK, 'react-001')[0].id).toBe('react-001')
  })

  it('matches the id inside a bank-scoped key', () => {
    const scoped = [q('iface.frontend:js-001', '什么是闭包？'), q('iface.frontend:js-0011', '别的')]
    expect(searchQuestions(scoped, 'js-001')[0].id).toBe('iface.frontend:js-001')
  })

  it('prefers title prefix over substring, then shorter titles', () => {
    const ids = searchQuestions(BANK, '闭包').map((x) => x.id)
    expect(ids).toEqual(['js-002', 'js-001'])
  })

  it('requires every term to match', () => {
    expect(searchQuestions(BANK, '闭包 内存').map((x) => x.id)).toEqual(['js-002'])
    expect(searchQuestions(BANK, '闭包 goroutine')).toEqual([])
  })

  it('matches tags and modules case-insensitively', () => {
    expect(searchQuestions(BANK, 'hooks').map((x) => x.id)).toEqual(['react-001'])
    expect(searchQuestions(BANK, 'go基础').map((x) => x.id)).toEqual(['go-001'])
  })

  it('respects the limit', () => {
    expect(searchQuestions(BANK, 'js', 1)).toHaveLength(1)
  })
})

describe('filterCommands', () => {
  const commands = [
    { id: 'a', label: '打开设置', keywords: ['settings'] },
    { id: 'b', label: '切换暗色', keywords: ['theme', 'dark'] },
  ]

  it('returns every command for an empty query', () => {
    expect(filterCommands(commands, '')).toEqual(commands)
  })

  it('matches labels and keywords', () => {
    expect(filterCommands(commands, '设置').map((c) => c.id)).toEqual(['a'])
    expect(filterCommands(commands, 'DARK').map((c) => c.id)).toEqual(['b'])
  })
})
