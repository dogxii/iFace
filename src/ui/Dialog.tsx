import { X } from 'lucide-react'
import { Dialog as D } from 'radix-ui'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { cn } from './cn'

export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogClose = D.Close

function Overlay({ className }: { className?: string }) {
  return (
    <D.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-overlay data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
        className,
      )}
    />
  )
}

export interface DialogContentProps extends Omit<D.DialogContentProps, 'title'> {
  title: ReactNode
  description?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  hideClose?: boolean
}

export function DialogContent({
  title,
  description,
  footer,
  size = 'md',
  hideClose,
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <D.Portal>
      <Overlay />
      <D.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 flex max-h-[85dvh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-line bg-elevated shadow-popover outline-none',
          'data-[state=open]:animate-scale-in data-[state=closed]:animate-fade-out',
          { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size],
          className,
        )}
        {...props}
      >
        <div className="flex items-start gap-4 px-5 pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <D.Title className="text-lg font-semibold tracking-tight text-fg">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-sm text-fg-muted">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          {hideClose ? null : (
            <D.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="关闭" className="-mt-1 -mr-1">
                <X />
              </Button>
            </D.Close>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-line bg-subtle/60 px-5 py-3 rounded-b-2xl">
            {footer}
          </div>
        ) : null}
      </D.Content>
    </D.Portal>
  )
}

export const Sheet = D.Root
export const SheetTrigger = D.Trigger
export const SheetClose = D.Close

export interface SheetContentProps extends Omit<D.DialogContentProps, 'title'> {
  title: ReactNode
  description?: ReactNode
  side?: 'right' | 'bottom'
  width?: number
  headerAction?: ReactNode
  footer?: ReactNode
  /** Classes for the scrollable body wrapper. */
  bodyClassName?: string
}

/** Side panel (settings, AI assistant, notes). Bottom sheet on small screens. */
export function SheetContent({
  title,
  description,
  side = 'right',
  width = 420,
  headerAction,
  footer,
  bodyClassName,
  className,
  children,
  style,
  ...props
}: SheetContentProps) {
  return (
    <D.Portal>
      <Overlay className="bg-overlay/60" />
      <D.Content
        style={side === 'right' ? { width, ...style } : style}
        className={cn(
          'fixed z-50 flex flex-col bg-elevated shadow-popover outline-none',
          side === 'right' &&
            'inset-y-0 right-0 max-w-[100vw] border-l border-line data-[state=open]:animate-slide-in-right',
          side === 'bottom' &&
            'inset-x-0 bottom-0 max-h-[90dvh] rounded-t-2xl border-t border-line data-[state=open]:animate-slide-in-bottom',
          'data-[state=closed]:animate-fade-out',
          className,
        )}
        {...props}
      >
        <div className="flex h-13 shrink-0 items-center gap-2 border-b border-line px-4">
          <div className="min-w-0 flex-1">
            <D.Title className="truncate text-base font-semibold text-fg">{title}</D.Title>
            {description ? (
              <D.Description className="truncate text-xs text-fg-subtle">
                {description}
              </D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          {headerAction}
          <D.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label="关闭">
              <X />
            </Button>
          </D.Close>
        </div>
        <div className={cn('min-h-0 flex-1 overflow-y-auto', bodyClassName)}>{children}</div>
        {footer ? <div className="shrink-0 border-t border-line p-3">{footer}</div> : null}
      </D.Content>
    </D.Portal>
  )
}
