import { describe, expect, it } from 'vitest'
import {
  clamp,
  clampSidePanelWidth,
  maxSidePanelWidth,
  resolveSidebarDrag,
  SIDE_PANEL,
  SIDEBAR,
} from './layout'

describe('clamp', () => {
  it('keeps values in range and prefers min when the range is empty', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
    expect(clamp(50, 40, 20)).toBe(40)
  })
})

describe('resolveSidebarDrag', () => {
  it('clamps widths and rounds to whole pixels', () => {
    expect(resolveSidebarDrag(250.6)).toEqual({ collapsed: false, width: 251 })
    expect(resolveSidebarDrag(170)).toEqual({ collapsed: false, width: SIDEBAR.min })
    expect(resolveSidebarDrag(900)).toEqual({ collapsed: false, width: SIDEBAR.max })
  })

  it('collapses past the threshold and remembers the default width for re-expanding', () => {
    expect(resolveSidebarDrag(SIDEBAR.collapseBelow - 1)).toEqual({
      collapsed: true,
      width: SIDEBAR.default,
    })
  })
})

describe('side panel width', () => {
  it('leaves room for the page column', () => {
    expect(maxSidePanelWidth(1440, 232)).toBe(1440 - 232 - SIDE_PANEL.minContent)
    expect(maxSidePanelWidth(3000, 232)).toBe(SIDE_PANEL.max)
    // Small screens still get the minimum panel width.
    expect(maxSidePanelWidth(1024, 232)).toBe(SIDE_PANEL.min)
  })

  it('clamps a dragged width', () => {
    expect(clampSidePanelWidth(200, 1440, 232)).toBe(SIDE_PANEL.min)
    expect(clampSidePanelWidth(500.4, 1440, 232)).toBe(500)
    expect(clampSidePanelWidth(900, 1440, 232)).toBe(1440 - 232 - SIDE_PANEL.minContent)
  })
})
