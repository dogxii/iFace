import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { SettingsDrawer } from '@/components/layout/SettingsDrawer'
import { Button, Kbd, Skeleton, Spinner } from '@/components/ui'
import { AIPanelWithStyles } from '@/components/ui/AIPanel'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { useQuestion, useQuestions } from '@/hooks/useQuestions'
import { useAIStore } from '@/store/useAIStore'
import { clearSessionReview, useStudyStore } from '@/store/useStudyStore'
import { DIFFICULTY_LABELS, DIFFICULTY_STYLES, type StudyStatus } from '@/types'

// ─── Status Action Button ─────────────────────────────────────────────────────

interface StatusButtonProps {
  onClick: () => void
  label: string
  sublabel: string
  variant: 'danger' | 'warning' | 'success'
  kbd: string
  active: boolean
  disabled?: boolean
}

function StatusButton({
  onClick,
  label,
  sublabel,
  variant,
  kbd: kbdKey,
  active,
  disabled,
}: StatusButtonProps) {
  const colorMap = {
    danger: {
      idle: { color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)' },
      active: { color: 'white', bg: '#ef4444', border: '#ef4444' },
      hover: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
    },
    warning: {
      idle: { color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)' },
      active: { color: 'white', bg: '#f59e0b', border: '#f59e0b' },
      hover: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    },
    success: {
      idle: { color: '#10b981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.2)' },
      active: { color: 'white', bg: '#10b981', border: '#10b981' },
      hover: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
    },
  }

  const c = colorMap[variant]
  const cur = active ? c.active : c.idle

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        padding: '10px 8px',
        borderRadius: 12,
        border: `1px solid ${cur.border}`,
        background: cur.bg,
        color: cur.color,
        cursor: 'pointer',
        transition: 'all 0.18s',
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          const el = e.currentTarget
          el.style.background = c.hover.bg
          el.style.borderColor = c.hover.border
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          const el = e.currentTarget
          el.style.background = cur.bg
          el.style.borderColor = cur.border
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            padding: '1px 4px',
            borderRadius: 4,
            border: '1px solid',
            borderColor: active ? 'rgba(255,255,255,0.35)' : 'var(--border)',
            background: active ? 'rgba(255,255,255,0.2)' : 'var(--surface-2)',
            color: active ? 'rgba(255,255,255,0.9)' : 'var(--text-3)',
          }}
        >
          {kbdKey}
        </span>
      </div>
      <span style={{ fontSize: 11, opacity: active ? 0.85 : 0.55 }}>{sublabel}</span>
    </button>
  )
}

// ─── Session Progress ─────────────────────────────────────────────────────────

interface SessionProgressProps {
  current: number
  total: number
  onExit: () => void
}

function SessionProgress({ current, total, onExit }: SessionProgressProps) {
  const percent = total > 0 ? (current / total) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        type="button"
        onClick={onExit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--text-2)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        退出练习
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        <div
          style={{
            width: 80,
            height: 4,
            background: 'var(--border)',
            borderRadius: 99,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'var(--primary)',
              borderRadius: 99,
              width: `${percent}%`,
              transition: 'width 0.4s var(--ease-out)',
            }}
          />
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-2)',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {current} / {total}
        </span>
      </div>
    </div>
  )
}

// ─── Shortcut Hints ───────────────────────────────────────────────────────────

function ShortcutHints({ answerVisible }: { answerVisible: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        fontSize: 12,
        color: 'var(--text-3)',
      }}
    >
      {!answerVisible && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Kbd>Space</Kbd>
          <span>查看答案</span>
        </span>
      )}
      {answerVisible && (
        <>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Kbd>1</Kbd>
            <span>没掌握</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Kbd>2</Kbd>
            <span>大概会</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Kbd>3</Kbd>
            <span>完全掌握</span>
          </span>
        </>
      )}
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Kbd>→</Kbd>
        <span>下一题</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Kbd>←</Kbd>
        <span>上一题</span>
      </span>
    </div>
  )
}

// ─── Streak Celebration ───────────────────────────────────────────────────────

interface StreakCelebrationProps {
  streak: number
  onDone: () => void
}

