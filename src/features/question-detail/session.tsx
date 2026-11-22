import { ArrowLeft, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'
import { Button, cn, Kbd, Progress, ProgressRing, Stat, StatGroup } from '@/ui'
import type { AnswerPanelView } from './answerPanel'

// ─── Status Action Button ─────────────────────────────────────────────────────

export interface StatusButtonProps {
  onClick: () => void
  label: string
  sublabel: React.ReactNode
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
        'grid min-w-0 flex-1 grid-cols-[auto_1fr_auto] items-center gap-x-2 rounded-xl border border-line-strong bg-canvas px-2.5 py-2 text-left transition-colors outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 sm:gap-x-2.5 sm:px-3',
        active && tone.active,
      )}
    >
      <span className={cn('row-span-2 size-2 rounded-full', tone.dot)} aria-hidden />
      <span className="truncate text-sm font-medium">{label}</span>
      <Kbd className="row-span-2 max-sm:hidden">{kbdKey}</Kbd>
      <span
        className={cn('col-start-2 truncate text-xs', active ? 'opacity-80' : 'text-fg-subtle')}
      >
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
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" className="-ml-2 text-fg-muted" onClick={onExit}>
        <ArrowLeft />
        退出练习
      </Button>
      <div className="ml-auto flex items-center gap-2.5">
        <Progress value={percent} className="w-24" aria-label="练习进度" />
        <span className="text-xs font-medium whitespace-nowrap text-fg-muted tabular-nums">
          {current} / {total}
        </span>
      </div>
    </div>
  )
}

// ─── Shortcut Hints ───────────────────────────────────────────────────────────

function Hint({ k, children }: { k: string; children: string }) {
  return (
    <span className="flex items-center gap-1">
      <Kbd>{k}</Kbd>
      <span>{children}</span>
    </span>
  )
}

export function ShortcutHints({
  answerVisible,
  answerPanelView,
}: {
  answerVisible: boolean
  answerPanelView: AnswerPanelView
}) {
  const showStatusShortcuts = answerVisible && answerPanelView === 'answer'

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-fg-subtle max-sm:hidden">
      {!answerVisible ? <Hint k="Space">查看答案</Hint> : null}
      {showStatusShortcuts ? (
        <>
          <Hint k="1">没掌握</Hint>
          <Hint k="2">大概会</Hint>
          <Hint k="3">完全掌握</Hint>
        </>
      ) : null}
      <Hint k="→">下一题</Hint>
      <Hint k="←">上一题</Hint>
      <Hint k="N">笔记</Hint>
      <Hint k="L">本模块</Hint>
      <Hint k="A">AI 助手</Hint>
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

  const milestones: Record<number, { emoji: string; message: string; tone: string }> = {
    3: { emoji: '🔥', message: '连续 3 题！保持住！', tone: 'bg-warning' },
    5: { emoji: '⚡', message: '5 连击！状态很好！', tone: 'bg-accent' },
    10: { emoji: '🚀', message: '10 连击！你太厉害了！', tone: 'bg-success' },
    20: { emoji: '👑', message: '20 连击！无人能挡！', tone: 'bg-warning' },
    50: { emoji: '🏆', message: '50 连击！传说级别！', tone: 'bg-danger' },
  }

  const hit = [50, 20, 10, 5, 3].find((l) => streak === l)
  if (!hit) return null

  const { emoji, message, tone } = milestones[hit]

  return (
    <output
      className="pointer-events-none fixed top-1/2 left-1/2 z-[9998] flex flex-col items-center gap-2"
      style={{ animation: 'streak-pop 2.2s var(--ease-spring) both' }}
    >
      <span className="text-6xl leading-none drop-shadow-lg">{emoji}</span>
      <span
        className={cn(
          'rounded-full px-5 py-2 text-base font-semibold text-white shadow-popover',
          tone,
        )}
      >
        {message}
      </span>
    </output>
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

  const allMastered = mastered === total
  const stats = [
    { label: '已掌握', value: mastered, tone: 'text-success' },
    { label: '待复习', value: review, tone: 'text-warning' },
    { label: '未学习', value: unlearned, tone: 'text-fg-muted' },
  ]

  return (
    <div
      className={cn(
        'flex flex-col gap-5 rounded-2xl border bg-canvas p-5',
        allMastered ? 'border-success/30' : 'border-line',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-2xs font-semibold tracking-wider text-fg-subtle uppercase">
            本轮完成
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-fg">
            {hasRetry ? '还有可巩固的题目' : '这一轮全部掌握'}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">
            {hasRetry
              ? `建议立即重练 ${retryCount} 道未完全掌握的题，趁记忆还热。`
              : '可以结束本轮，或者回到练习配置继续挑战新的题目。'}
          </p>
        </div>
        <div className="relative grid size-16 shrink-0 place-items-center">
          <ProgressRing
            value={masteredPercent}
            size={64}
            stroke={5}
            className={cn(
              'absolute inset-0',
              allMastered && '[&>circle:last-child]:stroke-success',
            )}
          />
          <span className="text-center leading-none">
            <span className="block text-base font-semibold text-fg tabular-nums">
              {masteredPercent}%
            </span>
            <span className="text-2xs text-fg-subtle">掌握</span>
          </span>
        </div>
      </div>

      <StatGroup className="grid-cols-3">
        {stats.map((item) => (
          <Stat
            key={item.label}
            label={item.label}
            value={<span className={item.tone}>{item.value}</span>}
          />
        ))}
      </StatGroup>

      <div className="flex flex-wrap gap-2 max-sm:flex-col">
        <Button variant="primary" onClick={hasRetry ? onRetry : onBackToPractice}>
          <RotateCcw />
          {hasRetry ? `重练 ${retryCount} 题` : '继续练习'}
        </Button>
        {hasRetry ? (
          <Button variant="secondary" onClick={onBackToPractice}>
            调整练习
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onDashboard}>
          回概览
        </Button>
      </div>
    </div>
  )
}
