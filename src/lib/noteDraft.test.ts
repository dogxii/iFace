import { describe, expect, it } from 'vitest'
import { isDraftNewer, parseNoteDraft } from './noteDraft'

const note = { questionId: 'q1', content: 'a', createdAt: 1, updatedAt: 10 }

describe('parseNoteDraft', () => {
  it('accepts a well-formed note and drops extra fields', () => {
    expect(parseNoteDraft({ ...note, extra: true })).toEqual(note)
  })

  it('rejects malformed values', () => {
    expect(parseNoteDraft(null)).toBeNull()
    expect(parseNoteDraft('x')).toBeNull()
    expect(parseNoteDraft({ ...note, questionId: '' })).toBeNull()
    expect(parseNoteDraft({ ...note, updatedAt: '10' })).toBeNull()
  })
})

describe('isDraftNewer', () => {
  it('restores a draft that was never saved', () => {
    expect(isDraftNewer(note, undefined)).toBe(true)
    expect(isDraftNewer({ ...note, content: '  ' }, undefined)).toBe(false)
  })

  it('only restores drafts newer than the saved note with different content', () => {
    expect(isDraftNewer({ ...note, content: 'b', updatedAt: 20 }, note)).toBe(true)
    expect(isDraftNewer({ ...note, content: 'b', updatedAt: 5 }, note)).toBe(false)
    expect(isDraftNewer({ ...note, updatedAt: 20 }, note)).toBe(false)
  })

  it('restores a cleared note so the deletion is not lost', () => {
    expect(isDraftNewer({ ...note, content: '', updatedAt: 20 }, note)).toBe(true)
  })
})
