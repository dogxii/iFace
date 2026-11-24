import { describe, expect, it } from 'vitest'
import type { Question } from '@/types'
import { countBySource, detectPasteFormat, parseImportText, sourceNameFromFile } from './importData'

describe('import helpers', () => {
  it('detects JSON vs Markdown', () => {
    expect(detectPasteFormat('  [{"id":1}]')).toBe('json')
    expect(detectPasteFormat('{"questions":[]}')).toBe('json')
    expect(detectPasteFormat('## Q: 题目')).toBe('markdown')
  })

  it('parses JSON arrays and wrapped objects with a count', () => {
    expect(parseImportText('[{"a":1},{"a":2}]')).toMatchObject({ ok: true, count: 2 })
    expect(parseImportText('{"questions":[{"a":1}]}')).toMatchObject({ ok: true, count: 1 })
    expect(parseImportText('{"x":1}')).toMatchObject({ ok: true, count: null })
  })

  it('reports invalid JSON', () => {
    const result = parseImportText('[{"a":')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toContain('JSON 解析失败')
  })

  it('parses Markdown and reports when nothing is found', () => {
    const md = '## Q: 闭包？\n**模块**: js\n\n答案'
    expect(parseImportText(md)).toMatchObject({
      ok: true,
      format: 'markdown',
      count: 1,
      skipped: [],
    })
    const partial = parseImportText(`${md}\n\n---\n\n## 没模块\n\n答案`)
    expect(partial).toMatchObject({ ok: true, count: 1 })
    if (partial.ok) expect(partial.skipped[0]).toContain('缺少模块')
    expect(parseImportText('随便写写')).toMatchObject({ ok: false, format: 'markdown' })
  })

  it('derives source names and counts questions per source', () => {
    expect(sourceNameFromFile('字节面经.md')).toBe('字节面经')
    expect(sourceNameFromFile('go.JSON')).toBe('go')
    const qs = [{ source: 'a' }, { source: 'custom_a' }, { source: 'b' }, {}] as Question[]
    expect(countBySource(qs, ['a', 'c'])).toEqual({ a: 2, c: 0 })
  })
})
