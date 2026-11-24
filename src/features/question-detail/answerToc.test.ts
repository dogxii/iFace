import { describe, expect, it } from 'vitest'
import { activeTocIndex, tocDepths } from './answerToc'

describe('tocDepths', () => {
  it('indents relative to the shallowest heading and caps the depth', () => {
    expect(
      tocDepths([
        { id: 'a', text: 'a', level: 2 },
        { id: 'b', text: 'b', level: 3 },
        { id: 'c', text: 'c', level: 4 },
        { id: 'd', text: 'd', level: 2 },
      ]),
    ).toEqual([0, 1, 2, 0])
    expect(
      tocDepths([
        { id: 'a', text: 'a', level: 1 },
        { id: 'b', text: 'b', level: 4 },
      ]),
    ).toEqual([0, 2])
    expect(tocDepths([])).toEqual([])
  })
})

describe('activeTocIndex', () => {
  it('picks the last heading scrolled past the offset', () => {
    expect(activeTocIndex([200, 600, 1200], 80)).toBe(0)
    expect(activeTocIndex([-300, 60, 900], 80)).toBe(1)
    expect(activeTocIndex([-900, -400, -10], 80)).toBe(2)
  })

  it('activates the last entry at the bottom of the page', () => {
    expect(activeTocIndex([-300, 60, 900], 80, true)).toBe(2)
  })

  it('returns -1 without headings', () => {
    expect(activeTocIndex([], 80)).toBe(-1)
  })
})
