import { cn } from '@/ui'

/**
 * The iFace mark: a winking face on a yellow tile. Uses the small-size drawing (bolder strokes)
 * that also backs `favicon.svg`; the full set lives in `docs/design/logo/`.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={cn('size-6 shrink-0', className)}>
      <rect width="64" height="64" rx="16" fill="#ffc933" />
      <path
        d="M13.5 28q6-6.5 12 0M17.5 40.5q14.5 12.5 29 0"
        stroke="#1c1917"
        strokeWidth="5.6"
        strokeLinecap="round"
      />
      <ellipse cx="43" cy="24.5" rx="4.8" ry="6" fill="#1c1917" />
    </svg>
  )
}
