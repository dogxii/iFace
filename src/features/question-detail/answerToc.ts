export interface TocEntry {
  /** Unique within the list: text plus occurrence count, so repeated headings stay distinct. */
  id: string
  text: string
  /** Heading level, 1–4. */
  level: number
}

/** Indent depth per entry, relative to the shallowest heading present (0 = top level). */
export function tocDepths(entries: readonly TocEntry[]): number[] {
  if (entries.length === 0) return []
  const min = Math.min(...entries.map((entry) => entry.level))
  return entries.map((entry) => Math.min(entry.level - min, 2))
}

/**
 * Index of the section being read: the last heading whose top has scrolled past `offset`
 * (px from the viewport top). Before the first heading, the first entry is active; at the
 * very bottom of the page the last entry wins so short final sections can still activate.
 */
export function activeTocIndex(tops: readonly number[], offset: number, atBottom = false): number {
  if (tops.length === 0) return -1
  if (atBottom) return tops.length - 1
  let active = 0
  for (let i = 0; i < tops.length; i++) {
    if (tops[i] - offset <= 1) active = i
    else break
  }
  return active
}
