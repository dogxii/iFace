import { Check, ChevronRight } from 'lucide-react'
import { DropdownMenu as M, Popover as P, Tooltip as T } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from './cn'
import { Kbd } from './Kbd'

const popoverSurface =
  'z-50 rounded-xl border border-line bg-elevated shadow-popover outline-none data-[state=open]:animate-scale-in data-[state=closed]:animate-fade-out'

export const DropdownMenu = M.Root
export const DropdownMenuTrigger = M.Trigger
export const DropdownMenuGroup = M.Group
export const DropdownMenuSub = M.Sub
export const DropdownMenuRadioGroup = M.RadioGroup

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = 'start',
  ...props
}: M.DropdownMenuContentProps) {
  return (
    <M.Portal>
      <M.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(popoverSurface, 'min-w-44 p-1', className)}
        {...props}
      />
    </M.Portal>
  )
}

const itemBase =
  'relative flex h-8 cursor-default items-center gap-2 rounded-lg px-2 text-sm text-fg outline-none select-none data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-subtle'

export function DropdownMenuItem({
  className,
  shortcut,
  destructive,
  children,
  ...props
}: M.DropdownMenuItemProps & { shortcut?: ReactNode; destructive?: boolean }) {
  return (
    <M.Item
      className={cn(
        itemBase,
        destructive && 'text-danger [&_svg]:text-danger data-[highlighted]:bg-danger-subtle',
        className,
      )}
      {...props}
    >
      {children}
      {shortcut ? <Kbd className="ml-auto">{shortcut}</Kbd> : null}
    </M.Item>
  )
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: M.DropdownMenuCheckboxItemProps) {
  return (
    <M.CheckboxItem className={cn(itemBase, 'pr-8', className)} {...props}>
      {children}
      <M.ItemIndicator className="absolute right-2">
        <Check className="text-fg!" />
      </M.ItemIndicator>
    </M.CheckboxItem>
  )
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: M.DropdownMenuRadioItemProps) {
  return (
    <M.RadioItem className={cn(itemBase, 'pr-8', className)} {...props}>
      {children}
      <M.ItemIndicator className="absolute right-2">
        <Check className="text-fg!" />
      </M.ItemIndicator>
    </M.RadioItem>
  )
}

export function DropdownMenuLabel({ className, ...props }: M.DropdownMenuLabelProps) {
  return <M.Label className={cn('px-2 pt-1.5 pb-1 text-xs text-fg-subtle', className)} {...props} />
}

export function DropdownMenuSeparator({ className, ...props }: M.DropdownMenuSeparatorProps) {
  return <M.Separator className={cn('-mx-1 my-1 h-px bg-line', className)} {...props} />
}

export function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: M.DropdownMenuSubTriggerProps) {
  return (
    <M.SubTrigger className={cn(itemBase, 'data-[state=open]:bg-muted', className)} {...props}>
      {children}
      <ChevronRight className="ml-auto" />
    </M.SubTrigger>
  )
}

export function DropdownMenuSubContent({ className, ...props }: M.DropdownMenuSubContentProps) {
  return (
    <M.Portal>
      <M.SubContent className={cn(popoverSurface, 'min-w-40 p-1', className)} {...props} />
    </M.Portal>
  )
}

export const Popover = P.Root
export const PopoverTrigger = P.Trigger
export const PopoverClose = P.Close

export function PopoverContent({ className, sideOffset = 6, ...props }: P.PopoverContentProps) {
  return (
    <P.Portal>
      <P.Content
        sideOffset={sideOffset}
        className={cn(popoverSurface, 'w-72 p-4', className)}
        {...props}
      />
    </P.Portal>
  )
}

export const TooltipProvider = T.Provider

/** Simple tooltip. Wrap the app (or a subtree) in `TooltipProvider`. */
export function Tooltip({
  content,
  shortcut,
  side = 'top',
  children,
}: {
  content: ReactNode
  shortcut?: ReactNode
  side?: T.TooltipContentProps['side']
  children: ReactNode
}) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="z-50 flex items-center gap-2 rounded-md bg-fg px-2 py-1 text-xs text-canvas shadow-popover data-[state=delayed-open]:animate-fade-in"
        >
          {content}
          {shortcut ? <span className="opacity-60">{shortcut}</span> : null}
        </T.Content>
      </T.Portal>
    </T.Root>
  )
}
