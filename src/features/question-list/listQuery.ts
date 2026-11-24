/**
 * Question list query: URL <-> filter state, and the filtering / search / sort pipeline.
 * Pure functions only — the page keeps the URL as the single source of truth.
 */
import type { Difficulty, Question, QuestionNote, StudyRecordMap, StudyStatus } from '@/types'

export type SortValue =
  | 'default'
  | 'note-updated'
  | 'difficulty-asc'
  | 'difficulty-desc'
  | 'module'
  | 'recent'

export const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: 'default', label: '默认排序' },
  { value: 'recent', label: '最近复习' },
  { value: 'note-updated', label: '最近笔记' },
  { value: 'difficulty-asc', label: '难度从低到高' },
  { value: 'difficulty-desc', label: '难度从高到低' },
  { value: 'module', label: '按模块' },
]

const SORT_VALUES = new Set<string>(SORT_OPTIONS.map((o) => o.value))
const STATUS_VALUES = new Set<string>(['unlearned', 'review', 'mastered'])

export interface ListQuery {
  modules: string[]
  difficulties: Difficulty[]
  statuses: StudyStatus[]
  starredOnly: boolean
  notesOnly: boolean
  search: string
  sort: SortValue
}

function listParam(params: URLSearchParams, key: string): string[] {
  const values = params
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
  return [...new Set(values)]
}

export function parseListQuery(params: URLSearchParams): ListQuery {
  const sort = params.get('sort') ?? 'default'
  return {
    modules: listParam(params, 'module'),
    difficulties: listParam(params, 'difficulty')
      .map(Number)
      .filter((d): d is Difficulty => d === 1 || d === 2 || d === 3),
    statuses: listParam(params, 'status').filter((s): s is StudyStatus => STATUS_VALUES.has(s)),
    starredOnly: params.get('starred') === '1',
    notesOnly: params.get('notes') === '1',
    search: params.get('q') ?? '',
    sort: SORT_VALUES.has(sort) ? (sort as SortValue) : 'default',
  }
}

export function buildListParams(query: ListQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.modules.length > 0) params.set('module', query.modules.join(','))
  if (query.difficulties.length > 0) params.set('difficulty', query.difficulties.join(','))
  if (query.statuses.length > 0) params.set('status', query.statuses.join(','))
  if (query.starredOnly) params.set('starred', '1')
  if (query.notesOnly) params.set('notes', '1')
  if (query.search.trim()) params.set('q', query.search.trim())
  if (query.sort !== 'default') params.set('sort', query.sort)
  return params
}

export function hasActiveFilters(query: ListQuery): boolean {
  return (
    query.modules.length > 0 ||
    query.difficulties.length > 0 ||
    query.statuses.length > 0 ||
    query.starredOnly ||
    query.notesOnly ||
    query.search.trim().length > 0
  )
}

/** Plain-text excerpt of a note around the first keyword hit. */
export function noteSnippet(content: string, keyword: string): string {
  const text = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*_[\]`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  const index = keyword ? text.toLowerCase().indexOf(keyword) : -1
  if (index === -1) return text.length > 120 ? `${text.slice(0, 120)}…` : text
  const start = Math.max(0, index - 36)
  const end = Math.min(text.length, index + keyword.length + 64)
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}

export interface ListResult {
  questions: Question[]
  /** Question id → note excerpt, for questions matched through their note. */
  noteHits: Map<string, string>
}

export function runListQuery(
  questions: Question[],
  query: ListQuery,
  ctx: {
    records: StudyRecordMap
    notes: Map<string, QuestionNote>
    starred: ReadonlySet<string>
  },
): ListResult {
  const modules = new Set(query.modules)
  const difficulties = new Set(query.difficulties)
  const statuses = new Set(query.statuses)
  const keyword = query.search.trim().toLowerCase()
  const noteHits = new Map<string, string>()

  const filtered = questions.filter((q) => {
    if (modules.size > 0 && !modules.has(q.module)) return false
    if (difficulties.size > 0 && !difficulties.has(q.difficulty)) return false
    if (statuses.size > 0 && !statuses.has(ctx.records[q.id]?.status ?? 'unlearned')) return false
    if (query.starredOnly && !ctx.starred.has(q.id)) return false
    const note = ctx.notes.get(q.id)
    if (query.notesOnly && !note) return false
    if (!keyword) return true

    const questionHit =
      q.question.toLowerCase().includes(keyword) ||
      q.module.toLowerCase().includes(keyword) ||
      q.tags.some((tag) => tag.toLowerCase().includes(keyword)) ||
      Boolean(q.source?.toLowerCase().includes(keyword))
    const noteHit = Boolean(note?.content.toLowerCase().includes(keyword))
    if (noteHit && note) noteHits.set(q.id, noteSnippet(note.content, keyword))
    return questionHit || noteHit
  })

  const sorted = [...filtered]
  switch (query.sort) {
    case 'difficulty-asc':
      sorted.sort((a, b) => a.difficulty - b.difficulty)
      break
    case 'difficulty-desc':
      sorted.sort((a, b) => b.difficulty - a.difficulty)
      break
    case 'module':
      sorted.sort((a, b) => a.module.localeCompare(b.module))
      break
    case 'note-updated':
      sorted.sort(
        (a, b) => (ctx.notes.get(b.id)?.updatedAt ?? 0) - (ctx.notes.get(a.id)?.updatedAt ?? 0),
      )
      break
    case 'recent':
      sorted.sort(
        (a, b) => (ctx.records[b.id]?.lastUpdated ?? 0) - (ctx.records[a.id]?.lastUpdated ?? 0),
      )
      break
  }

  return { questions: sorted, noteHits }
}

/** "刚刚 / 3 小时前 / 昨天 / 5 天前 / 11月2日" */
export function relativeTime(time: number, now: number): string {
  const diff = now - time
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 2 * day) return '昨天'
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  const d = new Date(time)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
