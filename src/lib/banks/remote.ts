/**
 * Reading banks from GitHub and from plain https links. Nothing here writes to IndexedDB.
 *
 * GitHub banks are pinned to a commit: the default branch is resolved to a sha first and every
 * file is read at that sha, so a package never mixes files from two pushes. Files are tried on
 * raw.githubusercontent.com first and on jsDelivr when that fails (blocked or rate limited).
 */
import { githubBankId, urlBankId } from '@/data/bank/ids'
import { BANK_MANIFEST_FILE } from '@/data/bank/schema'
import { type BankValidation, resolveBank } from '@/data/bank/validate'
import type { InstalledBank, InstalledBankOrigin } from '@/types'
import { type BankSource, repoPath } from './source'

export type Fetch = typeof fetch

export class RemoteError extends Error {
  /** Not worth retrying elsewhere: the file or repository does not exist. */
  readonly notFound: boolean

  constructor(message: string, notFound = false) {
    super(message)
    this.notFound = notFound
  }
}

async function readText(fetcher: Fetch, url: string, init?: RequestInit): Promise<string> {
  let response: Response
  try {
    response = await fetcher(url, init)
  } catch {
    throw new RemoteError(`网络错误：无法访问 ${new URL(url).host}`)
  }
  if (response.status === 404) throw new RemoteError('找不到', true)
  if (response.status === 403 || response.status === 429) {
    throw new RemoteError('GitHub 访问次数超过限制，请稍后再试')
  }
  if (!response.ok) throw new RemoteError(`HTTP ${response.status}`)
  return response.text()
}

/** Latest commit sha of the default branch. */
export async function latestGithubSha(
  owner: string,
  repo: string,
  fetcher: Fetch = fetch,
): Promise<string> {
  try {
    const sha = await readText(
      fetcher,
      `https://api.github.com/repos/${owner}/${repo}/commits/HEAD`,
      { headers: { Accept: 'application/vnd.github.sha' } },
    )
    if (!/^[0-9a-f]{40}$/.test(sha.trim())) throw new RemoteError('GitHub 返回的 commit 无效')
    return sha.trim()
  } catch (error) {
    if (error instanceof RemoteError && error.notFound) {
      throw new RemoteError(`找不到仓库 ${owner}/${repo}，或者它不是公开仓库`, true)
    }
    throw error
  }
}

/** One file of a repository at a commit. */
export async function readGithubFile(
  owner: string,
  repo: string,
  sha: string,
  path: string,
  fetcher: Fetch = fetch,
): Promise<string> {
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  const mirrors = [
    `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${encoded}`,
    `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${sha}/${encoded}`,
  ]
  let lastError: unknown
  for (const url of mirrors) {
    try {
      return await readText(fetcher, url)
    } catch (error) {
      if (error instanceof RemoteError && error.notFound) {
        throw new RemoteError(`仓库里找不到 ${path}`, true)
      }
      lastError = error
    }
  }
  throw lastError
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function bankIdForSource(source: BankSource): Promise<string> {
  return source.kind === 'github'
    ? githubBankId(source.owner, source.repo)
    : urlBankId((await sha256Hex(source.url)).slice(0, 10))
}

export interface RemoteBank {
  bankId: string
  source: BankSource
  origin: Extract<InstalledBankOrigin, { kind: 'github' | 'url' }>
  validation: BankValidation
}

/**
 * Downloads and validates a bank. `sha` pins a GitHub bank to a commit (restoring a backup);
 * otherwise the default branch is used.
 */
export async function fetchRemoteBank(
  source: BankSource,
  { fetcher = fetch, sha }: { fetcher?: Fetch; sha?: string } = {},
): Promise<RemoteBank> {
  const bankId = await bankIdForSource(source)

  if (source.kind === 'github') {
    const { owner, repo, path } = source
    const commit = sha ?? (await latestGithubSha(owner, repo, fetcher))
    const read = (file: string) =>
      readGithubFile(owner, repo, commit, repoPath(path, file), fetcher)
    let manifest: string
    try {
      manifest = await read(BANK_MANIFEST_FILE)
    } catch (error) {
      if (error instanceof RemoteError && error.notFound) {
        throw new RemoteError(
          `${repoPath(path, BANK_MANIFEST_FILE)} 不存在：这个仓库还不是 iFace 题库`,
          true,
        )
      }
      throw error
    }
    return {
      bankId,
      source,
      origin: { kind: 'github', owner, repo, sha: commit, ...(path ? { path } : {}) },
      validation: await resolveBank(manifest, read),
    }
  }

  const read = async (file: string) => {
    try {
      return await readText(fetcher, new URL(file, source.url).toString())
    } catch (error) {
      if (error instanceof RemoteError && error.notFound) {
        throw new RemoteError(`找不到 ${file}`, true)
      }
      throw error
    }
  }
  return {
    bankId,
    source,
    origin: { kind: 'url', url: source.url },
    validation: await resolveBank(await read(source.url), read),
  }
}

export function sourceOfBank(bank: InstalledBank): BankSource | null {
  const { origin } = bank
  if (origin.kind === 'github') {
    return { kind: 'github', owner: origin.owner, repo: origin.repo, path: origin.path ?? '' }
  }
  if (origin.kind === 'url') return { kind: 'url', url: origin.url }
  return null
}

function manifestVersion(text: string): string | null {
  try {
    const value = (JSON.parse(text) as { version?: unknown }).version
    return typeof value === 'string' ? value : null
  } catch {
    return null
  }
}

/**
 * Looks for a newer version without downloading the questions. A bank counts as updated when
 * its manifest `version` changed (authors bump it; other pushes, like README edits, do not).
 */
export async function checkRemoteVersion(
  bank: InstalledBank,
  fetcher: Fetch = fetch,
): Promise<InstalledBank['latest'] | null> {
  const { origin } = bank
  if (origin.kind === 'github') {
    const sha = await latestGithubSha(origin.owner, origin.repo, fetcher)
    if (sha === origin.sha) return null
    const text = await readGithubFile(
      origin.owner,
      origin.repo,
      sha,
      repoPath(origin.path ?? '', BANK_MANIFEST_FILE),
      fetcher,
    )
    const version = manifestVersion(text)
    return version && version !== bank.version ? { version, sha } : null
  }
  if (origin.kind === 'url') {
    const version = manifestVersion(await readText(fetcher, origin.url))
    return version && version !== bank.version ? { version } : null
  }
  return null
}
