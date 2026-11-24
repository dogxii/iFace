import { describe, expect, it } from 'vitest'
import { BANK_FORMAT, BANK_LIMITS, bankJsonSchema } from './schema'
import { bankIsValid, resolveBank } from './validate'

const question = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  difficulty: 2,
  question: `问题 ${id}`,
  answer: `答案 ${id}`,
  ...extra,
})

const manifest = (extra: Record<string, unknown> = {}) => ({
  format: BANK_FORMAT,
  name: 'Go 后端',
  version: '1.0.0',
  license: 'CC-BY-4.0',
  modules: [{ id: 'basics', name: 'Go基础', questions: [question('a'), question('b')] }],
  ...extra,
})

const files = (map: Record<string, string>) => async (path: string) => {
  if (!(path in map)) throw new Error('missing')
  return map[path]
}

describe('resolveBank', () => {
  it('resolves an inline single-file bank with defaults', async () => {
    const result = await resolveBank(JSON.stringify(manifest()))
    expect(bankIsValid(result)).toBe(true)
    expect(result.bank).toMatchObject({
      name: 'Go 后端',
      authors: [],
      language: 'zh-CN',
      tags: [],
      questionCount: 2,
      files: ['iface-bank.json'],
    })
    expect(result.bank?.modules[0].questions[0].tags).toEqual([])
  })

  it('follows json and markdown file references', async () => {
    const text = JSON.stringify(
      manifest({
        modules: [
          { id: 'a', name: 'A', questions: 'questions/a.json' },
          { id: 'b', name: 'B', questions: 'questions/b.md' },
        ],
      }),
    )
    const result = await resolveBank(
      text,
      files({
        'questions/a.json': JSON.stringify([question('a1')]),
        'questions/b.md': '<!-- id: b1; difficulty: 3; tags: x -->\n# 题目\n答案',
      }),
    )
    expect(result.issues).toEqual([])
    expect(result.bank?.files).toEqual(['iface-bank.json', 'questions/a.json', 'questions/b.md'])
    expect(result.bank?.modules[1].questions[0]).toMatchObject({
      id: 'b1',
      difficulty: 3,
      tags: ['x'],
    })
  })

  it('skips invalid and duplicate questions but keeps the bank', async () => {
    const result = await resolveBank(
      JSON.stringify(
        manifest({
          modules: [
            {
              id: 'm',
              name: 'M',
              questions: [question('ok'), question('Bad ID'), question('ok'), { id: 'x' }],
            },
          ],
        }),
      ),
    )
    expect(result.bank?.questionCount).toBe(1)
    expect(bankIsValid(result)).toBe(false)
    const codes = result.issues.map((i) => i.code)
    expect(codes).toContain('question-invalid')
    expect(codes).toContain('question-duplicate')
    expect(result.issues.find((i) => i.code === 'question-duplicate')?.path).toBe(
      'modules[0].questions[2].id',
    )
  })

  it('points markdown problems at the line', async () => {
    const result = await resolveBank(
      JSON.stringify(manifest({ modules: [{ id: 'm', name: 'M', questions: 'q.md' }] })),
      files({
        'q.md': '<!-- id: ok; difficulty: 1 -->\n# Q\nA\n\n<!-- id: BAD; difficulty: 1 -->\n# Q\nA',
      }),
    )
    expect(result.issues).toMatchObject([{ code: 'question-invalid', file: 'q.md', line: 5 }])
  })

  it('validates learning checks', async () => {
    const check = {
      id: 'c1',
      kind: 'single',
      prompt: 'p',
      options: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
      answerIds: ['a', 'b'],
      explanation: 'e',
    }
    const result = await resolveBank(
      JSON.stringify(
        manifest({
          modules: [{ id: 'm', name: 'M', questions: [question('q', { checks: [check] })] }],
        }),
      ),
    )
    expect(result.issues.map((i) => i.message).join()).toContain('单选题只能有一个答案')
  })

  it('warns about unknown icons, colours and missing licences', async () => {
    const result = await resolveBank(
      JSON.stringify(
        manifest({
          license: 'NOASSERTION',
          modules: [
            { id: 'm', name: 'M', icon: 'rocket', color: 'teal', questions: [question('q')] },
          ],
        }),
      ),
    )
    expect(bankIsValid(result)).toBe(true)
    expect(result.issues.map((i) => i.code).sort()).toEqual([
      'license-missing',
      'module-icon-unknown',
    ])
    expect(result.bank?.modules[0]).toMatchObject({ color: 'teal' })
    expect(result.bank?.modules[0].icon).toBeUndefined()
  })

  it('rejects broken packages as a whole', async () => {
    const cases: [string, string, Parameters<typeof resolveBank>[1]?][] = [
      ['{', 'invalid-json'],
      [JSON.stringify(manifest({ format: 'iface-bank@2' })), 'manifest-invalid'],
      [JSON.stringify(manifest({ version: 'v1' })), 'manifest-invalid'],
      [
        JSON.stringify(manifest({ modules: [{ id: 'm', name: 'M', questions: '../x.json' }] })),
        'manifest-invalid',
      ],
      [
        JSON.stringify(manifest({ modules: [{ id: 'm', name: 'M', questions: 'x.json' }] })),
        'file-unavailable',
      ],
      [
        JSON.stringify(manifest({ modules: [{ id: 'm', name: 'M', questions: 'x.json' }] })),
        'file-missing',
        files({}),
      ],
      [
        JSON.stringify(manifest({ modules: [{ id: 'm', name: 'M', questions: 'x.json' }] })),
        'questions-not-array',
        files({ 'x.json': '{}' }),
      ],
      [
        JSON.stringify(manifest({ modules: [{ id: 'm', name: 'M', questions: [{}] }] })),
        'bank-empty',
      ],
    ]
    for (const [text, code, read] of cases) {
      const result = await resolveBank(text, read)
      expect(result.bank, code).toBeNull()
      expect(
        result.issues.map((i) => i.code),
        code,
      ).toContain(code)
    }
  })

  it('enforces size and count limits', async () => {
    const many = Array.from({ length: BANK_LIMITS.questions + 1 }, (_, i) => question(`q${i}`))
    const tooMany = await resolveBank(
      JSON.stringify(manifest({ modules: [{ id: 'm', name: 'M', questions: many }] })),
    )
    expect(tooMany.issues.map((i) => i.code)).toContain('too-many-questions')

    const big = 'x'.repeat(BANK_LIMITS.totalBytes)
    const tooBig = await resolveBank(
      JSON.stringify(manifest({ modules: [{ id: 'm', name: 'M', questions: 'a.md' }] })),
      files({ 'a.md': big }),
    )
    expect(tooBig.issues.map((i) => i.code)).toContain('too-large')
  })
})

describe('bankJsonSchema', () => {
  it('describes the published format', () => {
    const schema = bankJsonSchema() as {
      $id: string
      required: string[]
      properties: Record<string, unknown>
    }
    expect(schema.$id).toBe('https://face.dogxi.me/schema/iface-bank-1.json')
    expect(schema.required).toEqual(
      expect.arrayContaining(['format', 'name', 'version', 'license', 'modules']),
    )
    expect(JSON.stringify(schema.properties.modules)).toContain('chart-line')
  })
})
