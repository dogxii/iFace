import { Check, ChevronDown } from 'lucide-react'
import { Select as S, Switch as Sw, Tabs as Tb, ToggleGroup as TG } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from './cn'

/* ─── Tabs ──────────────────────────────────────────────────────────────────── */

export const Tabs = Tb.Root
export const TabsContent = Tb.Content

export function TabsList({
  className,
  variant = 'pill',
  ...props
}: Tb.TabsListProps & { variant?: 'pill' | 'underline' }) {
  return (
    <Tb.List
      data-variant={variant}
      className={cn(
        'group/tabs inline-flex items-center',
        variant === 'pill' && 'gap-0.5 rounded-lg bg-muted p-0.5',
        variant === 'underline' && 'gap-5 border-b border-line',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: Tb.TabsTriggerProps) {
  return (
    <Tb.Trigger
      className={cn(
        'inline-flex items-center gap-1.5 text-sm whitespace-nowrap text-fg-muted transition-colors outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4',
        'group-data-[variant=pill]/tabs:h-7 group-data-[variant=pill]/tabs:rounded-md group-data-[variant=pill]/tabs:px-3',
        'group-data-[variant=pill]/tabs:data-[state=active]:bg-canvas group-data-[variant=pill]/tabs:data-[state=active]:text-fg group-data-[variant=pill]/tabs:data-[state=active]:shadow-[0_1px_2px_rgb(0_0_0/0.06),0_0_0_1px_var(--ds-border)]',
        'group-data-[variant=underline]/tabs:-mb-px group-data-[variant=underline]/tabs:h-9 group-data-[variant=underline]/tabs:border-b-2 group-data-[variant=underline]/tabs:border-transparent',
        'group-data-[variant=underline]/tabs:data-[state=active]:border-fg group-data-[variant=underline]/tabs:data-[state=active]:text-fg',
        className,
      )}
      {...props}
    />
  )
}

/* ─── Segmented control (single choice) ─────────────────────────────────────── */

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  size = 'md',
  className,
  label,
}: {
  value: T
  onValueChange: (value: T) => void
  options: SegmentedOption<T>[]
  size?: 'sm' | 'md'
  className?: string
  label?: string
}) {
  return (
    <TG.Root
      type="single"
      value={value}
      aria-label={label}
      onValueChange={(next) => next && onValueChange(next as T)}
      className={cn('inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5', className)}
    >
      {options.map((option) => (
        <TG.Item
          key={option.value}
          value={option.value}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-md text-fg-muted transition-colors outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5',
            size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-3 text-sm',
            'data-[state=on]:bg-canvas data-[state=on]:text-fg data-[state=on]:shadow-[0_1px_2px_rgb(0_0_0/0.06),0_0_0_1px_var(--ds-border)]',
          )}
        >
          {option.icon}
          {option.label}
        </TG.Item>
      ))}
    </TG.Root>
  )
}

/* ─── Switch ────────────────────────────────────────────────────────────────── */

export function Switch({ className, ...props }: Sw.SwitchProps) {
  return (
    <Sw.Root
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-line-strong p-0.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <Sw.Thumb className="block size-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4" />
    </Sw.Root>
  )
}

/** A labelled switch row, as used in settings lists. */
export function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string
  label: ReactNode
  description?: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-fg-muted">{description}</span>
        ) : null}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}

/* ─── Select ────────────────────────────────────────────────────────────────── */

export interface SelectOption {
  value: string
  label: ReactNode
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  prefix,
  className,
  size = 'md',
  label,
}: {
  value?: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: ReactNode
  /** Shown before the value, e.g. "状态". */
  prefix?: ReactNode
  className?: string
  size?: 'sm' | 'md'
  label?: string
}) {
  return (
    <S.Root value={value} onValueChange={onValueChange}>
      <S.Trigger
        aria-label={label}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas text-fg-muted outline-none transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-ring data-[placeholder]:text-fg-subtle',
          size === 'sm' ? 'h-7 px-2 text-xs' : 'h-8 px-2.5 text-sm',
          className,
        )}
      >
        {prefix ? <span>{prefix}</span> : null}
        <span className="font-medium text-fg">
          <S.Value placeholder={placeholder} />
        </span>
        <S.Icon className="ml-auto text-fg-subtle">
          <ChevronDown className="size-3.5" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-line bg-elevated p-1 shadow-popover data-[state=open]:animate-scale-in"
        >
          <S.Viewport>
            {options.map((option) => (
              <S.Item
                key={option.value}
                value={option.value}
                className="relative flex h-8 cursor-default items-center rounded-lg pr-8 pl-2 text-sm text-fg outline-none select-none data-[highlighted]:bg-muted"
              >
                <S.ItemText>{option.label}</S.ItemText>
                <S.ItemIndicator className="absolute right-2">
                  <Check className="size-4" />
                </S.ItemIndicator>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  )
}
