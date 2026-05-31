import { type IDBPDatabase, openDB } from 'idb'
import type {
  JdMatchReport,
  MockInterviewSession,
  Question,
  QuestionAnswerOverride,
  QuestionFlag,
  QuestionNote,
  QuestionNoteImage,
  StudyRecord,
} from '../types'

const DB_NAME = 'iface_db'
const DB_VERSION = 7

export const STORES = {
  QUESTIONS: 'questions',
  STUDY_RECORDS: 'study_records',
  QUESTION_NOTES: 'question_notes',
  QUESTION_NOTE_IMAGES: 'question_note_images',
  QUESTION_ANSWER_OVERRIDES: 'question_answer_overrides',
  QUESTION_FLAGS: 'question_flags',
  MOCK_INTERVIEWS: 'mock_interviews',
  JD_MATCH_REPORTS: 'jd_match_reports',
  META: 'meta',
} as const

// ─── Category types ───────────────────────────────────────────────────────────

/**
 * A category groups one or more modules under a display label.
 * Built-in categories (e.g. "前端") are seeded automatically.
 * Users can create custom ones (e.g. "Go", "Java") when importing.
 */
export interface CategoryEntry {
  /** Display name, e.g. "前端", "Go", "Java" */
  name: string
  /** Ordered list of module strings that belong to this category */
  modules: string[]
  /** true = shipped with the app; false = created by user import */
  builtin: boolean
  /** Display order (lower = shown first) */
  order: number
}

export type CategoryMap = Record<string, CategoryEntry>

export interface MetaEntry {
  key: string
  value: unknown
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Questions store
        if (!db.objectStoreNames.contains(STORES.QUESTIONS)) {
          const qs = db.createObjectStore(STORES.QUESTIONS, { keyPath: 'id' })
          qs.createIndex('module', 'module', { unique: false })
          qs.createIndex('difficulty', 'difficulty', { unique: false })
          qs.createIndex('source', 'source', { unique: false })
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

export async function bulkPutQuestions(questions: Question[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORES.QUESTIONS, 'readwrite')
  await Promise.all([...questions.map((q) => tx.store.put(q)), tx.done])
}

export async function getAllQuestions(): Promise<Question[]> {
  const db = await getDB()
  return db.getAll(STORES.QUESTIONS)
}

export async function getQuestionById(id: string): Promise<Question | undefined> {
  const db = await getDB()
  return db.get(STORES.QUESTIONS, id)
}

export async function getQuestionsByModule(module: string): Promise<Question[]> {
  const db = await getDB()
  return db.getAllFromIndex(STORES.QUESTIONS, 'module', module)
}

export async function getQuestionCount(): Promise<number> {
  const db = await getDB()
  return db.count(STORES.QUESTIONS)
}

export async function deleteQuestionsBySource(source: string): Promise<void> {
  const db = await getDB()
  const deletedIds: string[] = []
  const tx = db.transaction(STORES.QUESTIONS, 'readwrite')
  const index = tx.store.index('source')
  let cursor = await index.openCursor(source)
  while (cursor) {
    deletedIds.push(cursor.value.id)
    await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done

  if (deletedIds.length > 0) {
    const recordTx = db.transaction(STORES.STUDY_RECORDS, 'readwrite')
    const noteTx = db.transaction(STORES.QUESTION_NOTES, 'readwrite')
    const answerOverrideTx = db.transaction(STORES.QUESTION_ANSWER_OVERRIDES, 'readwrite')
    const flagTx = db.transaction(STORES.QUESTION_FLAGS, 'readwrite')
    await Promise.all([
      ...deletedIds.map((id) => recordTx.store.delete(id)),
      recordTx.done,
      ...deletedIds.map((id) => noteTx.store.delete(id)),
      noteTx.done,
      ...deletedIds.map((id) => answerOverrideTx.store.delete(id)),
      answerOverrideTx.done,
      ...deletedIds.map((id) => flagTx.store.delete(id)),
      flagTx.done,
    ])
    await Promise.all(deletedIds.map((id) => deleteQuestionNoteImagesByQuestionId(id)))
  }
}

export async function deleteQuestionById(id: string): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.delete(STORES.QUESTIONS, id),
    db.delete(STORES.STUDY_RECORDS, id),
    db.delete(STORES.QUESTION_NOTES, id),
    deleteQuestionNoteImagesByQuestionId(id),
    db.delete(STORES.QUESTION_ANSWER_OVERRIDES, id),
    db.delete(STORES.QUESTION_FLAGS, id),
  ])
}

