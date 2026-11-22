import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/** Scroll offsets per history entry, for restoring on back / forward (kept for the tab's life). */
const positions = new Map<string, number>()

function scrollToY(top: number) {
  const root = document.documentElement
  const previous = root.style.scrollBehavior
  root.style.scrollBehavior = 'auto'
  window.scrollTo({ top, left: 0, behavior: 'auto' })
  root.style.scrollBehavior = previous
}

/**
 * Window scroll handling for client-side navigation: new pages start at the top, while back /
 * forward returns to where you were on that entry (e.g. the question list after opening a
 * question). Content that renders a moment later (lazy routes, data) is waited for briefly.
 */
export function ScrollManager() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const lastPathname = useRef<string | null>(null)

  useEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previous
    }
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per history entry
  useLayoutEffect(() => {
    const key = location.key
    const saved = navigationType === 'POP' ? positions.get(key) : undefined
    const pathChanged = lastPathname.current !== location.pathname
    lastPathname.current = location.pathname

    let frame = 0
    if (saved !== undefined) {
      const deadline = performance.now() + 1500
      const restore = () => {
        scrollToY(saved)
        if (Math.abs(window.scrollY - saved) > 2 && performance.now() < deadline) {
          frame = requestAnimationFrame(restore)
        }
      }
      restore()
    } else if (pathChanged) {
      // Filter changes on the same page (replace navigations) keep their scroll position.
      scrollToY(0)
    }

    const save = () => positions.set(key, window.scrollY)
    window.addEventListener('scroll', save, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', save)
    }
  }, [location.key])

  return null
}
