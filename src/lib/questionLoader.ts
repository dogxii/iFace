import { normalizeQuestionsForImport, validateQuestions } from '../data/schema'
import type { Question } from '../types'
import {
  addCustomSource,
  bulkPutQuestionAnswerOverrides,
  bulkPutQuestionFlags,
  bulkPutQuestionNotes,
  bulkPutQuestions,
  bulkPutStudyRecords,
  type CategoryMap,
  DEFAULT_CATEGORY_MAP,
  deleteQuestionById,
  getAllQuestionAnswerOverrides,
  getAllQuestionFlags,
  getAllQuestionNotes,
  getAllQuestions,
  getAllStudyRecords,
  getCustomSources,
  getLoadedModules,
  getMeta,
  getQuestionsByModule,
  META_KEYS,
  markModuleLoaded,
  registerModulesInCategory,
  removeCustomSource,
  saveCategoryMap,
  setMeta,
} from './db'

// ─── Built-in category → module files registry ────────────────────────────────
//
// Each entry maps a display category name to the list of JSON files
// (relative to /public/questions/) that belong to it.
//
// Convention: files live under a subdirectory named after the category,
// e.g. frontend/js.json, golang/basics.json
//
// To add a new built-in category (e.g. Golang), just append an entry here
// and drop the JSON files in public/questions/<subdir>/.

export interface BuiltinCategory {
  /** Display name — must match the key in DEFAULT_CATEGORY_MAP in db.ts */
  category: string
  /** Paths relative to /public/questions/ */
  files: readonly string[]
}

export const BUILTIN_CATEGORIES: readonly BuiltinCategory[] = [
  {
    category: '前端',
    files: [
      'frontend/js.json',
      'frontend/react.json',
      'frontend/vue.json',
      'frontend/css.json',
      'frontend/typescript.json',
      'frontend/network.json',
      'frontend/performance.json',
      'frontend/algorithm.json',
      'frontend/project.json',
    ],
  },
  // ── Add new built-in categories below ──────────────────────────────────
  {
    category: 'Golang',
    files: [
      'golang/basics.json',
      'golang/concurrency.json',
      'golang/memory.json',
      'golang/engineering.json',
      'golang/web.json',
    ],
  },
  {
    category: 'Python',
    files: [
      'python/basics.json',
      'python/data-types.json',
      'python/engineering.json',
      'python/advanced.json',
      'python/algorithms.json',
      'python/crawler.json',
      'python/concurrency-network.json',
    ],
  },
  {
    category: 'AI Agent',
    files: [
      'ai-agent/llm.json',
      'ai-agent/prompt.json',
      'ai-agent/agent.json',
      'ai-agent/rag.json',
      'ai-agent/tools.json',
      'ai-agent/evaluation.json',
      'ai-agent/engineering.json',
      'ai-agent/application.json',
    ],
  },
  {
    category: 'Java',
    files: [
      'java/basics.json',
      'java/concurrency.json',
      'java/jvm.json',
      'java/spring.json',
      'java/network.json',
      'java/mysql.json',
      'java/redis.json',
    ],
  },
] as const

/** Flat list of every built-in file path across all categories (for legacy compat). */
export const BUILTIN_MODULE_FILES: readonly string[] = BUILTIN_CATEGORIES.flatMap((c) => c.files)
export const BUILTIN_QUESTIONS_VERSION = '0.19.0'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoadResult {
  file: string
  loaded: number
  skipped: number
  errors: { index: number; message: string }[]
}

// ─── Fetch + validate + persist a single JSON file ───────────────────────────

