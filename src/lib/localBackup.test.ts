import { describe, expect, it } from 'vitest'
import type { CategoryMap } from './db'
import { mergeCategoryMaps, parseImportPreview } from './localBackup'

describe('mergeCategoryMaps', () => {
  it('unions modules and keeps the base builtin flag', () => {
    const base = { 前端: { modules: ['React'], builtin: true } } as unknown as CategoryMap
    const incoming = {
      前端: { modules: ['React', 'Vue'], builtin: false },
      自定义: { modules: ['X'], builtin: false },
    } as unknown as CategoryMap

    const merged = mergeCategoryMaps(base, incoming)
    expect(merged.前端.modules).toEqual(['React', 'Vue'])
    expect(merged.前端.builtin).toBe(true)
    expect(merged.自定义.modules).toEqual(['X'])
  })
})

describe('parseImportPreview', () => {
  it('rejects invalid JSON and empty backups', () => {
    expect(() => parseImportPreview('a.json', '{')).toThrow('文件不是有效 JSON')
    expect(() => parseImportPreview('a.json', 'null')).toThrow('文件格式无效')
    expect(() => parseImportPreview('a.json', '{}')).toThrow('备份中没有可导入的数据')
  })

  it('reads study records and notes from a backup file', () => {
    const raw = JSON.stringify({
      formatVersion: 3,
      exportedAt: '2026-11-20T00:00:00.000Z',
      studyRecords: [{ questionId: 'q1', status: 'mastered', lastUpdated: 1, reviewCount: 2 }],
      questionNotes: [{ questionId: 'q1', content: '笔记', createdAt: 1, updatedAt: 2 }],
    })
    const preview = parseImportPreview('backup.json', raw)
    expect(preview.fileName).toBe('backup.json')
    expect(preview.formatVersion).toBe(3)
    expect(preview.studyRecords).toHaveLength(1)
    expect(preview.questionNotes[0].content).toBe('笔记')
    expect(preview.questions).toHaveLength(0)
  })

  it('accepts the bundled smoke backup fixture', async () => {
    const { readFile } = await import('node:fs/promises')
    const raw = await readFile(
      new URL('../../scripts/fixtures/smoke-backup.json', import.meta.url),
      'utf8',
    )
    const preview = parseImportPreview('smoke-backup.json', raw)
    expect(preview.studyRecords.length + preview.questions.length).toBeGreaterThan(0)
  })
})