function StreakCelebration({ streak, onDone }: StreakCelebrationProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  const milestones: Record<number, { emoji: string; message: string; color: string }> = {
    3: { emoji: '🔥', message: '连续 3 题！保持住！', color: '#f59e0b' },
    5: { emoji: '⚡', message: '5 连击！状态很好！', color: '#6366f1' },
    10: { emoji: '🚀', message: '10 连击！你太厉害了！', color: '#10b981' },
    20: { emoji: '👑', message: '20 连击！无人能挡！', color: '#f59e0b' },
    50: { emoji: '🏆', message: '50 连击！传说级别！', color: '#ef4444' },
  }

  // Find the highest matching milestone
  const levels = [50, 20, 10, 5, 3]
  const hit = levels.find((l) => streak === l)
  if (!hit) return null

  const { emoji, message, color } = milestones[hit]

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
        animation: 'streak-pop 2.2s var(--ease-spring) both',
      }}
    >
      <span
        style={{ fontSize: 64, lineHeight: 1, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))' }}
      >
        {emoji}
      </span>
      <div
        style={{
          padding: '8px 20px',
          borderRadius: 99,
          background: color,
          color: 'white',
          fontSize: 14,
          fontWeight: 700,
          boxShadow: `0 4px 20px ${color}55`,
          letterSpacing: '0.01em',
        }}
      >
        {message}
      </div>
    </div>
  )
}

// ─── My Answer Input ("我的作答") ─────────────────────────────────────────────
// Design principle: 先作答，再看答案 — shown ABOVE the answer card.
// Always starts open. Collapses only if user explicitly closes it.
// StudyMode affects placement and behavior:
//   answer-first    → shown above answer card, answer hidden until ready
//   answer-alongside → shown inside answer card (side-by-side)
//   memory-only     → hidden entirely

interface MyAnswerInputProps {
  questionId: string
  questionText: string
  answerText: string
  onOpenAIPanel: () => void
  isAiEnabled: boolean
  /** When true the component is in "compact / inside answer card" mode */
  compact?: boolean
}