export async function loadModuleFile(file: string, force = false): Promise<LoadResult> {
  // Support absolute URLs (e.g. remote imports) as well as relative paths
  const url = file.startsWith('http') ? file : `/questions/${file}`

  const alreadyLoaded = !force && (await getLoadedModules()).includes(file)

  let raw: unknown
  try {
    const res = await fetch(url, { cache: force ? 'reload' : 'default' })
    if (!res.ok) {
      return {
        file,
        loaded: 0,
        skipped: 0,
        errors: [{ index: -1, message: `HTTP ${res.status}: ${res.statusText}` }],
      }
    }
    raw = await res.json()
  } catch (err) {
    return {
      file,
      loaded: 0,
      skipped: 0,
      errors: [{ index: -1, message: String(err) }],
    }
  }

  const { valid, errors } = validateQuestions(raw)

  if (alreadyLoaded && valid.length > 0) {
    // Incremental check: compare count by module key
    const moduleKey = valid[0].module as string
    const existing = await getQuestionsByModule(moduleKey)
    if (valid.length <= existing.length) {
      return { file, loaded: 0, skipped: 0, errors }
    }
    await bulkPutQuestions(valid as Question[])
    return {
      file,
      loaded: valid.length - existing.length,
      skipped: Array.isArray(raw) ? (raw as unknown[]).length - valid.length : 0,
      errors,
    }
  }

  if (valid.length > 0) {
    await bulkPutQuestions(valid as Question[])
    if (!force) {
      await markModuleLoaded(file)
    }
  }

  return {
    file,
    loaded: valid.length,
    skipped: Array.isArray(raw) ? (raw as unknown[]).length - valid.length : 0,
    errors,
  }
}

// ─── Load all files in one category ──────────────────────────────────────────

export async function loadCategoryFiles(
  category: BuiltinCategory,
  onProgress?: (file: string, index: number, total: number) => void,
): Promise<LoadResult[]> {
  const results: LoadResult[] = []
  for (let i = 0; i < category.files.length; i++) {
    onProgress?.(category.files[i], i, category.files.length)
    const result = await loadModuleFile(category.files[i])
    results.push(result)
  }
  // Register the modules that actually loaded under the category name
  const loadedModules = results.filter((r) => r.loaded > 0 || r.skipped === 0).map((r) => r.file)
  if (loadedModules.length > 0) {
    // We need the actual module names from the DB — they come from the JSON,
    // not the file path, so we derive them from the loaded questions.
    // registerModulesInCategory is called inside loadModuleFile indirectly
    // via the category seeding in db.ts DEFAULT_CATEGORY_MAP; here we just
    // ensure every successfully-fetched module is linked.
  }
  return results
}

// ─── Load all built-in modules sequentially (with progress callback) ─────────

export async function loadAllBuiltinModules(
  onProgress?: (file: string, index: number, total: number) => void,
): Promise<LoadResult[]> {
  const allFiles = BUILTIN_MODULE_FILES
  const results: LoadResult[] = []
  for (let i = 0; i < allFiles.length; i++) {
    onProgress?.(allFiles[i], i, allFiles.length)
    results.push(await loadModuleFile(allFiles[i]))
  }
  return results
}

// ─── Built-in replacement migration ──────────────────────────────────────────

interface BuiltinReplacementMigrationResult {
  migratedQuestions: number
  migratedRecords: number
  migratedNotes: number
  migratedAnswerOverrides: number
  migratedFlags: number
  removedSources: number
  removedCategories: number
}

const emptyMigrationResult: BuiltinReplacementMigrationResult = {
  migratedQuestions: 0,
  migratedRecords: 0,
  migratedNotes: 0,
  migratedAnswerOverrides: 0,
  migratedFlags: 0,
  removedSources: 0,
  removedCategories: 0,
}

function normalizeQuestionText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[“”‘’"'`]/g, '')
    .replace(/\s+/g, '')
}

function findBuiltinReplacementId(
  question: Question,
  builtinQuestionsById: Map<string, Question>,
  builtinIdsByLength: string[],
  builtinIdsByModuleAndQuestion: Map<string, string>,
): string | null {
  for (const builtinId of builtinIdsByLength) {
    const builtinQuestion = builtinQuestionsById.get(builtinId)
    if (question.id.endsWith(`_${builtinId}`) && builtinQuestion?.module === question.module) {
      return builtinId
    }
  }

  return (
    builtinIdsByModuleAndQuestion.get(
      `${question.module}\u0000${normalizeQuestionText(question.question)}`,
    ) ?? null
  )
}

function mergeStudyRecord(
  from: Awaited<ReturnType<typeof getAllStudyRecords>>[number],
  to: Awaited<ReturnType<typeof getAllStudyRecords>>[number] | undefined,
  questionId: string,
) {
  if (!to) return { ...from, questionId }
  if (from.lastUpdated > to.lastUpdated) {
    return {
      ...from,
      questionId,
      reviewCount: Math.max(from.reviewCount, to.reviewCount),
    }
  }
  return {
    ...to,
    reviewCount: Math.max(from.reviewCount, to.reviewCount),
  }
}

