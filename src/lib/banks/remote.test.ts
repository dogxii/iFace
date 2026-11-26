import { describe, expect, it } from 'vitest'
import type { InstalledBank } from '@/types'
import { checkRemoteVersion, type Fetch, fetchRemoteBank, RemoteError } from './remote'

const SHA = 'a'.repeat(40)
const NEXT_SHA = 'b'.repeat(40)

const manifest = (version = '1.0.0') =>
  JSON.stringify({
    format: 'iface-bank@1',
    name: 'Go',
    version,
    license: 'MIT',
    modules: [{ id: 'basics', name: '基础', questions: 'questions/basics.md' }],
  })

const markdown = '<!-- id: q1; difficulty: 1 -->\n# 什么是 goroutine？\n\n轻量线程。\n'

/** Serves `files` by URL; `down` hosts fail like a blocked network. */
function server(files: Record<string, string>, down: string[] = []) {
  const requested: string[] = []
  const fetcher: Fetch = async (input) => {
    const url = String(input)
    requested.push(url)
    if (down.some((host) => url.includes(host))) throw new TypeError('Failed to fetch')
    const body = files[url]
    return body === undefined ? new Response('', { status: 404 }) : new Response(body)
  }
  return { fetcher, requested }
}

const raw = (sha: string, path: string) =>
  `https://raw.githubusercontent.com/dogxi/go/${sha}/${path}`

describe('fetchRemoteBank', () => {
  it('reads a GitHub bank at the latest commit', async () => {
    const { fetcher } = server({
      'https://api.github.com/repos/dogxi/go/commits/HEAD': SHA,
      [raw(SHA, 'iface-bank.json')]: manifest(),
      [raw(SHA, 'questions/basics.md')]: markdown,
    })
    const remote = await fetchRemoteBank(
      { kind: 'github', owner: 'dogxi', repo: 'go', path: '' },
      { fetcher },
    )
    expect(remote.bankId).toBe('gh.dogxi.go')
    expect(remote.origin).toEqual({ kind: 'github', owner: 'dogxi', repo: 'go', sha: SHA })
    expect(remote.validation.bank?.questionCount).toBe(1)
  })

  it('falls back to jsDelivr and reads sub folders', async () => {
    const cdn = (path: string) => `https://cdn.jsdelivr.net/gh/dogxi/go@${SHA}/${path}`
    const { fetcher } = server(
      {
        [cdn('banks/go/iface-bank.json')]: manifest(),
        [cdn('banks/go/questions/basics.md')]: markdown,
      },
      ['raw.githubusercontent.com'],
    )
    const remote = await fetchRemoteBank(
      { kind: 'github', owner: 'dogxi', repo: 'go', path: 'banks/go' },
      { fetcher, sha: SHA },
    )
    expect(remote.origin).toMatchObject({ sha: SHA, path: 'banks/go' })
    expect(remote.validation.bank?.questionCount).toBe(1)
  })

  it('explains a repository without a manifest', async () => {
    const { fetcher } = server({ 'https://api.github.com/repos/dogxi/go/commits/HEAD': SHA })
    await expect(
      fetchRemoteBank({ kind: 'github', owner: 'dogxi', repo: 'go', path: '' }, { fetcher }),
    ).rejects.toThrow('这个仓库还不是 iFace 题库')
    const missing = server({})
    await expect(
      fetchRemoteBank(
        { kind: 'github', owner: 'dogxi', repo: 'go', path: '' },
        { fetcher: missing.fetcher },
      ),
    ).rejects.toBeInstanceOf(RemoteError)
  })

  it('reads a URL bank with files relative to the manifest', async () => {
    const { fetcher } = server({
      'https://example.com/go/iface-bank.json': manifest(),
      'https://example.com/go/questions/basics.md': markdown,
    })
    const remote = await fetchRemoteBank(
      { kind: 'url', url: 'https://example.com/go/iface-bank.json' },
      { fetcher },
    )
    expect(remote.bankId).toMatch(/^url\.[0-9a-f]{10}$/)
    expect(remote.validation.bank?.modules[0].questions[0].id).toBe('q1')
  })
})

describe('checkRemoteVersion', () => {
  const installed = (origin: InstalledBank['origin']) =>
    ({ id: 'gh.dogxi.go', origin, version: '1.0.0' }) as InstalledBank

  it('reports a new manifest version on a new commit only', async () => {
    const origin = { kind: 'github', owner: 'dogxi', repo: 'go', sha: SHA } as const
    const same = server({ 'https://api.github.com/repos/dogxi/go/commits/HEAD': SHA })
    expect(await checkRemoteVersion(installed(origin), same.fetcher)).toBeNull()
    expect(same.requested).toHaveLength(1)

    const readmeOnly = server({
      'https://api.github.com/repos/dogxi/go/commits/HEAD': NEXT_SHA,
      [raw(NEXT_SHA, 'iface-bank.json')]: manifest('1.0.0'),
    })
    expect(await checkRemoteVersion(installed(origin), readmeOnly.fetcher)).toBeNull()

    const bumped = server({
      'https://api.github.com/repos/dogxi/go/commits/HEAD': NEXT_SHA,
      [raw(NEXT_SHA, 'iface-bank.json')]: manifest('1.1.0'),
    })
    expect(await checkRemoteVersion(installed(origin), bumped.fetcher)).toEqual({
      version: '1.1.0',
      sha: NEXT_SHA,
    })
  })

  it('checks URL banks by their manifest', async () => {
    const url = 'https://example.com/go/iface-bank.json'
    const { fetcher } = server({ [url]: manifest('2.0.0') })
    expect(await checkRemoteVersion(installed({ kind: 'url', url }), fetcher)).toEqual({
      version: '2.0.0',
    })
  })
})
