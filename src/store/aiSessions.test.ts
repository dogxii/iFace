import { describe, expect, it } from 'vitest'
import { type AISession, appendMessage, replaceMessages, trimSessions } from './useAIStore'

describe('AI session helpers', () => {
  it('creates a session on first message and appends afterwards', () => {
    const one = appendMessage({}, 'q', { role: 'user', content: 'hi' }, 1)
    expect(one.q).toEqual({
      questionId: 'q',
      messages: [{ role: 'user', content: 'hi' }],
      createdAt: 1,
      updatedAt: 1,
    })
    const two = appendMessage(one, 'q', { role: 'assistant', content: 'yo' }, 2)
    expect(two.q.messages).toHaveLength(2)
    expect(two.q.createdAt).toBe(1)
    expect(two.q.updatedAt).toBe(2)
    expect(one.q.messages).toHaveLength(1)
  })

  it('replaces messages and removes empty sessions', () => {
    const base = appendMessage({}, 'q', { role: 'user', content: 'a' }, 1)
    const replaced = replaceMessages(base, 'q', [{ role: 'user', content: 'b' }], 5)
    expect(replaced.q).toMatchObject({ createdAt: 1, updatedAt: 5 })
    expect(replaceMessages(base, 'q', [], 6)).toEqual({})
  })

  it('keeps only the 50 most recently updated sessions', () => {
    const sessions: Record<string, AISession> = {}
    for (let i = 0; i < 60; i++) {
      sessions[`q${i}`] = { questionId: `q${i}`, messages: [], createdAt: i, updatedAt: i }
    }
    const trimmed = trimSessions(sessions)
    expect(Object.keys(trimmed)).toHaveLength(50)
    expect(trimmed.q59).toBeDefined()
    expect(trimmed.q9).toBeUndefined()
  })
})
