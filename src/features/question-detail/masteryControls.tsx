import { ArrowLeft, ArrowRight, Eye } from 'lucide-react'
import type { ButtonHTMLAttributes, Ref } from 'react'
import type { StudyStatus } from '@/types'
import { Button, cn, Kbd, Spinner, Tooltip } from '@/ui'
import { MASTERY_OPTIONS, type MasteryKey, type MasteryOption, masteryHint } from './mastery'

const TONE = {
  danger: { dot: 'bg-danger', on: 'border-danger/50 bg-danger-subtle text-danger' },
  warning: { dot: 'bg-warning', on: 'border-warning/50 bg-warning-subtle text-warning' },
  success: { dot: 'bg-success', on: 'border-success/50 bg-success-subtle text-success' },
} as const

interface MasteryProps {
  activeKey: MasteryKey | null
  reviewCount: number
  marking: boolean
  onMark: (status: StudyStatus, key: MasteryKey) => void
}

function MasteryChoice({
  option,
  active,
  disabled,
  className,
  children,
  onMark,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  option: MasteryOption
  active: boolean
  disabled: boolean
  onMark: MasteryProps['onMark']
  ref?: Ref<HTMLButtonElement>
}) {
  return (
    <button
      {...props}
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={() => onMark(option.status, option.key)}
      className={cn(
        'inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border border-line-strong bg-canvas text-sm font-medium text-fg transition-colors outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        active && TONE[option.tone].on,
        className,
      )}
    >
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', TONE[option.tone].dot)} />
      {children}
    </button>
  )
}

/**
 * End-of-answer self-rating. Sits in the flow after the answer instead of floating over it,
 * so it never covers what you're reading; 1/2/3 and the header control work from anywhere.
 */
export function MasteryFooter({
  status,
  activeKey,
  justMarked,
  reviewCount,
  marking,
  advancing,
  className,
  onMark,
}: MasteryProps & {
  status: StudyStatus
  /** Rated on this visit (vs. a status from an earlier visit). */
  justMarked: boolean
  /** A practice session moves on to the next question after rating. */
  advancing: boolean
  className?: string
}) {
  const picked = MASTERY_OPTIONS.find((option) => option.key === activeKey)
  const hint = marking
    ? '保存中…'
    : justMarked && picked
      ? `已记为「${picked.label}」· ${masteryHint(picked.key, reviewCount)}${advancing ? ' · 即将进入下一题' : ''}`
      : status === 'mastered'
        ? '之前已掌握，可以再确认一次'
        : status === 'review'
          ? '之前标记为待复习'
          : '按 1 / 2 / 3 快速标记，决定下次什么时候复习'

  return (
    <section
      aria-label="掌握程度"
      className={cn(
        'flex flex-col gap-3 border-t border-line pt-4 @lg/detail:flex-row @lg/detail:items-center @lg/detail:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">掌握得怎么样？</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle" aria-live="polite">
          {marking ? <Spinner size="sm" /> : null}
          {hint}
        </p>
      </div>
      <fieldset aria-label="标记掌握程度" className="grid min-w-0 grid-cols-3 gap-1.5">
        {MASTERY_OPTIONS.map((option) => (
          <Tooltip key={option.key} content={masteryHint(option.key, reviewCount)}>
            <MasteryChoice
              option={option}
              active={activeKey === option.key}
              disabled={marking}
              className="h-9 px-3"
              onMark={onMark}
            >
              <span className="truncate">{option.label}</span>
              <Kbd className="max-sm:hidden">{option.key}</Kbd>
            </MasteryChoice>
          </Tooltip>
        ))}
      </fieldset>
    </section>
  )
}

/** Compact traffic-light rating for the page header, reachable mid-answer without scrolling. */
export function MasteryHeaderControl({ activeKey, reviewCount, marking, onMark }: MasteryProps) {
  return (
    <fieldset
      aria-label="标记掌握程度"
      className="flex items-center gap-0.5 rounded-lg border border-line p-0.5"
    >
      {MASTERY_OPTIONS.map((option) => {
        const active = activeKey === option.key
        return (
          <Tooltip
            key={option.key}
            content={`${option.label} · ${masteryHint(option.key, reviewCount)}`}
            shortcut={option.key}
            side="bottom"
          >
            <button
              type="button"
              aria-label={option.label}
              aria-pressed={active}
              disabled={marking}
              onClick={() => onMark(option.status, option.key)}
              className={cn(
                'grid size-7 place-items-center rounded-md transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                active && TONE[option.tone].on,
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'size-2.5 rounded-full',
                  TONE[option.tone].dot,
                  !active && 'opacity-70',
                )}
              />
            </button>
          </Tooltip>
        )
      })}
    </fieldset>
  )
}

/**
 * Mobile bottom bar: prev / next around the main action of the moment — reveal the answer,
 * then rate it. One bar instead of a nav bar with a floating dock stacked on top.
 */
export function MobileQuestionNav({
  prevDisabled,
  nextDisabled,
  answerVisible,
  onPrev,
  onNext,
  onReveal,
  ...mastery
}: MasteryProps & {
  prevDisabled: boolean
  nextDisabled: boolean
  answerVisible: boolean
  onPrev: () => void
  onNext: () => void
  onReveal: () => void
}) {
  return (
    <nav
      aria-label="题目切换"
      className="fixed inset-x-0 bottom-0 z-[35] grid grid-cols-[40px_minmax(0,1fr)_40px] gap-1.5 border-t border-line bg-canvas/90 px-2 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden"
    >
      <Button
        variant="secondary"
        size="icon-lg"
        aria-label="上一题"
        onClick={onPrev}
        disabled={prevDisabled}
      >
        <ArrowLeft />
      </Button>
      {answerVisible ? (
        <fieldset aria-label="标记掌握程度" className="grid min-w-0 grid-cols-3 gap-1.5">
          {MASTERY_OPTIONS.map((option) => (
            <MasteryChoice
              key={option.key}
              option={option}
              active={mastery.activeKey === option.key}
              disabled={mastery.marking}
              className="h-10 px-1.5"
              onMark={mastery.onMark}
            >
              <span className="truncate">{option.short}</span>
            </MasteryChoice>
          ))}
        </fieldset>
      ) : (
        <Button variant="primary" size="lg" onClick={onReveal}>
          <Eye />
          查看答案
        </Button>
      )}
      <Button
        variant="secondary"
        size="icon-lg"
        aria-label="下一题"
        onClick={onNext}
        disabled={nextDisabled}
      >
        <ArrowRight />
      </Button>
    </nav>
  )
}
