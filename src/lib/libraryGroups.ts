/**
 * Groups the visible questions by bank and module for pickers (practice, question list).
 * The library already orders questions by bank and module, so groups follow that order.
 */
import type { InstalledBank, Question, StudyRecordMap } from '@/types'

export interface ModuleStat {
  moduleKey: string
  /** Display name. */
  module: string
  total: number
  mastered: number
}

export interface BankGroup {
  bankId: string
  name: string
  modules: ModuleStat[]
}

export function groupByBank(
  questions: readonly Question[],
  banks: readonly Pick<InstalledBank, 'id' | 'name'>[],
  records: StudyRecordMap,
): BankGroup[] {
  const names = new Map(banks.map((bank) => [bank.id, bank.name]))
  const groups = new Map<string, BankGroup>()
  const modules = new Map<string, ModuleStat>()
  for (const question of questions) {
    let mod = modules.get(question.moduleKey)
    if (!mod) {
      let group = groups.get(question.bankId)
      if (!group) {
        group = {
          bankId: question.bankId,
          name: names.get(question.bankId) ?? question.bankId,
          modules: [],
        }
        groups.set(question.bankId, group)
      }
      mod = { moduleKey: question.moduleKey, module: question.module, total: 0, mastered: 0 }
      modules.set(question.moduleKey, mod)
      group.modules.push(mod)
    }
    mod.total++
    if (records[question.id]?.status === 'mastered') mod.mastered++
  }
  return [...groups.values()]
}
