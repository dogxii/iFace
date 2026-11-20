import { cn } from './cn'

type Tone = 'accent' | 'fg' | 'success' | 'warning' | 'danger'
const toneBg: Record<Tone, string> = {
  accent: 'bg-accent',
  fg: 'bg-fg',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export interface ProgressSegment {
  value: number
  tone: Tone
}

/** Thin progress bar. Pass `segments` for stacked values (e.g. mastered + review). */
export function Progress({
  value = 0,
  max = 100,
  tone = 'accent',
  segments,
  size = 'sm',
  className,
  label,
}: {
  value?: number
  max?: number
  tone?: Tone
  segments?: ProgressSegment[]
  size?: 'xs' | 'sm' | 'md'
  className?: string
  label?: string
}) {
  const parts = segments ?? [{ value, tone }]
  const total = parts.reduce((sum, part) => sum + part.value, 0)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(total, max)}
      className={cn(
        'flex w-full overflow-hidden rounded-full bg-muted',
        { xs: 'h-1', sm: 'h-1.5', md: 'h-2' }[size],
        className,
      )}
    >
      {parts.map((part, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
          key={index}
          className={cn('h-full transition-[width] duration-500 ease-out-expo', toneBg[part.tone])}
          style={{ width: `${Math.max(0, Math.min(100, (part.value / max) * 100))}%` }}
        />
      ))}
    </div>
  )
}

export type StepState = 'done' | 'success' | 'warning' | 'danger' | 'current' | 'todo'
const stepBg: Record<StepState, string> = {
  done: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  current: 'bg-fg',
  todo: 'bg-line',
}

/** Segmented progress — one segment per item (practice session, daily goal). */
export function StepProgress({
  steps,
  className,
  label,
}: {
  steps: StepState[]
  className?: string
  label?: string
}) {
  const done = steps.filter((step) => step !== 'todo' && step !== 'current').length
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={steps.length}
      aria-valuenow={done}
      className={cn('flex w-full gap-1', className)}
    >
      {steps
        .map((step, position) => ({ step, position }))
        .map(({ step, position }) => (
          <span
            key={position}
            className={cn('h-1 flex-1 rounded-full transition-colors', stepBg[step])}
          />
        ))}
    </div>
  )
}

/** Small circular progress for module lists. */
export function ProgressRing({
  value,
  max = 100,
  size = 14,
  stroke = 3,
  className,
}: {
  value: number
  max?: number
  size?: number
  stroke?: number
  className?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value / max))
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('-rotate-90 shrink-0', className)}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        className="stroke-line"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round"
        className="stroke-accent transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  )
}
