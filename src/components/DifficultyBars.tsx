import type { Difficulty } from '@/types'
import { cn } from '@/ui'

/** Three ascending bars, filled up to the question's difficulty. */
export function DifficultyBars({ value, className }: { value: Difficulty; className?: string }) {
  return (
    <span className={cn('mr-1.5 inline-flex h-3 items-end gap-0.5', className)} aria-hidden>
      {[5, 8, 12].map((h, i) => (
        <span
          key={h}
          style={{ height: h }}
          className={cn('w-[3px] rounded-[1px]', i < value ? 'bg-fg' : 'bg-line-strong')}
        />
      ))}
    </span>
  )
}
