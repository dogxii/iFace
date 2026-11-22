/** Sizing rules for the resizable app sidebar and the question detail side panel. */

export const SIDEBAR = {
  default: 232,
  min: 200,
  max: 360,
  /** Width of the collapsed icon rail. */
  rail: 52,
  /** Dragging narrower than this collapses the sidebar into the rail. */
  collapseBelow: 150,
} as const

export const SIDE_PANEL = {
  default: 420,
  min: 340,
  max: 720,
  /** The page column keeps at least this much room next to the panel. */
  minContent: 520,
} as const

/** Keyboard step for resize handles, in px (Shift multiplies it). */
export const RESIZE_STEP = 16

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

/** Result of dragging the sidebar edge to `raw` px: collapse past the threshold, else clamp. */
export function resolveSidebarDrag(raw: number): { collapsed: boolean; width: number } {
  if (raw < SIDEBAR.collapseBelow) return { collapsed: true, width: SIDEBAR.default }
  return { collapsed: false, width: Math.round(clamp(raw, SIDEBAR.min, SIDEBAR.max)) }
}

/** Largest panel width that still leaves the page column usable at this viewport size. */
export function maxSidePanelWidth(viewportWidth: number, sidebarWidth: number): number {
  return clamp(viewportWidth - sidebarWidth - SIDE_PANEL.minContent, SIDE_PANEL.min, SIDE_PANEL.max)
}

export function clampSidePanelWidth(
  raw: number,
  viewportWidth: number,
  sidebarWidth: number,
): number {
  return Math.round(clamp(raw, SIDE_PANEL.min, maxSidePanelWidth(viewportWidth, sidebarWidth)))
}
