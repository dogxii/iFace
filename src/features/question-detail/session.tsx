import { useEffect } from 'react'
import { Button } from '@/components/ui'
import { cn, Kbd } from '@/ui'
import type { AnswerPanelView } from './answerPanel'

// ─── Status Action Button ─────────────────────────────────────────────────────

export interface StatusButtonProps {
  onClick: () => void
  label: string
  sublabel: string
  variant: 'danger' | 'warning' | 'success'
  kbd: string
  active: boolean
  disabled?: boolean
}

export function StatusButton({
  onClick,
  label,
  sublabel,
  variant,
  kbd: kbdKey,
  active,
  disabled,
}: StatusButtonProps) {
  const tone = {
    danger: { dot: 'bg-danger', active: 'border-danger/60 bg-danger-subtle text-danger' },
    warning: { dot: 'bg-warning', active: 'border-warning/60 bg-warning-subtle text-warning' },
    success: { dot: 'bg-success', active: 'border-success/60 bg-success-subtle text-success' },
  }[variant]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'grid flex-1 grid-cols-[auto_1fr_auto] items-center gap-x-2.5 rounded-xl border border-line-strong bg-canvas px-3 py-2 text-left transition-colors outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        active && tone.active,
      )}
    >
      <span className={cn('row-span-2 size-2 rounded-full', tone.dot)} aria-hidden />
      <span className="text-sm font-medium">{label}</span>
      <Kbd className="row-span-2">{kbdKey}</Kbd>
      <span className={cn('col-start-2 text-xs', active ? 'opacity-80' : 'text-fg-subtle')}>
        {sublabel}
      </span>
    </button>
  )
}

// ─── Session Progress ─────────────────────────────────────────────────────────

export interface SessionProgressProps {
  current: number
  total: number
  onExit: () => void
}

export function SessionProgress({ current, total, onExit }: SessionProgressProps) {
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

export function ShortcutHints({
  answerVisible,
  answerPanelView,
}: {
  answerVisible: boolean
  answerPanelView: AnswerPanelView
}) {
  const showStatusShortcuts = answerVisible && answerPanelView === 'answer'

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
      {showStatusShortcuts && (
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
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Kbd>N</Kbd>
        <span>笔记</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Kbd>A</Kbd>
        <span>AI 助手</span>
      </span>
    </div>
  )
}

// ─── Streak Celebration ───────────────────────────────────────────────────────

export interface StreakCelebrationProps {
  streak: number
  onDone: () => void
}

export function StreakCelebration({ streak, onDone }: StreakCelebrationProps) {
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

// ─── Session Completion ──────────────────────────────────────────────────────

export interface SessionCompletionCardProps {
  mastered: number
  review: number
  unlearned: number
  total: number
  retryCount: number
  onRetry: () => void
  onBackToPractice: () => void
  onDashboard: () => void
}

export function SessionCompletionCard({
  mastered,
  review,
  unlearned,
  total,
  retryCount,
  onRetry,
  onBackToPractice,
  onDashboard,
}: SessionCompletionCardProps) {
  const masteredPercent = total > 0 ? Math.round((mastered / total) * 100) : 0
  const hasRetry = retryCount > 0

  return (
    <div
      className="card animate-scale-in"
      style={{
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        borderColor: mastered === total ? 'rgba(16,185,129,0.22)' : 'var(--border-subtle)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 5,
            }}
          >
            本轮完成
          </p>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1.35 }}>
            {hasRetry ? '还有可巩固的题目' : '这一轮全部掌握'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 5, lineHeight: 1.6 }}>
            {hasRetry
              ? `建议立即重练 ${retryCount} 道未完全掌握的题，趁记忆还热。`
              : '可以结束本轮，或者回到练习配置继续挑战新的题目。'}
          </p>
        </div>
        <div
          style={{
            flexShrink: 0,
            minWidth: 58,
            height: 58,
            borderRadius: 14,
            background: mastered === total ? 'var(--success-light)' : 'var(--primary-light)',
            color: mastered === total ? 'var(--success)' : 'var(--primary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{masteredPercent}%</span>
          <span style={{ fontSize: 10, marginTop: 3 }}>掌握</span>
        </div>
      </div>

      <div
        className="session-completion-stats"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
        {[
          { label: '已掌握', value: mastered, color: 'var(--success)', bg: 'var(--success-light)' },
          { label: '待复习', value: review, color: 'var(--warning)', bg: 'var(--warning-light)' },
          { label: '未学习', value: unlearned, color: 'var(--text-3)', bg: 'var(--surface-3)' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: '11px 12px',
              borderRadius: 10,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>{item.label}</p>
            <p
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: item.color,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.2,
              }}
            >
              {item.value}
            </p>
            <div
              style={{
                width: 20,
                height: 3,
                borderRadius: 99,
                background: item.bg,
                marginTop: 7,
              }}
            />
          </div>
        ))}
      </div>

      <div
        className="session-completion-actions"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        <Button
          variant="primary"
          size="sm"
          onClick={hasRetry ? onRetry : onBackToPractice}
          icon={
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          }
        >
          {hasRetry ? `重练 ${retryCount} 题` : '继续练习'}
        </Button>
        {hasRetry && (
          <Button variant="secondary" size="sm" onClick={onBackToPractice}>
            调整练习
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDashboard}>
          回概览
        </Button>
      </div>
    </div>
  )
}
