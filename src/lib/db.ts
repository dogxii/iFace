import { type IDBPDatabase, openDB } from 'idb'
import type {
  InstalledBank,
  JdMatchReport,
  MockInterviewSession,
  Question,
  QuestionAnswerAnnotation,
  QuestionAnswerOverride,
  QuestionFlag,
  QuestionNote,
  QuestionNoteImage,
  StoredLearningChecks,
  StudyRecord,
} from '../types'

const DB_NAME = 'iface_db'
const DB_VERSION = 9

export const STORES = {
  QUESTIONS: 'questions',
  STUDY_RECORDS: 'study_records',
  QUESTION_NOTES: 'question_notes',
  QUESTION_NOTE_IMAGES: 'question_note_images',
  QUESTION_ANSWER_ANNOTATIONS: 'question_answer_annotations',
  QUESTION_ANSWER_OVERRIDES: 'question_answer_overrides',
  QUESTION_FLAGS: 'question_flags',
  MOCK_INTERVIEWS: 'mock_interviews',
  JD_MATCH_REPORTS: 'jd_match_reports',
  BANKS: 'banks',
  LEARNING_CHECKS: 'learning_checks',
  META: 'meta',
} as const

export interface MetaEntry {
  key: string
  value: unknown
}

let dbPromise: Promise<IDBPDatabase> | null = null

