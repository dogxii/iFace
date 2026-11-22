import { type SetStateAction, useCallback, useEffect, useRef, useState } from 'react'
import { readDraft, removeDraft, writeDraft } from '@/lib/storage'

const SAVE_DELAY = 400

/**
 * Form state that survives navigation, reloads and closed tabs. Saved to localStorage under
 * `iface_draft:<scope>` (debounced, flushed on pagehide and unmount) and removed again when the
 * value is back to `initial`.
 *
 * `parse` restores a stored value, returning null to discard it (e.g. after a shape change).
 */
export function useDraft<T>(
  scope: string,
  initial: T,
  parse: (value: unknown) => T | null,
): [T, (next: SetStateAction<T>) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    const stored = readDraft(scope)
    return (stored === null ? null : parse(stored)) ?? initial
  })
  const initialJSON = JSON.stringify(initial)
  const pending = useRef<{ scope: string; value: T } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const firstRender = useRef(true)

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const next = pending.current
    pending.current = null
    if (!next) return
    if (JSON.stringify(next.value) === initialJSON) removeDraft(next.scope)
    else writeDraft(next.scope, next.value)
  }, [initialJSON])

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    pending.current = { scope, value }
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY)
  }, [flush, scope, value])

  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])

  const clear = useCallback(() => {
    clearTimeout(timer.current)
    pending.current = null
    removeDraft(scope)
    setValue(initial)
    // The effect would re-save `initial`; that only removes the key again.
  }, [initial, scope])

  return [value, setValue, clear]
}

/** `parse` helper for drafts that are a flat record of strings. */
export function parseStringRecord(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const out: Record<string, string> = {}
  for (const [key, item] of Object.entries(value)) if (typeof item === 'string') out[key] = item
  return out
}
