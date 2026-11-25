import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { type MarkdownQuestionInput, parseMarkdownQuestions, questionsToMarkdown } from './markdown'

describe('parseMarkdownQuestions', () => {
  it('reads metadata, heading and answer', () => {
    const md = [
      '# Go 基础',
      '',
      'Intro text is ignored.',
      '',
      '<!-- id: basics-001; difficulty: 初级; tags: slice, 数组、array; source: 高频 -->',
      '# slice 和数组有什么区别？',
      '',
      '## 区别',
      '',
      '数组定长。',
    ].join('\n')

    expect(parseMarkdownQuestions(md)).toEqual({
      questions: [
        {
          id: 'basics-001',
          difficulty: 1,
          question: 'slice 和数组有什么区别？',
          answer: '## 区别\n\n数组定长。',
          tags: ['slice', '数组', 'array'],
          source: '高频',
          __line: 5,
        },
      ],
      issues: [],
    })
  })

  it('splits a multi-line question at the answer marker and ignores markers in code', () => {
    const md = [
      '<!-- id: q1 | difficulty: 2 -->',
      '# 以下代码输出什么？',
      '',
      '```go',
      '<!-- id: fake; difficulty: 1 -->',
      '<!-- answer -->',
      '```',
      '',
      '<!-- answer -->',
      '',
      '输出 6。',
      '',
      '<!-- id: q2; difficulty: 3 -->',
      '# 第二题',
      '答案二',
    ].join('\n')

    const { questions, issues } = parseMarkdownQuestions(md)
    expect(issues).toEqual([])
    expect(questions.map((q) => q.id)).toEqual(['q1', 'q2'])
    expect(questions[0].question).toBe(
      '以下代码输出什么？\n\n```go\n<!-- id: fake; difficulty: 1 -->\n<!-- answer -->\n```',
    )
    expect(questions[0].answer).toBe('输出 6。')
    expect(questions[1]).toMatchObject({ question: '第二题', answer: '答案二', difficulty: 3 })
  })

  it('keeps a trailing # that is part of the question', () => {
    const { questions } = parseMarkdownQuestions('<!-- id: a; difficulty: 1 -->\n# 什么是 C#\nx')
    expect(questions[0].question).toBe('什么是 C#')
  })

  it('reports blocks it cannot read', () => {
    const md = [
      '<!-- id: a; difficulty: 1 -->',
      '没有标题',
      '<!-- id: b; difficulty: 9 -->',
      '# 难度不对',
      'x',
    ].join('\n')
    const { questions, issues } = parseMarkdownQuestions(md)
    expect(questions).toEqual([])
    expect(issues.map((i) => i.line)).toEqual([1, 3])
  })

  it('reports a file without any question', () => {
    expect(parseMarkdownQuestions('# Just a title').issues).toHaveLength(1)
  })
})

describe('questionsToMarkdown', () => {
  it('round-trips every official question', () => {
    const root = join(process.cwd(), 'public/banks')
    const questions: MarkdownQuestionInput[] = readdirSync(root)
      .filter((file) => file.startsWith('iface.') && file.endsWith('.json'))
      .flatMap((file) => JSON.parse(readFileSync(join(root, file), 'utf8')).modules)
      .flatMap((mod: { questions: MarkdownQuestionInput[] }) => mod.questions)
      .map(({ id, difficulty, question, answer, tags, source }) => ({
        id,
        difficulty,
        question: question.trim(),
        answer: answer.trim(),
        tags,
        source,
      }))
    expect(questions.length).toBeGreaterThan(1000)

    const { questions: parsed, issues } = parseMarkdownQuestions(
      questionsToMarkdown(questions, 'All'),
    )
    expect(issues).toEqual([])
    expect(parsed.map(({ __line, ...q }) => q)).toEqual(questions)
  })

  it('refuses answers that would start a new question', () => {
    expect(() =>
      questionsToMarkdown([
        { id: 'a', difficulty: 1, question: 'q', answer: '<!-- id: b; difficulty: 1 -->' },
      ]),
    ).toThrow()
  })

  it('adds the answer marker when the answer itself contains one', () => {
    const input = {
      id: 'a',
      difficulty: 1 as const,
      question: 'q',
      answer: 'x\n<!-- answer -->\ny',
      tags: [],
    }
    const { questions } = parseMarkdownQuestions(questionsToMarkdown([input]))
    expect(questions[0]).toMatchObject({ question: 'q', answer: input.answer })
  })
})
