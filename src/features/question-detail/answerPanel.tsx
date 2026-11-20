import { Spinner } from '@/components/ui'
import { formatReviewNoteTime } from '@/lib/feedbackNote'

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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 0,
      }}
    >
      <textarea
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        rows={10}
        style={{
          width: '100%',
          minHeight: 'min(52dvh, 520px)',
          resize: 'vertical',
          padding: '14px 16px',
          borderRadius: 10,
          border: '1px solid var(--border-subtle)',
          background: 'var(--surface-2)',
          color: 'var(--text)',
          outline: 'none',
          fontSize: 13,
          lineHeight: 1.65,
          fontFamily: 'var(--font-sans)',
        }}
        onFocus={(event) => {
          event.currentTarget.style.borderColor = 'var(--primary)'
          event.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-light)'
        }}
        onBlur={(event) => {
          event.currentTarget.style.borderColor = 'var(--border-subtle)'
          event.currentTarget.style.boxShadow = 'none'
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
          paddingTop: 2,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color:
              saveStatus === 'error'
                ? 'var(--danger)'
                : saveStatus === 'saved'
                  ? 'var(--success)'
                  : 'var(--text-3)',
          }}
        >
          {saveStatus === 'saving'
            ? '保存中…'
            : saveStatus === 'saved'
              ? '已保存'
              : saveStatus === 'error'
                ? '保存失败'
                : 'Markdown'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onRestoreDefault}
            style={{
              fontSize: 12,
              color: 'var(--text-3)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '5px 8px',
              borderRadius: 7,
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = 'var(--surface)'
              event.currentTarget.style.color = 'var(--text)'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = 'transparent'
              event.currentTarget.style.color = 'var(--text-3)'
            }}
          >
            恢复默认
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              fontSize: 12,
              color: 'var(--text-2)',
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              padding: '5px 10px',
              borderRadius: 7,
            }}
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave || saveStatus === 'saving'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: canSave ? 'white' : 'var(--text-3)',
              background: canSave ? 'var(--primary)' : 'var(--surface-3)',
              border: 'none',
              cursor: canSave ? 'pointer' : 'default',
              padding: '6px 12px',
              borderRadius: 8,
              opacity: saveStatus === 'saving' ? 0.75 : 1,
            }}
          >
            {saveStatus === 'saving' && <Spinner size="sm" />}
            保存答案
          </button>
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
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 11,
          lineHeight: 1.35,
          color: 'var(--text-3)',
          whiteSpace: 'nowrap',
        }}
      >
        {updatedAt ? formatReviewNoteTime(updatedAt) : '已自定义'}
      </span>
      <button
        type="button"
        onClick={onToggleOriginal}
        style={{
          fontSize: 11,
          color: 'var(--text-2)',
          background: 'transparent',
          border: '1px solid var(--border-subtle)',
          cursor: 'pointer',
          padding: '2px 7px',
          borderRadius: 999,
          lineHeight: 1.45,
        }}
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        minWidth: 0,
      }}
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 30,
              padding: '0 11px',
              borderRadius: 8,
              border: 'none',
              background: active ? 'var(--primary-light)' : 'transparent',
              color: active ? 'var(--primary)' : 'var(--text-2)',
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(event) => {
              if (active) return
              event.currentTarget.style.background = 'var(--surface-2)'
              event.currentTarget.style.color = 'var(--text)'
            }}
            onMouseLeave={(event) => {
              if (active) return
              event.currentTarget.style.background = 'transparent'
              event.currentTarget.style.color = 'var(--text-2)'
            }}
          >
            <span>{item.label}</span>
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
  const navButtonStyle = (disabled: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 0,
    height: 38,
    padding: '0 10px',
    borderRadius: 10,
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface)',
    color: disabled ? 'var(--text-3)' : 'var(--text-2)',
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.48 : 1,
    whiteSpace: 'nowrap',
  })

  return (
    <div className="mobile-question-nav">
      <button
        type="button"
        onClick={onPrev}
        disabled={prevDisabled}
        style={navButtonStyle(prevDisabled)}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        上一题
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        style={navButtonStyle(nextDisabled)}
      >
        下一题
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
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
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        border: '1px solid',
        borderColor: active ? 'rgba(var(--primary-rgb),0.3)' : 'transparent',
        background: active ? 'rgba(var(--primary-rgb),0.08)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-3)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--primary-rgb),0.28)'
        ;(e.currentTarget as HTMLElement).style.background = 'rgba(var(--primary-rgb),0.08)'
        ;(e.currentTarget as HTMLElement).style.color = 'var(--primary)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = active
          ? 'rgba(var(--primary-rgb),0.3)'
          : 'transparent'
        ;(e.currentTarget as HTMLElement).style.background = active
          ? 'rgba(var(--primary-rgb),0.08)'
          : 'transparent'
        ;(e.currentTarget as HTMLElement).style.color = active ? 'var(--primary)' : 'var(--text-3)'
      }}
    >
      {children}
    </button>
  )
}
