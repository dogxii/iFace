import { useCallback, useEffect } from 'react'
import { getDailyRecommendations } from '@/lib/dailyRecommendations'
import { initLibraryStore, useLibraryState } from '@/store/useLibraryStore'
import type { Question } from '@/types'

interface UseQuestionsReturn {
  /** Questions of enabled banks, in display order. */
  allQuestions: Question[]
  loading: boolean
  initializing: boolean
  error: string | null
  getDailyIds: (
    recordMap: Record<string, { status: string; lastUpdated: number }>,
    count?: number,
    questionIds?: string[],
  ) => Promise<string[]>
}

export function useQuestions(): UseQuestionsReturn {
  const allQuestions = useLibraryState((state) => state.questions)
  const loaded = useLibraryState((state) => state.loaded)
  const error = useLibraryState((state) => state.error)

  useEffect(() => {
    void initLibraryStore()
  }, [])

  const getDailyIds = useCallback<UseQuestionsReturn['getDailyIds']>(
    (recordMap, count = 10, questionIds) =>
      getDailyRecommendations(questionIds ?? allQuestions.map((q) => q.id), recordMap, count),
    [allQuestions],
  )

  return { allQuestions, loading: !loaded, initializing: !loaded, error, getDailyIds }
}

/** One question by id, including questions of disabled banks (links keep working). */
export function useQuestion(id: string | undefined): {
  question: Question | undefined
  loading: boolean
} {
  const question = useLibraryState((state) => (id ? state.byId.get(id) : undefined))
  const loaded = useLibraryState((state) => state.loaded)

  useEffect(() => {
    void initLibraryStore()
  }, [])

  return { question, loading: Boolean(id) && !loaded }
}
