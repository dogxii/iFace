import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { cn } from './cn'

const fieldBase =
  'w-full rounded-lg border border-line-strong bg-canvas text-base text-fg placeholder:text-fg-subtle transition-[border-color,box-shadow] outline-none focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg'
  /** Icon or text rendered inside the field, before the value. */
  leading?: ReactNode
  /** Icon, button or kbd rendered inside the field, after the value. */
  trailing?: ReactNode
}

const inputSizes = { sm: 'h-7 text-sm', md: 'h-8 text-sm', lg: 'h-10' }

export function Input({
  className,
  size = 'md',
  leading,
  trailing,
  ref,
  ...props
}: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  if (!leading && !trailing) {
    return (
      <input ref={ref} className={cn(fieldBase, inputSizes[size], 'px-3', className)} {...props} />
    )
  }

  return (
    <div className={cn('relative flex items-center', className)}>
      {leading ? (
        <span className="pointer-events-none absolute left-2.5 flex items-center text-fg-subtle [&_svg]:size-4">
          {leading}
        </span>
      ) : null}
      <input
        ref={ref}
        className={cn(
          fieldBase,
          inputSizes[size],
          leading ? 'pl-8' : 'pl-3',
          trailing ? 'pr-10' : 'pr-3',
        )}
        {...props}
      />
      {trailing ? (
        <span className="absolute right-2 flex items-center gap-1">{trailing}</span>
      ) : null}
    </div>
  )
}

export function Textarea({
  className,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: React.Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      ref={ref}
      className={cn(fieldBase, 'min-h-20 resize-y px-3 py-2.5 leading-relaxed', className)}
      {...props}
    />
  )
}

/**
 * Composer: a textarea with a toolbar row, used for answers, notes and AI prompts.
 * The textarea itself is borderless; the wrapper carries the border and focus ring.
 */
export function Composer({
  className,
  toolbar,
  textareaClassName,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  toolbar?: ReactNode
  textareaClassName?: string
  ref?: React.Ref<HTMLTextAreaElement>
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-line-strong bg-canvas transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-3 focus-within:ring-ring/40',
        className,
      )}
    >
      <textarea
        ref={ref}
        className={cn(
          'block min-h-24 w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-md leading-relaxed text-fg outline-none placeholder:text-fg-subtle',
          textareaClassName,
        )}
        {...props}
      />
      {toolbar ? (
        <div className="flex items-center gap-1 border-t border-line px-2 py-1.5">{toolbar}</div>
      ) : null}
    </div>
  )
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  // biome-ignore lint/a11y/noLabelWithoutControl: consumers pass htmlFor or wrap the control
  return <label className={cn('text-sm font-medium text-fg', className)} {...props} />
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  )
}
