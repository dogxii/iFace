import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'
import { Spinner } from './Spinner'

export const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-medium select-none',
    'transition-[background-color,border-color,color,box-shadow,opacity] duration-150',
    'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-canvas',
    'disabled:pointer-events-none disabled:opacity-45',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-fg text-canvas hover:opacity-88',
        accent: 'bg-accent text-accent-fg hover:bg-accent-hover',
        secondary: 'border border-line-strong bg-canvas text-fg hover:bg-subtle',
        ghost: 'text-fg-muted hover:bg-muted hover:text-fg',
        danger: 'bg-danger text-white hover:opacity-90',
        'danger-ghost': 'text-danger hover:bg-danger-subtle',
        link: 'h-auto px-0 text-accent underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-7 rounded-md px-2.5 text-xs [&_svg]:size-3.5',
        md: 'h-8 rounded-lg px-3 text-sm [&_svg]:size-4',
        lg: 'h-10 rounded-lg px-4 text-base [&_svg]:size-4',
        'icon-sm': 'size-7 rounded-md [&_svg]:size-3.5',
        icon: 'size-8 rounded-lg [&_svg]:size-4',
        'icon-lg': 'size-10 rounded-lg [&_svg]:size-[18px]',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render the child element (e.g. a router `Link`) with button styles. */
  asChild?: boolean
  loading?: boolean
  /** Keyboard hint rendered at the end, e.g. `⌘K`. */
  shortcut?: ReactNode
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  shortcut,
  disabled,
  children,
  type,
  ref,
  ...props
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
  const classes = cn(buttonVariants({ variant, size }), className)

  if (asChild) {
    return (
      <Slot.Root ref={ref} className={classes} {...props}>
        {children}
      </Slot.Root>
    )
  }

  const onDark = variant === 'primary' || variant === 'accent' || variant === 'danger'

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : null}
      {children}
      {shortcut ? (
        <kbd
          className={cn(
            'ml-1 rounded border px-1 font-sans text-2xs leading-4 font-normal',
            onDark ? 'border-current/30 opacity-70' : 'border-line bg-subtle text-fg-subtle',
          )}
        >
          {shortcut}
        </kbd>
      ) : null}
    </button>
  )
}