function MyAnswerInput({
  questionId,
  questionText,
  answerText,
  onOpenAIPanel,
  isAiEnabled,
  compact = false,
}: MyAnswerInputProps) {
  const { sendMessage, streaming, streamingQuestionId } = useAIStore()

  // Always start expanded — no collapsed gate
  const [collapsed, setCollapsed] = useState(false)
  const [text, setText] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [streamingFeedback, setStreamingFeedback] = useState('')
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isStreaming = streaming && streamingQuestionId === `${questionId}_selfcheck`

  // Reset when question changes — always open again
  useEffect(() => {
    setCollapsed(false)
    setText('')
    setFeedback(null)
    setStreamingFeedback('')
    setError(null)
  }, [])

  // Auto-focus textarea on mount / question change
  useEffect(() => {
    if (!collapsed && !feedback) {
      setTimeout(() => textareaRef.current?.focus(), 80)
    }
  }, [collapsed, feedback])

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || isStreaming) return

    setError(null)
    setStreamingFeedback('')

    const systemPrompt = `你是一位严格但友善的前端面试教练。用户在看到参考答案之前，凭记忆写下了自己的作答，请你：
1. 先肯定用户答对/答到位的部分（简短，1-2句）
2. 指出遗漏或不够准确的关键点（重点，最多3条）
3. 给出1个最重要的补充建议

风格：直接、简练、不废话，总字数控制在200字以内。用中文回答。`

    const contextMessages = [
      {
        role: 'user' as const,
        content: `题目：${questionText}\n\n参考答案：${answerText}\n\n我的理解：${text.trim()}`,
      },
    ]

    // Use a dedicated sub-id so it doesn't pollute the main AI chat
    await sendMessage(
      `${questionId}_selfcheck`,
      '请根据以上内容给我反馈',
      contextMessages,
      `\n\n---\n${systemPrompt}`,
      (chunk) => setStreamingFeedback((prev) => prev + chunk),
      (full) => {
        setFeedback(full)
        setStreamingFeedback('')
      },
      (err) => {
        setError(err)
        setStreamingFeedback('')
      },
    )
  }, [text, isStreaming, questionId, questionText, answerText, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const handleReset = useCallback(() => {
    setFeedback(null)
    setStreamingFeedback('')
    setText('')
    setError(null)
    setTimeout(() => textareaRef.current?.focus(), 60)
  }, [])

  const displayFeedback = feedback ?? (streamingFeedback || null)

  const wrapperStyle: React.CSSProperties = compact
    ? { borderTop: '1px solid var(--border-subtle)', marginTop: 4, paddingTop: 14 }
    : {
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }

  if (collapsed) {
    return (
      <div style={wrapperStyle}>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            width: '100%',
            padding: compact ? '9px 12px' : '12px 16px',
            background: 'transparent',
            border: compact ? '1px dashed var(--border)' : 'none',
            borderRadius: compact ? 10 : 0,
            color: 'var(--text-3)',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.15s',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.color = 'var(--primary)'
            el.style.background = 'var(--primary-light)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.color = 'var(--text-3)'
            el.style.background = 'transparent'
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          我的作答已收起，点击展开…
        </button>
      </div>
    )
  }

  return (
    <div style={wrapperStyle}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: compact ? '0 0 10px 0' : '14px 16px 10px',
          borderBottom: compact ? 'none' : '1px solid var(--border-subtle)',
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: 'var(--primary-light)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </span>
          我的作答
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-3)',
            cursor: 'pointer',
            fontSize: 11,
            padding: '3px 6px',
            borderRadius: 5,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'none'
          }}
          title="收起作答区"
        >
          收起
        </button>
      </div>

      <div
        style={{
          padding: compact ? '10px 0 0' : '12px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Input area — only show when no feedback yet */}
        {!displayFeedback && (
          <div
            style={{
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              overflow: 'hidden',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocusCapture={(e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px var(--primary-light)'
            }}
            onBlurCapture={(e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
            }}
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="用自己的话说说你对这道题的理解……不用完整，写核心思路就行"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                fontSize: 13,
                lineHeight: 1.6,
                resize: 'vertical',
                minHeight: 72,
                fontFamily: 'var(--font-sans)',
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--surface-2)',
              }}
            >
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                {isAiEnabled ? (
                  <>⌘+Enter 提交作答</>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenAIPanel}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      fontSize: 11,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    </svg>
                    配置 AI 才能获得反馈
                  </button>
                )}
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim() || !isAiEnabled || isStreaming}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 12px',
                  borderRadius: 7,
                  border: 'none',
                  background: text.trim() && isAiEnabled ? 'var(--primary)' : 'var(--surface-3)',
                  color: text.trim() && isAiEnabled ? 'white' : 'var(--text-3)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: text.trim() && isAiEnabled ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                提交作答
              </button>
            </div>
          </div>
        )}

        {/* Streaming / feedback result */}
        {(displayFeedback || isStreaming) && (
          <div
            style={{
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-2)',
              overflow: 'hidden',
              animation: 'scale-in 0.2s var(--ease-spring) both',
            }}
          >
            {/* User's answer preview */}
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--surface-3)',
              }}
            >
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>我的作答</p>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-2)',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {text}
              </p>
            </div>

            {/* AI feedback */}
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    background: 'var(--primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                    <circle cx="7.5" cy="14.5" r="1.5" />
                    <circle cx="16.5" cy="14.5" r="1.5" />
                  </svg>
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>
                  AI 点评
                </span>
                {isStreaming && (
                  <span style={{ display: 'inline-flex', gap: 3, marginLeft: 4 }}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          display: 'inline-block',
                          animation: `ai-dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </span>
                )}
              </div>
              {displayFeedback && (
                <div className="prose" style={{ fontSize: 13 }}>
                  <MarkdownRenderer content={displayFeedback} />
                </div>
              )}
            </div>

            {/* Actions after feedback */}
            {feedback && !isStreaming && (
              <div
                style={{
                  padding: '8px 14px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    fontSize: 12,
                    color: 'var(--text-3)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    borderRadius: 6,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'none'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
                  }}
                >
                  重新作答
                </button>
                <button
                  type="button"
                  onClick={onOpenAIPanel}
                  style={{
                    fontSize: 12,
                    color: 'var(--primary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    borderRadius: 6,
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--primary-light)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'none'
                  }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                    <circle cx="7.5" cy="14.5" r="1.5" />
                    <circle cx="16.5" cy="14.5" r="1.5" />
                  </svg>
                  深入讨论
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '9px 12px',
              borderRadius: 9,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              fontSize: 12,
              color: '#ef4444',
            }}
          >
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              style={{
                marginLeft: 8,
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: 12,
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AI Drawer ────────────────────────────────────────────────────────────────
// Fixed right drawer — never affects main content width

interface AIDrawerProps {
  open: boolean
  onClose: () => void
  question: NonNullable<ReturnType<typeof useQuestion>['question']>
  answerVisible: boolean
  onOpenSettings: () => void
}

function AIDrawer({ open, onClose, question, answerVisible, onOpenSettings }: AIDrawerProps) {
  const { config, getMessages, clearSession } = useAIStore()
  const messages = getMessages(question.id)

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

          {/* Right: clear history + Esc hint + close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => clearSession(question.id)}
                title="清除对话历史"
                style={{
                  width: 26,
                  height: 26,
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
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--danger-light)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--danger)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
                }}
              >
                {/* trash icon */}
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
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            )}
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
          />
        </div>
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuestionDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const { question, loading } = useQuestion(id)
  const { allQuestions } = useQuestions()
  const { getStatus, setStatus, getRecord, studyMode, streak, incrementStreak } = useStudyStore()
  const { config: aiConfig } = useAIStore()

  const [answerVisible, setAnswerVisible] = useState(false)
  const [marking, setMarking] = useState(false)
  const [justMarked, setJustMarked] = useState<StudyStatus | null>(null)
  const [lastPressedKey, setLastPressedKey] = useState<'1' | '2' | '3' | null>(null)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [celebrationStreak, setCelebrationStreak] = useState(0)
  const answerRef = useRef<HTMLDivElement>(null)

  // Session context (from ?ids=... params)
  const sessionIds = searchParams.get('ids')?.split(',').filter(Boolean) ?? []
  const isInSession = sessionIds.length > 0
  const sessionIndex = isInSession ? sessionIds.indexOf(id ?? '') : -1

  // Adjacent IDs from the full question list (for non-session browsing)
  // Sorted same as default list order (insertion order = file order by id)
  const { prevIdByList, nextIdByList } = useMemo(() => {
    if (!id || allQuestions.length === 0) return { prevIdByList: null, nextIdByList: null }
    // Filter to same module so ← → stays within module context
    const sameModule = question
      ? allQuestions.filter((q) => q.module === question.module)
      : allQuestions
    const idx = sameModule.findIndex((q) => q.id === id)
    if (idx === -1) return { prevIdByList: null, nextIdByList: null }
    return {
      prevIdByList: idx > 0 ? sameModule[idx - 1].id : null,
      nextIdByList: idx < sameModule.length - 1 ? sameModule[idx + 1].id : null,
    }
  }, [id, allQuestions, question])

  const prevId =
    isInSession && sessionIndex > 0
      ? sessionIds[sessionIndex - 1]
      : (searchParams.get('prev') ?? prevIdByList)
  const nextId =
    isInSession && sessionIndex < sessionIds.length - 1
      ? sessionIds[sessionIndex + 1]
      : (searchParams.get('next') ?? nextIdByList)
  const sessionCurrent = sessionIndex + 1
  const sessionTotal = sessionIds.length

  // Reset on question change
  useEffect(() => {
    setAnswerVisible(false)
    setJustMarked(null)
    setLastPressedKey(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // Clear per-question session review guard so the new question starts fresh
    return () => {
      if (id) clearSessionReview(id)
    }
  }, [id])

  const currentStatus = id ? getStatus(id) : 'unlearned'
  const record = id ? getRecord(id) : undefined

  const handleSetStatus = useCallback(
    async (status: StudyStatus, key?: '1' | '2' | '3') => {
      if (!id || marking) return
      setMarking(true)
      setJustMarked(status)
      if (key) setLastPressedKey(key)
      await setStatus(id, status)
      setMarking(false)

      // Increment streak and trigger celebration if milestone hit
      incrementStreak()
      const newStreak = streak.currentStreak + 1
      const milestones = [3, 5, 10, 20, 50]
      if (milestones.includes(newStreak)) {
        setCelebrationStreak(newStreak)
      }

      if (isInSession && nextId) {
        setTimeout(() => {
          const idsParam = sessionIds.length > 0 ? `?ids=${sessionIds.join(',')}` : ''
          navigate(`/questions/${nextId}${idsParam}`)
        }, 600)
      }
    },
    [
      id,
      marking,
      setStatus,
      isInSession,
      nextId,
      navigate,
      sessionIds,
      incrementStreak,
      streak.currentStreak,
    ],
  )

  const handleRevealAnswer = useCallback(() => {
    setAnswerVisible(true)
    setJustMarked(null)
    setLastPressedKey(null)
  }, [])

  const navigateTo = useCallback(
    (targetId: string | null | undefined) => {
      if (!targetId) return
      const idsParam = sessionIds.length > 0 ? `?ids=${sessionIds.join(',')}` : ''
      navigate(`/questions/${targetId}${idsParam}`)
    },
    [navigate, sessionIds],
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (aiDrawerOpen) return // don't interfere with AI chat

      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (!answerVisible) handleRevealAnswer()
          break
        case '1':
          if (answerVisible) handleSetStatus('review', '1')
          break
        case '2':
          if (answerVisible) handleSetStatus('review', '2')
          break
        case '3':
          if (answerVisible) handleSetStatus('mastered', '3')
          break
        case 'ArrowRight':
          e.preventDefault()
          navigateTo(nextId)
          break
        case 'ArrowLeft':
          e.preventDefault()
          navigateTo(prevId)
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [answerVisible, handleRevealAnswer, handleSetStatus, navigateTo, nextId, prevId, aiDrawerOpen])

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className="page-container animate-fade-in"
        style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <Skeleton width={180} height={13} />
        <div
          className="card"
          style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <Skeleton width={60} height={22} rounded="md" />
            <Skeleton width={48} height={22} rounded="md" />
          </div>
          <Skeleton width="80%" height={20} />
          <Skeleton width="60%" height={20} />
          <Skeleton width="70%" height={20} />
        </div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="page-container" style={{ maxWidth: 760 }}>
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>找不到该题目</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>题目 ID: {id}</p>
          <Link to="/questions">
            <Button variant="primary" size="sm">
              返回题库
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const diffStyle = DIFFICULTY_STYLES[question.difficulty]
  const isAiEnabled = aiConfig.enabled && aiConfig.apiKey.trim().length > 0

  // Derived from studyMode
  const showAnswerInputAbove = studyMode === 'answer-first'
  const showAnswerInputInside = studyMode === 'answer-alongside'
  const hideAnswerInput = studyMode === 'memory-only'

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Main content — always max-width 760, never changes ── */}
      <div
        className="page-container"
        style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {/* Breadcrumb / Session progress */}
        <div className="animate-fade-in">
          {isInSession ? (
            <SessionProgress
              current={sessionCurrent}
              total={sessionTotal}
              onExit={() => navigate('/practice')}
            />
          ) : (
            <nav
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--text-3)',
              }}
            >
              <Link
                to="/questions"
                style={{
                  color: 'var(--text-3)',
                  textDecoration: 'none',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--primary)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
                }}
              >
                题库
              </Link>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.4 }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <Link
                to={`/questions?module=${encodeURIComponent(question.module)}`}
                style={{
                  color: 'var(--text-3)',
                  textDecoration: 'none',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--primary)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
                }}
              >
                {question.module}
              </Link>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.4 }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span
                style={{
                  color: 'var(--text-2)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 200,
                }}
              >
                {question.question.slice(0, 30)}…
              </span>
            </nav>
          )}
        </div>

        {/* Question Card */}
        <div
          className="card animate-fade-in stagger-1"
          style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-2)',
                padding: '3px 10px',
                borderRadius: 6,
                background: 'var(--surface-3)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {question.module}
            </span>

            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: '3px 10px',
                borderRadius: 6,
                border: '1px solid',
                color: diffStyle.color,
                background: diffStyle.background,
                borderColor: diffStyle.borderColor,
              }}
            >
              {DIFFICULTY_LABELS[question.difficulty]}
            </span>

            {question.source && (
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 5,
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(var(--primary-rgb),0.2)',
                }}
              >
                {question.source}
              </span>
            )}

            {currentStatus !== 'unlearned' && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '2px 8px',
                  borderRadius: 5,
                  background:
                    currentStatus === 'mastered' ? 'var(--success-light)' : 'var(--warning-light)',
                  color: currentStatus === 'mastered' ? 'var(--success)' : 'var(--warning)',
                  border: `1px solid ${currentStatus === 'mastered' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                }}
              >
                {currentStatus === 'mastered' ? '已掌握' : '待复习'}
              </span>
            )}

            {record && (
              <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>
                已复习 {record.reviewCount} 次
              </span>
            )}
          </div>

          {/* Question text */}
          <h1
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--text)',
              lineHeight: 1.65,
              letterSpacing: '-0.005em',
            }}
          >
            {question.question}
          </h1>

          {/* Tags */}
          {question.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {question.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 5,
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-3)',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Reveal button */}
          {!answerVisible && (
            <button
              type="button"
              onClick={handleRevealAnswer}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                border: '2px dashed var(--border)',
                background: 'transparent',
                color: 'var(--text-2)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.18s',
                marginTop: 4,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(var(--primary-rgb),0.5)'
                el.style.color = 'var(--primary)'
                el.style.background = 'var(--primary-light)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'var(--border)'
                el.style.color = 'var(--text-2)'
                el.style.background = 'transparent'
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              查看参考答案
              <Kbd>Space</Kbd>
            </button>
          )}
        </div>

        {/* ── My Answer Input — shown ABOVE answer card in "answer-first" mode ── */}
        {showAnswerInputAbove && !hideAnswerInput && (
          <div className="animate-fade-in stagger-1">
            <MyAnswerInput
              questionId={id ?? ''}
              questionText={question.question}
              answerText={question.answer}
              onOpenAIPanel={() => setAiDrawerOpen(true)}
              isAiEnabled={isAiEnabled}
            />
          </div>
        )}

        {/* Answer Card */}
        {answerVisible && (
          <div
            ref={answerRef}
            className="card animate-scale-in"
            style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {/* Answer header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 14,
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 3,
                    height: 18,
                    borderRadius: 99,
                    background: 'var(--primary)',
                    flexShrink: 0,
                  }}
                />
                <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>参考答案</h2>
              </div>

              {/* AI assistant entry — subtle, inside the answer card */}
              <button
                type="button"
                onClick={() => setAiDrawerOpen(true)}
                title="打开 AI 助手"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 7,
                  border: '1px solid',
                  borderColor: aiDrawerOpen
                    ? 'rgba(var(--primary-rgb),0.4)'
                    : 'var(--border-subtle)',
                  background: aiDrawerOpen ? 'var(--primary-light)' : 'transparent',
                  color: aiDrawerOpen ? 'var(--primary)' : 'var(--text-3)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!aiDrawerOpen) {
                    ;(e.currentTarget as HTMLElement).style.borderColor =
                      'rgba(var(--primary-rgb),0.35)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--primary)'
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--primary-light)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!aiDrawerOpen) {
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }
                }}
              >
                <svg
                  width="12"
                  height="12"
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
                {isAiEnabled ? 'AI 助手' : 'AI（未配置）'}
              </button>
            </div>

            {/* Markdown answer */}
            <div className="prose" style={{ minWidth: 0 }}>
              <MarkdownRenderer content={question.answer} />
            </div>

            {/* Status actions */}
            <div
              style={{
                paddingTop: 16,
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>你掌握了吗？</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <StatusButton
                  onClick={() => handleSetStatus('review', '1')}
                  label="没掌握"
                  sublabel="加入待复习"
                  variant="danger"
                  kbd="1"
                  active={
                    (justMarked === 'review' && lastPressedKey === '1') ||
                    (currentStatus === 'review' &&
                      lastPressedKey !== '2' &&
                      justMarked !== 'review')
                  }
                  disabled={marking}
                />
                <StatusButton
                  onClick={() => handleSetStatus('review', '2')}
                  label="大概会"
                  sublabel="还需巩固"
                  variant="warning"
                  kbd="2"
                  active={justMarked === 'review' && lastPressedKey === '2'}
                  disabled={marking}
                />
                <StatusButton
                  onClick={() => handleSetStatus('mastered', '3')}
                  label="完全掌握"
                  sublabel="不再推荐"
                  variant="success"
                  kbd="3"
                  active={justMarked === 'mastered' || currentStatus === 'mastered'}
                  disabled={marking}
                />
              </div>

              {marking && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: 'var(--text-3)',
                  }}
                >
                  <Spinner size="sm" />
                  <span>保存中…</span>
                </div>
              )}
            </div>

            {/* ── My Answer Input — "answer-alongside" mode: compact inside answer card ── */}
            {showAnswerInputInside && !hideAnswerInput && (
              <MyAnswerInput
                questionId={id ?? ''}
                questionText={question.question}
                answerText={question.answer}
                onOpenAIPanel={() => setAiDrawerOpen(true)}
                isAiEnabled={isAiEnabled}
                compact
              />
            )}
          </div>
        )}

        {/* ── Streak counter pill (always visible when streak > 0) ── */}
        {streak.currentStreak >= 2 && (
          <div
            className="animate-fade-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 99,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              width: 'fit-content',
              fontSize: 12,
              color: 'var(--text-2)',
            }}
          >
            <span style={{ fontSize: 16 }}>🔥</span>
            <span
              style={{ fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}
            >
              {streak.currentStreak}
            </span>
            <span>连击</span>
            {streak.bestStreak > streak.currentStreak && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 2 }}>
                最高 {streak.bestStreak}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 2 }}>
              · 今日 {streak.todayCount} 题
            </span>
          </div>
        )}

        {/* Keyboard shortcuts */}
        <div className="animate-fade-in stagger-3">
          <ShortcutHints answerVisible={answerVisible} />
        </div>

        {/* Navigation */}
        <div
          className="animate-fade-in stagger-4"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 8,
          }}
        >
          <button
            type="button"
            onClick={() => navigateTo(prevId)}
            disabled={!prevId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--text-2)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
              opacity: !prevId ? 0.3 : 1,
              pointerEvents: !prevId ? 'none' : 'auto',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'none'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
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
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            上一题
          </button>

          <Link
            to="/questions"
            style={{
              fontSize: 12,
              color: 'var(--text-3)',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.color = 'var(--primary)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
            }}
          >
            返回列表
          </Link>

          <button
            type="button"
            onClick={() => navigateTo(nextId)}
            disabled={!nextId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--text-2)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
              opacity: !nextId ? 0.3 : 1,
              pointerEvents: !nextId ? 'none' : 'auto',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'none'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
            }}
          >
            下一题
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
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── AI Drawer — fixed overlay, never shifts main content ── */}
      <AIDrawer
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        question={question}
        answerVisible={answerVisible}
        onOpenSettings={() => {
          setAiDrawerOpen(false)
          setSettingsOpen(true)
        }}
      />

      {/* Settings Drawer */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* ── Streak Celebration overlay ── */}
      {celebrationStreak > 0 && (
        <StreakCelebration streak={celebrationStreak} onDone={() => setCelebrationStreak(0)} />
      )}

      <style>{`
				@keyframes ai-dot-bounce {
					0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
					30% { transform: translateY(-4px); opacity: 1; }
				}
				@keyframes streak-pop {
					0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
					15%  { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
					25%  { transform: translate(-50%, -50%) scale(0.95); }
					35%  { transform: translate(-50%, -50%) scale(1.05); }
					50%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
					80%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
					100% { opacity: 0; transform: translate(-50%, -60%) scale(0.9); }
				}
				@media (max-width: 1023px) {
					.ai-fab { display: flex !important; }
				}
				@media (min-width: 1024px) {
					.ai-drawer-backdrop { display: none !important; }
				}
			`}</style>
      {/* ── Mobile FAB: AI Assistant ── */}
      {!aiDrawerOpen && (
        <button
          type="button"
          onClick={() => setAiDrawerOpen(true)}
          className="ai-fab"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 20,
            zIndex: 140,
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: 'none',
            background: 'var(--surface-3)',
            color: 'var(--text-3)',
            boxShadow: 'var(--shadow-md)',
            cursor: 'pointer',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.18s var(--ease-spring), box-shadow 0.18s',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          }}
          title={isAiEnabled ? '打开 AI 助手' : 'AI 助手（请先配置）'}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
            <circle cx="7.5" cy="14.5" r="1.5" />
            <circle cx="16.5" cy="14.5" r="1.5" />
          </svg>
        </button>
      )}
    </>
  )
}
