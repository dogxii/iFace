import { describe, expect, it } from 'vitest'
import { activeMasteryKey, masteryHint } from './mastery'

describe('activeMasteryKey', () => {
  it('prefers the rating made on this visit', () => {
    expect(activeMasteryKey('mastered', 'review', '2')).toBe('2')
    expect(activeMasteryKey('review', 'mastered', '3')).toBe('3')
    expect(activeMasteryKey('unlearned', 'review', null)).toBe('1')
  })

  it('falls back to the stored status only when it is unambiguous', () => {
    expect(activeMasteryKey('mastered', null, null)).toBe('3')
    expect(activeMasteryKey('review', null, null)).toBeNull()
    expect(activeMasteryKey('unlearned', null, null)).toBeNull()
  })
})

describe('masteryHint', () => {
  it('describes when the question comes back', () => {
    expect(masteryHint('1', 0)).toBe('明天再练')
    expect(masteryHint('2', 3)).toBe('明天巩固')
    expect(masteryHint('3', 0)).toMatch(/^\d+ 天后复习$/)
  })
})
