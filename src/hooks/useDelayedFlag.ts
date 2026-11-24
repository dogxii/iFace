import { useEffect, useState } from 'react'

/**
 * `active`, but only once it has stayed true for `delay` ms. Use it for loading placeholders so
 * fast loads (IndexedDB reads, preloaded chunks) don't flash a spinner or skeleton.
 */
export function useDelayedFlag(active: boolean, delay = 250): boolean {
  const [elapsed, setElapsed] = useState(false)
  useEffect(() => {
    if (!active) {
      setElapsed(false)
      return
    }
    const timer = setTimeout(() => setElapsed(true), delay)
    return () => clearTimeout(timer)
  }, [active, delay])
  return active && elapsed
}
