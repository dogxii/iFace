import { describe, expect, it } from 'vitest'
import {
  adjacentInModule,
  parseInlineSessionIds,
  resolveAdjacent,
  type SessionSource,
  sessionIdentityOf,
  sessionSearchOf,
  summarizeSession,
} from './sessionNav'

const source = (patch: Partial<SessionSource>): SessionSource => ({
  sessionKey: null,
  inlineIds: [],
  storedIds: [],
  ...patch,
})

describe('session source', () => {
  it('parses inline ids and drops empty entries', () => {
    expect(parseInlineSessionIds('a,,b,')).toEqual(['a', 'b'])
    expect(parseInlineSessionIds(null)).toEqual([])
  })

  it('keeps the session in the search string', () => {
    expect(sessionSearchOf(source({ sessionKey: 'k1', storedIds: ['a'] }))).toBe('?session=k1')
    expect(sessionSearchOf(source({ inlineIds: ['a', 'b'] }))).toBe('?ids=a,b')
    expect(sessionSearchOf(source({}))).toBe('')
  })

  it('derives a stable identity per session', () => {
    expect(sessionIdentityOf(source({ sessionKey: 'k1' }))).toBe('session:k1')
    expect(sessionIdentityOf(source({ inlineIds: ['a'] }))).toBe('ids:a')
    expect(sessionIdentityOf(source({ storedIds: ['a'] }))).toBe('browse')
  })
})

describe('adjacent questions', () => {
  const questions = [
    { id: 'js-1', module: 'JS' },
    { id: 'css-1', module: 'CSS' },
    { id: 'js-2', module: 'JS' },
    { id: 'js-3', module: 'JS' },
  ]

  it('stays within the module', () => {
    expect(adjacentInModule(questions, 'js-2', 'JS')).toEqual({ prevId: 'js-1', nextId: 'js-3' })
    expect(adjacentInModule(questions, 'js-1', 'JS')).toEqual({ prevId: null, nextId: 'js-2' })
    expect(adjacentInModule(questions, 'missing', 'JS')).toEqual({ prevId: null, nextId: null })
  })

  it('follows the session order when in a session', () => {
    const explicit = { prev: 'x', next: 'y' }
    const moduleAdjacent = { prevId: 'm1', nextId: 'm2' }
    expect(resolveAdjacent(['a', 'b', 'c'], 'b', explicit, moduleAdjacent)).toEqual({
      prevId: 'a',
      nextId: 'c',
    })
    expect(resolveAdjacent(['a', 'b'], 'b', explicit, moduleAdjacent)).toEqual({
      prevId: 'a',
      nextId: null,
    })
  })

  it('prefers explicit links over module order when browsing', () => {
    const moduleAdjacent = { prevId: 'm1', nextId: 'm2' }
    expect(resolveAdjacent([], 'b', { prev: 'x', next: null }, moduleAdjacent)).toEqual({
      prevId: 'x',
      nextId: 'm2',
    })
  })
})

describe('summarizeSession', () => {
  it('counts statuses and lists questions to retry', () => {
    const summary = summarizeSession(['a', 'b', 'c', 'd'], {
      a: { status: 'mastered' },
      b: { status: 'review' },
      c: undefined,
    })
    expect(summary).toEqual({
      mastered: 1,
      review: 1,
      unlearned: 2,
      total: 4,
      retryIds: ['b', 'c', 'd'],
    })
  })
})
