import { describe, expect, it } from 'vitest'
import type { Question, QuestionNote, StudyRecord } from '@/types'
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

const question: Question = {
  id: 'custom-1',
  module: '自定义',
  difficulty: 1,
  question: 'Q',
  answer: 'A',
  tags: [],
  source: 'my-bank',
} as Question

function data(partial: Partial<SyncData> = {}): SyncData {
  return {
    studyRecords: [],
    questionNotes: [],
    questionAnswerAnnotations: [],
    questionAnswerOverrides: [],
    questionFlags: [],
    aiSessions: [],
    customQuestions: [],
    customCategories: {},
    customSources: [],
    ...partial,
  }
}

describe('gist backup serialization', () => {
  it('round-trips records, notes and custom questions', () => {
    const backup = data({
      studyRecords: [record('q1', 'mastered', 100), record('q2', 'review', 200)],
      questionNotes: [note('q1', '笔记', 300)],
      customQuestions: [question],
      customSources: ['my-bank'],
    })
    const raw = serializeGistBackup(backup, '2026-11-20T00:00:00.000Z')
    const parsed = parseGistBackupPayload(raw)

    expect(parsed.exportedAt).toBe('2026-11-20T00:00:00.000Z')
    expect(parsed.studyRecords).toEqual(backup.studyRecords)
    expect(parsed.questionNotes).toEqual(backup.questionNotes)
    expect(parsed.customQuestions).toEqual([question])
    expect(parsed.customSources).toEqual(['my-bank'])
  })

  it('truncates record timestamps to whole seconds', () => {
    const raw = serializeGistBackup(
      data({
        studyRecords: [{ questionId: 'q1', status: 'review', lastUpdated: 1_999, reviewCount: 0 }],
      }),
    )
    expect(parseGistBackupPayload(raw).studyRecords[0].lastUpdated).toBe(1_000)
  })

  it('rejects unreadable payloads', () => {
    expect(() => parseGistBackupPayload('not json')).toThrow()
  })
})

describe('mergeGistBackupData', () => {
  it('keeps local data when there is no remote backup', () => {
    const local = data({ studyRecords: [record('q1', 'mastered', 100)] })
    const { backup, stats } = mergeGistBackupData(local, null)
    expect(backup.studyRecords).toEqual(local.studyRecords)
    expect(stats.remoteRecordsApplied).toBe(0)
  })

  it('takes the newer side per question and adds remote-only items', () => {
    const local = data({
      studyRecords: [record('q1', 'review', 200), record('q2', 'review', 100)],
      questionNotes: [note('q1', 'local', 500)],
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
          customQuestions: [question],
        }),
      ),
    )

    const { backup, stats } = mergeGistBackupData(local, remote)
    const byId = Object.fromEntries(backup.studyRecords.map((r) => [r.questionId, r.status]))

    expect(byId).toEqual({ q1: 'review', q2: 'mastered', q3: 'mastered' })
    expect(backup.questionNotes[0].content).toBe('local')
    expect(backup.customQuestions.map((q) => q.id)).toEqual(['custom-1'])
    expect(stats.remoteRecordsApplied).toBe(2)
    expect(stats.remoteNotesApplied).toBe(0)
    expect(stats.remoteQuestionsAdded).toBe(1)
  })
})
