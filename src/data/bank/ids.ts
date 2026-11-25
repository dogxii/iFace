/**
 * Identifiers for banks, modules and questions.
 *
 * Every id is globally unique, readable and safe in a URL path segment:
 *
 *   bank      iface.frontend · gh.<owner>.<repo> · url.<hash> · local.<slug>
 *   question  <bankId>:<localId>        e.g. iface.frontend:js-001
 *   module    <bankId>/<localId>        e.g. iface.frontend/js
 *
 * GitHub owners cannot contain dots, so `gh.<owner>.<repo>` splits back unambiguously even
 * when the repo name has dots in it.
 */

/** Ids authors choose inside a package: questions, modules, learning checks. */
export const LOCAL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/

const OWNER_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38})$/
const REPO_PATTERN = /^[a-z0-9._-]{1,100}$/
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/

export type BankIdKind = 'official' | 'github' | 'url' | 'local'

export type ParsedBankId =
  | { kind: 'official'; name: string }
  | { kind: 'github'; owner: string; repo: string }
  | { kind: 'url'; hash: string }
  | { kind: 'local'; slug: string }

export function isLocalId(value: string): boolean {
  return LOCAL_ID_PATTERN.test(value)
}

export function officialBankId(name: string): string {
  if (!SLUG_PATTERN.test(name)) throw new Error(`Invalid official bank name: ${name}`)
  return `iface.${name}`
}

export function githubBankId(owner: string, repo: string): string {
  const o = owner.toLowerCase()
  const r = repo.toLowerCase()
  if (!OWNER_PATTERN.test(o) || !REPO_PATTERN.test(r) || r === '.' || r === '..') {
    throw new Error(`Invalid GitHub repository: ${owner}/${repo}`)
  }
  return `gh.${o}.${r}`
}

export function urlBankId(hash: string): string {
  if (!/^[0-9a-f]{10}$/.test(hash)) throw new Error(`Invalid url bank hash: ${hash}`)
  return `url.${hash}`
}

export function localBankId(slug: string): string {
  if (!SLUG_PATTERN.test(slug)) throw new Error(`Invalid local bank slug: ${slug}`)
  return `local.${slug}`
}

export function parseBankId(id: string): ParsedBankId | null {
  const dot = id.indexOf('.')
  if (dot <= 0) return null
  const prefix = id.slice(0, dot)
  const rest = id.slice(dot + 1)
  switch (prefix) {
    case 'iface':
      return SLUG_PATTERN.test(rest) ? { kind: 'official', name: rest } : null
    case 'gh': {
      const split = rest.indexOf('.')
      if (split <= 0) return null
      const owner = rest.slice(0, split)
      const repo = rest.slice(split + 1)
      if (!OWNER_PATTERN.test(owner) || !REPO_PATTERN.test(repo)) return null
      return { kind: 'github', owner, repo }
    }
    case 'url':
      return /^[0-9a-f]{10}$/.test(rest) ? { kind: 'url', hash: rest } : null
    case 'local':
      return SLUG_PATTERN.test(rest) ? { kind: 'local', slug: rest } : null
    default:
      return null
  }
}

export function isBankId(id: string): boolean {
  return parseBankId(id) !== null
}

export function questionKey(bankId: string, localId: string): string {
  return `${bankId}:${localId}`
}

export function moduleKey(bankId: string, localId: string): string {
  return `${bankId}/${localId}`
}

/** Splits `<bankId>:<localId>`; null for anything else (including pre-2.0 ids). */
export function parseQuestionKey(key: string): { bankId: string; localId: string } | null {
  const colon = key.indexOf(':')
  if (colon <= 0) return null
  const bankId = key.slice(0, colon)
  const localId = key.slice(colon + 1)
  if (!isBankId(bankId) || !isLocalId(localId)) return null
  return { bankId, localId }
}

export function parseModuleKey(key: string): { bankId: string; localId: string } | null {
  const slash = key.indexOf('/')
  if (slash <= 0) return null
  const bankId = key.slice(0, slash)
  const localId = key.slice(slash + 1)
  if (!isBankId(bankId) || !isLocalId(localId)) return null
  return { bankId, localId }
}

/** Turns a display name into a slug for local bank ids; empty when nothing usable is left. */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}

/**
 * Turns any string into a valid local id (lower-case, `[a-z0-9._-]`, at most 64 characters).
 * Returns `fallback` when nothing usable is left, e.g. for a Chinese-only title.
 */
export function toLocalId(raw: string, fallback: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[^a-z0-9]+/, '')
    .slice(0, 64)
    .replace(/[-.]+$/, '')
  return isLocalId(cleaned) ? cleaned : fallback
}

/** `base`, or `base-2`, `base-3`… whichever is not in `taken`; adds the result to `taken`. */
export function uniqueLocalId(base: string, taken: Set<string>): string {
  let id = base
  for (let n = 2; taken.has(id); n++) {
    const suffix = `-${n}`
    id = `${base.slice(0, 64 - suffix.length)}${suffix}`
  }
  taken.add(id)
  return id
}
