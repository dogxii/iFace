const SESSION_PREFIX = 'iface_practice_session_'
const INLINE_MAX_IDS = 50
const INLINE_MAX_CHARS = 3000

function cleanIds(ids: string[]): string[] {
  return ids.map((id) => id.trim()).filter(Boolean)
}

export function getInlinePracticeSearch(ids: string[]): string {
  const cleaned = cleanIds(ids)
  if (cleaned.length === 0) return ''

  const serialized = cleaned.join(',')
  if (cleaned.length > INLINE_MAX_IDS || serialized.length > INLINE_MAX_CHARS) return ''

  return `?ids=${serialized}`
}

export function savePracticeSession(ids: string[]): string | null {
  const cleaned = cleanIds(ids)
  if (cleaned.length === 0) return null

  try {
    const key = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem(`${SESSION_PREFIX}${key}`, JSON.stringify(cleaned))
    return key
  } catch {
    return null
  }
}

export function readPracticeSession(key: string | null): string[] {
  if (!key) return []

  try {
    const raw = sessionStorage.getItem(`${SESSION_PREFIX}${key}`)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return cleanIds(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return []
  }
}

export function createPracticeSessionPath(firstId: string, ids: string[]): string {
  const cleaned = cleanIds(ids)
  if (!firstId || cleaned.length === 0) return '/questions'

  const inlineSearch = getInlinePracticeSearch(cleaned)
  if (inlineSearch) return `/questions/${firstId}${inlineSearch}`

  const key = savePracticeSession(cleaned)
  if (key) return `/questions/${firstId}?session=${key}`

  return `/questions/${firstId}?ids=${cleaned.join(',')}`
}
