/**
 * Converting between what the app stores and the `iface-bank@1` package format.
 *
 * A local bank travels (backup file, Gist, "export as package") as a single-file package with
 * inline questions, so restoring it runs the same validator as installing any other bank.
 */
import { parseQuestionKey } from '@/data/bank/ids'
import { BANK_FORMAT, BANK_SCHEMA_URL, type BankQuestion } from '@/data/bank/schema'
import { type ResolvedBank, resolveBank } from '@/data/bank/validate'
import type { InstalledBank, Question, StoredLearningChecks } from '@/types'
import { type BankRecords, bankRecords } from './records'

/** Single-file `iface-bank@1` package: the manifest with every module's questions inline. */
export interface InlineBankPackage {
  $schema?: string
  format: typeof BANK_FORMAT
  name: string
  description?: string
  version: string
  license: string
  authors?: string[]
  language?: string
  tags?: string[]
  homepage?: string
  modules: {
    id: string
    name: string
    description?: string
    icon?: string
    color?: string
    questions: BankQuestion[]
  }[]
}

/** Rebuilds the package content of an installed bank from its stored rows. */
export function storedToResolved(
  bank: InstalledBank,
  questions: readonly Question[],
  checks: readonly StoredLearningChecks[],
): ResolvedBank {
  const checksById = new Map(checks.map((entry) => [entry.questionId, entry.checks]))
  const byModule = new Map<string, Question[]>()
  for (const question of [...questions].sort((a, b) => a.position - b.position)) {
    const list = byModule.get(question.moduleKey) ?? []
    list.push(question)
    byModule.set(question.moduleKey, list)
  }

  const modules = bank.modules.map((mod) => ({
    id: mod.id,
    name: mod.name,
    ...(mod.description ? { description: mod.description } : {}),
    ...(mod.icon ? { icon: mod.icon } : {}),
    ...(mod.color ? { color: mod.color } : {}),
    questions: (byModule.get(mod.key) ?? []).map((question): BankQuestion => {
      const localId = parseQuestionKey(question.id)?.localId ?? question.id
      const questionChecks = checksById.get(question.id)
      return {
        id: localId,
        difficulty: question.difficulty,
        question: question.question,
        answer: question.answer,
        tags: question.tags,
        ...(question.source ? { source: question.source } : {}),
        ...(questionChecks?.length ? { checks: questionChecks } : {}),
      }
    }),
  }))

  return {
    name: bank.name,
    ...(bank.description ? { description: bank.description } : {}),
    version: bank.version,
    license: bank.license,
    authors: bank.authors,
    language: 'zh-CN',
    tags: [],
    ...(bank.homepage ? { homepage: bank.homepage } : {}),
    modules,
    questionCount: modules.reduce((sum, mod) => sum + mod.questions.length, 0),
    bytes: 0,
    files: [],
  }
}

export function resolvedToPackage(bank: ResolvedBank): InlineBankPackage {
  return {
    $schema: BANK_SCHEMA_URL,
    format: BANK_FORMAT,
    name: bank.name,
    ...(bank.description ? { description: bank.description } : {}),
    version: bank.version,
    license: bank.license,
    ...(bank.authors.length ? { authors: bank.authors } : {}),
    ...(bank.language !== 'zh-CN' ? { language: bank.language } : {}),
    ...(bank.tags.length ? { tags: bank.tags } : {}),
    ...(bank.homepage ? { homepage: bank.homepage } : {}),
    modules: bank.modules
      .filter((mod) => mod.questions.length > 0)
      .map((mod) => ({
        id: mod.id,
        name: mod.name,
        ...(mod.description ? { description: mod.description } : {}),
        ...(mod.icon ? { icon: mod.icon } : {}),
        ...(mod.color ? { color: mod.color } : {}),
        questions: mod.questions,
      })),
  }
}

// ─── Snapshots (backup / sync) ────────────────────────────────────────────────

/** A local bank as it is written to backups and the Gist. */
export interface BankSnapshot {
  id: string
  enabled: boolean
  order: number
  installedAt: number
  updatedAt: number
  package: InlineBankPackage
}

export function snapshotBank(
  bank: InstalledBank,
  questions: readonly Question[],
  checks: readonly StoredLearningChecks[],
): BankSnapshot {
  return {
    id: bank.id,
    enabled: bank.enabled,
    order: bank.order,
    installedAt: bank.installedAt,
    updatedAt: bank.updatedAt,
    package: resolvedToPackage(storedToResolved(bank, questions, checks)),
  }
}

export function isBankSnapshot(value: unknown): value is BankSnapshot {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    v.id.startsWith('local.') &&
    typeof v.enabled === 'boolean' &&
    typeof v.order === 'number' &&
    typeof v.installedAt === 'number' &&
    typeof v.updatedAt === 'number' &&
    Boolean(v.package) &&
    typeof v.package === 'object'
  )
}

/**
 * Validates a snapshot (it comes from a file or the network) and turns it into rows to store.
 * Returns the first error instead when the package does not validate.
 */
export async function restoreSnapshot(
  snapshot: BankSnapshot,
): Promise<{ records: BankRecords; error?: undefined } | { records: null; error: string }> {
  const { bank, issues } = await resolveBank(JSON.stringify(snapshot.package))
  // The validator skips bad questions; a restore must not silently lose any.
  const error = issues.find((issue) => issue.level === 'error')
  if (!bank || error) return { records: null, error: error?.message ?? '题库内容无效' }
  return {
    records: bankRecords(snapshot.id, bank, {
      origin: { kind: 'local' },
      order: snapshot.order,
      now: snapshot.updatedAt,
      previous: {
        enabled: snapshot.enabled,
        order: snapshot.order,
        installedAt: snapshot.installedAt,
      },
    }),
  }
}
