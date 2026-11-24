import { useEffect } from 'react'
import { create } from 'zustand'
import { invalidateQuestionsCache } from '@/hooks/useQuestions'
import { useAIState } from '@/store/useAIStore'
import { useAuthState } from '@/store/useAuthStore'
import { formatSyncSummary } from './settingsData'

export interface SyncMessage {
  ok: boolean
  message: string
  at?: string
}

interface SyncState {
  lastResult: SyncMessage | null
  autoSynced: boolean
  setLastResult: (result: SyncMessage | null) => void
  markAutoSynced: () => void
}

/** Last Gist sync outcome, shared by the auto-sync hook and the sync settings tab. */
export const useSyncState = create<SyncState>()((set) => ({
  lastResult: null,
  autoSynced: false,
  setLastResult: (lastResult) => set({ lastResult }),
  markAutoSynced: () => set({ autoSynced: true }),
}))

/**
 * Pull the Gist backup once per app session after login. Mounted once in the app shell
 * so it runs whether or not the settings dialog is open.
 */
export function useGistAutoSync() {
  const token = useAuthState((s) => s.token)
  const isLoggedIn = useAuthState((s) => Boolean(s.token && s.user))
  const autoSynced = useSyncState((s) => s.autoSynced)

  useEffect(() => {
    if (!isLoggedIn || !token || autoSynced) return
    const { markAutoSynced, setLastResult } = useSyncState.getState()
    markAutoSynced()
    ;(async () => {
      try {
        const { sessions, upsertSessions } = useAIState.getState()
        // Loaded on demand so the Gist sync code stays out of the entry chunk.
        const { pullFromGist } = await import('@/lib/gistSync')
        const result = await pullFromGist(token, Object.values(sessions))
        if (result === null) return // no backup yet
        if (result.ok) {
          invalidateQuestionsCache()
          if (result.aiSessions?.length) upsertSessions(result.aiSessions)
          setLastResult({
            ok: true,
            message: formatSyncSummary('已自动同步', result),
            at: result.exportedAt,
          })
        } else {
          setLastResult({ ok: false, message: `自动同步失败：${result.error ?? '未知错误'}` })
        }
      } catch (err) {
        setLastResult({
          ok: false,
          message: `自动同步失败：${err instanceof Error ? err.message : String(err)}`,
        })
      }
    })()
  }, [isLoggedIn, token, autoSynced])
}
