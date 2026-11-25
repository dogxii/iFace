import { describe, expect, it } from 'vitest'
import { backupQuestionCount, parseImportPreview } from './localBackup'

describe('parseImportPreview', () => {
  it('rejects invalid JSON, empty and newer backups', () => {
    expect(() => parseImportPreview('a.json', '{')).toThrow('文件不是有效 JSON')
    expect(() => parseImportPreview('a.json', 'null')).toThrow('文件格式无效')
    expect(() => parseImportPreview('a.json', '{}')).toThrow('备份中没有可导入的数据')
    expect(() => parseImportPreview('a.json', '{"formatVersion":99}')).toThrow('更新版本')
  })

  it('reads a 2.0 backup as is', () => {
    const raw = JSON.stringify({
      formatVersion: 9,
      exportedAt: '2026-11-20T00:00:00.000Z',
      bankStates: [{ id: 'iface.golang', enabled: false, order: 1 }],
      studyRecords: [
        { questionId: 'iface.golang:go-001', status: 'mastered', lastUpdated: 1, reviewCount: 2 },
      ],
      questionNotes: [
        { questionId: 'iface.golang:go-001', content: '笔记', createdAt: 1, updatedAt: 2 },
      ],
    })
    const preview = parseImportPreview('backup.json', raw)
    expect(preview).toMatchObject({ fileName: 'backup.json', formatVersion: 9, upgraded: false })
    expect(preview.bankStates).toEqual([{ id: 'iface.golang', enabled: false, order: 1 }])
    expect(preview.studyRecords[0].questionId).toBe('iface.golang:go-001')
    expect(preview.questionNotes[0].content).toBe('笔记')
  })

  it('upgrades the bundled 1.x smoke backup to a local bank and new ids', async () => {
    const { readFile } = await import('node:fs/promises')
    const raw = await readFile(
      new URL('../../scripts/fixtures/smoke-backup.json', import.meta.url),
      'utf8',
    )
    const preview = parseImportPreview('smoke-backup.json', raw)
    expect(preview.upgraded).toBe(true)
    expect(preview.banks).toHaveLength(1)
    expect(preview.banks[0].id).toMatch(/^local\.smoke-backup-[a-z0-9]{4}$/)
    expect(backupQuestionCount(preview.banks)).toBe(1)
    const key = preview.studyRecords[0].questionId
    expect(key.startsWith(`${preview.banks[0].id}:`)).toBe(true)
    expect(preview.questionNotes[0].questionId).toBe(key)
    expect(preview.aiSessions[0].questionId).toBe(key)
  })

  it('maps 1.x official ids with the given keys', () => {
    const raw = JSON.stringify({
      formatVersion: 8,
      studyRecords: [{ questionId: 'js-001', status: 'review', lastUpdated: 5, reviewCount: 1 }],
    })
    const preview = parseImportPreview(
      'old.json',
      raw,
      new Map([['js-001', 'iface.frontend:js-001']]),
    )
    expect(preview.upgraded).toBe(true)
    expect(preview.studyRecords[0].questionId).toBe('iface.frontend:js-001')
  })
})
