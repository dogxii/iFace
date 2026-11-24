import type { Difficulty } from '@/types'
import { cn } from '@/ui'

/** Semantic tone per difficulty, usable as a `Tag` variant. */
export const DIFFICULTY_TONE = {
  1: 'success',
  2: 'warning',
  3: 'danger',
} as const satisfies Record<Difficulty, string>

const FILL: Record<Difficulty, string> = { 1: 'bg-success', 2: 'bg-warning', 3: 'bg-danger' }

/** Three ascending bars, filled up to the question's difficulty. */
export function DifficultyBars({ value, className }: { value: Difficulty; className?: string }) {
  return (
    <span className={cn('mr-1.5 inline-flex h-3 items-end gap-0.5', className)} aria-hidden>
      {[5, 8, 12].map((h, i) => (
        <span
          key={h}
          style={{ height: h }}
          className={cn('w-[3px] rounded-[1px]', i < value ? FILL[value] : 'bg-line-strong')}
        />
      ))}
    </span>
  )
}
