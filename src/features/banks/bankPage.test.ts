import { describe, expect, it } from 'vitest'
import type { ResolvedBank } from '@/data/bank/validate'
import { bankHomepage, diffSummary, issueText, sampleQuestions } from './bankPage'

const q = (id: string) => ({ id, difficulty: 1 as const, question: id, answer: 'a', tags: [] })

describe('bank page helpers', () => {
  it('links GitHub banks to the repository and sub folders to the installed commit', () => {
    const sha = 'a'.repeat(40)
    expect(bankHomepage({ origin: { kind: 'github', owner: 'o', repo: 'r', sha } })).toBe(
      'https://github.com/o/r',
    )
    expect(
      bankHomepage({ origin: { kind: 'github', owner: 'o', repo: 'r', sha, path: 'go' } }),
    ).toBe(`https://github.com/o/r/tree/${sha}/go`)
    expect(bankHomepage({ origin: { kind: 'local' } })).toBeNull()
    expect(bankHomepage({ origin: { kind: 'local' }, homepage: 'https://x.dev' })).toBe(
      'https://x.dev',
    )
  })

  it('summarises a diff', () => {
    expect(diffSummary({ added: ['a'], changed: [], removed: ['b', 'c'], unchanged: 3 })).toBe(
      '新增 1 题 · 移除 2 题',
    )
    expect(diffSummary({ added: [], changed: [], removed: [], unchanged: 3 })).toBe(
      '题目内容没有变化',
    )
  })

  it('samples questions across modules', () => {
    const bank = {
      modules: [
        { id: 'a', name: 'A', questions: [q('a1'), q('a2')] },
        { id: 'b', name: 'B', questions: [q('b1')] },
      ],
    } as unknown as ResolvedBank
    expect(sampleQuestions(bank).map((item) => item.question)).toEqual(['a1', 'b1', 'a2'])
    expect(sampleQuestions(bank, 10)).toHaveLength(3)
  })

  it('formats issues with their location', () => {
    expect(
      issueText({ level: 'error', code: 'x', message: '缺少答案', file: 'q.md', line: 3 }),
    ).toBe('q.md 第 3 行：缺少答案')
    expect(issueText({ level: 'warning', code: 'x', message: '没有协议' })).toBe('没有协议')
  })
})
