/**
 * Managing installed banks from the UI: importing into local banks, installing a package as a
 * local bank, exporting and removing banks. Every change ends with `libraryChanged()` so open
 * pages and other tabs pick it up.
 */
import { localBankId, slugify } from '@/data/bank/ids'
import type { ResolvedBank } from '@/data/bank/validate'
import {
  deleteBank,
  getAllBanks,
  getBank,
  getLearningChecksByBank,
  getQuestionsByBank,
  writeBank,
} from '@/lib/db'
import { libraryChanged } from '@/store/useLibraryStore'
import type { InstalledBank } from '@/types'
import { emptyLocalBank, type ImportQuestion, type MergeResult, mergeIntoBank } from './localImport'
import { markOfficialBankUninstalled, syncOfficialBanks } from './official'
import { type InlineBankPackage, resolvedToPackage, storedToResolved } from './package'
import { bankRecords } from './records'

export type ImportTarget = { kind: 'new'; name: string } | { kind: 'existing'; bankId: string }

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6).padEnd(4, '0')
}

async function newLocalBankId(name: string): Promise<string> {
  const taken = new Set((await getAllBanks()).map((bank) => bank.id))
  const slug = (slugify(name) || 'bank').slice(0, 40)
  let id = localBankId(`${slug}-${randomSuffix()}`)
  while (taken.has(id)) id = localBankId(`${slug}-${randomSuffix()}`)
  return id
}

/** Order for a newly installed bank: after every installed one. */
export async function nextOrder(): Promise<number> {
  return (await getAllBanks()).reduce((max, bank) => Math.max(max, bank.order), -1) + 1
}

/** The package content of an installed bank, rebuilt from IndexedDB. */
export async function loadBankContent(bankId: string): Promise<ResolvedBank | null> {
  const bank = await getBank(bankId)
  if (!bank) return null
  const [questions, checks] = await Promise.all([
    getQuestionsByBank(bankId),
    getLearningChecksByBank(bankId),
  ])
  return storedToResolved(bank, questions, checks)
}

export interface ImportOutcome extends Omit<MergeResult, 'bank'> {
  bankId: string | null
  bankName: string
}

/** Adds questions to a new or existing local bank. Nothing is written when none are valid. */
export async function importQuestions(
  target: ImportTarget,
  incoming: readonly ImportQuestion[],
): Promise<ImportOutcome> {
  const previous = target.kind === 'existing' ? await getBank(target.bankId) : undefined
  if (target.kind === 'existing' && previous?.origin.kind !== 'local') {
    throw new Error('只能导入到本地题库')
  }
  const base =
    target.kind === 'existing'
      ? ((await loadBankContent(target.bankId)) ?? emptyLocalBank(''))
      : emptyLocalBank(target.name)
  const result = mergeIntoBank(base, incoming)
  const { bank: merged, ...stats } = result
  if (stats.added + stats.updated === 0) {
    return { ...stats, bankId: previous?.id ?? null, bankName: merged.name }
  }

  const bankId = previous?.id ?? (await newLocalBankId(merged.name))
  const records = bankRecords(bankId, merged, {
    origin: { kind: 'local' },
    previous,
    order: await nextOrder(),
  })
  await writeBank(records.bank, records.questions, records.checks)
  await libraryChanged()
  return { ...stats, bankId, bankName: merged.name }
}

/** Installs a validated package as a new local bank, or replaces the content of one. */
export async function installLocalPackage(
  resolved: ResolvedBank,
  replaceBankId?: string,
): Promise<InstalledBank> {
  const previous = replaceBankId ? await getBank(replaceBankId) : undefined
  if (replaceBankId && previous?.origin.kind !== 'local') throw new Error('只能替换本地题库')
  const bankId = previous?.id ?? (await newLocalBankId(resolved.name))
  const records = bankRecords(bankId, resolved, {
    origin: { kind: 'local' },
    previous,
    order: await nextOrder(),
  })
  await writeBank(records.bank, records.questions, records.checks)
  await libraryChanged()
  return records.bank
}

export async function exportBankPackage(bankId: string): Promise<InlineBankPackage | null> {
  const content = await loadBankContent(bankId)
  return content ? resolvedToPackage(content) : null
}

/**
 * Removes a bank and its questions. Study data (records, notes…) stays, so installing the
 * bank again brings the progress back. Official banks are remembered as removed so start-up
 * does not reinstall them.
 */
export async function removeBank(bank: InstalledBank): Promise<void> {
  if (bank.origin.kind === 'bundled') await markOfficialBankUninstalled(bank.id, true)
  await deleteBank(bank.id, false)
  await libraryChanged()
}

/** Installs an official bank the user removed earlier. */
export async function restoreOfficialBank(bankId: string): Promise<void> {
  await markOfficialBankUninstalled(bankId, false)
  await syncOfficialBanks()
  await libraryChanged()
}
