import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checksToMarkdown, parseChecksMarkdown } from './checksMarkdown'
import { BANK_FORMAT } from './schema'
import { resolveBank } from './validate'

const sample = [
  '# 标题会被忽略',
  '',
  '## basics-001',
  '',
  '### Q1 single | 数组类型',
  '',
  '下面哪个对？',
  '',
  '```go',
  '- [x] A. 这一行在代码里，不是选项',
  '**解释**：也不是解释',
  '```',
  '',
  '- [ ] A. 错的',
  '- [x] B. 对的',
  '',
  '**解释**：因为……',
  '第二行解释',
  '',
  '### Q2 multiple',
  '多选',
  '- [x] A. 一',
  '- [x] B. 二',
  '- [ ] C. 三',
  '**解析**: 都对',
].join('\n')

describe('parseChecksMarkdown', () => {
  it('reads checks grouped by question', () => {
    const { byQuestion, issues } = parseChecksMarkdown(sample)
    expect(issues).toEqual([])
    const checks = byQuestion.get('basics-001')?.checks ?? []
    expect(checks.map(({ line, ...check }) => check)).toEqual([
      {
        id: 'basics-001-check-01',
        kind: 'single',
        focus: '数组类型',
        prompt:
          '下面哪个对？\n\n```go\n- [x] A. 这一行在代码里，不是选项\n**解释**：也不是解释\n```',
        options: [
          { id: 'a', text: '错的' },
          { id: 'b', text: '对的' },
        ],
        answerIds: ['b'],
        explanation: '因为……\n第二行解释',
      },
      {
        id: 'basics-001-check-02',
        kind: 'multiple',
        focus: '',
        prompt: '多选',
        options: [
          { id: 'a', text: '一' },
          { id: 'b', text: '二' },
          { id: 'c', text: '三' },
        ],
        answerIds: ['a', 'b'],
        explanation: '都对',
      },
    ])
  })

  it('reports checks outside a question and repeated questions', () => {
    const { issues } = parseChecksMarkdown('### Q1 single\nx\n## a\n## a')
    expect(issues.map((i) => i.line)).toEqual([1, 4])
  })

  it('round-trips every official learning check', () => {
    const root = join(process.cwd(), 'public/learning-checks')
    const groups = readdirSync(root, { recursive: true })
      .map(String)
      .filter((file) => file.endsWith('.json'))
      .flatMap((file) => JSON.parse(readFileSync(join(root, file), 'utf8')))
    expect(groups.length).toBeGreaterThan(300)

    const { byQuestion, issues } = parseChecksMarkdown(checksToMarkdown(groups))
    expect(issues).toEqual([])
    const parsed = [...byQuestion].map(([questionId, group]) => ({
      questionId,
      checks: group.checks.map(({ line, ...check }) => check),
    }))
    expect(parsed).toEqual(groups)
  })
})

describe('module checks files', () => {
  const manifest = (checks: string) =>
    JSON.stringify({
      format: BANK_FORMAT,
      name: 'x',
      version: '1.0.0',
      license: 'MIT',
      modules: [
        {
          id: 'm',
          name: 'M',
          questions: [
            { id: 'basics-001', difficulty: 1, question: 'q', answer: 'a' },
            {
              id: 'inline',
              difficulty: 1,
              question: 'q',
              answer: 'a',
              checks: [
                {
                  id: 'c',
                  kind: 'single',
                  prompt: 'p',
                  options: [
                    { id: 'a', text: 'A' },
                    { id: 'b', text: 'B' },
                  ],
                  answerIds: ['a'],
                  explanation: 'e',
                },
              ],
            },
          ],
          checks,
        },
      ],
    })

  it('attaches checks to the module questions', async () => {
    const result = await resolveBank(manifest('checks/m.md'), async () => sample)
    expect(result.issues).toEqual([])
    expect(result.bank?.files).toEqual(['iface-bank.json', 'checks/m.md'])
    expect(result.bank?.modules[0].questions[0].checks).toHaveLength(2)
  })

  it('reports orphaned, conflicting and invalid checks', async () => {
    const md = [
      '## nope',
      '### Q1 single',
      'p',
      '- [x] A. a',
      '- [ ] B. b',
      '**解释**：e',
      '## inline',
      '### Q1 single',
      'p',
      '## basics-001',
      '### Q1 single',
      'p',
      '- [x] A. a',
      '- [x] B. b',
      '**解释**：e',
    ].join('\n')
    const result = await resolveBank(manifest('checks/m.md'), async () => md)
    expect(result.issues.map((i) => [i.code, i.line])).toEqual([
      ['check-orphan', 1],
      ['check-conflict', 7],
      ['check-invalid', 11],
    ])
    expect(result.bank?.modules[0].questions[0].checks).toBeUndefined()
  })

  it('only accepts markdown paths', async () => {
    const result = await resolveBank(manifest('checks/m.json'))
    expect(result.issues.map((i) => i.code)).toEqual(['manifest-invalid'])
  })
})
