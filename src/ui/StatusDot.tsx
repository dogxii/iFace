import { cn } from './cn'

export type StatusTone = 'success' | 'warning' | 'danger' | 'accent' | 'neutral' | 'current'

const tones: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  accent: 'bg-accent',
  neutral: 'bg-fg-subtle/60',
  current: 'bg-fg',
}

export function StatusDot({
  tone = 'neutral',
  size = 6,
  className,
  label,
}: {
  tone?: StatusTone
  size?: 6 | 8
  className?: string
  /** Accessible label; omit when the adjacent text already conveys the status. */
  label?: string
}) {
  const classes = cn(
    'inline-block shrink-0 rounded-full',
    size === 6 ? 'size-1.5' : 'size-2',
    tones[tone],
    className,
  )
  if (label) return <span role="img" aria-label={label} className={classes} />
  return <span aria-hidden className={classes} />
}
