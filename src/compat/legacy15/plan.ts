// COMPAT: remove after 2027-06-30
/**
 * Pure part of the 1.5 → 2.0 migration: works out the new id of every pre-2.0 question and
 * which local banks to create for imported questions. `run.ts` applies the plan to IndexedDB
 * and localStorage; backup and Gist imports reuse `planLegacyMigration` + `remapQuestionIds`.
 *
 * Pre-2.0 ids:
 *   official  `js-001`                      → `iface.frontend:js-001`
 *   imported  `custom_<source>_<id>`        → `local.<slug>-<rand>:<id>` (one bank per source)
 */
import { localBankId, questionKey, slugify, toLocalId, uniqueLocalId } from '@/data/bank/ids'
import { BANK_LIMITS, type BankQuestion } from '@/data/bank/schema'
import type { ResolvedBank } from '@/data/bank/validate'
import { fitQuestion } from '@/lib/banks/localImport'

export interface LegacyQuestion {
  id: string
  module: string
  difficulty: 1 | 2 | 3
  question: string
  answer: string
  tags?: string[]
  source?: string
}

export interface LegacyPlanInput {
  /** Pre-2.0 questions (official and imported) found in the old store or a backup. */
  questions: LegacyQuestion[]
  /** Current official questions, local id → full key. */
  officialKeys: ReadonlyMap<string, string>
  /** Value of the old `iface_hidden_categories` preference. */
  hiddenCategories?: readonly string[]
  /**
   * Suffix for a new local bank id. Defaults to a hash of the source name, so running the
   * migration again after an interruption lands on the same bank instead of a duplicate.
   */
  suffixFor?: (source: string) => string
}

export interface LegacyLocalBank {
  id: string
  source: string
  bank: ResolvedBank
}

export interface LegacyPlan {
  /** Old question id → new key. Old ids without a mapping are left alone. */
  idMap: Map<string, string>
  localBanks: LegacyLocalBank[]
  /** Banks to disable because their old category was hidden. */
  disabledBankIds: string[]
}

/** Pre-2.0 built-in category names → official bank ids. */
export const LEGACY_CATEGORY_BANKS: Readonly<Record<string, string>> = {
  前端: 'iface.frontend',
  Golang: 'iface.golang',
  'AI Agent': 'iface.ai-agent',
  Java: 'iface.java',
}

const CUSTOM_PREFIX = 'custom_'

export function isLegacyQuestionId(id: string): boolean {
  return !id.includes(':')
}

/** Mirrors how 1.x named the category of an imported file. */
export function legacySourceName(source: string): string {
  return source
    .replace(/\.(json|md)$/i, '')
    .replace(/[-_]/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function stableSuffix(source: string): string {
  let hash = 2166136261
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36).slice(-4).padStart(4, '0')
}

export function planLegacyMigration({
  questions,
  officialKeys,
  hiddenCategories = [],
  suffixFor = stableSuffix,
}: LegacyPlanInput): LegacyPlan {
  // Data may reference official questions the input does not carry (Gist payloads never do).
  const idMap = new Map<string, string>(officialKeys)
  const imported = new Map<string, LegacyQuestion[]>()

  for (const question of questions) {
    if (!isLegacyQuestionId(question.id)) continue
    if (question.id.startsWith(CUSTOM_PREFIX)) {
      const source = question.source?.trim() || 'imported'
      const group = imported.get(source) ?? []
      group.push(question)
      imported.set(source, group)
    }
  }

  const hidden = new Set(hiddenCategories)
  const disabledBankIds = Object.entries(LEGACY_CATEGORY_BANKS)
    .filter(([category]) => hidden.has(category))
    .map(([, bankId]) => bankId)

  const localBanks: LegacyLocalBank[] = []
  for (const [source, group] of imported) {
    const name = legacySourceName(source) || '导入的题目'
    const slug = (slugify(name) || 'imported').slice(0, 40)
    const bankId = localBankId(`${slug}-${suffixFor(source)}`)
    const modules = new Map<string, { id: string; name: string; questions: BankQuestion[] }>()
    const moduleIds = new Set<string>()
    const questionIds = new Set<string>()
    let count = 0

    group.forEach((question, index) => {
      let mod = modules.get(question.module)
      if (!mod) {
        const id = uniqueLocalId(slugify(question.module) || `m${modules.size + 1}`, moduleIds)
        mod = { id, name: question.module.slice(0, 20) || '未分组', questions: [] }
        modules.set(question.module, mod)
      }
      const prefix = `${CUSTOM_PREFIX}${source}_`
      const raw = question.id.startsWith(prefix) ? question.id.slice(prefix.length) : question.id
      const localId = uniqueLocalId(toLocalId(raw, `q-${index + 1}`), questionIds)
      // 1.x had no length limits; clip so the bank stays a valid package (backup, sync).
      const fitted = fitQuestion(
        {
          module: question.module,
          difficulty: question.difficulty,
          question: question.question.slice(0, BANK_LIMITS.questionLength),
          answer: question.answer.slice(0, BANK_LIMITS.answerLength),
          tags: question.tags,
        },
        localId,
      )
      if ('error' in fitted) return
      mod.questions.push(fitted.question)
      count++
      idMap.set(question.id, questionKey(bankId, localId))
    })

    if (count === 0) continue
    const bankModules = [...modules.values()]
    localBanks.push({
      id: bankId,
      source,
      bank: {
        name: name.slice(0, 40),
        version: '1.0.0',
        license: 'NOASSERTION',
        authors: [],
        language: 'zh-CN',
        tags: [],
        modules: bankModules.filter((mod) => mod.questions.length > 0),
        questionCount: count,
        bytes: 0,
        files: [],
      },
    })
    if (hidden.has(name)) disabledBankIds.push(bankId)
  }

  return { idMap, localBanks, disabledBankIds }
}

// ─── Remapping study data ─────────────────────────────────────────────────────

/**
 * Renames `questionId` on every item. When two items land on the same key (data that was
 * already migrated plus an old copy), `pickNewer` decides which one survives.
 */
export function remapByQuestionId<T extends { questionId: string }>(
  items: readonly T[],
  idMap: ReadonlyMap<string, string>,
  pickNewer: (a: T, b: T) => T,
): T[] {
  const byKey = new Map<string, T>()
  for (const item of items) {
    const questionId = idMap.get(item.questionId) ?? item.questionId
    const next = questionId === item.questionId ? item : { ...item, questionId }
    const existing = byKey.get(questionId)
    byKey.set(questionId, existing ? pickNewer(existing, next) : next)
  }
  return [...byKey.values()]
}

/** For stores keyed by their own id (annotations, note images): only the reference moves. */
export function remapQuestionRefs<T extends { questionId: string }>(
  items: readonly T[],
  idMap: ReadonlyMap<string, string>,
): T[] {
  return items.map((item) => {
    const questionId = idMap.get(item.questionId)
    return questionId ? { ...item, questionId } : item
  })
}

export function remapIdList(ids: readonly string[], idMap: ReadonlyMap<string, string>): string[] {
  return ids.map((id) => idMap.get(id) ?? id)
}

export function newerByField<K extends string>(field: K) {
  return <T extends Record<K, number>>(a: T, b: T): T => (b[field] > a[field] ? b : a)
}
