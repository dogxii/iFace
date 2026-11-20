import { useEffect, useMemo, useRef, useState } from 'react'
import { Kbd } from '@/components/ui'
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_STYLES,
  type Question,
  STATUS_LABELS,
  STATUS_STYLES,
  type StudyStatus,
} from '@/types'

export type ModuleQuestionStatusFilter = 'all' | StudyStatus

export const MODULE_QUESTION_STATUS_FILTERS: ModuleQuestionStatusFilter[] = [
  'all',
  'unlearned',
  'review',
  'mastered',
]

export interface ModuleQuestionDrawerProps {
  open: boolean
  onClose: () => void
  question: Question
  questions: Question[]
  records: Record<string, { status: StudyStatus } | undefined>
  onNavigate: (questionId: string) => void
}

export function ModuleQuestionDrawer({
  open,
  onClose,
  question,
  questions,
  records,
  onNavigate,
}: ModuleQuestionDrawerProps) {
  const panelRef = useRef<HTMLElement>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ModuleQuestionStatusFilter>('all')

  useEffect(() => {
    if (!open) return
    setQuery('')
    setStatusFilter('all')
  }, [open])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      panelRef.current?.focus({ preventScroll: true })
      panelRef.current
        ?.querySelector<HTMLElement>('.module-question-current-row')
        ?.scrollIntoView({ block: 'center' })
    }, 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const currentIndex = questions.findIndex((item) => item.id === question.id)
  const normalizedQuery = query.trim().toLowerCase()

  const statusCounts = useMemo(() => {
    const counts: Record<StudyStatus, number> = { unlearned: 0, review: 0, mastered: 0 }
    for (const item of questions) {
      const status = records[item.id]?.status ?? 'unlearned'
      counts[status] += 1
    }
    return counts
  }, [records, questions])

  const filteredQuestions = useMemo(
    () =>
      questions.filter((item) => {
        const status = records[item.id]?.status ?? 'unlearned'
        if (statusFilter !== 'all' && status !== statusFilter) return false
        if (!normalizedQuery) return true

        return (
          item.question.toLowerCase().includes(normalizedQuery) ||
          item.id.toLowerCase().includes(normalizedQuery) ||
          item.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
          item.source?.toLowerCase().includes(normalizedQuery)
        )
      }),
    [normalizedQuery, records, questions, statusFilter],
  )

  if (!open) return null

  const totalCount = questions.length

  return (
    <>
      <button
        type="button"
        aria-label="关闭本模块题库"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 171,
          background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          animation: 'fade-in 0.16s var(--ease-out) both',
        }}
      />
      <aside
        ref={panelRef}
        className="module-question-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="本模块题库"
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: 'var(--navbar-h)',
          right: 0,
          bottom: 0,
          zIndex: 172,
          width: 'min(520px, 100vw)',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'drawer-slide-in 0.22s var(--ease-out) both',
          outline: 'none',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 14, fontWeight: 650, color: 'var(--text)' }}>本模块题库</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Kbd>L</Kbd>
                <Kbd>Esc</Kbd>
              </span>
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-3)',
                marginTop: 3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {question.module}
              {currentIndex >= 0 ? ` · 第 ${currentIndex + 1} / ${questions.length} 题` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭本模块题库"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
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
              width="15"
              height="15"
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

        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div style={{ position: 'relative' }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: 'absolute',
                left: 11,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-3)',
                pointerEvents: 'none',
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索本模块题目、标签或来源"
              style={{
                width: '100%',
                height: 36,
                padding: query ? '0 36px 0 34px' : '0 12px 0 34px',
                borderRadius: 9,
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-2)',
                color: 'var(--text)',
                fontSize: 13,
                outline: 'none',
              }}
            />
            {query && (
              <button
                type="button"
                aria-label="清空搜索"
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute',
                  right: 7,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="13"
                  height="13"
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
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 1 }}>
            {MODULE_QUESTION_STATUS_FILTERS.map((item) => {
              const active = statusFilter === item
              const count = item === 'all' ? totalCount : statusCounts[item as StudyStatus]
              const label = item === 'all' ? '全部' : STATUS_LABELS[item]
              const style = item === 'all' ? null : STATUS_STYLES[item]

              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => setStatusFilter(item)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    minHeight: 28,
                    padding: '0 10px',
                    borderRadius: 99,
                    border: '1px solid',
                    borderColor: active
                      ? (style?.borderColor ?? 'rgba(var(--primary-rgb),0.28)')
                      : 'var(--border-subtle)',
                    background: active
                      ? (style?.background ?? 'var(--primary-light)')
                      : 'var(--surface)',
                    color: active ? (style?.color ?? 'var(--primary)') : 'var(--text-3)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: active ? 650 : 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{label}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div
          style={{
            padding: 12,
            overflowY: 'auto',
            minHeight: 0,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '0 4px 2px',
              fontSize: 12,
              color: 'var(--text-3)',
            }}
          >
            <span>
              本模块 <strong style={{ color: 'var(--text)' }}>{filteredQuestions.length}</strong> /{' '}
              {totalCount} 题
            </span>
            {currentIndex >= 0 && <span>当前第 {currentIndex + 1} 题</span>}
          </div>

          {filteredQuestions.length === 0 ? (
            <div
              style={{
                margin: '24px 4px',
                padding: 24,
                borderRadius: 10,
                border: '1px dashed var(--border)',
                color: 'var(--text-3)',
                textAlign: 'center',
                fontSize: 13,
              }}
            >
              没有匹配的题目
            </div>
          ) : (
            filteredQuestions.map((item) => {
              const itemStatus = records[item.id]?.status ?? 'unlearned'
              const active = item.id === question.id
              const itemIndex = questions.findIndex((candidate) => candidate.id === item.id)
              const difficultyStyle = DIFFICULTY_STYLES[item.difficulty]
              const statusStyle = STATUS_STYLES[itemStatus]

              return (
                <button
                  type="button"
                  key={item.id}
                  className={active ? 'module-question-current-row' : undefined}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => {
                    if (active) {
                      onClose()
                      return
                    }
                    onNavigate(item.id)
                  }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px minmax(0, 1fr)',
                    gap: 10,
                    width: '100%',
                    minHeight: 76,
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid',
                    borderColor: active ? 'rgba(var(--primary-rgb),0.32)' : 'var(--border-subtle)',
                    background: active ? 'var(--primary-light)' : 'var(--surface)',
                    color: 'inherit',
                    textAlign: 'left',
                    cursor: active ? 'default' : 'pointer',
                    transition: 'background 0.14s, border-color 0.14s, transform 0.14s',
                  }}
                  onMouseEnter={(event) => {
                    if (active) return
                    event.currentTarget.style.background = 'var(--surface-2)'
                    event.currentTarget.style.borderColor = 'var(--border)'
                  }}
                  onMouseLeave={(event) => {
                    if (active) return
                    event.currentTarget.style.background = 'var(--surface)'
                    event.currentTarget.style.borderColor = 'var(--border-subtle)'
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: active ? 'var(--primary)' : 'var(--surface-2)',
                      color: active ? 'white' : 'var(--text-3)',
                      fontSize: 12,
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {itemIndex + 1}
                  </span>
                  <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: active ? 650 : 560,
                        color: 'var(--text)',
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.question}
                    </span>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '2px 7px',
                          borderRadius: 5,
                          border: '1px solid',
                          color: difficultyStyle.color,
                          background: difficultyStyle.background,
                          borderColor: difficultyStyle.borderColor,
                        }}
                      >
                        {DIFFICULTY_LABELS[item.difficulty]}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '2px 7px',
                          borderRadius: 5,
                          border: '1px solid',
                          color: statusStyle.color,
                          background: statusStyle.background,
                          borderColor: statusStyle.borderColor,
                        }}
                      >
                        {STATUS_LABELS[itemStatus]}
                      </span>
                      {item.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: 11,
                            color: 'var(--text-3)',
                            maxWidth: 110,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </span>
                  </span>
                </button>
              )
            })
          )}
        </div>
      </aside>
    </>
  )
}
