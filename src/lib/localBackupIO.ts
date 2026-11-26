/** Reads and writes the data of a backup file (see `localBackup.ts` for the format). */

import type { AISession } from '@/store/useAIStore'
import { libraryChanged } from '@/store/useLibraryStore'
import { installRemoteBank } from './banks/install'
import type { BankSnapshot } from './banks/package'
import { restoreSnapshot, snapshotBank } from './banks/package'
import { fetchRemoteBank } from './banks/remote'
import {
  bulkPutJdMatchReports,
  bulkPutMockInterviews,
  bulkPutQuestionAnswerAnnotations,
  bulkPutQuestionAnswerOverrides,
  bulkPutQuestionFlags,
  bulkPutQuestionNotes,
  bulkPutStudyRecords,
  getAllBanks,
  getAllJdMatchReports,
  getAllMockInterviews,
  getAllQuestionAnswerAnnotations,
  getAllQuestionAnswerOverrides,
  getAllQuestionFlags,
  getAllQuestionNotes,
  getAllStudyRecords,
  getLearningChecksByBank,
  getQuestionsByBank,
  putBank,
  writeBank,
} from './db'
import {
  BACKUP_FORMAT_VERSION,
  type BackupFile,
  type BankState,
  type ImportPreview,
} from './localBackup'

/** Snapshots of every local bank, plus enabled/order of the others. */
export async function collectBanks(): Promise<{ banks: BankSnapshot[]; bankStates: BankState[] }> {
  const installed = await getAllBanks()
  const banks: BankSnapshot[] = []
  const bankStates: BankState[] = []
  for (const bank of installed) {
    if (bank.origin.kind === 'local') {
      const [questions, checks] = await Promise.all([
        getQuestionsByBank(bank.id),
        getLearningChecksByBank(bank.id),
      ])
      banks.push(snapshotBank(bank, questions, checks))
    } else {
      const { origin } = bank
      bankStates.push({
        id: bank.id,
        enabled: bank.enabled,
        order: bank.order,
        ...(origin.kind === 'github' || origin.kind === 'url'
          ? { origin, name: bank.name, version: bank.version }
          : {}),
      })
    }
  }
  return { banks, bankStates }
}

export async function createBackup(aiSessions: AISession[]): Promise<BackupFile> {
  const [
    { banks, bankStates },
    studyRecords,
    questionNotes,
    questionAnswerAnnotations,
    questionAnswerOverrides,
    questionFlags,
    mockInterviews,
    jdMatchReports,
  ] = await Promise.all([
    collectBanks(),
    getAllStudyRecords(),
    getAllQuestionNotes(),
    getAllQuestionAnswerAnnotations(),
    getAllQuestionAnswerOverrides(),
    getAllQuestionFlags(),
    getAllMockInterviews(),
    getAllJdMatchReports(),
  ])
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    banks,
    bankStates,
    studyRecords,
    questionNotes,
    questionAnswerAnnotations,
    questionAnswerOverrides,
    questionFlags,
    aiSessions,
    mockInterviews,
    jdMatchReports,
  }
}

/**
 * Writes local bank snapshots (replacing banks with the same id), reinstalls GitHub / URL banks
 * that are missing here and applies enabled/order to installed banks. Returns the banks that
 * could not be restored, with the reason.
 */
export async function restoreBanks(
  banks: readonly BankSnapshot[],
  bankStates: readonly BankState[],
): Promise<{ restored: number; failed: string[] }> {
  const failed: string[] = []
  let restored = 0
  for (const snapshot of banks) {
    const result = await restoreSnapshot(snapshot)
    if (!result.records) {
      failed.push(`${snapshot.package.name ?? snapshot.id}：${result.error}`)
      continue
    }
    await writeBank(result.records.bank, result.records.questions, result.records.checks)
    restored++
  }
  const installed = new Set((await getAllBanks()).map((bank) => bank.id))
  for (const state of bankStates) {
    if (!state.origin || installed.has(state.id)) continue
    const label = state.name ?? state.id
    try {
      const { origin } = state
      const remote =
        origin.kind === 'github'
          ? await fetchRemoteBank(
              { kind: 'github', owner: origin.owner, repo: origin.repo, path: origin.path ?? '' },
              { sha: origin.sha },
            )
          : await fetchRemoteBank({ kind: 'url', url: origin.url })
      if (remote.bankId !== state.id) throw new Error('来源和题库 id 不一致')
      await installRemoteBank(remote, { notify: false })
      restored++
    } catch (error) {
      failed.push(`${label}：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  if (bankStates.length > 0) {
    const states = new Map(bankStates.map((state) => [state.id, state]))
    for (const bank of await getAllBanks()) {
      const state = states.get(bank.id)
      if (state && bank.origin.kind !== 'local') {
        await putBank({ ...bank, enabled: state.enabled, order: state.order })
      }
    }
  }
  if (banks.length > 0 || bankStates.length > 0) await libraryChanged()
  return { restored, failed }
}

export async function applyBackup(
  preview: ImportPreview,
  upsertSessions: (sessions: AISession[]) => void,
): Promise<{ restored: number; failed: string[] }> {
  const result = await restoreBanks(preview.banks, preview.bankStates)
  if (preview.studyRecords.length > 0) await bulkPutStudyRecords(preview.studyRecords)
  if (preview.questionNotes.length > 0) await bulkPutQuestionNotes(preview.questionNotes)
  if (preview.questionAnswerAnnotations.length > 0) {
    await bulkPutQuestionAnswerAnnotations(preview.questionAnswerAnnotations)
  }
  if (preview.questionAnswerOverrides.length > 0) {
    await bulkPutQuestionAnswerOverrides(preview.questionAnswerOverrides)
  }
  if (preview.questionFlags.length > 0) await bulkPutQuestionFlags(preview.questionFlags)
  if (preview.aiSessions.length > 0) upsertSessions(preview.aiSessions)
  if (preview.mockInterviews.length > 0) await bulkPutMockInterviews(preview.mockInterviews)
  if (preview.jdMatchReports.length > 0) await bulkPutJdMatchReports(preview.jdMatchReports)
  return result
}
