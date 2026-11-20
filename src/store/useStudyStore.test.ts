import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type DataSource, localDataSource, setDataSource } from '@/data/source'
import type { StudyRecord } from '@/types'

vi.mock('@/lib/questionLoader', () => ({ invalidateDailyCache: vi.fn(async () => {}) }))

const { useStudyState, clearSessionReview } = await import('./useStudyStore')

function memoryRecords(initial: StudyRecord[] = []) {
  const map = new Map(initial.map((r) => [r.questionId, r]))
  const records: DataSource['records'] = {
    list: async () => [...map.values()],
    get: async (id) => map.get(id),
    put: async (r) => void map.set(r.questionId, r),
    remove: async (id) => void map.delete(id),
    clear: async () => map.clear(),
  }
  return { map, records }
}

describe('study store', () => {
  let map: Map<string, StudyRecord>

  beforeEach(async () => {
    const memory = memoryRecords([
      { questionId: 'a', status: 'mastered', lastUpdated: 1, reviewCount: 0 },
    ])
    map = memory.map
    setDataSource({ ...localDataSource, records: memory.records })
    clearSessionReview('b')
    await useStudyState.getState().reloadRecords()
  })

  it('loads records and derives status counts', () => {
    const state = useStudyState.getState()
    expect(state.initialized).toBe(true)
    expect(state.statusCounts).toEqual({ unlearned: 0, mastered: 1, review: 0 })
  })

  it('updates memory and storage when a status is set', async () => {
    await useStudyState.getState().setStatus('b', 'review')
    await useStudyState.getState().setStatus('b', 'review')
    const state = useStudyState.getState()
    expect(state.getStatus('b')).toBe('review')
    expect(state.records.b.reviewCount).toBe(1)
    expect(state.statusCounts.review).toBe(1)
    expect(map.get('b')?.status).toBe('review')
  })

  it('clears a single record and resets everything', async () => {
    await useStudyState.getState().clearRecord('a')
    expect(useStudyState.getState().getStatus('a')).toBe('unlearned')
    expect(map.has('a')).toBe(false)

    await useStudyState.getState().setStatus('c', 'mastered')
    await useStudyState.getState().resetAll()
    expect(useStudyState.getState().records).toEqual({})
    expect(map.size).toBe(0)
  })

  it('toggles category visibility', () => {
    const { toggleCategoryVisibility } = useStudyState.getState()
    toggleCategoryVisibility('Java')
    expect(useStudyState.getState().isCategoryHidden('Java')).toBe(true)
    toggleCategoryVisibility('Java')
    expect(useStudyState.getState().isCategoryHidden('Java')).toBe(false)
  })
})
