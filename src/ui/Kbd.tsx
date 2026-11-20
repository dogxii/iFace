import type { HTMLAttributes } from 'react'
import { cn } from './cn'

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-line border-b-2 bg-subtle px-1 font-sans text-2xs leading-none text-fg-subtle',
        className,
      )}
      {...props}
    />
  )
}