// ─── Study Records ────────────────────────────────────────────────────────────

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

// ─── Meta Keys ────────────────────────────────────────────────────────────────

export const META_KEYS = {
  LOADED_MODULES: 'loaded_modules', // string[] — which JSON modules are loaded
  CUSTOM_SOURCES: 'custom_sources', // string[] — user-imported source names
  DAILY_RECS: 'daily_recommendations', // { date, ids }
  SCHEMA_VERSION: 'schema_version',
  BUILTIN_QUESTIONS_VERSION: 'builtin_questions_version',
  BUILTIN_REPLACEMENT_MIGRATION: 'builtin_replacement_migration',
  CATEGORY_MAP: 'category_map', // CategoryMap — user-defined category → modules mapping
} as const

// ─── Default built-in category map ───────────────────────────────────────────

export const DEFAULT_CATEGORY_MAP: CategoryMap = {
  前端: {
    name: '前端',
    modules: [
      'JS基础',
      'React',
      'Vue',
      'CSS',
      'TypeScript',
      '性能优化',
      '网络',
      '手写题',
      '项目深挖',
    ],
    builtin: true,
    order: 0,
  },
  Golang: {
    name: 'Golang',
    modules: ['Go基础', '并发编程', '内存与GC', '工程化', 'Web开发'],
    builtin: true,
    order: 1,
  },
  'AI Agent': {
    name: 'AI Agent',
    modules: [
      'LLM基础',
      'Prompt工程',
      'Agent架构',
      'RAG与知识库',
      '工具调用与工作流',
      '评测与线上优化',
      'AI工程化',
      'AI应用实践',
    ],
    builtin: true,
    order: 2,
  },
  Java: {
    name: 'Java',
    modules: ['Java基础', 'Java并发', 'JVM', 'Spring框架', '计算机网络', 'MySQL', 'Redis'],
    builtin: true,
    order: 3,
  },
}

// ─── Category map ─────────────────────────────────────────────────────────────

const LEGACY_JAVA_CATEGORY_NAMES = new Set(['Java 后端', '计算机网络', 'Redis', 'MySQL'])

export async function getCategoryMap(): Promise<CategoryMap> {
  const stored = await getMeta<CategoryMap>(META_KEYS.CATEGORY_MAP)
  if (!stored || Object.keys(stored).length === 0) return { ...DEFAULT_CATEGORY_MAP }

  const merged: CategoryMap = { ...DEFAULT_CATEGORY_MAP }

  for (const [key, entry] of Object.entries(stored)) {
    const builtin = DEFAULT_CATEGORY_MAP[key]

    if (entry.builtin && LEGACY_JAVA_CATEGORY_NAMES.has(key)) {
      continue
    }

    if (!builtin) {
      merged[key] = entry
      continue
    }

    const modules = [...builtin.modules]
    for (const module of entry.modules) {
      if (!modules.includes(module)) modules.push(module)
    }

    merged[key] = {
      ...builtin,
      modules,
    }
  }

  return merged
}

export async function saveCategoryMap(map: CategoryMap): Promise<void> {
  await setMeta(META_KEYS.CATEGORY_MAP, map)
}

/**
 * Ensure a module is registered under a category.
 * If the category doesn't exist, it is created.
 * If the module is already in the category, this is a no-op.
 */
export async function registerModuleInCategory(
  categoryName: string,
  moduleName: string,
): Promise<void> {
  const map = await getCategoryMap()
  if (!map[categoryName]) {
    map[categoryName] = {
      name: categoryName,
      modules: [],
      builtin: false,
      order: Object.keys(map).length,
    }
  }
  if (!map[categoryName].modules.includes(moduleName)) {
    map[categoryName].modules.push(moduleName)
  }
  await saveCategoryMap(map)
}

/**
 * Register multiple modules under a category in one write.
 */
export async function registerModulesInCategory(
  categoryName: string,
  moduleNames: string[],
): Promise<void> {
  const map = await getCategoryMap()
  if (!map[categoryName]) {
    map[categoryName] = {
      name: categoryName,
      modules: [],
      builtin: false,
      order: Object.keys(map).length,
    }
  }
  for (const m of moduleNames) {
    if (!map[categoryName].modules.includes(m)) {
      map[categoryName].modules.push(m)
    }
  }
  await saveCategoryMap(map)
}

/**
 * Remove a module from all categories (call when source is deleted).
 */
