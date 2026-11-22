import { Sparkles, X } from 'lucide-react'
import { useEffect } from 'react'
import type { useQuestion } from '@/hooks/useQuestions'
import { useAIStore } from '@/store/useAIStore'
import { Button, cn, Kbd } from '@/ui'
import { AIChatPanel } from './aiChat'

// ─── AI Drawer ────────────────────────────────────────────────────────────────
// Non-modal on desktop: the question stays readable and scrollable beside it.

export interface AIDrawerProps {
  open: boolean
  onClose: () => void
  question: NonNullable<ReturnType<typeof useQuestion>['question']>
  answerVisible: boolean
  onOpenSettings: () => void
  initialPrompt?: { id: string; questionId: string; text: string } | null
  onInitialPromptConsumed?: (id: string) => void
}

export function AIDrawer({
  open,
  onClose,
  question,
  answerVisible,
  onOpenSettings,
  initialPrompt = null,
  onInitialPromptConsumed,
}: AIDrawerProps) {
  const { config } = useAIStore()

  // Lock body scroll on mobile when open
  useEffect(() => {
    if (open && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="关闭 AI 助手"
          onClick={onClose}
          className="fixed inset-0 z-[44] animate-fade-in cursor-pointer bg-overlay/60 lg:hidden"
        />
      )}

      <aside
        aria-hidden={!open}
        aria-label="AI 助手"
        className={cn(
          'fixed top-[var(--navbar-h,0px)] right-0 bottom-0 z-[45] flex w-[min(420px,100vw)] flex-col overflow-hidden',
          'border-l border-line bg-elevated transition-[transform,box-shadow] duration-300 ease-out',
          open
            ? 'visible translate-x-0 shadow-popover'
            : 'pointer-events-none invisible translate-x-full',
        )}
      >
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line px-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent-subtle text-accent">
              <Sparkles className="size-3.5" />
            </span>
            <span className="shrink-0 text-sm font-semibold text-fg">AI 助手</span>
            {config.model ? (
              <span className="max-w-[130px] truncate rounded border border-line bg-subtle px-1.5 font-mono text-2xs text-fg-subtle">
                {config.model}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Kbd className="max-lg:hidden">Esc</Kbd>
            <Button variant="ghost" size="icon-sm" aria-label="关闭 AI 助手" onClick={onClose}>
              <X />
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <AIChatPanel
            question={question}
            answerVisible={answerVisible}
            onOpenSettings={onOpenSettings}
            initialPrompt={initialPrompt}
            onInitialPromptConsumed={onInitialPromptConsumed}
          />
        </div>
      </aside>
    </>
  )
}
