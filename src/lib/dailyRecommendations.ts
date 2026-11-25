import { toDateKey } from './date'
import { getMeta, setMeta } from './db'

const DAILY_RECS_META = 'daily_recommendations_v2'

// ─── Daily recommendations cache ─────────────────────────────────────────────

interface DailyCache {
  date: string
  ids: string[]
}

export async function getDailyRecommendations(
  allIds: string[],
  recordMap: Record<string, { status: string; lastUpdated: number }>,
  count = 10,
): Promise<string[]> {
  const cached = await getMeta<DailyCache>(DAILY_RECS_META)
  if (cached && cached.date === toDateKey()) {
    const allIdSet = new Set(allIds)
    const valid = cached.ids.filter((id) => allIdSet.has(id))
    const targetCount = Math.min(count, allIds.length)
    if (valid.length >= targetCount) return valid.slice(0, count)
  }

  const reviewIds = allIds
    .filter((id) => recordMap[id]?.status === 'review')
    .sort((a, b) => (recordMap[a]?.lastUpdated ?? 0) - (recordMap[b]?.lastUpdated ?? 0))

  const unlearnedIds = allIds.filter((id) => !recordMap[id] || recordMap[id].status === 'unlearned')

  const result: string[] = []
  const seen = new Set<string>()
  for (const id of [...reviewIds, ...unlearnedIds]) {
    if (result.length >= count) break
    if (!seen.has(id)) {
      result.push(id)
      seen.add(id)
    }
  }

  await setMeta(DAILY_RECS_META, { date: toDateKey(), ids: result })
  return result
}

// ─── Invalidate daily cache ───────────────────────────────────────────────────

export async function invalidateDailyCache(): Promise<void> {
  await setMeta(DAILY_RECS_META, null)
}