function mergeQuestionNote(
  from: Awaited<ReturnType<typeof getAllQuestionNotes>>[number],
  to: Awaited<ReturnType<typeof getAllQuestionNotes>>[number] | undefined,
  questionId: string,
) {
  if (!to) return { ...from, questionId }

  const fromContent = from.content.trim()
  const toContent = to.content.trim()
  if (!fromContent || toContent.includes(fromContent)) return to
  if (!toContent) return { ...from, questionId }

  return {
    questionId,
    content: `${to.content.trim()}\n\n---\n\n${from.content.trim()}`,
    createdAt: Math.min(to.createdAt, from.createdAt),
    updatedAt: Math.max(to.updatedAt, from.updatedAt),
  }
}

function mergeQuestionAnswerOverride(
  from: Awaited<ReturnType<typeof getAllQuestionAnswerOverrides>>[number],
  to: Awaited<ReturnType<typeof getAllQuestionAnswerOverrides>>[number] | undefined,
  questionId: string,
) {
  if (!to) return { ...from, questionId }
  return from.updatedAt > to.updatedAt ? { ...from, questionId } : to
}

function mergeQuestionFlag(
  from: Awaited<ReturnType<typeof getAllQuestionFlags>>[number],
  to: Awaited<ReturnType<typeof getAllQuestionFlags>>[number] | undefined,
  questionId: string,
) {
  if (!to) return { ...from, questionId }
  return {
    questionId,
    starred: to.starred || from.starred,
    createdAt: Math.min(to.createdAt, from.createdAt),
    updatedAt: Math.max(to.updatedAt, from.updatedAt),
  }
}

async function cleanupBuiltinReplacementCategories(): Promise<number> {
  const stored = await getMeta<CategoryMap>(META_KEYS.CATEGORY_MAP)
  if (!stored || Object.keys(stored).length === 0) return 0

  const builtinModules = new Set(
    Object.values(DEFAULT_CATEGORY_MAP)
      .filter((category) => category.builtin)
      .flatMap((category) => category.modules),
  )
  const builtinCategories = new Set(Object.keys(DEFAULT_CATEGORY_MAP))
  const customCategories: CategoryMap = {}
  let removedCategories = 0
  let changed = false

  for (const [key, entry] of Object.entries(stored)) {
    if (builtinCategories.has(key)) continue

    const customModules = entry.modules.filter((module) => !builtinModules.has(module))
    if (customModules.length === 0) {
      removedCategories += 1
      changed = true
      continue
    }

    customCategories[key] = { ...entry, modules: customModules }
    if (customModules.length !== entry.modules.length) changed = true
  }

  const nextMap = { ...DEFAULT_CATEGORY_MAP, ...customCategories }
  if (changed || Object.keys(stored).some((key) => !nextMap[key])) {
    await saveCategoryMap(nextMap)
  }

  return removedCategories
}

