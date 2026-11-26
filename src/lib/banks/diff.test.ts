import { describe, expect, it } from 'vitest'
import type { ResolvedBank } from '@/data/bank/validate'
import type { Question } from '@/types'
import { diffBank, diffIsEmpty } from './diff'

const bank = (questions: { id: string; answer?: string }[]): ResolvedBank => ({
  name: 'B',
  version: '1.0.0',
  license: 'MIT',
  authors: [],
  language: 'zh-CN',
  tags: [],
  modules: [
    {
      id: 'm',
      name: 'M',
      questions: questions.map((q) => ({
        id: q.id,
        difficulty: 1,
        question: `Q ${q.id}`,
        answer: q.answer ?? 'A',
        tags: [],
      })),
    },
  ],
  questionCount: questions.length,
  bytes: 0,
  files: [],
})

const stored = (id: string, answer = 'A'): Question => ({
  id: `gh.a.b:${id}`,
  bankId: 'gh.a.b',
  moduleKey: 'gh.a.b/m',
  module: 'M',
  difficulty: 1,
  question: `Q ${id}`,
  answer,
  tags: [],
  position: 0,
})

describe('diffBank', () => {
  it('sorts questions into added, changed, removed and unchanged', () => {
    const diff = diffBank(
      'gh.a.b',
      [stored('q1'), stored('q2'), stored('q3')],
      [],
      bank([{ id: 'q1' }, { id: 'q2', answer: 'new' }, { id: 'q4' }]),
    )
    expect(diff).toEqual({
      added: ['gh.a.b:q4'],
      changed: ['gh.a.b:q2'],
      removed: ['gh.a.b:q3'],
      unchanged: 1,
    })
    expect(diffIsEmpty(diff)).toBe(false)
  })

  it('notices changed learning checks and reports nothing for identical content', () => {
    const next = bank([{ id: 'q1' }])
    expect(diffIsEmpty(diffBank('gh.a.b', [stored('q1')], [], next))).toBe(true)
    const withChecks = diffBank(
      'gh.a.b',
      [stored('q1')],
      [{ questionId: 'gh.a.b:q1', bankId: 'gh.a.b', checks: [] }],
      {
        ...next,
        modules: [
          {
            ...next.modules[0],
            questions: [
              {
                ...next.modules[0].questions[0],
                checks: [
                  {
                    id: 'c1',
                    kind: 'single',
                    prompt: 'P',
                    options: [
                      { id: 'a', text: 'A' },
                      { id: 'b', text: 'B' },
                    ],
                    answerIds: ['a'],
                    explanation: 'E',
                  },
                ],
              },
            ],
          },
        ],
      } as ResolvedBank,
    )
    expect(withChecks.changed).toEqual(['gh.a.b:q1'])
  })
})
