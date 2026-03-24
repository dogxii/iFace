import { type IDBPDatabase, openDB } from 'idb'
import type { Question, StudyRecord } from '@/types'

const DB_NAME = 'iface_db'
const DB_VERSION = 1

export const STORES = {
  QUESTIONS: 'questions',
  STUDY_RECORDS: 'study_records',
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
  const tx = db.transaction(STORES.QUESTIONS, 'readwrite')
  const index = tx.store.index('source')
  let cursor = await index.openCursor(source)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done
}

export async function deleteQuestionById(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORES.QUESTIONS, id)
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
  CATEGORY_MAP: 'category_map', // CategoryMap — user-defined category → modules mapping
} as const

// ─── Default built-in category map ───────────────────────────────────────────

export const DEFAULT_CATEGORY_MAP: CategoryMap = {
  前端: {
    name: '前端',
    modules: ['JS基础', 'React', 'CSS', 'TypeScript', '性能优化', '网络', '手写题', '项目深挖'],
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
    ],
    builtin: true,
    order: 2,
  },
}

// ─── Category map ─────────────────────────────────────────────────────────────

export async function getCategoryMap(): Promise<CategoryMap> {
  const stored = await getMeta<CategoryMap>(META_KEYS.CATEGORY_MAP)
  if (stored && Object.keys(stored).length > 0) return stored
  return { ...DEFAULT_CATEGORY_MAP }
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
  questions: Question[]
  studyRecords: StudyRecord[]
}> {
  const [questions, studyRecords] = await Promise.all([getAllQuestions(), getAllStudyRecords()])
  return { questions, studyRecords }
}

// ─── Reset DB ─────────────────────────────────────────────────────────────────

export async function resetDatabase(): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.clear(STORES.QUESTIONS),
    db.clear(STORES.STUDY_RECORDS),
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