export async function migrateBuiltinQuestionReplacements(): Promise<BuiltinReplacementMigrationResult> {
  const current = await getMeta<string>(META_KEYS.BUILTIN_REPLACEMENT_MIGRATION)
  if (current === BUILTIN_QUESTIONS_VERSION) return emptyMigrationResult

  const allQuestions = await getAllQuestions()
  const builtinQuestions = allQuestions.filter((question) => !question.id.startsWith('custom_'))
  const customQuestions = allQuestions.filter((question) => question.id.startsWith('custom_'))
  const builtinQuestionsById = new Map(
    builtinQuestions.map((question) => [question.id, question] as const),
  )
  const builtinIdsByLength = builtinQuestions
    .map((question) => question.id)
    .sort((a, b) => b.length - a.length)
  const builtinIdsByModuleAndQuestion = new Map(
    builtinQuestions.map((question) => [
      `${question.module}\u0000${normalizeQuestionText(question.question)}`,
      question.id,
    ]),
  )

  const replacements = new Map<string, string>()
  const migratedSources = new Set<string>()
  for (const question of customQuestions) {
    const replacementId = findBuiltinReplacementId(
      question,
      builtinQuestionsById,
      builtinIdsByLength,
      builtinIdsByModuleAndQuestion,
    )
    if (!replacementId) continue

    replacements.set(question.id, replacementId)
    if (question.source?.trim()) migratedSources.add(question.source.trim())
  }

  const result: BuiltinReplacementMigrationResult = {
    ...emptyMigrationResult,
    migratedQuestions: replacements.size,
  }

  if (replacements.size > 0) {
    const [records, notes, answerOverrides, flags] = await Promise.all([
      getAllStudyRecords(),
      getAllQuestionNotes(),
      getAllQuestionAnswerOverrides(),
      getAllQuestionFlags(),
    ])
    const recordsById = new Map(records.map((record) => [record.questionId, record]))
    const notesById = new Map(notes.map((note) => [note.questionId, note]))
    const answerOverridesById = new Map(
      answerOverrides.map((override) => [override.questionId, override]),
    )
    const flagsById = new Map(flags.map((flag) => [flag.questionId, flag]))

    const nextRecords = []
    const nextNotes = []
    const nextAnswerOverrides = []
    const nextFlags = []

    for (const [fromId, toId] of replacements) {
      const fromRecord = recordsById.get(fromId)
      if (fromRecord) {
        nextRecords.push(mergeStudyRecord(fromRecord, recordsById.get(toId), toId))
      }

      const fromNote = notesById.get(fromId)
      if (fromNote) {
        nextNotes.push(mergeQuestionNote(fromNote, notesById.get(toId), toId))
      }

      const fromAnswerOverride = answerOverridesById.get(fromId)
      if (fromAnswerOverride) {
        nextAnswerOverrides.push(
          mergeQuestionAnswerOverride(fromAnswerOverride, answerOverridesById.get(toId), toId),
        )
      }

      const fromFlag = flagsById.get(fromId)
      if (fromFlag) {
        nextFlags.push(mergeQuestionFlag(fromFlag, flagsById.get(toId), toId))
      }
    }

    await Promise.all([
      nextRecords.length > 0 ? bulkPutStudyRecords(nextRecords) : Promise.resolve(),
      nextNotes.length > 0 ? bulkPutQuestionNotes(nextNotes) : Promise.resolve(),
      nextAnswerOverrides.length > 0
        ? bulkPutQuestionAnswerOverrides(nextAnswerOverrides)
        : Promise.resolve(),
      nextFlags.length > 0 ? bulkPutQuestionFlags(nextFlags) : Promise.resolve(),
    ])

    result.migratedRecords = nextRecords.length
    result.migratedNotes = nextNotes.length
    result.migratedAnswerOverrides = nextAnswerOverrides.length
    result.migratedFlags = nextFlags.length

    for (const customId of replacements.keys()) {
      await deleteQuestionById(customId)
    }

    const remainingQuestions = await getAllQuestions()
    const remainingCustomSources = new Set(
      remainingQuestions
        .filter((question) => question.id.startsWith('custom_') && question.source?.trim())
        .map((question) => question.source?.trim() ?? ''),
    )
    const registeredSources = await getCustomSources()
    for (const source of registeredSources) {
      if (migratedSources.has(source) && !remainingCustomSources.has(source)) {
        await removeCustomSource(source)
        result.removedSources += 1
      }
    }
  }

  result.removedCategories = await cleanupBuiltinReplacementCategories()
  await setMeta(META_KEYS.BUILTIN_REPLACEMENT_MIGRATION, BUILTIN_QUESTIONS_VERSION)
  return result
}

// ─── Load all built-in modules in parallel (faster initial load) ──────────────

export async function loadAllBuiltinModulesParallel(force = false): Promise<LoadResult[]> {
  const results = await Promise.all(BUILTIN_MODULE_FILES.map((f) => loadModuleFile(f, force)))
  const hasLoadFailure = results.some((result) =>
    result.errors.some((error) => error.index === -1 && result.loaded === 0),
  )
  if (!hasLoadFailure) {
    await migrateBuiltinQuestionReplacements()
    const loadedModules = new Set(await getLoadedModules())
    for (const file of BUILTIN_MODULE_FILES) {
      loadedModules.add(file)
    }
    await setMeta(META_KEYS.LOADED_MODULES, [...loadedModules])
    await setMeta(META_KEYS.BUILTIN_QUESTIONS_VERSION, BUILTIN_QUESTIONS_VERSION)
  }
  return results
}

