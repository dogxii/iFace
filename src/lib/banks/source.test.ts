import { describe, expect, it } from 'vitest'
import { describeSource, parseBankSource, repoPath } from './source'

const ok = (input: string) => {
  const result = parseBankSource(input)
  if (!result.ok) throw new Error(result.error)
  return result.source
}

describe('parseBankSource', () => {
  it('accepts owner/repo', () => {
    expect(ok('dogxi/go-interview')).toEqual({
      kind: 'github',
      owner: 'dogxi',
      repo: 'go-interview',
      path: '',
    })
  })

  it('accepts GitHub links with or without a scheme, .git and sub folders', () => {
    expect(ok('https://github.com/Dogxi/go.bank.git')).toMatchObject({ repo: 'go.bank', path: '' })
    expect(ok('github.com/dogxi/banks/tree/main/go')).toMatchObject({ repo: 'banks', path: 'go' })
    expect(ok('https://github.com/dogxi/banks/blob/main/go/iface-bank.json')).toMatchObject({
      path: 'go',
    })
    expect(ok('https://raw.githubusercontent.com/dogxi/banks/main/iface-bank.json')).toMatchObject({
      owner: 'dogxi',
      repo: 'banks',
      path: '',
    })
  })

  it('accepts https manifest links', () => {
    expect(ok('https://example.com/banks/go.json#x')).toEqual({
      kind: 'url',
      url: 'https://example.com/banks/go.json',
    })
  })

  it('rejects everything else with a reason', () => {
    for (const input of [
      '',
      'not a source',
      'http://example.com/bank.json',
      'https://example.com/page',
      'https://github.com/dogxi',
      'bad_owner!/repo',
    ]) {
      const result = parseBankSource(input)
      expect(result.ok, input).toBe(false)
    }
  })
})

describe('helpers', () => {
  it('describes sources and joins repository paths', () => {
    expect(describeSource(ok('dogxi/banks'))).toBe('dogxi/banks')
    expect(describeSource(ok('github.com/dogxi/banks/tree/main/go'))).toBe('dogxi/banks/go')
    expect(repoPath('', 'iface-bank.json')).toBe('iface-bank.json')
    expect(repoPath('go', 'questions/a.md')).toBe('go/questions/a.md')
  })
})
