import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

/** Sidebar container (desktop). Pages render inside `AppMain`. */
export function Sidebar({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <aside
      className={cn(
        'flex h-full w-58 shrink-0 flex-col gap-px border-r border-line bg-subtle px-2.5 py-3.5',
        className,
      )}
      {...props}
    />
  )
}

export function SidebarGroupLabel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-2 pt-4 pb-1.5 text-xs text-fg-subtle', className)} {...props} />
}

export interface SidebarItemProps extends HTMLAttributes<HTMLElement> {
  icon?: ReactNode
  active?: boolean
  count?: ReactNode
  /** Render the item as the given element (e.g. a router `NavLink`). */
  as?: React.ElementType
  [key: string]: unknown
}

export function SidebarItem({
  icon,
  active,
  count,
  as: Comp = 'button',
  className,
  children,
  ...props
}: SidebarItemProps) {
  return (
    <Comp
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm text-fg-muted transition-colors outline-none hover:bg-muted/70 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring',
        '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-subtle',
        active && 'bg-muted font-medium text-fg [&_svg]:text-fg',
        className,
      )}
      {...(Comp === 'button' ? { type: 'button' } : {})}
      {...props}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count !== undefined ? (
        <span className="text-xs tabular-nums text-fg-subtle">{count}</span>
      ) : null}
    </Comp>
  )
}

/** Top bar of a page: breadcrumb / title on the left, actions on the right. */
export function PageHeader({
  title,
  actions,
  className,
}: {
  title: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-13 shrink-0 items-center gap-2 border-b border-line bg-canvas/85 px-6 backdrop-blur-md',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-fg-subtle">{title}</div>
      {actions ? <div className="flex items-center gap-1.5">{actions}</div> : null}
    </header>
  )
}

export function Breadcrumb({ items }: { items: { label: ReactNode; onClick?: () => void }[] }) {
  return (
    <nav aria-label="面包屑" className="flex min-w-0 items-center gap-1.5">
      {items.map((item, index) => {
        const last = index === items.length - 1
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: breadcrumb order is stable
          <span key={index} className="flex min-w-0 items-center gap-1.5">
            {item.onClick && !last ? (
              <button type="button" onClick={item.onClick} className="truncate hover:text-fg">
                {item.label}
              </button>
            ) : (
              <span className={cn('truncate', last && 'font-medium text-fg')}>{item.label}</span>
            )}
            {last ? null : <span className="text-line-strong">/</span>}
          </span>
        )
      })}
    </nav>
  )
}

/** Page title block with optional actions, used at the top of page content. */
export function PageTitle({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
        {description ? <p className="mt-1 text-base text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function SectionHeader({
  title,
  action,
  className,
}: {
  title: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-4', className)}>
      <h2 className="text-base font-semibold text-fg">{title}</h2>
      {action ? <div className="text-sm text-fg-subtle">{action}</div> : null}
    </div>
  )
}
