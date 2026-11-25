// COMPAT: remove after 2027-06-30
/**
 * Applies the 1.5 → 2.0 migration to this browser's data, once:
 *
 * - imported questions become local banks; official questions are already reinstalled from
 *   the bundled banks, so their old copies are simply dropped
 * - study records, notes, note images, highlights, custom answers, flags, mock interview
 *   recommendations, AI chats and the unsaved note draft move to the new question ids
 * - hidden categories become disabled banks
 * - 1.x bookkeeping (category map, loaded modules, custom sources…) is removed
 *
 * Must run after the official banks are installed and before anything reads study data.
 */
import { bankRecords } from '@/lib/banks/records'
import { getAllBanks, getDB, putBank, STORES, writeBank } from '@/lib/db'
import { readJSON, STORAGE_KEYS, writeJSON } from '@/lib/storage'
import type { MockInterviewSession } from '@/types'
import {
  isLegacyQuestionId,
  type LegacyQuestion,
  newerByField,
  planLegacyMigration,
  remapByQuestionId,
  remapIdList,
  remapQuestionRefs,
} from './plan'

const DONE_META = 'legacy15_migrated'
const LEGACY_META_KEYS = [
  'loaded_modules',
  'custom_sources',
  'daily_recommendations',
  'builtin_questions_version',
  'builtin_replacement_migration',
  'category_map',
]
const LEGACY_HIDDEN_CATEGORIES_KEY = 'iface_hidden_categories'

function readHiddenCategories(): string[] {
  try {
    const raw = localStorage.getItem(LEGACY_HIDDEN_CATEGORIES_KEY)
    const value: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

/** Old question id → new key, for every official question currently installed. */
export async function officialKeysByLegacyId(): Promise<Map<string, string>> {
  const db = await getDB()
  const keys = (await db.getAllKeys(STORES.QUESTIONS)) as string[]
  const map = new Map<string, string>()
  for (const key of keys) {
    if (!key.startsWith('iface.')) continue
    const localId = key.slice(key.indexOf(':') + 1)
    map.set(localId, key)
  }
  return map
}

/** Returns true when it migrated anything. */
export async function migrateLegacy15(): Promise<boolean> {
  const db = await getDB()
  if (await db.get(STORES.META, DONE_META)) return false

  const allQuestions = (await db.getAll(STORES.QUESTIONS)) as (LegacyQuestion & {
    bankId?: string
  })[]
  const legacyQuestions = allQuestions.filter((question) => !question.bankId)
  const hiddenCategories = readHiddenCategories()

  const plan = planLegacyMigration({
    questions: legacyQuestions,
    officialKeys: await officialKeysByLegacyId(),
    hiddenCategories,
  })

  // 1. Local banks for imported questions.
  const existingBanks = await getAllBanks()
  let order = existingBanks.reduce((max, bank) => Math.max(max, bank.order), -1) + 1
  for (const local of plan.localBanks) {
    const records = bankRecords(local.id, local.bank, { origin: { kind: 'local' }, order: order++ })
    await writeBank(records.bank, records.questions, records.checks)
  }

  // 2. Move study data to the new ids.
  const idMap = plan.idMap
  const rewrite = async <T extends { questionId: string }>(
    store: string,
    transform: (items: T[]) => T[],
  ) => {
    const tx = db.transaction(store, 'readwrite')
    const items = (await tx.store.getAll()) as T[]
    await tx.store.clear()
    await Promise.all([...transform(items).map((item) => tx.store.put(item)), tx.done])
  }
  const byUpdated = newerByField('updatedAt')
  await rewrite<{ questionId: string; lastUpdated: number }>(STORES.STUDY_RECORDS, (items) =>
    remapByQuestionId(items, idMap, newerByField('lastUpdated')),
  )
  await rewrite<{ questionId: string; updatedAt: number }>(STORES.QUESTION_NOTES, (items) =>
    remapByQuestionId(items, idMap, byUpdated),
  )
  await rewrite<{ questionId: string; updatedAt: number }>(
    STORES.QUESTION_ANSWER_OVERRIDES,
    (items) => remapByQuestionId(items, idMap, byUpdated),
  )
  await rewrite<{ questionId: string; updatedAt: number }>(STORES.QUESTION_FLAGS, (items) =>
    remapByQuestionId(items, idMap, byUpdated),
  )
  await rewrite<{ questionId: string }>(STORES.QUESTION_ANSWER_ANNOTATIONS, (items) =>
    remapQuestionRefs(items, idMap),
  )
  await rewrite<{ questionId: string }>(STORES.QUESTION_NOTE_IMAGES, (items) =>
    remapQuestionRefs(items, idMap),
  )
  {
    const tx = db.transaction(STORES.MOCK_INTERVIEWS, 'readwrite')
    const sessions = (await tx.store.getAll()) as MockInterviewSession[]
    await Promise.all([
      ...sessions
        .filter((session) => session.report?.recommendedQuestionIds.length)
        .map((session) =>
          tx.store.put({
            ...session,
            report: session.report && {
              ...session.report,
              recommendedQuestionIds: remapIdList(session.report.recommendedQuestionIds, idMap),
            },
          }),
        ),
      tx.done,
    ])
  }

  // 3. Drop the old question copies and 1.x bookkeeping.
  {
    const tx = db.transaction([STORES.QUESTIONS, STORES.META], 'readwrite')
    await Promise.all([
      ...legacyQuestions
        .filter((question) => isLegacyQuestionId(question.id))
        .map((question) => tx.objectStore(STORES.QUESTIONS).delete(question.id)),
      ...LEGACY_META_KEYS.map((key) => tx.objectStore(STORES.META).delete(key)),
      tx.objectStore(STORES.META).put({ key: DONE_META, value: Date.now() }),
      tx.done,
    ])
  }

  // 4. Hidden categories → disabled banks.
  for (const bank of await getAllBanks()) {
    if (plan.disabledBankIds.includes(bank.id) && bank.enabled) {
      await putBank({ ...bank, enabled: false })
    }
  }
  try {
    localStorage.removeItem(LEGACY_HIDDEN_CATEGORIES_KEY)
  } catch {}

  // 5. localStorage: AI chats and the unsaved note draft.
  const sessions = readJSON<Record<string, { questionId: string }> | null>(
    STORAGE_KEYS.aiSessions,
    (value) =>
      value && typeof value === 'object' ? (value as Record<string, { questionId: string }>) : null,
    null,
  )
  if (sessions) {
    const next: Record<string, { questionId: string }> = {}
    for (const [id, session] of Object.entries(sessions)) {
      const key = idMap.get(id) ?? id
      next[key] = { ...session, questionId: key }
    }
    writeJSON(STORAGE_KEYS.aiSessions, next)
  }
  const draft = readJSON<{ questionId: string } | null>(
    STORAGE_KEYS.noteDraft,
    (value) => (value && typeof value === 'object' ? (value as { questionId: string }) : null),
    null,
  )
  const draftKey = draft && idMap.get(draft.questionId)
  if (draft && draftKey) writeJSON(STORAGE_KEYS.noteDraft, { ...draft, questionId: draftKey })

  return legacyQuestions.length > 0
}
