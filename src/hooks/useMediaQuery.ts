import { useSyncExternalStore } from 'react'

/** Live result of a CSS media query (false during SSR / without matchMedia). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => (typeof window !== 'undefined' && window.matchMedia?.(query).matches) || false,
    () => false,
  )
}

/** Width of the layout viewport excluding the root scrollbar, updated on resize. */
export function useViewportWidth(): number {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('resize', onChange)
      return () => window.removeEventListener('resize', onChange)
    },
    () => document.documentElement.clientWidth,
    () => 1280,
  )
}
