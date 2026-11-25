/**
 * Turns a resolved `iface-bank@1` package into what the app stores: the bank record, its
 * questions with namespaced ids and its learning checks.
 */
import { moduleKey, questionKey } from '@/data/bank/ids'
import type { ResolvedBank } from '@/data/bank/validate'
import type { InstalledBank, InstalledBankOrigin, Question, StoredLearningChecks } from '@/types'

export interface BankRecords {
  bank: InstalledBank
  questions: Question[]
  checks: StoredLearningChecks[]
}

export interface BankRecordOptions {
  origin: InstalledBankOrigin
  /** The currently installed version, whose user choices (enabled, order) carry over. */
  previous?: Pick<InstalledBank, 'enabled' | 'order' | 'installedAt' | 'checkedAt'>
  /** Used for a first install. */
  order: number
  enabled?: boolean
  now?: number
}

export function bankRecords(
  bankId: string,
  resolved: ResolvedBank,
  { origin, previous, order, enabled = true, now = Date.now() }: BankRecordOptions,
): BankRecords {
  const questions: Question[] = []
  const checks: StoredLearningChecks[] = []

  const modules = resolved.modules.map((mod) => {
    const key = moduleKey(bankId, mod.id)
    for (const question of mod.questions) {
      const id = questionKey(bankId, question.id)
      questions.push({
        id,
        bankId,
        moduleKey: key,
        module: mod.name,
        difficulty: question.difficulty,
        question: question.question,
        answer: question.answer,
        tags: question.tags,
        ...(question.source ? { source: question.source } : {}),
        position: questions.length,
      })
      if (question.checks?.length) checks.push({ questionId: id, bankId, checks: question.checks })
    }
    return {
      key,
      id: mod.id,
      name: mod.name,
      ...(mod.description ? { description: mod.description } : {}),
      ...(mod.icon ? { icon: mod.icon } : {}),
      ...(mod.color ? { color: mod.color } : {}),
      count: mod.questions.length,
    }
  })

  const bank: InstalledBank = {
    id: bankId,
    origin,
    name: resolved.name,
    ...(resolved.description ? { description: resolved.description } : {}),
    version: resolved.version,
    license: resolved.license,
    authors: resolved.authors,
    ...(resolved.homepage ? { homepage: resolved.homepage } : {}),
    modules,
    questionCount: questions.length,
    enabled: previous?.enabled ?? enabled,
    order: previous?.order ?? order,
    installedAt: previous?.installedAt ?? now,
    updatedAt: now,
    ...(previous?.checkedAt ? { checkedAt: previous.checkedAt } : {}),
  }

  return { bank, questions, checks }
}
