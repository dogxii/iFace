import type { StudyRecord } from '@/types'

/** Where the detail page is navigating within: a practice session or the question's module. */
export interface SessionSource {
  /** `?session=` key of a session stored in sessionStorage. */
  sessionKey: string | null
  /** Ids from an inline `?ids=a,b,c` session. */
  inlineIds: string[]
  /** Ids read from the stored session. */
  storedIds: string[]
}

export function parseInlineSessionIds(value: string | null): string[] {
  return value?.split(',').filter(Boolean) ?? []
}

export function sessionIdsOf(source: SessionSource): string[] {
  return source.inlineIds.length > 0 ? source.inlineIds : source.storedIds
}

/** Query string that keeps the current session when moving to another question. */
export function sessionSearchOf(source: SessionSource): string {
  if (source.sessionKey) return `?session=${source.sessionKey}`
  const ids = sessionIdsOf(source)
  return ids.length > 0 ? `?ids=${ids.join(',')}` : ''
}

/** Changes whenever a different session starts, even on the same question id. */
export function sessionIdentityOf(source: SessionSource): string {
  if (source.sessionKey) return `session:${source.sessionKey}`
  if (source.inlineIds.length > 0) return `ids:${source.inlineIds.join(',')}`
  return 'browse'
}

export interface AdjacentIds {
  prevId: string | null
  nextId: string | null
}

/** Previous / next question within the same module, in list order. */
export function adjacentInModule(
  questions: readonly { id: string; moduleKey: string }[],
  id: string,
  moduleKey: string | undefined,
): AdjacentIds {
  const scope = moduleKey ? questions.filter((q) => q.moduleKey === moduleKey) : questions
  const index = scope.findIndex((q) => q.id === id)
  if (index === -1) return { prevId: null, nextId: null }
  return {
    prevId: index > 0 ? scope[index - 1].id : null,
    nextId: index < scope.length - 1 ? scope[index + 1].id : null,
  }
}

/**
 * Previous / next question: inside a session follow the session order, otherwise prefer
 * explicit `?prev=` / `?next=` links and fall back to the module order.
 */
export function resolveAdjacent(
  sessionIds: readonly string[],
  id: string,
  explicit: { prev: string | null; next: string | null },
  moduleAdjacent: AdjacentIds,
): AdjacentIds {
  if (sessionIds.length === 0) {
    return {
      prevId: explicit.prev ?? moduleAdjacent.prevId,
      nextId: explicit.next ?? moduleAdjacent.nextId,
    }
  }
  const index = sessionIds.indexOf(id)
  return {
    prevId: index > 0 ? sessionIds[index - 1] : null,
    nextId: index >= 0 && index < sessionIds.length - 1 ? sessionIds[index + 1] : null,
  }
}

export interface SessionSummary {
  mastered: number
  review: number
  unlearned: number
  total: number
  /** Questions not yet mastered, in session order. */
  retryIds: string[]
}

export function summarizeSession(
  sessionIds: readonly string[],
  records: Record<string, Pick<StudyRecord, 'status'> | undefined>,
): SessionSummary {
  const summary: SessionSummary = {
    mastered: 0,
    review: 0,
    unlearned: 0,
    total: sessionIds.length,
    retryIds: [],
  }
  for (const id of sessionIds) {
    const status = records[id]?.status ?? 'unlearned'
    summary[status]++
    if (status !== 'mastered') summary.retryIds.push(id)
  }
  return summary
}
