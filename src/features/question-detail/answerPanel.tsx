import { ArrowLeft, ArrowRight } from 'lucide-react'
import { formatReviewNoteTime } from '@/lib/feedbackNote'
import { Button, cn, Textarea } from '@/ui'

export type AnswerOverrideSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface AnswerOverrideEditorProps {
  draft: string
  saveStatus: AnswerOverrideSaveStatus
  canSave: boolean
  onDraftChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  onRestoreDefault: () => void
}

const SAVE_STATUS_TEXT: Record<AnswerOverrideSaveStatus, string> = {
  idle: '支持 Markdown',
  saving: '保存中…',
  saved: '已保存',
  error: '保存失败',
}

export function AnswerOverrideEditor({
  draft,
  saveStatus,
  canSave,
  onDraftChange,
  onSave,
  onCancel,
  onRestoreDefault,
}: AnswerOverrideEditorProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <Textarea
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        rows={10}
        aria-label="自定义答案"
        className="min-h-[min(52dvh,520px)] px-4 py-3.5 text-sm"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            'text-xs',
            saveStatus === 'error' && 'text-danger',
            saveStatus === 'saved' && 'text-success',
            (saveStatus === 'idle' || saveStatus === 'saving') && 'text-fg-subtle',
          )}
        >
          {SAVE_STATUS_TEXT[saveStatus]}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onRestoreDefault}>
            恢复默认
          </Button>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            取消
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={onSave}
            disabled={!canSave}
            loading={saveStatus === 'saving'}
          >
            保存答案
          </Button>
        </div>
      </div>
    </div>
  )
}

export interface AnswerOverrideHeaderMetaProps {
  updatedAt: number | null
  showingOriginal: boolean
  onToggleOriginal: () => void
}

export function AnswerOverrideHeaderMeta({
  updatedAt,
  showingOriginal,
  onToggleOriginal,
}: AnswerOverrideHeaderMetaProps) {
  return (
    <div className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
      <span className="text-2xs whitespace-nowrap text-fg-subtle">
        {updatedAt ? formatReviewNoteTime(updatedAt) : '已自定义'}
      </span>
      <button
        type="button"
        onClick={onToggleOriginal}
        className="rounded-full border border-line px-2 py-px text-2xs text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
      >
        {showingOriginal ? '看自定义' : '看参考答案'}
      </button>
    </div>
  )
}

export type AnswerPanelView = 'answer' | 'check'

export interface AnswerPanelTabsProps {
  activeView: AnswerPanelView
  answerLabel: string
  onChange: (view: AnswerPanelView) => void
}

export function AnswerPanelTabs({ activeView, answerLabel, onChange }: AnswerPanelTabsProps) {
  const items: Array<{ view: AnswerPanelView; label: string }> = [
    { view: 'answer', label: answerLabel },
    { view: 'check', label: '测试一下' },
  ]

  return (
    <div
      role="tablist"
      aria-label="答案学习视图"
      className="inline-flex min-w-0 items-center gap-0.5 rounded-lg bg-muted p-0.5"
    >
      {items.map((item) => {
        const active = activeView === item.view
        return (
          <button
            key={item.view}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.view)}
            className={cn(
              'inline-flex h-7 items-center justify-center rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors',
              active ? 'bg-canvas text-fg shadow-raised' : 'text-fg-muted hover:text-fg',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

export interface MobileQuestionNavProps {
  prevDisabled: boolean
  nextDisabled: boolean
  onPrev: () => void
  onNext: () => void
}

export function MobileQuestionNav({
  prevDisabled,
  nextDisabled,
  onPrev,
  onNext,
}: MobileQuestionNavProps) {
  return (
    <nav
      aria-label="题目切换"
      className="fixed inset-x-0 bottom-0 z-[35] grid grid-cols-2 gap-2.5 border-t border-line bg-canvas/90 px-2.5 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden"
    >
      <Button variant="secondary" onClick={onPrev} disabled={prevDisabled}>
        <ArrowLeft />
        上一题
      </Button>
      <Button variant="secondary" onClick={onNext} disabled={nextDisabled}>
        下一题
        <ArrowRight />
      </Button>
    </nav>
  )
}

export function AnswerAIButton({
  title,
  active = false,
  onClick,
  children,
}: {
  title: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      title={title}
      aria-pressed={active}
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-md transition-colors [&_svg]:size-3.5',
        active
          ? 'bg-accent-subtle text-accent'
          : 'text-fg-subtle hover:bg-accent-subtle hover:text-accent',
      )}
    >
      {children}
    </button>
  )
}
