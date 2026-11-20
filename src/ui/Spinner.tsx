import { cn } from './cn'

const sizes = { sm: 'size-3.5 border-[1.5px]', md: 'size-4 border-2', lg: 'size-6 border-2' }

export function Spinner({
  size = 'md',
  className,
  label = '加载中',
}: {
  size?: keyof typeof sizes
  className?: string
  label?: string
}) {
  return (
    <output
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-r-transparent opacity-70',
        sizes[size],
        className,
      )}
    />
  )
}
