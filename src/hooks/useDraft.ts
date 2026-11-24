import { type SetStateAction, useCallback, useEffect, useRef, useState } from 'react'
import { readDraft, removeDraft, writeDraft } from '@/lib/storage'

const SAVE_DELAY = 400

/**
 * Form state that survives navigation, reloads and closed tabs. Saved to localStorage under
 * `iface_draft:<scope>` (debounced, flushed on pagehide and unmount); setting it back to
 * `initial` removes the key. `scope` must stay the same for the component's lifetime (remount
 * with a `key` to switch scopes).
 *
 * `parse` restores a stored value, returning null to discard it (e.g. after a shape change).
 */
export function useDraft<T>(
  scope: string,
  initial: T,
  parse: (value: unknown) => T | null,
): [T, (next: SetStateAction<T>) => void] {
  const [value, setValue] = useState<T>(() => {
    const stored = readDraft(scope)
    return (stored === null ? null : parse(stored)) ?? initial
  })
  const initialJSON = JSON.stringify(initial)
  const pending = useRef<{ value: T } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    if (!pending.current) return
    const { value: next } = pending.current
    pending.current = null
    if (JSON.stringify(next) === initialJSON) removeDraft(scope)
    else writeDraft(scope, next)
  }, [initialJSON, scope])

  useEffect(() => {
    pending.current = { value }
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY)
  }, [flush, value])

  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])

  return [value, setValue]
}

/** `parse` helper for drafts that are a flat record of strings. */
export function parseStringRecord(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const out: Record<string, string> = {}
  for (const [key, item] of Object.entries(value)) if (typeof item === 'string') out[key] = item
  return out
}
