import { lazy, Suspense } from 'react'
import type { MarkdownRendererProps } from '@/components/ui/MarkdownRenderer'

const LazyRenderer = lazy(async () => {
  const module = await import('@/components/ui/MarkdownRenderer')
  return { default: module.MarkdownRenderer }
})

export function MarkdownRenderer({ className = '', ...props }: MarkdownRendererProps) {
  return (
    <Suspense fallback={<div className={className} style={{ minHeight: 24 }} />}>
      <LazyRenderer className={className} {...props} />
    </Suspense>
  )
}
