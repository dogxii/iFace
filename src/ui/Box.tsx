import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, HTMLAttributes } from 'react'
import { cn } from './cn'

const boxVariants = cva('rounded-xl border border-line bg-canvas', {
  variants: {
    padding: { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' },
    elevation: { flat: '', raised: 'shadow-raised' },
    interactive: {
      true: 'transition-colors hover:border-line-strong hover:bg-subtle/60 cursor-pointer',
      false: '',
    },
  },
  defaultVariants: { padding: 'none', elevation: 'flat', interactive: false },
})

export interface BoxProps extends ComponentProps<'div'>, VariantProps<typeof boxVariants> {}

/** Bordered container — the base surface for cards, tables and panels. */
export function Box({ className, padding, elevation, interactive, ...props }: BoxProps) {
  return (
    <div className={cn(boxVariants({ padding, elevation, interactive }), className)} {...props} />
  )
}

export function BoxHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-fg">{title}</h3>
        {description ? <p className="mt-0.5 text-sm text-fg-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}

/** A row of stats separated by hairlines, as on the dashboard. */
export function StatGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'grid divide-x divide-line rounded-xl border border-line bg-canvas [grid-template-columns:repeat(auto-fit,minmax(0,1fr))]',
        className,
      )}
      {...props}
    />
  )
}

export function Stat({
  label,
  value,
  unit,
  hint,
  hintTone = 'neutral',
  indicator,
}: {
  label: React.ReactNode
  value: React.ReactNode
  unit?: React.ReactNode
  hint?: React.ReactNode
  hintTone?: 'neutral' | 'positive'
  indicator?: React.ReactNode
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-1.5 text-xs text-fg-muted">
        {indicator}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-fg">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-normal tracking-normal text-fg-subtle">{unit}</span>
        ) : null}
      </div>
      {hint ? (
        <div
          className={cn(
            'mt-0.5 text-xs',
            hintTone === 'positive' ? 'text-success' : 'text-fg-subtle',
          )}
        >
          {hint}
        </div>
      ) : null}
    </div>
  )
}
