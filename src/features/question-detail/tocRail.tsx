import { type RefObject, useEffect, useRef, useState } from 'react'
import { cn } from '@/ui'
import { activeTocIndex, type TocEntry, tocDepths } from './answerToc'

/** Distance from the viewport top where a heading counts as "being read" (below the header). */
const READ_OFFSET = 96
const HEADING_SELECTOR = 'h1, h2, h3, h4'

/**
 * Right-hand table of contents for the rendered answer. Fixed beside the 760px column on
 * screens wide enough to hold it; hidden otherwise or when the answer has fewer than two
 * headings.
 */
export function AnswerTocRail({ rootRef }: { rootRef: RefObject<HTMLElement | null> }) {
  const [entries, setEntries] = useState<TocEntry[]>([])
  const [active, setActive] = useState(0)
  const headingsRef = useRef<HTMLElement[]>([])

  // Collect headings; the Markdown renders lazily and re-renders, so watch for changes.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let frame: number | null = null
    const scan = () => {
      frame = null
      const headings = [...root.querySelectorAll<HTMLElement>(HEADING_SELECTOR)]
      headingsRef.current = headings
      const seen = new Map<string, number>()
      const next = headings.map((el) => {
        const text = el.textContent?.trim() ?? ''
        const occurrence = (seen.get(text) ?? 0) + 1
        seen.set(text, occurrence)
        return { id: `${text}#${occurrence}`, text, level: Number(el.tagName.slice(1)) }
      })
      setEntries((current) =>
        current.length === next.length &&
        current.every((entry, i) => entry.id === next[i].id && entry.level === next[i].level)
          ? current
          : next,
      )
    }
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(scan)
    }
    schedule()
    // Highlights wrap nothing in the DOM (CSS Highlight API), so only real content changes fire.
    const observer = new MutationObserver(schedule)
    observer.observe(root, { childList: true, subtree: true, characterData: true })
    return () => {
      observer.disconnect()
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [rootRef])

  // Scroll-spy.
  useEffect(() => {
    if (entries.length < 2) return
    let frame: number | null = null
    const update = () => {
      frame = null
      const tops = headingsRef.current.map((el) => el.getBoundingClientRect().top)
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      setActive(Math.max(0, activeTocIndex(tops, READ_OFFSET, atBottom)))
    }
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [entries])

  if (entries.length < 2) return null
  const depths = tocDepths(entries)

  const jumpTo = (index: number) => {
    const el = headingsRef.current[index]
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - READ_OFFSET + 8
    window.scrollTo({ top, behavior: 'smooth' })
    setActive(index)
  }

  return (
    // Hangs off the right edge of the answer card; shown only when the page column (the
    // `detail` container, which already excludes the sidebar and side panel) has room for it.
    <div className="absolute inset-y-0 left-[calc(100%+32px)] hidden w-44 @min-[1180px]/detail:block">
      <nav
        aria-label="答案目录"
        className="sticky top-20 max-h-[calc(100dvh-120px)] overflow-y-auto overscroll-contain"
      >
        <p className="mb-2 text-xs font-medium text-fg-subtle">目录</p>
        <ol className="flex flex-col border-l border-line">
          {entries.map((entry, index) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => jumpTo(index)}
                aria-current={index === active ? 'location' : undefined}
                className={cn(
                  '-ml-px block w-full border-l py-1 pr-1 text-left text-xs leading-snug transition-colors',
                  depths[index] === 0 ? 'pl-3' : depths[index] === 1 ? 'pl-6' : 'pl-9',
                  index === active
                    ? 'border-accent font-medium text-fg'
                    : 'border-transparent text-fg-subtle hover:text-fg',
                )}
              >
                <span className="line-clamp-2">{entry.text}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
