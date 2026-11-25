import { describe, expect, it } from 'vitest'
import {
  detectPasteFormat,
  parseImportText,
  sourceNameFromFile,
  toImportQuestions,
} from './importData'

describe('import helpers', () => {
  it('detects JSON vs Markdown', () => {
    expect(detectPasteFormat('  [{"id":1}]')).toBe('json')
    expect(detectPasteFormat('{"questions":[]}')).toBe('json')
    expect(detectPasteFormat('## Q: 题目')).toBe('markdown')
  })

  it('parses JSON question arrays and wrapped objects', () => {
    const item = { module: 'React', difficulty: 1, question: 'Q', answer: 'A' }
    expect(parseImportText(JSON.stringify([item, item]))).toMatchObject({
      ok: true,
      kind: 'questions',
      count: 2,
    })
    expect(parseImportText(JSON.stringify({ questions: [item] }))).toMatchObject({ count: 1 })
    expect(parseImportText('{"x":1}')).toMatchObject({ ok: false })
  })

  it('recognises an iface-bank package', () => {
    const pkg = {
      format: 'iface-bank@1',
      name: '我的包',
      version: '1.0.0',
      license: 'MIT',
      modules: [{ id: 'a', name: 'A', questions: [{}, {}] }],
    }
    expect(parseImportText(JSON.stringify(pkg))).toMatchObject({
      ok: true,
      kind: 'package',
      name: '我的包',
      count: 2,
    })
  })

  it('reports invalid JSON', () => {
    const result = parseImportText('[{"a":')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toContain('JSON 解析失败')
  })

  it('parses the AI prompt Markdown and reports when nothing is found', () => {
    const md = '## Q: 闭包？\n**模块**: js\n\n答案'
    expect(parseImportText(md)).toMatchObject({
      ok: true,
      format: 'markdown',
      count: 1,
      skipped: [],
    })
    const partial = parseImportText(`${md}\n\n---\n\n## 没模块\n\n答案`)
    expect(partial).toMatchObject({ ok: true, count: 1 })
    if (partial.ok && partial.kind === 'questions') expect(partial.skipped[0]).toContain('缺少模块')
    expect(parseImportText('随便写写')).toMatchObject({ ok: false, format: 'markdown' })
  })

  it('parses iface-bank Markdown into the fallback module', () => {
    const md = '<!-- id: closure; difficulty: 2; tags: js -->\n# 什么是闭包？\n\n函数和词法环境。\n'
    const result = parseImportText(md, 'markdown', '面经')
    expect(result).toMatchObject({ ok: true, kind: 'questions', count: 1 })
    if (result.ok && result.kind === 'questions') {
      expect(result.questions[0]).toMatchObject({
        id: 'closure',
        module: '面经',
        difficulty: 2,
        question: '什么是闭包？',
        tags: ['js'],
      })
    }
  })

  it('skips items without text and fills in defaults', () => {
    const { questions, skipped } = toImportQuestions(
      [{ question: 'Q', answer: 'A' }, { question: 'Q' }, 3],
      '默认',
    )
    expect(questions).toEqual([
      { module: '默认', difficulty: 2, question: 'Q', answer: 'A', tags: [] },
    ])
    expect(skipped).toEqual(['第 2 题：缺少 answer', '第 3 题：不是对象'])
  })

  it('derives names from file names', () => {
    expect(sourceNameFromFile('字节面经.md')).toBe('字节面经')
    expect(sourceNameFromFile('go.JSON')).toBe('go')
  })
})
