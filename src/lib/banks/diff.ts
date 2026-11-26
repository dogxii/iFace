/** What installing a new version of a bank changes, by question key. */
import { questionKey } from '@/data/bank/ids'
import type { ResolvedBank } from '@/data/bank/validate'
import type { Question, StoredLearningChecks } from '@/types'

export interface BankDiff {
  added: string[]
  changed: string[]
  removed: string[]
  unchanged: number
}

function sameJSON(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

export function diffBank(
  bankId: string,
  current: readonly Question[],
  currentChecks: readonly StoredLearningChecks[],
  next: ResolvedBank,
): BankDiff {
  const before = new Map(current.map((question) => [question.id, question]))
  const checks = new Map(currentChecks.map((entry) => [entry.questionId, entry.checks]))
  const diff: BankDiff = { added: [], changed: [], removed: [], unchanged: 0 }
  const seen = new Set<string>()

  for (const mod of next.modules) {
    for (const question of mod.questions) {
      const id = questionKey(bankId, question.id)
      seen.add(id)
      const old = before.get(id)
      if (!old) {
        diff.added.push(id)
        continue
      }
      const same =
        old.module === mod.name &&
        old.moduleKey === `${bankId}/${mod.id}` &&
        old.difficulty === question.difficulty &&
        old.question === question.question &&
        old.answer === question.answer &&
        sameJSON(old.tags, question.tags) &&
        (old.source ?? '') === (question.source ?? '') &&
        sameJSON(checks.get(id) ?? [], question.checks ?? [])
      if (same) diff.unchanged++
      else diff.changed.push(id)
    }
  }
  for (const id of before.keys()) if (!seen.has(id)) diff.removed.push(id)
  return diff
}

export function diffIsEmpty(diff: BankDiff): boolean {
  return diff.added.length + diff.changed.length + diff.removed.length === 0
}
