/**
 * Official banks ship with the app under `public/banks/` (generated from `banks/official/`).
 * They are installed into IndexedDB like any other bank and re-installed whenever the
 * generated file changes, unless the user uninstalled them.
 */
import { resolveBank } from '@/data/bank/validate'
import { getAllBanks, getMeta, setMeta, writeBank } from '@/lib/db'
import type { InstalledBank } from '@/types'
import { bankRecords } from './records'

export interface OfficialBankEntry {
  id: string
  name: string
  description?: string
  version: string
  hash: string
  file: string
  questionCount: number
}

const INDEX_URL = '/banks/official.json'
const UNINSTALLED_META = 'official_banks_uninstalled'

export async function fetchOfficialIndex(): Promise<OfficialBankEntry[]> {
  const response = await fetch(INDEX_URL)
  if (!response.ok) throw new Error(`官方题库列表加载失败：HTTP ${response.status}`)
  const data = (await response.json()) as { banks?: OfficialBankEntry[] }
  return Array.isArray(data.banks) ? data.banks : []
}

export async function installOfficialBank(
  entry: OfficialBankEntry,
  order: number,
  previous?: InstalledBank,
): Promise<InstalledBank> {
  const response = await fetch(entry.file)
  if (!response.ok) throw new Error(`题库「${entry.name}」加载失败：HTTP ${response.status}`)
  const result = await resolveBank(await response.text())
  if (!result.bank) {
    throw new Error(`题库「${entry.name}」无效：${result.issues[0]?.message ?? '未知错误'}`)
  }
  const records = bankRecords(entry.id, result.bank, {
    origin: { kind: 'bundled', file: entry.file, hash: entry.hash },
    previous,
    order,
  })
  await writeBank(records.bank, records.questions, records.checks)
  return records.bank
}

async function uninstalledOfficialIds(): Promise<string[]> {
  return (await getMeta<string[]>(UNINSTALLED_META)) ?? []
}

/** Remembers that the user removed an official bank so start-up does not reinstall it. */
export async function markOfficialBankUninstalled(id: string, uninstalled: boolean): Promise<void> {
  const ids = new Set(await uninstalledOfficialIds())
  if (uninstalled) ids.add(id)
  else ids.delete(id)
  await setMeta(UNINSTALLED_META, [...ids])
}

/** Official banks the user removed, for offering them again. */
export async function uninstalledOfficialBanks(): Promise<OfficialBankEntry[]> {
  const [index, uninstalled, installed] = await Promise.all([
    fetchOfficialIndex(),
    uninstalledOfficialIds(),
    getAllBanks(),
  ])
  const installedIds = new Set(installed.map((bank) => bank.id))
  return index.filter((entry) => uninstalled.includes(entry.id) && !installedIds.has(entry.id))
}

/**
 * Installs missing official banks and updates outdated ones. Returns the ids it wrote.
 * Throws when the index cannot be loaded (e.g. offline before the first visit was cached).
 */
export async function syncOfficialBanks(): Promise<string[]> {
  const [index, installed, uninstalled] = await Promise.all([
    fetchOfficialIndex(),
    getAllBanks(),
    uninstalledOfficialIds(),
  ])
  const byId = new Map(installed.map((bank) => [bank.id, bank]))
  const written: string[] = []

  for (const [order, entry] of index.entries()) {
    const previous = byId.get(entry.id)
    if (!previous && uninstalled.includes(entry.id)) continue
    if (previous?.origin.kind === 'bundled' && previous.origin.hash === entry.hash) continue
    await installOfficialBank(entry, order, previous)
    written.push(entry.id)
  }
  return written
}
