import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-line bg-subtle text-fg-muted [&_svg]:size-5">
          {icon}
        </div>
      ) : null}
      <p className="text-base font-medium text-fg">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p> : null}
      {action ? <div className="mt-5 flex gap-2">{action}</div> : null}
    </div>
  )
}

const calloutTones = {
  neutral: 'bg-subtle border-line text-fg',
  accent: 'bg-accent-subtle border-transparent text-fg',
  success: 'bg-success-subtle border-transparent text-fg',
  warning: 'bg-warning-subtle border-transparent text-fg',
  danger: 'bg-danger-subtle border-transparent text-fg',
}
const calloutIcon = {
  neutral: 'text-fg-muted',
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

export function Callout({
  tone = 'neutral',
  icon,
  title,
  children,
  className,
}: {
  tone?: keyof typeof calloutTones
  icon?: ReactNode
  title?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border px-4 py-3 text-sm',
        calloutTones[tone],
        className,
      )}
    >
      {icon ? (
        <span className={cn('mt-0.5 shrink-0 [&_svg]:size-4', calloutIcon[tone])}>{icon}</span>
      ) : null}
      <div className="min-w-0 leading-relaxed">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-0.5 text-fg-muted')}>{children}</div> : null}
      </div>
    </div>
  )
}
