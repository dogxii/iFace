import { describe, expect, it } from 'vitest'
import {
  countImportImpact,
  formatBackupTime,
  formatRemoteMergeSummary,
  formatSyncSummary,
} from './settingsData'

describe('countImportImpact', () => {
  it('splits incoming items into created and overwritten by id', () => {
    const impact = countImportImpact(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      new Set(['b']),
      (x) => x.id,
    )
    expect(impact).toEqual({ created: 2, overwritten: 1 })
  })

  it('returns zeros for an empty import', () => {
    expect(countImportImpact([], new Set(['a']), (x: { id: string }) => x.id)).toEqual({
      created: 0,
      overwritten: 0,
    })
  })
})

describe('formatRemoteMergeSummary', () => {
  it('is empty when nothing was merged from the remote', () => {
    expect(formatRemoteMergeSummary({ ok: true })).toBe('')
    expect(formatRemoteMergeSummary({ ok: true, mergedRemoteNoteCount: 0 })).toBe('')
  })

  it('lists only the non-zero merged kinds in a fixed order', () => {
    expect(
      formatRemoteMergeSummary({
        ok: true,
        mergedRemoteNoteCount: 2,
        mergedRemoteRecordCount: 1200,
      }),
    ).toBe('，并保留云端较新的 1,200 条学习记录、2 条笔记')
  })
})

describe('formatSyncSummary', () => {
  it('defaults missing counts to zero', () => {
    expect(formatSyncSummary('已备份', { ok: true, recordCount: 3 })).toBe(
      '已备份 3 条学习记录、0 道自定义题目、0 条笔记、0 个答案标注、0 个重点题、0 个 AI 会话',
    )
  })
})

describe('formatBackupTime', () => {
  it('falls back for missing or invalid dates', () => {
    expect(formatBackupTime()).toBe('未知')
    expect(formatBackupTime('not a date')).toBe('未知')
  })
})
