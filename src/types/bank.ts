import type { BankLearningCheck, BankModuleColor, BankModuleIcon } from '@/data/bank/schema'

export type InstalledBankOrigin =
  /** Shipped with the app under `public/banks/`. */
  | { kind: 'bundled'; file: string; hash: string }
  | { kind: 'github'; owner: string; repo: string; sha: string; path?: string }
  | { kind: 'url'; url: string }
  /** Created in this browser (imports, AI-generated questions). */
  | { kind: 'local' }

export interface InstalledBankModule {
  /** `<bankId>/<moduleId>` */
  key: string
  id: string
  name: string
  description?: string
  icon?: BankModuleIcon
  color?: BankModuleColor
  count: number
}

export interface InstalledBank {
  id: string
  origin: InstalledBankOrigin
  name: string
  description?: string
  version: string
  license: string
  authors: string[]
  homepage?: string
  modules: InstalledBankModule[]
  questionCount: number
  /** Disabled banks keep their questions and study data but are hidden everywhere. */
  enabled: boolean
  /** Lower first. */
  order: number
  installedAt: number
  updatedAt: number
  /** Last time an update check ran. */
  checkedAt?: number
  /** Newer version found by the last update check. */
  latest?: { version: string; sha?: string; hash?: string }
}

export interface StoredLearningChecks {
  questionId: string
  bankId: string
  checks: BankLearningCheck[]
}
