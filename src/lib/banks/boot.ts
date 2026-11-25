/**
 * Start-up order for question data. Everything that reads questions or study data awaits
 * `dataReady()`:
 *
 * 1. install or update the bundled official banks
 * 2. migrate pre-2.0 data to bank-scoped ids (once; needs the official banks in place)
 */
import { migrateLegacy15 } from '@/compat/legacy15/run'
import { getAllBanks } from '@/lib/db'
import { reloadAISessions } from '@/store/useAIStore'
import { syncOfficialBanks } from './official'

let ready: Promise<void> | null = null

async function boot(): Promise<void> {
  try {
    await syncOfficialBanks()
  } catch (error) {
    // Offline before the bank files were ever cached: carry on with whatever is installed.
    console.warn('Official banks could not be synced', error)
  }

  const banks = await getAllBanks()
  const officialInstalled = banks.some((bank) => bank.origin.kind === 'bundled')
  if (officialInstalled) {
    try {
      if (await migrateLegacy15()) reloadAISessions()
    } catch (error) {
      console.error('Migrating pre-2.0 data failed; it will be retried next start', error)
    }
  }
}

export function dataReady(): Promise<void> {
  ready ??= boot()
  return ready
}
