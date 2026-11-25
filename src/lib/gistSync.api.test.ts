import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  deleteBackupGist,
  findBackupGistId,
  loadFromGist,
  saveBackupToGist,
  serializeGistBackup,
} from './gistSync'

type Call = { url: string; method?: string; headers?: Record<string, string>; body?: unknown }

function mockFetch(handler: (call: Call) => Response): Call[] {
  const calls: Call[] = []
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: init?.method,
      headers: init?.headers as Record<string, string> | undefined,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    }
    calls.push(call)
    return handler(call)
  })
  return calls
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const listWith = (id: string) =>
  json([{ id, files: { 'iface-backup.json': { filename: 'iface-backup.json' } } }])
const empty = {
  studyRecords: [],
  questionNotes: [],
  questionAnswerAnnotations: [],
  questionAnswerOverrides: [],
  questionFlags: [],
  aiSessions: [],
  banks: [],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('gist api', () => {
  it('finds the backup gist with auth headers and reports API errors', async () => {
    const calls = mockFetch(() => listWith('gist-1'))
    expect(await findBackupGistId('ghp_token')).toBe('gist-1')
    expect(calls[0].url).toBe('https://api.github.com/gists?per_page=30&page=1')
    expect(calls[0].headers).toMatchObject({
      Authorization: 'Bearer ghp_token',
      Accept: 'application/vnd.github+json',
    })

    mockFetch(() => json({ message: 'Bad credentials' }, 401))
    await expect(findBackupGistId('bad')).rejects.toThrow('GitHub API 401: Bad credentials')
  })

  it('loads and parses the backup file', async () => {
    const content = serializeGistBackup(
      {
        ...empty,
        studyRecords: [
          { questionId: 'iface.go:q', status: 'mastered', lastUpdated: 5000, reviewCount: 1 },
        ],
      },
      '2026-01-04T00:00:00.000Z',
    )
    mockFetch(({ url }) =>
      url.endsWith('/gists/gist-2')
        ? json({
            id: 'gist-2',
            files: { 'iface-backup.json': { filename: 'iface-backup.json', content } },
          })
        : listWith('gist-2'),
    )
    const loaded = await loadFromGist('ghp_token')
    expect(loaded?.version).toBe(9)
    expect(loaded?.studyRecords[0].questionId).toBe('iface.go:q')
  })

  it('creates a private gist on first save and patches it afterwards', async () => {
    const created = mockFetch(({ url, method }) =>
      method === 'POST' && url.endsWith('/gists') ? json({ id: 'new-gist' }, 201) : json([]),
    )
    const result = await saveBackupToGist('ghp_token', empty)
    expect(result.ok).toBe(true)
    const post = created.find((call) => call.method === 'POST')
    expect(post?.body).toMatchObject({ public: false })
    const file = (post?.body as { files: Record<string, { content: string }> }).files[
      'iface-backup.json'
    ]
    expect(JSON.parse(file.content).version).toBe(9)

    const patched = mockFetch(({ method }) =>
      method === 'PATCH' ? json({ id: 'gist-3' }) : listWith('gist-3'),
    )
    expect((await saveBackupToGist('ghp_token', empty)).ok).toBe(true)
    expect(
      patched.some((call) => call.method === 'PATCH' && call.url.endsWith('/gists/gist-3')),
    ).toBe(true)
  })

  it('deletes the backup gist', async () => {
    const calls = mockFetch(({ method }) =>
      method === 'DELETE' ? new Response(null, { status: 204 }) : listWith('gist-4'),
    )
    expect((await deleteBackupGist('ghp_token')).ok).toBe(true)
    expect(
      calls.some((call) => call.method === 'DELETE' && call.url.endsWith('/gists/gist-4')),
    ).toBe(true)
  })
})
