// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  createPracticeSessionPath,
  getInlinePracticeSearch,
  readPracticeSession,
  savePracticeSession,
} from './practiceSession'

beforeEach(() => sessionStorage.clear())

describe('practice session paths', () => {
  it('inlines short id lists into the query string', () => {
    expect(getInlinePracticeSearch([' a ', '', 'b'])).toBe('?ids=a,b')
    expect(createPracticeSessionPath('a', ['a', 'b'])).toBe('/questions/a?ids=a,b')
  })

  it('falls back to the question list without ids', () => {
    expect(createPracticeSessionPath('', ['a'])).toBe('/questions')
    expect(createPracticeSessionPath('a', [])).toBe('/questions')
  })

  it('stores long id lists in sessionStorage', () => {
    const ids = Array.from({ length: 60 }, (_, i) => `q${i}`)
    expect(getInlinePracticeSearch(ids)).toBe('')
    const path = createPracticeSessionPath('q0', ids)
    const key = new URL(path, 'http://x').searchParams.get('session')
    expect(key).toBeTruthy()
    expect(readPracticeSession(key)).toEqual(ids)
  })

  it('round-trips saved sessions and ignores bad data', () => {
    const key = savePracticeSession(['x', ' y '])
    expect(readPracticeSession(key)).toEqual(['x', 'y'])
    expect(readPracticeSession(null)).toEqual([])
    expect(readPracticeSession('missing')).toEqual([])
    sessionStorage.setItem('iface_practice_session_bad', '{"not":"array"}')
    expect(readPracticeSession('bad')).toEqual([])
  })
})
