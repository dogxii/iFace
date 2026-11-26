/**
 * What the user typed into "add a bank": `owner/repo`, a GitHub link, or the https URL of an
 * `iface-bank.json`. Pure parsing, no network.
 */
import { githubBankId } from '@/data/bank/ids'
import { BANK_MANIFEST_FILE } from '@/data/bank/schema'

export type BankSource =
  /** `path` is the folder holding `iface-bank.json`, '' for the repository root. */
  { kind: 'github'; owner: string; repo: string; path: string } | { kind: 'url'; url: string }

export type ParsedSource = { ok: true; source: BankSource } | { ok: false; error: string }

const OWNER = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})'
const REPO = '[A-Za-z0-9._-]{1,100}'
const SHORT = new RegExp(`^(${OWNER})/(${REPO})$`)

function cleanPath(segments: string[]): string {
  const path = segments.filter(Boolean).join('/')
  return path.endsWith(BANK_MANIFEST_FILE)
    ? path.slice(0, -BANK_MANIFEST_FILE.length).replace(/\/$/, '')
    : path
}

function github(owner: string, repo: string, path = ''): ParsedSource {
  const name = repo.replace(/\.git$/, '')
  try {
    githubBankId(owner, name)
  } catch {
    return { ok: false, error: `不是有效的 GitHub 仓库：${owner}/${name}` }
  }
  if (path.split('/').some((segment) => segment === '..')) {
    return { ok: false, error: '路径不能包含 ..' }
  }
  return { ok: true, source: { kind: 'github', owner, repo: name, path } }
}

export function parseBankSource(input: string): ParsedSource {
  const value = input.trim()
  if (!value) return { ok: false, error: '请输入 GitHub 仓库或题库链接' }

  const short = value.match(SHORT)
  if (short) return github(short[1], short[2])

  let url: URL
  try {
    url = new URL(/^[a-z]+:\/\//i.test(value) ? value : `https://${value}`)
  } catch {
    return {
      ok: false,
      error: '格式不对：输入 owner/repo、GitHub 仓库链接或 iface-bank.json 的链接',
    }
  }

  const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  const host = url.hostname.toLowerCase()
  if (host === 'github.com' || host === 'www.github.com') {
    const [owner, repo, kind, , ...rest] = segments
    if (!owner || !repo) return { ok: false, error: 'GitHub 链接里缺少仓库名' }
    // /owner/repo/tree/<ref>/<dir> or /owner/repo/blob/<ref>/<dir>/iface-bank.json; the ref
    // is ignored because banks always install from the default branch.
    const path = kind === 'tree' || kind === 'blob' ? cleanPath(rest) : ''
    return github(owner, repo, path)
  }
  if (host === 'raw.githubusercontent.com') {
    const [owner, repo, , ...rest] = segments
    if (!owner || !repo) return { ok: false, error: 'GitHub 链接里缺少仓库名' }
    return github(owner, repo, cleanPath(rest))
  }

  if (url.protocol !== 'https:') return { ok: false, error: '链接必须是 https' }
  if (!/\.json$/i.test(url.pathname)) {
    return { ok: false, error: '链接需要直接指向题库清单（.json 文件）' }
  }
  url.hash = ''
  return { ok: true, source: { kind: 'url', url: url.toString() } }
}

/** `owner/repo` or `owner/repo/path`, for display. */
export function describeSource(source: BankSource): string {
  if (source.kind === 'url') return source.url
  return [source.owner, source.repo, source.path].filter(Boolean).join('/')
}

/** Package-relative file → path inside the repository. */
export function repoPath(base: string, file: string): string {
  return base ? `${base}/${file}` : file
}
