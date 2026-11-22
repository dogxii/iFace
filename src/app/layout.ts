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

export const MODULE_PANEL = {
  default: 288,
  min: 240,
  max: 420,
  /** With the module list docked, the page column keeps at least this much room. */
  minContent: 480,
} as const

export interface DetailPanelsInput {
  viewportWidth: number
  /** Width the app sidebar currently occupies (rail width when collapsed). */
  sidebarWidth: number
  /** Whether the user wants the module list docked. */
  modulePinned: boolean
  moduleWidth: number
  sidePanelOpen: boolean
  sidePanelWidth: number
}

export interface DetailPanelsLayout {
  /** Whether the module list fits beside the page (so pinning it would dock it). */
  moduleFits: boolean
  moduleDocked: boolean
  moduleWidth: number
  /** Largest width the docked module list may take right now. */
  moduleMaxWidth: number
  sidePanelWidth: number
}

/**
 * Fit the docked module list (left) and side panel (right) around the detail page. The module
 * list shrinks first and undocks when even its minimum width would squeeze the page column;
 * the side panel then takes what is left, as it does on its own.
 */
export function resolveDetailPanels(input: DetailPanelsInput): DetailPanelsLayout {
  const reserved = input.sidePanelOpen ? SIDE_PANEL.min : 0
  const room = input.viewportWidth - input.sidebarWidth - reserved - MODULE_PANEL.minContent
  const moduleFits = room >= MODULE_PANEL.min
  const moduleDocked = input.modulePinned && moduleFits
  const moduleMaxWidth = clamp(room, MODULE_PANEL.min, MODULE_PANEL.max)
  const moduleWidth = Math.round(clamp(input.moduleWidth, MODULE_PANEL.min, moduleMaxWidth))
  const leftWidth = input.sidebarWidth + (moduleDocked ? moduleWidth : 0)
  return {
    moduleFits,
    moduleDocked,
    moduleWidth,
    moduleMaxWidth,
    sidePanelWidth: clampSidePanelWidth(input.sidePanelWidth, input.viewportWidth, leftWidth),
  }
}
