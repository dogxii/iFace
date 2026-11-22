import { useEffect, useState } from 'react'

const openPanels = new Set<string>()

/**
 * Whether a panel should play its enter animation. Pages that remount per route (the question
 * detail page is keyed by id) would otherwise replay it on every navigation while the panel
 * stays open; this only returns true when the panel was not already showing.
 */
export function useEnterAnimation(id: string, open: boolean): boolean {
  const [animate] = useState(() => !openPanels.has(id))
  useEffect(() => {
    if (!open) return
    openPanels.add(id)
    return () => {
      openPanels.delete(id)
    }
  }, [id, open])
  return animate
}