/** Raw database handle, for migrations that need to touch several stores at once. */
export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, tx) {
        // Questions store
        if (!db.objectStoreNames.contains(STORES.QUESTIONS)) {
          const qs = db.createObjectStore(STORES.QUESTIONS, { keyPath: 'id' })
          qs.createIndex('module', 'module', { unique: false })
          qs.createIndex('difficulty', 'difficulty', { unique: false })
          qs.createIndex('source', 'source', { unique: false })
        }
        // v9: questions belong to banks.
        const questionStore = tx.objectStore(STORES.QUESTIONS)
        if (!questionStore.indexNames.contains('bankId')) {
          questionStore.createIndex('bankId', 'bankId', { unique: false })
        }
        if (!questionStore.indexNames.contains('moduleKey')) {
          questionStore.createIndex('moduleKey', 'moduleKey', { unique: false })
        }
        if (!db.objectStoreNames.contains(STORES.BANKS)) {
          db.createObjectStore(STORES.BANKS, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORES.LEARNING_CHECKS)) {
          const checks = db.createObjectStore(STORES.LEARNING_CHECKS, { keyPath: 'questionId' })
          checks.createIndex('bankId', 'bankId', { unique: false })
        }

        // Study records store
        if (!db.objectStoreNames.contains(STORES.STUDY_RECORDS)) {
          const rs = db.createObjectStore(STORES.STUDY_RECORDS, {
            keyPath: 'questionId',
          })
          rs.createIndex('status', 'status', { unique: false })
          rs.createIndex('lastUpdated', 'lastUpdated', { unique: false })
        }

        // Per-question notes store
        if (!db.objectStoreNames.contains(STORES.QUESTION_NOTES)) {
          const notes = db.createObjectStore(STORES.QUESTION_NOTES, {
            keyPath: 'questionId',
          })
          notes.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        // Local-only images embedded into question notes.
        if (!db.objectStoreNames.contains(STORES.QUESTION_NOTE_IMAGES)) {
          const noteImages = db.createObjectStore(STORES.QUESTION_NOTE_IMAGES, {
            keyPath: 'id',
          })
          noteImages.createIndex('questionId', 'questionId', { unique: false })
          noteImages.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        // Per-question answer highlights and comments.
        if (!db.objectStoreNames.contains(STORES.QUESTION_ANSWER_ANNOTATIONS)) {
          const answerAnnotations = db.createObjectStore(STORES.QUESTION_ANSWER_ANNOTATIONS, {
            keyPath: 'id',
          })
          answerAnnotations.createIndex('questionId', 'questionId', { unique: false })
          answerAnnotations.createIndex('answerHash', 'answerHash', { unique: false })
          answerAnnotations.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        // Per-question custom reference answers. The original question stays intact.
        if (!db.objectStoreNames.contains(STORES.QUESTION_ANSWER_OVERRIDES)) {
          const answerOverrides = db.createObjectStore(STORES.QUESTION_ANSWER_OVERRIDES, {
            keyPath: 'questionId',
          })
          answerOverrides.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        // Per-question flags such as starred/重点题.
        if (!db.objectStoreNames.contains(STORES.QUESTION_FLAGS)) {
          const flags = db.createObjectStore(STORES.QUESTION_FLAGS, {
            keyPath: 'questionId',
          })
          flags.createIndex('starred', 'starred', { unique: false })
          flags.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.MOCK_INTERVIEWS)) {
          const mockInterviews = db.createObjectStore(STORES.MOCK_INTERVIEWS, {
            keyPath: 'id',
          })
          mockInterviews.createIndex('status', 'status', { unique: false })
          mockInterviews.createIndex('createdAt', 'createdAt', { unique: false })
          mockInterviews.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.JD_MATCH_REPORTS)) {
          const jdMatchReports = db.createObjectStore(STORES.JD_MATCH_REPORTS, {
            keyPath: 'id',
          })
          jdMatchReports.createIndex('createdAt', 'createdAt', { unique: false })
          jdMatchReports.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        // Meta store (for tracking loaded modules, version, etc.)
        if (!db.objectStoreNames.contains(STORES.META)) {
          db.createObjectStore(STORES.META, { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

// ─── Questions ────────────────────────────────────────────────────────────────

export async function getAllQuestions(): Promise<Question[]> {
  const db = await getDB()
  return db.getAll(STORES.QUESTIONS)
}

export async function getQuestionById(id: string): Promise<Question | undefined> {
  const db = await getDB()
  return db.get(STORES.QUESTIONS, id)
}

/** Deletes everything users attached to these questions: records, notes, highlights, flags. */
export async function deleteQuestionUserData(questionIds: string[]): Promise<void> {
  if (questionIds.length === 0) return
  const db = await getDB()
  const tx = db.transaction(
    [
      STORES.STUDY_RECORDS,
      STORES.QUESTION_NOTES,
      STORES.QUESTION_ANSWER_OVERRIDES,
      STORES.QUESTION_FLAGS,
    ],
    'readwrite',
  )
  await Promise.all([
    ...questionIds.flatMap((id) => [
      tx.objectStore(STORES.STUDY_RECORDS).delete(id),
      tx.objectStore(STORES.QUESTION_NOTES).delete(id),
      tx.objectStore(STORES.QUESTION_ANSWER_OVERRIDES).delete(id),
      tx.objectStore(STORES.QUESTION_FLAGS).delete(id),
    ]),
    tx.done,
  ])
  for (const id of questionIds) {
    await deleteQuestionAnswerAnnotationsByQuestionId(id)
    await deleteQuestionNoteImagesByQuestionId(id)
  }
}

/** How many of these questions have a study record, note, flag or custom answer. */
export async function countQuestionsWithUserData(questionIds: readonly string[]): Promise<number> {
  if (questionIds.length === 0) return 0
  const db = await getDB()
  const stores = [
    STORES.STUDY_RECORDS,
    STORES.QUESTION_NOTES,
    STORES.QUESTION_ANSWER_OVERRIDES,
    STORES.QUESTION_FLAGS,
  ]
  const tx = db.transaction(stores, 'readonly')
  let count = 0
  for (const id of questionIds) {
    const keys = await Promise.all(stores.map((store) => tx.objectStore(store).getKey(id)))
    if (keys.some((key) => key !== undefined)) count++
  }
  await tx.done
  return count
}

// ─── Banks ────────────────────────────────────────────────────────────────────

export async function getAllBanks(): Promise<InstalledBank[]> {
  const db = await getDB()
  return db.getAll(STORES.BANKS)
}

export async function getBank(id: string): Promise<InstalledBank | undefined> {
  const db = await getDB()
  return db.get(STORES.BANKS, id)
}

export async function putBank(bank: InstalledBank): Promise<void> {
  const db = await getDB()
  await db.put(STORES.BANKS, bank)
}

export async function getQuestionsByBank(bankId: string): Promise<Question[]> {
  const db = await getDB()
  return db.getAllFromIndex(STORES.QUESTIONS, 'bankId', bankId)
}

export async function getLearningChecksByBank(bankId: string): Promise<StoredLearningChecks[]> {
  const db = await getDB()
  return db.getAllFromIndex(STORES.LEARNING_CHECKS, 'bankId', bankId)
}

export async function getQuestionIdsByBank(bankId: string): Promise<string[]> {
  const db = await getDB()
  return (await db.getAllKeysFromIndex(STORES.QUESTIONS, 'bankId', bankId)) as string[]
}

/**
 * Installs or updates a bank in one transaction: writes the bank record and replaces its
 * questions and learning checks. Returns the ids the new version no longer has; their study
 * data is left alone so callers can decide (see `deleteQuestionUserData`).
 */
export async function writeBank(
  bank: InstalledBank,
  questions: Question[],
  checks: StoredLearningChecks[],
): Promise<{ removedIds: string[] }> {
  const db = await getDB()
  const tx = db.transaction([STORES.BANKS, STORES.QUESTIONS, STORES.LEARNING_CHECKS], 'readwrite')
  const questionStore = tx.objectStore(STORES.QUESTIONS)
  const checkStore = tx.objectStore(STORES.LEARNING_CHECKS)
  const nextIds = new Set(questions.map((question) => question.id))
  const previousIds = (await questionStore.index('bankId').getAllKeys(bank.id)) as string[]
  const previousCheckIds = (await checkStore.index('bankId').getAllKeys(bank.id)) as string[]
  const removedIds = previousIds.filter((id) => !nextIds.has(id))

  await Promise.all([
    ...removedIds.map((id) => questionStore.delete(id)),
    ...previousCheckIds.map((id) => checkStore.delete(id)),
    ...questions.map((question) => questionStore.put(question)),
    ...checks.map((entry) => checkStore.put(entry)),
    tx.objectStore(STORES.BANKS).put(bank),
    tx.done,
  ])
  return { removedIds }
}

/** Removes a bank, its questions and checks. Study data goes too when `purgeData` is set. */
export async function deleteBank(bankId: string, purgeData: boolean): Promise<void> {
  const db = await getDB()
  const tx = db.transaction([STORES.BANKS, STORES.QUESTIONS, STORES.LEARNING_CHECKS], 'readwrite')
  const questionIds = (await tx
    .objectStore(STORES.QUESTIONS)
    .index('bankId')
    .getAllKeys(bankId)) as string[]
  const checkIds = (await tx
    .objectStore(STORES.LEARNING_CHECKS)
    .index('bankId')
    .getAllKeys(bankId)) as string[]
  await Promise.all([
    ...questionIds.map((id) => tx.objectStore(STORES.QUESTIONS).delete(id)),
    ...checkIds.map((id) => tx.objectStore(STORES.LEARNING_CHECKS).delete(id)),
    tx.objectStore(STORES.BANKS).delete(bankId),
    tx.done,
  ])
  if (purgeData) await deleteQuestionUserData(questionIds)
}

export async function getLearningChecks(
  questionId: string,
): Promise<StoredLearningChecks | undefined> {
  const db = await getDB()
  return db.get(STORES.LEARNING_CHECKS, questionId)
}

// ─── Study Records ────────────────────────────────────────────────────────────

/**
 * Fires after study records are replaced in bulk (backup import, Gist pull, migrations),
 * so in-memory stores can reload instead of showing stale data.
 */
export const studyRecordEvents = new EventTarget()

function notifyStudyRecordsReplaced(): void {
  studyRecordEvents.dispatchEvent(new Event('replaced'))
}

export async function getAllStudyRecords(): Promise<StudyRecord[]> {
  const db = await getDB()
  return db.getAll(STORES.STUDY_RECORDS)
}

export async function putStudyRecord(record: StudyRecord): Promise<void> {
  const db = await getDB()
  await db.put(STORES.STUDY_RECORDS, record)
}

export async function bulkPutStudyRecords(records: StudyRecord[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORES.STUDY_RECORDS, 'readwrite')
  await Promise.all([...records.map((r) => tx.store.put(r)), tx.done])
  notifyStudyRecordsReplaced()
}

export async function getStudyRecord(questionId: string): Promise<StudyRecord | undefined> {
  const db = await getDB()
  return db.get(STORES.STUDY_RECORDS, questionId)
}

export async function deleteStudyRecord(questionId: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORES.STUDY_RECORDS, questionId)
}

export async function clearAllStudyRecords(): Promise<void> {
  const db = await getDB()
  await db.clear(STORES.STUDY_RECORDS)
}

// ─── Question Notes ──────────────────────────────────────────────────────────

export async function getAllQuestionNotes(): Promise<QuestionNote[]> {
  const db = await getDB()
  return db.getAll(STORES.QUESTION_NOTES)
}

export async function getQuestionNote(questionId: string): Promise<QuestionNote | undefined> {
  const db = await getDB()
  return db.get(STORES.QUESTION_NOTES, questionId)
}

export async function putQuestionNote(note: QuestionNote): Promise<void> {
  const db = await getDB()
  const now = Date.now()
  const existing = await getQuestionNote(note.questionId)
  const trimmed = note.content.trim()

  if (!trimmed) {
    await Promise.all([
      db.delete(STORES.QUESTION_NOTES, note.questionId),
      deleteQuestionNoteImagesByQuestionId(note.questionId),
    ])
    return
  }

  await db.put(STORES.QUESTION_NOTES, {
    questionId: note.questionId,
    content: note.content,
    createdAt: existing?.createdAt ?? note.createdAt ?? now,
    updatedAt: now,
  })
}

export async function bulkPutQuestionNotes(notes: QuestionNote[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORES.QUESTION_NOTES, 'readwrite')
  await Promise.all([...notes.map((note) => tx.store.put(note)), tx.done])
}

export async function deleteQuestionNote(questionId: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORES.QUESTION_NOTES, questionId)
}

export async function getQuestionNoteIds(): Promise<string[]> {
  const notes = await getAllQuestionNotes()
  return notes.filter((note) => note.content.trim().length > 0).map((note) => note.questionId)
}

export async function appendQuestionNoteContent(
  questionId: string,
  content: string,
): Promise<QuestionNote> {
  const db = await getDB()
  const now = Date.now()
  const existing = await db.get(STORES.QUESTION_NOTES, questionId)
  const previous = existing?.content.trim()
  const nextContent = previous ? `${previous}\n\n${content.trim()}` : content.trim()
  const next: QuestionNote = {
    questionId,
    content: nextContent,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await db.put(STORES.QUESTION_NOTES, next)
  return next
}

// ─── Local-only Question Note Images ────────────────────────────────────────

export async function getQuestionNoteImages(questionId: string): Promise<QuestionNoteImage[]> {
  const db = await getDB()
  return db.getAllFromIndex(STORES.QUESTION_NOTE_IMAGES, 'questionId', questionId)
}

export async function putQuestionNoteImage(image: QuestionNoteImage): Promise<QuestionNoteImage> {
  const db = await getDB()
  const now = Date.now()
  const next: QuestionNoteImage = {
    ...image,
    createdAt: image.createdAt || now,
    updatedAt: now,
  }
  await db.put(STORES.QUESTION_NOTE_IMAGES, next)
  return next
}

export async function deleteQuestionNoteImagesByQuestionId(questionId: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORES.QUESTION_NOTE_IMAGES, 'readwrite')
  const index = tx.store.index('questionId')
  let cursor = await index.openCursor(questionId)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done
}

export async function deleteUnusedQuestionNoteImages(
  questionId: string,
  keepIds: string[],
): Promise<void> {
  const keep = new Set(keepIds)
  const db = await getDB()
  const tx = db.transaction(STORES.QUESTION_NOTE_IMAGES, 'readwrite')
  const index = tx.store.index('questionId')
  let cursor = await index.openCursor(questionId)
  while (cursor) {
    if (!keep.has(cursor.value.id)) await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done
}

// ─── Question Answer Annotations ────────────────────────────────────────────

export async function getAllQuestionAnswerAnnotations(): Promise<QuestionAnswerAnnotation[]> {
  const db = await getDB()
  return db.getAll(STORES.QUESTION_ANSWER_ANNOTATIONS)
}

export async function getQuestionAnswerAnnotations(
  questionId: string,
): Promise<QuestionAnswerAnnotation[]> {
  const db = await getDB()
  return db.getAllFromIndex(STORES.QUESTION_ANSWER_ANNOTATIONS, 'questionId', questionId)
}

export async function putQuestionAnswerAnnotation(
  annotation: QuestionAnswerAnnotation,
): Promise<QuestionAnswerAnnotation> {
  const db = await getDB()
  const now = Date.now()
  const existing = await db.get(STORES.QUESTION_ANSWER_ANNOTATIONS, annotation.id)
  const next: QuestionAnswerAnnotation = {
    ...annotation,
    createdAt: existing?.createdAt ?? annotation.createdAt ?? now,
    updatedAt: now,
  }
  await db.put(STORES.QUESTION_ANSWER_ANNOTATIONS, next)
  return next
}

export async function bulkPutQuestionAnswerAnnotations(
  annotations: QuestionAnswerAnnotation[],
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORES.QUESTION_ANSWER_ANNOTATIONS, 'readwrite')
  await Promise.all([...annotations.map((annotation) => tx.store.put(annotation)), tx.done])
}

export async function deleteQuestionAnswerAnnotation(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORES.QUESTION_ANSWER_ANNOTATIONS, id)
}

export async function deleteQuestionAnswerAnnotationsByQuestionId(
  questionId: string,
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORES.QUESTION_ANSWER_ANNOTATIONS, 'readwrite')
  const index = tx.store.index('questionId')
  let cursor = await index.openCursor(questionId)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done
}

// ─── Question Answer Overrides ──────────────────────────────────────────────

export async function getAllQuestionAnswerOverrides(): Promise<QuestionAnswerOverride[]> {
  const db = await getDB()
  return db.getAll(STORES.QUESTION_ANSWER_OVERRIDES)
}

export async function getQuestionAnswerOverride(
  questionId: string,
): Promise<QuestionAnswerOverride | undefined> {
  const db = await getDB()
  return db.get(STORES.QUESTION_ANSWER_OVERRIDES, questionId)
}

export async function putQuestionAnswerOverride(
  override: QuestionAnswerOverride,
): Promise<QuestionAnswerOverride | null> {
  const db = await getDB()
  const now = Date.now()
  const existing = await getQuestionAnswerOverride(override.questionId)
  const trimmed = override.content.trim()

  if (!trimmed) {
    await db.delete(STORES.QUESTION_ANSWER_OVERRIDES, override.questionId)
    return null
  }

  const next: QuestionAnswerOverride = {
    questionId: override.questionId,
    content: override.content,
    createdAt: existing?.createdAt ?? override.createdAt ?? now,
    updatedAt: now,
  }
  await db.put(STORES.QUESTION_ANSWER_OVERRIDES, next)
  return next
}

export async function bulkPutQuestionAnswerOverrides(
  overrides: QuestionAnswerOverride[],
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORES.QUESTION_ANSWER_OVERRIDES, 'readwrite')
  await Promise.all([...overrides.map((override) => tx.store.put(override)), tx.done])
}

export async function deleteQuestionAnswerOverride(questionId: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORES.QUESTION_ANSWER_OVERRIDES, questionId)
}

// ─── Question Flags ─────────────────────────────────────────────────────────

export async function getAllQuestionFlags(): Promise<QuestionFlag[]> {
  const db = await getDB()
  return db.getAll(STORES.QUESTION_FLAGS)
}

export async function getQuestionFlag(questionId: string): Promise<QuestionFlag | undefined> {
  const db = await getDB()
  return db.get(STORES.QUESTION_FLAGS, questionId)
}

export async function setQuestionStarred(
  questionId: string,
  starred: boolean,
): Promise<QuestionFlag> {
  const db = await getDB()
  const now = Date.now()
  const existing = await getQuestionFlag(questionId)
  const next: QuestionFlag = {
    questionId,
    starred,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await db.put(STORES.QUESTION_FLAGS, next)
  return next
}

export async function bulkPutQuestionFlags(flags: QuestionFlag[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORES.QUESTION_FLAGS, 'readwrite')
  await Promise.all([...flags.map((flag) => tx.store.put(flag)), tx.done])
}

export async function getStarredQuestionIds(): Promise<string[]> {
  const flags = await getAllQuestionFlags()
  return flags.filter((flag) => flag.starred).map((flag) => flag.questionId)
}

// ─── Mock Interviews ─────────────────────────────────────────────────────────

export async function getAllMockInterviews(): Promise<MockInterviewSession[]> {
  const db = await getDB()
  const sessions = await db.getAll(STORES.MOCK_INTERVIEWS)
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getMockInterviewById(id: string): Promise<MockInterviewSession | undefined> {
  const db = await getDB()
  return db.get(STORES.MOCK_INTERVIEWS, id)
}

export async function putMockInterview(session: MockInterviewSession): Promise<void> {
  const db = await getDB()
  await db.put(STORES.MOCK_INTERVIEWS, {
    ...session,
    updatedAt: Date.now(),
  })
}

export async function bulkPutMockInterviews(sessions: MockInterviewSession[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORES.MOCK_INTERVIEWS, 'readwrite')
  await Promise.all([...sessions.map((session) => tx.store.put(session)), tx.done])
}

export async function deleteMockInterview(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORES.MOCK_INTERVIEWS, id)
}

export async function clearAllMockInterviews(): Promise<void> {
  const db = await getDB()
  await db.clear(STORES.MOCK_INTERVIEWS)
}

// ─── JD Match Reports ────────────────────────────────────────────────────────

export async function getAllJdMatchReports(): Promise<JdMatchReport[]> {
  const db = await getDB()
  const reports = await db.getAll(STORES.JD_MATCH_REPORTS)
  return reports.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function putJdMatchReport(report: JdMatchReport): Promise<void> {
  const db = await getDB()
  await db.put(STORES.JD_MATCH_REPORTS, {
    ...report,
    updatedAt: Date.now(),
  })
}

export async function bulkPutJdMatchReports(reports: JdMatchReport[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORES.JD_MATCH_REPORTS, 'readwrite')
  await Promise.all([...reports.map((report) => tx.store.put(report)), tx.done])
}

export async function deleteJdMatchReport(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORES.JD_MATCH_REPORTS, id)
}

export async function clearAllJdMatchReports(): Promise<void> {
  const db = await getDB()
  await db.clear(STORES.JD_MATCH_REPORTS)
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDB()
  const entry = await db.get(STORES.META, key)
  return entry?.value as T | undefined
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  await db.put(STORES.META, { key, value })
}

export async function deleteMeta(key: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORES.META, key)
}

// ─── Reset DB ─────────────────────────────────────────────────────────────────

export async function resetDatabase(): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.clear(STORES.QUESTIONS),
    db.clear(STORES.BANKS),
    db.clear(STORES.LEARNING_CHECKS),
    db.clear(STORES.STUDY_RECORDS),
    db.clear(STORES.QUESTION_NOTES),
    db.clear(STORES.QUESTION_NOTE_IMAGES),
    db.clear(STORES.QUESTION_ANSWER_ANNOTATIONS),
    db.clear(STORES.QUESTION_ANSWER_OVERRIDES),
    db.clear(STORES.QUESTION_FLAGS),
    db.clear(STORES.MOCK_INTERVIEWS),
    db.clear(STORES.JD_MATCH_REPORTS),
    db.clear(STORES.META),
  ])
  dbPromise = null
}
