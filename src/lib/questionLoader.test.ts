import { describe, expect, it } from 'vitest'
import type { Question } from '@/types'
import { findBuiltinReplacementId } from './questionLoader'

function q(id: string, module: string, question: string, answer = 'a'): Question {
  return { id, module, question, answer, difficulty: 2, tags: [] } as Question
}

const builtin = [
  q('js-001', 'JS基础', 'var、let、const 的区别是什么？', '作用域不同'),
  q('react-001', 'React', '什么是虚拟 DOM？', 'VDOM'),
]
const byId = new Map(builtin.map((b) => [b.id, b]))
const byLength = builtin.map((b) => b.id).sort((a, b) => b.length - a.length)
const byText = new Map(
  builtin.map((b) => [`${b.module}\u0000${b.question.toLowerCase().replace(/\s+/g, '')}`, b.id]),
)

const find = (question: Question) => findBuiltinReplacementId(question, byId, byLength, byText)

describe('findBuiltinReplacementId', () => {
  it('matches a re-imported copy of a built-in question', () => {
    expect(find(q('custom_frontend_js-001', 'JS基础', 'var、let、const 的区别是什么？'))).toBe(
      'js-001',
    )
  })

  it('matches an older copy whose question changed but answer did not', () => {
    expect(find(q('custom_old_js-001', 'JS基础', 'var/let/const 区别', '作用域不同'))).toBe(
      'js-001',
    )
  })

  it('matches by module and question text regardless of id', () => {
    expect(find(q('custom_x_whatever', 'React', ' 什么是 虚拟 DOM？ '))).toBe('react-001')
  })

  it('does not treat an unrelated question with a colliding id as a duplicate', () => {
    expect(find(q('custom_我的整理_js-001', 'JS基础', '什么是闭包？', '闭包是…'))).toBeNull()
  })

  it('ignores id matches in a different module', () => {
    expect(find(q('custom_x_js-001', 'React', 'var、let、const 的区别是什么？'))).toBeNull()
  })
})
