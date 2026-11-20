import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from './cn'
import { StatusDot, type StatusTone } from './StatusDot'

const tagVariants = cva(
  'inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-md px-2 text-xs whitespace-nowrap [&_svg]:size-3',
  {
    variants: {
      variant: {
        outline: 'border border-line text-fg-muted',
        soft: 'bg-muted text-fg-muted',
        accent: 'bg-accent-subtle text-accent',
        success: 'bg-success-subtle text-success',
        warning: 'bg-warning-subtle text-warning',
        danger: 'bg-danger-subtle text-danger',
      },
    },
    defaultVariants: { variant: 'outline' },
  },
)

export interface TagProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {
  /** Show a leading status dot. */
  dot?: StatusTone
}

export function Tag({ className, variant, dot, children, ...props }: TagProps) {
  return (
    <span className={cn(tagVariants({ variant }), className)} {...props}>
      {dot ? <StatusDot tone={dot} /> : null}
      {children}
    </span>
  )
}
