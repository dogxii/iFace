import { useCallback, useEffect, useRef, useState } from 'react'
import { getAllQuestions } from '@/lib/db'
import { getDailyRecommendations, loadAllBuiltinModulesParallel } from '@/lib/questionLoader'
import type { Difficulty, FilterState, Module, Question, StudyStatus } from '@/types'

export type SortKey = 'default' | 'difficulty-asc' | 'difficulty-desc' | 'module'

interface UseQuestionsReturn {
  questions: Question[]
  allQuestions: Question[]
  filteredQuestions: Question[]
  loading: boolean
  initializing: boolean
  error: string | null
  totalCount: number
  reload: () => Promise<void>
  getQuestionById: (id: string) => Question | undefined
  getQuestionsByModule: (module: Module) => Question[]
  getDailyIds: (
    recordMap: Record<string, { status: string; lastUpdated: number }>,
    count?: number,
  ) => Promise<string[]>
  getAdjacentIds: (
    currentId: string,
    filteredIds: string[],
  ) => { prevId: string | null; nextId: string | null }
}

// ─── In-memory cache shared across hook instances ─────────────────────────────

let _allQuestions: Question[] = []
let _loaded = false
let _loading = false
const _waiters: Array<() => void> = []

async function ensureLoaded(): Promise<Question[]> {
  if (_loaded) return _allQuestions

  if (_loading) {
    return new Promise<Question[]>((resolve) => {
      _waiters.push(() => resolve(_allQuestions))
    })
  }

  _loading = true

  // Try to load from IndexedDB first
  const cached = await getAllQuestions()
  if (cached.length > 0) {
    _allQuestions = cached
    _loaded = true
    _loading = false
    _waiters.forEach((fn) => {
      fn()
    })
    _waiters.length = 0

    // Background sync: fetch any new built-in modules
    loadAllBuiltinModulesParallel().then(async () => {
      const updated = await getAllQuestions()
      if (updated.length !== _allQuestions.length) {
        _allQuestions = updated
        _waiters.forEach((fn) => {
          fn()
        })
      }
    })

    return _allQuestions
  }

  // First run: fetch all built-in modules
  await loadAllBuiltinModulesParallel()
  _allQuestions = await getAllQuestions()
  _loaded = true
  _loading = false
  _waiters.forEach((fn) => {
    fn()
  })
  _waiters.length = 0

  return _allQuestions
}

export function invalidateQuestionsCache() {
  _loaded = false
  _loading = false
  _allQuestions = []
}

// ─── Filter helper ────────────────────────────────────────────────────────────

export function applyFilters(
  questions: Question[],
  filter: Partial<FilterState>,
  recordMap: Record<string, { status: StudyStatus }>,
  sort: SortKey = 'default',
): Question[] {
  let result = questions

  if (filter.modules && filter.modules.length > 0) {
    const set = new Set(filter.modules)
    result = result.filter((q) => set.has(q.module))
  }

  if (filter.difficulties && filter.difficulties.length > 0) {
    const set = new Set(filter.difficulties)
    result = result.filter((q) => set.has(q.difficulty))
  }

  if (filter.statuses && filter.statuses.length > 0) {
    const set = new Set(filter.statuses)
    result = result.filter((q) => {
      const status = recordMap[q.id]?.status ?? 'unlearned'
      return set.has(status as StudyStatus)
    })
  }

  if (filter.search?.trim()) {
    const keyword = filter.search.trim().toLowerCase()
    result = result.filter(
      (q) =>
        q.question.toLowerCase().includes(keyword) ||
        q.tags.some((t) => t.toLowerCase().includes(keyword)) ||
        q.module.toLowerCase().includes(keyword) ||
        q.source?.toLowerCase().includes(keyword),
    )
  }

  switch (sort) {
    case 'difficulty-asc':
      result = [...result].sort((a, b) => a.difficulty - b.difficulty)
      break
    case 'difficulty-desc':
      result = [...result].sort((a, b) => b.difficulty - a.difficulty)
      break
    case 'module':
      result = [...result].sort((a, b) => a.module.localeCompare(b.module))
      break
    default:
      break
  }

  return result
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useQuestions(
  filter?: Partial<FilterState>,
  recordMap?: Record<string, { status: StudyStatus }>,
  sort: SortKey = 'default',
): UseQuestionsReturn {
  const [allQuestions, setAllQuestions] = useState<Question[]>(_allQuestions)
  const [loading, setLoading] = useState(!_loaded)
  const [initializing, setInitializing] = useState(!_loaded)
  const [error, setError] = useState<string | null>(null)

  const filterRef = useRef(filter)
  filterRef.current = filter
  const recordRef = useRef(recordMap)
  recordRef.current = recordMap
  const sortRef = useRef(sort)
  sortRef.current = sort

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const questions = await ensureLoaded()
      setAllQuestions(questions)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
      setInitializing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const reload = useCallback(async () => {
    invalidateQuestionsCache()
    await load()
  }, [load])

  // ── Derived: filtered + sorted questions ──────────────────────────────────

  const filteredQuestions = useCallback((): Question[] => {
    if (!filter && !recordMap) return allQuestions
    return applyFilters(allQuestions, filter ?? {}, recordMap ?? {}, sort)
  }, [allQuestions, filter, recordMap, sort])()

  // ── Lookup helpers ────────────────────────────────────────────────────────

  const getQuestionById = useCallback(
    (id: string): Question | undefined => allQuestions.find((q) => q.id === id),
    [allQuestions],
  )

  const getQuestionsByModule = useCallback(
    (module: Module): Question[] => allQuestions.filter((q) => q.module === module),
    [allQuestions],
  )

  const getDailyIds = useCallback(
    async (
      rm: Record<string, { status: string; lastUpdated: number }>,
      count = 10,
    ): Promise<string[]> => {
      const allIds = allQuestions.map((q) => q.id)
      return getDailyRecommendations(allIds, rm, count)
    },
    [allQuestions],
  )

  const getAdjacentIds = useCallback(
    (
      currentId: string,
      filteredIds: string[],
    ): { prevId: string | null; nextId: string | null } => {
      const idx = filteredIds.indexOf(currentId)
      if (idx === -1) return { prevId: null, nextId: null }
      return {
        prevId: idx > 0 ? filteredIds[idx - 1] : null,
        nextId: idx < filteredIds.length - 1 ? filteredIds[idx + 1] : null,
      }
    },
    [],
  )

  return {
    questions: allQuestions,
    allQuestions,
    filteredQuestions,
    loading,
    initializing,
    error,
    totalCount: allQuestions.length,
    reload,
    getQuestionById,
    getQuestionsByModule,
    getDailyIds,
    getAdjacentIds,
  }
}

// ─── Lightweight hook for a single question (detail page) ─────────────────────

export function useQuestion(id: string | undefined): {
  question: Question | undefined
  loading: boolean
} {
  const [question, setQuestion] = useState<Question | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    ensureLoaded()
      .then((qs) => setQuestion(qs.find((q) => q.id === id)))
      .finally(() => setLoading(false))
  }, [id])

  return { question, loading }
}

// ─── Hook for practice session (filtered list of ids) ─────────────────────────

export function usePracticeQuestions(
  module: Module | null,
  difficulty: Difficulty | null,
): { questions: Question[]; loading: boolean } {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    ensureLoaded()
      .then((all) => {
        let filtered = all
        if (module) filtered = filtered.filter((q) => q.module === module)
        if (difficulty) filtered = filtered.filter((q) => q.difficulty === difficulty)
        setQuestions(filtered)
      })
      .finally(() => setLoading(false))
  }, [module, difficulty])

  return { questions, loading }
}
