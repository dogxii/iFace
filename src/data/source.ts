/**
 * Data source boundary.
 *
 * Pages and stores should depend on these interfaces rather than on `lib/db` directly, so a
 * future remote backend (the QFace community bank) can sit behind the same API. Today the
 * only implementation is the local IndexedDB one below.
 *
 * Keep the surface small: add methods when a rebuilt page needs them, not ahead of time.
 */
import * as db from '@/lib/db'
import type { Question, QuestionFlag, QuestionNote, StudyRecord } from '@/types'

export interface QuestionSource {
  list(): Promise<Question[]>
  get(id: string): Promise<Question | undefined>
  listByModule(module: string): Promise<Question[]>
  count(): Promise<number>
}

export interface StudyRecordSource {
  list(): Promise<StudyRecord[]>
  get(questionId: string): Promise<StudyRecord | undefined>
  put(record: StudyRecord): Promise<void>
  remove(questionId: string): Promise<void>
  clear(): Promise<void>
}

export interface NoteSource {
  list(): Promise<QuestionNote[]>
  get(questionId: string): Promise<QuestionNote | undefined>
  /** Saving empty content deletes the note (and its images). */
  save(note: QuestionNote): Promise<void>
  remove(questionId: string): Promise<void>
  idsWithNotes(): Promise<string[]>
}

export interface FlagSource {
  list(): Promise<QuestionFlag[]>
  setStarred(questionId: string, starred: boolean): Promise<QuestionFlag>
  starredIds(): Promise<string[]>
}

export interface DataSource {
  /** Identifies the backend, e.g. for diagnostics or feature gating. */
  readonly kind: 'local' | 'remote'
  questions: QuestionSource
  records: StudyRecordSource
  notes: NoteSource
  flags: FlagSource
}

export const localDataSource: DataSource = {
  kind: 'local',
  questions: {
    list: db.getAllQuestions,
    get: db.getQuestionById,
    listByModule: db.getQuestionsByModule,
    count: db.getQuestionCount,
  },
  records: {
    list: db.getAllStudyRecords,
    get: db.getStudyRecord,
    put: db.putStudyRecord,
    remove: db.deleteStudyRecord,
    clear: db.clearAllStudyRecords,
  },
  notes: {
    list: db.getAllQuestionNotes,
    get: db.getQuestionNote,
    save: db.putQuestionNote,
    remove: db.deleteQuestionNote,
    idsWithNotes: db.getQuestionNoteIds,
  },
  flags: {
    list: db.getAllQuestionFlags,
    setStarred: db.setQuestionStarred,
    starredIds: db.getStarredQuestionIds,
  },
}

let current: DataSource = localDataSource

/** The active data source. */
export function dataSource(): DataSource {
  return current
}

/** Swap the data source (tests, or a future remote backend). Returns the previous one. */
export function setDataSource(next: DataSource): DataSource {
  const previous = current
  current = next
  return previous
}
