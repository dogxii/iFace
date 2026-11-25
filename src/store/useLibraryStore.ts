/**
 * Library store — installed banks and their questions, kept in memory for the whole app.
 *
 * - `banks` are ordered by the user's order; disabled banks stay in `banks` but their questions
 *   are left out of `questions`, which is what pages list, search and practise from.
 * - `byId` holds every installed question, so a link to a question in a disabled bank still
 *   opens.
 * - Changes made in another tab arrive through a BroadcastChannel.
 */
import { create } from 'zustand'
import { dataReady } from '@/lib/banks/boot'
import { getAllBanks, getAllQuestions, putBank } from '@/lib/db'
import type { InstalledBank, InstalledBankModule, Question } from '@/types'

export interface LibraryModule extends InstalledBankModule {
  bankId: string
  bankName: string
  enabled: boolean
}

interface LibraryState {
  loaded: boolean
  error: string | null
  banks: InstalledBank[]
  /** Module key → module, every installed bank. */
  modules: Map<string, LibraryModule>
  /** Module keys of enabled banks, in display order. */
  moduleOrder: string[]
  /** Questions of enabled banks, in display order. */
  questions: Question[]
  /** Every installed question by id. */
  byId: Map<string, Question>

  reload: () => Promise<void>
  setBankEnabled: (bankId: string, enabled: boolean) => Promise<void>
  /** Enables exactly these banks (onboarding). */
  setEnabledBanks: (bankIds: readonly string[]) => Promise<void>
}

const CHANNEL = 'iface-library'
let channel: BroadcastChannel | null = null

function announce(): void {
  channel?.postMessage('changed')
}

export function deriveLibrary(
  bankList: readonly InstalledBank[],
  questionList: readonly Question[],
): Pick<LibraryState, 'banks' | 'modules' | 'moduleOrder' | 'questions' | 'byId'> {
  const banks = [...bankList].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  const modules = new Map<string, LibraryModule>()
  const moduleOrder: string[] = []
  const rank = new Map<string, number>()
  for (const bank of banks) {
    for (const mod of bank.modules) {
      modules.set(mod.key, { ...mod, bankId: bank.id, bankName: bank.name, enabled: bank.enabled })
      if (bank.enabled) {
        rank.set(mod.key, moduleOrder.length)
        moduleOrder.push(mod.key)
      }
    }
  }
  const byId = new Map(questionList.map((question) => [question.id, question]))
  const questions = questionList
    .filter((question) => rank.has(question.moduleKey))
    .sort(
      (a, b) =>
        (rank.get(a.moduleKey) ?? 0) - (rank.get(b.moduleKey) ?? 0) || a.position - b.position,
    )
  return { banks, modules, moduleOrder, questions, byId }
}

export const useLibraryState = create<LibraryState>()((set, get) => ({
  loaded: false,
  error: null,
  banks: [],
  modules: new Map(),
  moduleOrder: [],
  questions: [],
  byId: new Map(),

  async reload() {
    try {
      await dataReady()
      const [banks, questions] = await Promise.all([getAllBanks(), getAllQuestions()])
      set({ ...deriveLibrary(banks, questions), loaded: true, error: null })
    } catch (error) {
      set({ loaded: true, error: error instanceof Error ? error.message : String(error) })
    }
  },

  async setBankEnabled(bankId, enabled) {
    const bank = get().banks.find((item) => item.id === bankId)
    if (!bank || bank.enabled === enabled) return
    await putBank({ ...bank, enabled })
    await get().reload()
    announce()
  },

  async setEnabledBanks(bankIds) {
    const wanted = new Set(bankIds)
    for (const bank of get().banks) {
      const enabled = wanted.has(bank.id)
      if (bank.enabled !== enabled) await putBank({ ...bank, enabled })
    }
    await get().reload()
    announce()
  },
}))

/** Call after installing, updating or removing banks. */
export async function libraryChanged(): Promise<void> {
  await useLibraryState.getState().reload()
  announce()
}

let initialized: Promise<void> | null = null

export function initLibraryStore(): Promise<void> {
  if (initialized) return initialized
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL)
    channel.onmessage = () => void useLibraryState.getState().reload()
  }
  initialized = useLibraryState.getState().reload()
  return initialized
}