export async function unregisterModuleFromCategories(moduleName: string): Promise<void> {
  const map = await getCategoryMap()
  let changed = false
  for (const cat of Object.values(map)) {
    const idx = cat.modules.indexOf(moduleName)
    if (idx !== -1) {
      cat.modules.splice(idx, 1)
      changed = true
    }
  }
  if (changed) await saveCategoryMap(map)
}

/**
 * Delete an entire custom category (builtin categories cannot be deleted).
 */
export async function deleteCategory(categoryName: string): Promise<void> {
  const map = await getCategoryMap()
  if (map[categoryName] && !map[categoryName].builtin) {
    delete map[categoryName]
    await saveCategoryMap(map)
  }
}

/**
 * Rename a category (builtin categories cannot be renamed).
 */
export async function renameCategory(oldName: string, newName: string): Promise<void> {
  if (oldName === newName) return
  const map = await getCategoryMap()
  if (!map[oldName] || map[oldName].builtin) return
  map[newName] = { ...map[oldName], name: newName }
  delete map[oldName]
  await saveCategoryMap(map)
}

// ─── Module loader tracking ───────────────────────────────────────────────────

export async function getLoadedModules(): Promise<string[]> {
  return (await getMeta<string[]>(META_KEYS.LOADED_MODULES)) ?? []
}

export async function markModuleLoaded(moduleFile: string): Promise<void> {
  const current = await getLoadedModules()
  if (!current.includes(moduleFile)) {
    await setMeta(META_KEYS.LOADED_MODULES, [...current, moduleFile])
  }
}

export async function getCustomSources(): Promise<string[]> {
  return (await getMeta<string[]>(META_KEYS.CUSTOM_SOURCES)) ?? []
}

export async function addCustomSource(source: string): Promise<void> {
  const current = await getCustomSources()
  if (!current.includes(source)) {
    await setMeta(META_KEYS.CUSTOM_SOURCES, [...current, source])
  }
}

export async function removeCustomSource(source: string): Promise<void> {
  const current = await getCustomSources()
  await setMeta(
    META_KEYS.CUSTOM_SOURCES,
    current.filter((s) => s !== source),
  )
}

// ─── Export all data (for backup) ────────────────────────────────────────────

export async function exportAllData(): Promise<{
  formatVersion: 6
  exportedAt: string
  questions: Question[]
  studyRecords: StudyRecord[]
  questionNotes: QuestionNote[]
  questionAnswerOverrides: QuestionAnswerOverride[]
  questionFlags: QuestionFlag[]
  mockInterviews: MockInterviewSession[]
  jdMatchReports: JdMatchReport[]
  customSources: string[]
  customCategories: CategoryMap
}> {
  const [
    questions,
    studyRecords,
    questionNotes,
    questionAnswerOverrides,
    questionFlags,
    mockInterviews,
    jdMatchReports,
    customSources,
    categoryMap,
  ] = await Promise.all([
    getAllQuestions(),
    getAllStudyRecords(),
    getAllQuestionNotes(),
    getAllQuestionAnswerOverrides(),
    getAllQuestionFlags(),
    getAllMockInterviews(),
    getAllJdMatchReports(),
    getCustomSources(),
    getCategoryMap(),
  ])
  const customCategories: CategoryMap = {}
  for (const [key, entry] of Object.entries(categoryMap)) {
    if (!entry.builtin) customCategories[key] = entry
  }

  return {
    formatVersion: 6,
    exportedAt: new Date().toISOString(),
    questions,
    studyRecords,
    questionNotes,
    questionAnswerOverrides,
    questionFlags,
    mockInterviews,
    jdMatchReports,
    customSources,
    customCategories,
  }
}

// ─── Reset DB ─────────────────────────────────────────────────────────────────

export async function resetDatabase(): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.clear(STORES.QUESTIONS),
    db.clear(STORES.STUDY_RECORDS),
    db.clear(STORES.QUESTION_NOTES),
    db.clear(STORES.QUESTION_NOTE_IMAGES),
    db.clear(STORES.QUESTION_ANSWER_OVERRIDES),
    db.clear(STORES.QUESTION_FLAGS),
    db.clear(STORES.MOCK_INTERVIEWS),
    db.clear(STORES.JD_MATCH_REPORTS),
    db.clear(STORES.META),
  ])
  dbPromise = null
}

/**
 * Get all unique module names that actually have questions in DB.
 * Used to keep the category map in sync with real data.
 */
export async function getActiveModules(): Promise<string[]> {
  const all = await getAllQuestions()
  return [...new Set(all.map((q) => q.module))]
}
