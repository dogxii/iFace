import { describe, expect, it } from 'vitest'
import type { QuestionNote, StudyRecord } from '@/types'
import type { BankSnapshot } from './banks/package'
import {
  mergeGistBackupData,
  parseGistBackupPayload,
  type SyncData,
  serializeGistBackup,
} from './gistSync'

// Gist payloads store record times in whole seconds, so fixtures use second-aligned values.
function record(questionId: string, status: StudyRecord['status'], seconds: number) {
  return { questionId, status, lastUpdated: seconds * 1000, reviewCount: 1 } satisfies StudyRecord
}

function note(questionId: string, content: string, updatedAt: number): QuestionNote {
  return { questionId, content, createdAt: 1, updatedAt }
}

function bank(id: string, updatedAt: number, name = id): BankSnapshot {
  return {
    id,
    enabled: true,
    order: 5,
    installedAt: 1,
    updatedAt,
    package: {
      format: 'iface-bank@1',
      name,
      version: '1.0.0',
      license: 'NOASSERTION',
      modules: [
        {
          id: 'm1',
          name: 'M',
          questions: [{ id: 'q1', difficulty: 1, question: 'Q', answer: 'A', tags: [] }],
        },
      ],
    },
  }
}

function data(partial: Partial<SyncData> = {}): SyncData {
  return {
    studyRecords: [],
    questionNotes: [],
    questionAnswerAnnotations: [],
    questionAnswerOverrides: [],
    questionFlags: [],
    aiSessions: [],
    banks: [],
    ...partial,
  }
}

describe('gist backup serialization', () => {
  it('round-trips records, notes and local banks', () => {
    const backup = data({
      studyRecords: [record('iface.go:q1', 'mastered', 100), record('local.x:q1', 'review', 200)],
      questionNotes: [note('iface.go:q1', '笔记', 300)],
      banks: [bank('local.x', 10)],
    })
    const raw = serializeGistBackup(backup, '2026-11-20T00:00:00.000Z')
    const parsed = parseGistBackupPayload(raw)

    expect(parsed.version).toBe(9)
    expect(parsed.exportedAt).toBe('2026-11-20T00:00:00.000Z')
    expect(parsed.studyRecords).toEqual(backup.studyRecords)
    expect(parsed.questionNotes).toEqual(backup.questionNotes)
    expect(parsed.banks).toEqual(backup.banks)
  })

  it('truncates record timestamps to whole seconds', () => {
    const raw = serializeGistBackup(
      data({
        studyRecords: [{ questionId: 'q1', status: 'review', lastUpdated: 1_999, reviewCount: 0 }],
      }),
    )
    expect(parseGistBackupPayload(raw).studyRecords[0].lastUpdated).toBe(1_000)
  })

  it('rejects unreadable and newer payloads', () => {
    expect(() => parseGistBackupPayload('not json')).toThrow()
    expect(() => parseGistBackupPayload('{"version":10}')).toThrow('newer version')
  })

  it('upgrades a 1.x payload: custom questions become a local bank', () => {
    const raw = JSON.stringify({
      version: 8,
      exportedAt: '2026-01-01T00:00:00.000Z',
      records: {
        ids: ['js-001', 'custom_my_a1'],
        statuses: [1, 2],
        times: [10, 20],
        counts: [1, 1],
      },
      questionNotes: [note('custom_my_a1', 'n', 3)],
      customQuestions: [
        {
          id: 'custom_my_a1',
          module: 'X',
          difficulty: 2,
          question: 'Q',
          answer: 'A',
          tags: [],
          source: 'my',
        },
      ],
      customCategories: {},
      customSources: ['my'],
    })
    const parsed = parseGistBackupPayload(raw, new Map([['js-001', 'iface.frontend:js-001']]))
    expect(parsed.banks).toHaveLength(1)
    const bankId = parsed.banks[0].id
    expect(parsed.studyRecords.map((r) => r.questionId)).toEqual([
      'iface.frontend:js-001',
      `${bankId}:a1`,
    ])
    expect(parsed.questionNotes[0].questionId).toBe(`${bankId}:a1`)
  })
})

describe('mergeGistBackupData', () => {
  it('keeps local data when there is no remote backup', () => {
    const local = data({ studyRecords: [record('q1', 'mastered', 100)] })
    const { backup, stats, remoteBanks } = mergeGistBackupData(local, null)
    expect(backup.studyRecords).toEqual(local.studyRecords)
    expect(stats.remoteRecordsApplied).toBe(0)
    expect(remoteBanks).toEqual([])
  })

  it('takes the newer side per item, including whole local banks', () => {
    const local = data({
      studyRecords: [record('q1', 'review', 200), record('q2', 'review', 100)],
      questionNotes: [note('q1', 'local', 500)],
      banks: [bank('local.a', 50, 'local A'), bank('local.b', 10, 'local B')],
    })
    const remote = parseGistBackupPayload(
      serializeGistBackup(
        data({
          studyRecords: [
            record('q1', 'mastered', 100),
            record('q2', 'mastered', 300),
            record('q3', 'mastered', 300),
          ],
          questionNotes: [note('q1', 'remote', 400)],
          banks: [
            bank('local.a', 40, 'remote A'),
            bank('local.b', 20, 'remote B'),
            bank('local.c', 1),
          ],
        }),
      ),
    )

    const { backup, stats, remoteBanks } = mergeGistBackupData(local, remote)
    const byId = Object.fromEntries(backup.studyRecords.map((r) => [r.questionId, r.status]))

    expect(byId).toEqual({ q1: 'review', q2: 'mastered', q3: 'mastered' })
    expect(backup.questionNotes[0].content).toBe('local')
    expect(backup.banks.map((b) => b.package.name)).toEqual(['local A', 'remote B', 'local.c'])
    expect(remoteBanks.map((b) => b.id)).toEqual(['local.b', 'local.c'])
    expect(stats.remoteRecordsApplied).toBe(2)
    expect(stats.remoteNotesApplied).toBe(0)
    expect(stats.remoteBanksApplied).toBe(2)
  })
})
