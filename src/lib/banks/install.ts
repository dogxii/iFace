/**
 * Installing and updating GitHub / URL banks. `prepareInstall` downloads and compares without
 * writing, so the UI can show what will change; `installRemoteBank` then writes it in one
 * transaction.
 */
import type { BankIssue } from '@/data/bank/validate'
import {
  countQuestionsWithUserData,
  getAllBanks,
  getBank,
  getLearningChecksByBank,
  getQuestionsByBank,
  putBank,
  writeBank,
} from '@/lib/db'
import { libraryChanged } from '@/store/useLibraryStore'
import type { InstalledBank } from '@/types'
import { type BankDiff, diffBank } from './diff'
import { nextOrder } from './local'
import { bankRecords } from './records'
import { checkRemoteVersion, type Fetch, fetchRemoteBank, type RemoteBank } from './remote'
import type { BankSource } from './source'

export interface InstallPlan {
  remote: RemoteBank
  /** The installed version this replaces. */
  previous?: InstalledBank
  /** Against the installed version; absent for a first install. */
  diff?: BankDiff
  /** Removed questions that have study records, notes, flags or custom answers. */
  removedWithData: number
  errors: BankIssue[]
  warnings: BankIssue[]
}

export async function prepareInstall(
  source: BankSource,
  options: { fetcher?: Fetch; sha?: string } = {},
): Promise<InstallPlan> {
  const remote = await fetchRemoteBank(source, options)
  const previous = await getBank(remote.bankId)
  const { bank: resolved, issues } = remote.validation
  const errors = issues.filter((issue) => issue.level === 'error')
  const warnings = issues.filter((issue) => issue.level === 'warning')
  if (!resolved || !previous) return { remote, previous, removedWithData: 0, errors, warnings }

  const [questions, checks] = await Promise.all([
    getQuestionsByBank(previous.id),
    getLearningChecksByBank(previous.id),
  ])
  const diff = diffBank(remote.bankId, questions, checks, resolved)
  return {
    remote,
    previous,
    diff,
    removedWithData: await countQuestionsWithUserData(diff.removed),
    errors,
    warnings,
  }
}

/**
 * Writes a downloaded bank, replacing the installed version (whose enabled state and order
 * carry over). Study data of removed questions stays, like when a bank is removed.
 */
export async function installRemoteBank(
  remote: RemoteBank,
  { notify = true }: { notify?: boolean } = {},
): Promise<InstalledBank> {
  const resolved = remote.validation.bank
  if (!resolved) throw new Error(remote.validation.issues[0]?.message ?? '题库无效')
  const previous = await getBank(remote.bankId)
  const records = bankRecords(remote.bankId, resolved, {
    origin: remote.origin,
    previous,
    order: await nextOrder(),
  })
  records.bank.checkedAt = Date.now()
  await writeBank(records.bank, records.questions, records.checks)
  if (notify) await libraryChanged()
  return records.bank
}

const DAY = 24 * 60 * 60 * 1000

/**
 * Checks GitHub and URL banks for a new version, each at most once a day unless `force`d,
 * and stores what it found in `bank.latest`. Returns the banks with an update available.
 * Failures (offline, rate limits) are skipped and retried on the next check.
 */
export async function checkForUpdates({
  force = false,
  fetcher = fetch,
  now = Date.now(),
}: {
  force?: boolean
  fetcher?: Fetch
  now?: number
} = {}): Promise<InstalledBank[]> {
  const banks = (await getAllBanks()).filter(
    (bank) => bank.origin.kind === 'github' || bank.origin.kind === 'url',
  )
  let changed = false
  for (const bank of banks) {
    if (!force && bank.checkedAt && now - bank.checkedAt < DAY) continue
    try {
      const latest = await checkRemoteVersion(bank, fetcher)
      const { latest: _old, ...rest } = bank
      await putBank({ ...rest, checkedAt: now, ...(latest ? { latest } : {}) })
      changed ||= JSON.stringify(latest ?? null) !== JSON.stringify(bank.latest ?? null)
    } catch (error) {
      console.warn(`Update check failed for ${bank.id}`, error)
    }
  }
  if (changed) await libraryChanged()
  return (await getAllBanks()).filter((bank) => bank.latest)
}

let scheduled = false

/** Runs the daily update check once per app start, a little after the first paint. */
export function scheduleUpdateCheck(delay = 8000): void {
  if (scheduled || typeof window === 'undefined') return
  scheduled = true
  window.setTimeout(() => {
    if (navigator.onLine === false) return
    void checkForUpdates().catch(() => {})
  }, delay)
}