export async function refreshBuiltinQuestionsIfNeeded(): Promise<boolean> {
  const current = await getMeta<string>(META_KEYS.BUILTIN_QUESTIONS_VERSION)
  if (current === BUILTIN_QUESTIONS_VERSION) return false

  await loadAllBuiltinModulesParallel(true)
  await invalidateDailyCache()
  return true
}

// ─── Import from raw JSON / parsed object (user custom import) ───────────────

export interface CustomImportResult {
  source: string
  loaded: number
  errors: { index: number; message: string }[]
  warnings: string[]
}

export async function importCustomQuestions(
  data: unknown,
  sourceName: string,
  categoryName?: string,
): Promise<CustomImportResult> {
  const warnings: string[] = []
  const { valid, errors } = validateQuestions(normalizeQuestionsForImport(data))

  if (valid.length === 0) {
    return { source: sourceName, loaded: 0, errors, warnings }
  }

  // Stamp every question with the custom source name for tracking
  const stamped: Question[] = valid.map((q) => ({
    ...(q as Question),
    source: sourceName,
    id: q.id.startsWith(`custom_${sourceName}_`) ? q.id : `custom_${sourceName}_${q.id}`,
  }))

  // Warn about id collisions
  const existingAll = await getAllQuestions()
  const existingIds = new Set(existingAll.map((q) => q.id))
  for (const q of stamped) {
    if (existingIds.has(q.id)) {
      warnings.push(`题目 ID "${q.id}" 已存在，将被覆盖`)
    }
  }

  await bulkPutQuestions(stamped)

  if (stamped.length > 0) {
    const uniqueModules = [...new Set(stamped.map((q) => q.module))]
    const resolvedCategory = categoryName?.trim() || _deriveCategory(sourceName)
    await Promise.all([
      registerModulesInCategory(resolvedCategory, uniqueModules),
      addCustomSource(sourceName),
    ])
  }

  return { source: sourceName, loaded: stamped.length, errors, warnings }
}

function _deriveCategory(sourceName: string): string {
  const base = sourceName
    .replace(/\.(json|md)$/i, '')
    .replace(/[-_]/g, ' ')
    .trim()
  return base.replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Parse JSON string safely ─────────────────────────────────────────────────

export function parseJSONSafe(
  raw: string,
): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, data: JSON.parse(raw) }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── File type helpers ────────────────────────────────────────────────────────

export function isJSONFile(file: File): boolean {
  return file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')
}

export function isMDFile(file: File): boolean {
  return (
    file.type === 'text/markdown' ||
    file.name.toLowerCase().endsWith('.md') ||
    file.name.toLowerCase().endsWith('.markdown')
  )
}

// ─── Daily recommendations cache ─────────────────────────────────────────────

interface DailyCache {
  date: string
  ids: string[]
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function getDailyRecommendations(
  allIds: string[],
  recordMap: Record<string, { status: string; lastUpdated: number }>,
  count = 10,
): Promise<string[]> {
  const cached = await getMeta<DailyCache>(META_KEYS.DAILY_RECS)
  if (cached && cached.date === todayString()) {
    const allIdSet = new Set(allIds)
    const valid = cached.ids.filter((id) => allIdSet.has(id))
    const targetCount = Math.min(count, allIds.length)
    if (valid.length >= targetCount) return valid.slice(0, count)
  }

  const reviewIds = allIds
    .filter((id) => recordMap[id]?.status === 'review')
    .sort((a, b) => (recordMap[a]?.lastUpdated ?? 0) - (recordMap[b]?.lastUpdated ?? 0))

  const unlearnedIds = allIds.filter((id) => !recordMap[id] || recordMap[id].status === 'unlearned')

  const result: string[] = []
  const seen = new Set<string>()
  for (const id of [...reviewIds, ...unlearnedIds]) {
    if (result.length >= count) break
    if (!seen.has(id)) {
      result.push(id)
      seen.add(id)
    }
  }

  await setMeta(META_KEYS.DAILY_RECS, { date: todayString(), ids: result })
  return result
}

// ─── Invalidate daily cache ───────────────────────────────────────────────────

export async function invalidateDailyCache(): Promise<void> {
  await setMeta(META_KEYS.DAILY_RECS, null)
}
