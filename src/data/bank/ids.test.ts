import { describe, expect, it } from 'vitest'
import {
  githubBankId,
  isLocalId,
  localBankId,
  moduleKey,
  officialBankId,
  parseBankId,
  parseModuleKey,
  parseQuestionKey,
  questionKey,
  slugify,
  toLocalId,
  uniqueLocalId,
  urlBankId,
} from './ids'

describe('bank ids', () => {
  it('builds and parses every kind', () => {
    expect(parseBankId(officialBankId('frontend'))).toEqual({ kind: 'official', name: 'frontend' })
    expect(parseBankId(urlBankId('3f9a1c07be'))).toEqual({ kind: 'url', hash: '3f9a1c07be' })
    expect(parseBankId(localBankId('my-notes-k3x9'))).toEqual({
      kind: 'local',
      slug: 'my-notes-k3x9',
    })
  })

  it('lowercases GitHub repos and splits repo names that contain dots', () => {
    const id = githubBankId('Dogxi', 'Go.Interview')
    expect(id).toBe('gh.dogxi.go.interview')
    expect(parseBankId(id)).toEqual({ kind: 'github', owner: 'dogxi', repo: 'go.interview' })
  })

  it('rejects malformed ids', () => {
    expect(() => githubBankId('bad.owner', 'repo')).toThrow()
    expect(() => githubBankId('owner', '..')).toThrow()
    expect(parseBankId('frontend')).toBeNull()
    expect(parseBankId('x.frontend')).toBeNull()
    expect(parseBankId('gh.owner')).toBeNull()
    expect(parseBankId('iface.Frontend')).toBeNull()
  })
})

describe('question and module keys', () => {
  it('round-trips', () => {
    const key = questionKey('iface.frontend', 'js-001')
    expect(key).toBe('iface.frontend:js-001')
    expect(parseQuestionKey(key)).toEqual({ bankId: 'iface.frontend', localId: 'js-001' })
    expect(parseModuleKey(moduleKey('gh.a.b', 'basics'))).toEqual({
      bankId: 'gh.a.b',
      localId: 'basics',
    })
  })

  it('does not mistake pre-2.0 ids for keys', () => {
    expect(parseQuestionKey('js-001')).toBeNull()
    expect(parseQuestionKey('custom_my-file_js-001')).toBeNull()
    expect(parseModuleKey('JS基础')).toBeNull()
  })

  it('limits local ids to lowercase url-safe characters', () => {
    expect(isLocalId('go-basics-001')).toBe(true)
    expect(isLocalId('v1.2_a')).toBe(true)
    expect(isLocalId('JS-001')).toBe(false)
    expect(isLocalId('-a')).toBe(false)
    expect(isLocalId('a:b')).toBe(false)
    expect(isLocalId('a'.repeat(65))).toBe(false)
  })
})

describe('slugify', () => {
  it('keeps ascii words and drops the rest', () => {
    expect(slugify('Go 后端 Interview!')).toBe('go-interview')
    expect(slugify('前端题')).toBe('')
  })
})

describe('toLocalId / uniqueLocalId', () => {
  it('cleans raw ids and falls back when nothing is left', () => {
    expect(toLocalId('JS_001', 'x')).toBe('js_001')
    expect(toLocalId('  Hello World!! ', 'x')).toBe('hello-world')
    expect(toLocalId('闭包', 'q-1')).toBe('q-1')
  })

  it('appends a counter until the id is free', () => {
    const taken = new Set(['a', 'a-2'])
    expect(uniqueLocalId('a', taken)).toBe('a-3')
    expect(uniqueLocalId('b', taken)).toBe('b')
    expect(taken.has('a-3') && taken.has('b')).toBe(true)
  })
})
