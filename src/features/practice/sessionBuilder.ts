import { isDueForReview } from '@/store/studyLogic'
import type { Difficulty, Question, StudyRecordMap, StudyStatus } from '@/types'

export type StatusFilter = 'all' | 'unmastered' | 'due' | StudyStatus
export type SizeOption = 'all' | number

export interface SessionOptions {
  modules: string[]
  difficulty: Difficulty | 'all'
  status: StatusFilter
  size: SizeOption
  shuffle: boolean
}

export const DEFAULT_SESSION_OPTIONS: SessionOptions = {
  modules: [],
  difficulty: 'all',
  status: 'unmastered',
  size: 20,
  shuffle: false,
}

const STATUS_FILTERS: readonly StatusFilter[] = [
  'all',
  'unmastered',
  'due',
  'unlearned',
  'review',
  'mastered',
]
const DIFFICULTIES: readonly (Difficulty | 'all')[] = ['all', 1, 2, 3]

/** Restore remembered practice options, falling back field by field to the defaults. */
export function parseSessionOptions(value: unknown): SessionOptions | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const size = v.size === 'all' || (typeof v.size === 'number' && v.size > 0) ? v.size : null
  return {
    modules: Array.isArray(v.modules)
      ? v.modules.filter((m): m is string => typeof m === 'string')
      : [],
    difficulty: DIFFICULTIES.includes(v.difficulty as Difficulty)
      ? (v.difficulty as Difficulty | 'all')
      : DEFAULT_SESSION_OPTIONS.difficulty,
    status: STATUS_FILTERS.includes(v.status as StatusFilter)
      ? (v.status as StatusFilter)
      : DEFAULT_SESSION_OPTIONS.status,
    size: (size as SizeOption | null) ?? DEFAULT_SESSION_OPTIONS.size,
    shuffle: typeof v.shuffle === 'boolean' ? v.shuffle : DEFAULT_SESSION_OPTIONS.shuffle,
  }
}

function matchesStatus(
  question: Question,
  records: StudyRecordMap,
  status: StatusFilter,
  now: number,
) {
  const record = records[question.id]
  const current = record?.status ?? 'unlearned'
  switch (status) {
    case 'all':
      return true
    case 'unmastered':
      return current !== 'mastered'
    case 'due':
      return record ? isDueForReview(record, now) : false
    default:
      return current === status
  }
}

/** Questions matching the options, before size limit and shuffling. */
export function sessionPool(
  questions: Question[],
  records: StudyRecordMap,
  options: Omit<SessionOptions, 'size' | 'shuffle'>,
  now: number,
): Question[] {
  const modules = new Set(options.modules)
  return questions.filter(
    (q) =>
      (modules.size === 0 || modules.has(q.moduleKey)) &&
      (options.difficulty === 'all' || q.difficulty === options.difficulty) &&
      matchesStatus(q, records, options.status, now),
  )
}

/**
 * Pick the question ids for a session. Without shuffling, review questions come first
 * (oldest first), then the rest in bank order — so a limited session targets weak spots.
 */
export function buildSession(
  pool: Question[],
  records: StudyRecordMap,
  options: Pick<SessionOptions, 'size' | 'shuffle'>,
  random: () => number = Math.random,
): string[] {
  let ordered = [...pool]
  if (options.shuffle) {
    for (let i = ordered.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[ordered[i], ordered[j]] = [ordered[j], ordered[i]]
    }
  } else {
    const rank = (q: Question) => (records[q.id]?.status === 'review' ? 0 : 1)
    ordered = ordered
      .map((q, index) => ({ q, index }))
      .sort((a, b) => {
        const byRank = rank(a.q) - rank(b.q)
        if (byRank !== 0) return byRank
        if (rank(a.q) === 0)
          return (records[a.q.id]?.lastUpdated ?? 0) - (records[b.q.id]?.lastUpdated ?? 0)
        return a.index - b.index
      })
      .map(({ q }) => q)
  }
  const limited = options.size === 'all' ? ordered : ordered.slice(0, options.size)
  return limited.map((q) => q.id)
}
