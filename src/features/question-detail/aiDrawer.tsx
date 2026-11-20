import { useEffect } from 'react'
import { AIPanelWithStyles } from '@/components/ui/AIPanel'
import type { useQuestion } from '@/hooks/useQuestions'
import { useAIStore } from '@/store/useAIStore'

// ─── AI Drawer ────────────────────────────────────────────────────────────────
// Fixed right drawer — never affects main content width

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

  // Esc key to close
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
      {/* Mobile backdrop */}
      {open && (
        <button
          type="button"
          aria-label="关闭 AI 助手"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 149,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            animation: 'fade-in 0.18s var(--ease-out) both',
            border: 'none',
            padding: 0,
            margin: 0,
            cursor: 'pointer',
          }}
          className="ai-drawer-backdrop"
        />
      )}

      {/* Drawer panel */}
      <div
        aria-hidden={!open}
        style={{
          position: 'fixed',
          top: 'var(--navbar-h)',
          right: 0,
          bottom: 0,
          zIndex: 150,
          width: 'min(420px, 100vw)',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border-subtle)',
          boxShadow: open ? 'var(--shadow-xl)' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s var(--ease-out), box-shadow 0.28s',
          visibility: open ? 'visible' : 'hidden',
          pointerEvents: open ? 'auto' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Drawer header — single, unified, no duplicate inside AIPanel */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '11px 14px',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0,
            background: 'var(--surface)',
          }}
        >
          {/* Left: icon + title + model badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                <circle cx="7.5" cy="14.5" r="1.5" />
                <circle cx="16.5" cy="14.5" r="1.5" />
              </svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flexShrink: 0 }}>
              AI 助手
            </span>
            {config.model && (
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'var(--surface-3)',
                  color: 'var(--text-3)',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-mono)',
                  maxWidth: 110,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {config.model}
              </span>
            )}
          </div>

          {/* Right: Esc hint + close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {/* Esc hint — desktop only */}
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-3)',
                padding: '2px 5px',
                borderRadius: 4,
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-2)',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.4,
              }}
              className="hidden-mobile"
            >
              Esc
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭 AI 助手"
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* AI Panel content — headless=true so it doesn't render its own header */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <AIPanelWithStyles
            question={question}
            answerVisible={answerVisible}
            onOpenSettings={onOpenSettings}
            headless
            initialPrompt={initialPrompt}
            onInitialPromptConsumed={onInitialPromptConsumed}
          />
        </div>
      </div>
    </>
  )
}
