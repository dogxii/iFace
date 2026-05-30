import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, EmptyState, Skeleton } from '@/components/ui'
import { applyFilters, type SortKey, useQuestions } from '@/hooks/useQuestions'
import {
  type CategoryMap,
  DEFAULT_CATEGORY_MAP,
  getAllQuestionFlags,
  getAllQuestionNotes,
  getCategoryMap,
} from '@/lib/db'
import { createPracticeSessionPath } from '@/lib/practiceSession'
import { filterVisibleQuestions, getHiddenModules } from '@/lib/questionVisibility'
import { preloadRoute } from '@/lib/routePreload'
import { useStudyStore } from '@/store/useStudyStore'
import {
  BUILTIN_MODULE_CATEGORY,
  BUILTIN_MODULES,
  DIFFICULTY_LABELS,
  DIFFICULTY_STYLES,
  type Difficulty,
  type Module,
  type Question,
  type QuestionFlag,
  type QuestionNote,
  STATUS_LABELS,
  STATUS_STYLES,
  type StudyStatus,
} from '@/types'

// ─── Filter Panel ─────────────────────────────────────────────────────────────

interface FilterPanelProps {
  selectedModules: Module[]
  selectedDifficulties: Difficulty[]
  selectedStatuses: StudyStatus[]
  starredOnly: boolean
  notesOnly: boolean
  starredCount: number
  noteCount: number
  onModuleToggle: (m: Module) => void
  onDifficultyToggle: (d: Difficulty) => void
  onStatusToggle: (s: StudyStatus) => void
  onStarredOnlyToggle: () => void
  onNotesOnlyToggle: () => void
  onClear: () => void
  totalFiltered: number
  totalAll: number
  /** All module names present in current DB (built-in + custom) */
  availableModules: Module[]
}

function FilterPanel({
  selectedModules,
  selectedDifficulties,
  selectedStatuses,
  starredOnly,
  notesOnly,
  starredCount,
  noteCount,
  onModuleToggle,
  onDifficultyToggle,
  onStatusToggle,
  onStarredOnlyToggle,
  onNotesOnlyToggle,
  onClear,
  totalFiltered,
  totalAll,
  availableModules,
}: FilterPanelProps) {
  const hasFilters =
    selectedModules.length > 0 ||
    selectedDifficulties.length > 0 ||
    selectedStatuses.length > 0 ||
    starredOnly ||
    notesOnly

  return (
    <aside
      style={{
        width: '100%',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          筛选
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            style={{
              fontSize: 12,
              color: 'var(--primary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            清除全部
          </button>
        )}
      </div>

      {/* Results count */}
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
        显示 <span style={{ fontWeight: 600, color: 'var(--text)' }}>{totalFiltered}</span> /{' '}
        {totalAll} 题
      </div>

      {/* Difficulty */}
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-3)',
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          难度
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {([1, 2, 3] as Difficulty[]).map((d) => {
            const active = selectedDifficulties.includes(d)
            return (
              <button
                type="button"
                key={d}
                onClick={() => onDifficultyToggle(d)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 10px',
                  borderRadius: 8,
                  background: active ? 'var(--surface-2)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = active
                    ? 'var(--surface-2)'
                    : 'transparent'
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: '1px solid',
                    color: DIFFICULTY_STYLES[d].color,
                    background: DIFFICULTY_STYLES[d].background,
                    borderColor: DIFFICULTY_STYLES[d].borderColor,
                  }}
                >
                  {DIFFICULTY_LABELS[d]}
                </span>
                {active && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: 'var(--primary)', marginLeft: 'auto' }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Status */}
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-3)',
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          学习状态
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(['unlearned', 'review', 'mastered'] as StudyStatus[]).map((s) => {
            const active = selectedStatuses.includes(s)
            return (
              <button
                type="button"
                key={s}
                onClick={() => onStatusToggle(s)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 10px',
                  borderRadius: 8,
                  background: active ? 'var(--surface-2)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = active
                    ? 'var(--surface-2)'
                    : 'transparent'
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: '1px solid',
                    color: STATUS_STYLES[s].color,
                    background: STATUS_STYLES[s].background,
                    borderColor: STATUS_STYLES[s].borderColor,
                  }}
                >
                  {STATUS_LABELS[s]}
                </span>
                {active && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: 'var(--primary)', marginLeft: 'auto' }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Module */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            模块
          </p>
          {/* Show badge when custom modules exist */}
          {availableModules.some((m) => !(BUILTIN_MODULES as readonly string[]).includes(m)) && (
            <span
              style={{
                fontSize: 10,
                padding: '1px 5px',
                borderRadius: 4,
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                border: '1px solid rgba(var(--primary-rgb),0.2)',
              }}
            >
              含自定义
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {availableModules.map((mod) => {
            const active = selectedModules.includes(mod)
            const categoryLabel = BUILTIN_MODULE_CATEGORY[mod] ?? null
            const isCustom = !(BUILTIN_MODULES as readonly string[]).includes(mod)
            return (
              <button
                type="button"
                key={mod}
                onClick={() => onModuleToggle(mod)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  color: active ? 'var(--primary)' : 'var(--text-2)',
                  background: active ? 'var(--primary-light)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s, color 0.12s',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
                  }
                }}
              >
                <span
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {mod}
                </span>
                {categoryLabel && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: '1px 4px',
                      borderRadius: 3,
                      background: active ? 'rgba(255,255,255,0.2)' : 'var(--surface-3)',
                      color: active ? 'rgba(255,255,255,0.8)' : 'var(--text-3)',
                      flexShrink: 0,
                    }}
                  >
                    {categoryLabel}
                  </span>
                )}
                {isCustom && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: '1px 4px',
                      borderRadius: 3,
                      background: active ? 'rgba(255,255,255,0.2)' : 'var(--surface-3)',
                      color: active ? 'rgba(255,255,255,0.8)' : 'var(--text-3)',
                      flexShrink: 0,
                    }}
                  >
                    自定义
                  </span>
                )}
                {active && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Review */}
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-3)',
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          复盘
        </p>
        <button
          type="button"
          aria-pressed={starredOnly}
          title={starredOnly ? '关闭只看重点题' : '只看重点题'}
          onClick={onStarredOnlyToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            width: '100%',
            minHeight: 36,
            padding: '7px 10px',
            borderRadius: 10,
            border: starredOnly
              ? '1px solid rgba(245,158,11,0.35)'
              : '1px solid var(--border-subtle)',
            background: starredOnly ? 'rgba(245,158,11,0.1)' : 'var(--surface)',
            color: starredOnly ? '#b45309' : 'var(--text-2)',
            cursor: 'pointer',
            transition: 'background 0.12s, border-color 0.12s, color 0.12s',
            marginBottom: 6,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill={starredOnly ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span
              style={{
                fontSize: 13,
                fontWeight: starredOnly ? 600 : 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              只看重点题
            </span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span
              style={{
                minWidth: 20,
                padding: '1px 6px',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1.45,
                textAlign: 'center',
                background: starredOnly ? 'rgba(255,255,255,0.55)' : 'var(--surface-2)',
                color: starredOnly ? '#b45309' : 'var(--text-3)',
              }}
            >
              {starredCount}
            </span>
            {starredOnly && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </span>
        </button>
        <button
          type="button"
          aria-pressed={notesOnly}
          title={notesOnly ? '关闭只看有笔记 (N)' : '只看有笔记 (N)'}
          onClick={onNotesOnlyToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            width: '100%',
            minHeight: 36,
            padding: '7px 10px',
            borderRadius: 10,
            border: notesOnly
              ? '1px solid rgba(var(--primary-rgb), 0.28)'
              : '1px solid var(--border-subtle)',
            background: notesOnly ? 'var(--primary-light)' : 'var(--surface)',
            color: notesOnly ? 'var(--primary)' : 'var(--text-2)',
            cursor: 'pointer',
            transition: 'background 0.12s, border-color 0.12s, color 0.12s',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" />
              <path d="M8 7h6" />
              <path d="M8 11h8" />
            </svg>
            <span
              style={{
                fontSize: 13,
                fontWeight: notesOnly ? 600 : 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              只看有笔记
            </span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span
              style={{
                minWidth: 20,
                padding: '1px 6px',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1.45,
                textAlign: 'center',
                background: notesOnly ? 'rgba(255,255,255,0.55)' : 'var(--surface-2)',
                color: notesOnly ? 'var(--primary)' : 'var(--text-3)',
              }}
            >
              {noteCount}
            </span>
            {notesOnly && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </span>
        </button>
      </div>
    </aside>
  )
}

// ─── Question Card ────────────────────────────────────────────────────────────

interface QuestionCardProps {
  question: {
    id: string
    module: Module
    difficulty: Difficulty
    question: string
    tags: string[]
    source?: string
  }
  status: StudyStatus
  index: number
  starred: boolean
  hasNote: boolean
  noteSearchMatched?: boolean
  noteSnippet?: string
}

const QuestionCard = memo(function QuestionCard({
  question: q,
  status,
  index,
  starred,
  hasNote,
  noteSearchMatched,
  noteSnippet,
}: QuestionCardProps) {
  return (
    <Link
      to={`/questions/${q.id}${noteSearchMatched ? '?note=1' : ''}`}
      className="animate-fade-in card card-interactive"
      onPointerEnter={() => preloadRoute('questionDetail')}
      onFocus={() => preloadRoute('questionDetail')}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '14px 16px',
        textDecoration: 'none',
        animationDelay: `${Math.min(index * 0.025, 0.3)}s`,
      }}
    >
      {/* Status indicator strip */}
      <div
        style={{
          width: 3,
          alignSelf: 'stretch',
          borderRadius: 99,
          flexShrink: 0,
          background:
            status === 'mastered'
              ? 'var(--success)'
              : status === 'review'
                ? 'var(--warning)'
                : 'var(--border)',
          opacity: status === 'unlearned' ? 0.4 : 1,
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Question text */}
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text)',
            lineHeight: 1.55,
            marginBottom: 8,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {q.question}
        </p>

        {/* Meta row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          {/* Module */}
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{q.module}</span>

          <span style={{ color: 'var(--border)', fontSize: 12 }}>·</span>

          {/* Difficulty */}
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '2px 7px',
              borderRadius: 5,
              border: '1px solid',
              color: DIFFICULTY_STYLES[q.difficulty].color,
              background: DIFFICULTY_STYLES[q.difficulty].background,
              borderColor: DIFFICULTY_STYLES[q.difficulty].borderColor,
            }}
          >
            {DIFFICULTY_LABELS[q.difficulty]}
          </span>

          {/* Status badge */}
          {status !== 'unlearned' && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: '2px 7px',
                borderRadius: 5,
                border: '1px solid',
                color: STATUS_STYLES[status].color,
                background: STATUS_STYLES[status].background,
                borderColor: STATUS_STYLES[status].borderColor,
              }}
            >
              {STATUS_LABELS[status]}
            </span>
          )}

          {/* Source */}
          {q.source && (
            <span
              style={{
                fontSize: 11,
                padding: '1px 7px',
                borderRadius: 5,
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                border: '1px solid rgba(var(--primary-rgb), 0.2)',
              }}
            >
              {q.source}
            </span>
          )}

          {/* Starred badge */}
          {starred && (
            <span
              title="重点题"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 500,
                padding: '1px 7px',
                borderRadius: 5,
                background: 'rgba(245,158,11,0.1)',
                color: '#b45309',
                border: '1px solid rgba(245,158,11,0.22)',
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              重点
            </span>
          )}

          {/* Note badge */}
          {hasNote && (
            <span
              title={noteSearchMatched ? '笔记内容匹配当前搜索' : '这道题有笔记'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 500,
                padding: '1px 7px',
                borderRadius: 5,
                background: 'rgba(99,102,241,0.08)',
                color: 'var(--primary)',
                border: '1px solid rgba(var(--primary-rgb), 0.18)',
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" />
                <path d="M8 7h6" />
                <path d="M8 11h8" />
              </svg>
              {noteSearchMatched ? '命中笔记' : '笔记'}
            </span>
          )}

          {/* Tags (first 2 only) */}
          {q.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                padding: '1px 7px',
                borderRadius: 5,
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-3)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {noteSearchMatched && noteSnippet && (
          <div
            style={{
              marginTop: 10,
              padding: '9px 10px',
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid rgba(var(--primary-rgb), 0.14)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 4,
                color: 'var(--primary)',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" />
                <path d="M8 7h6" />
                <path d="M8 11h8" />
              </svg>
              笔记摘录
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-2)',
                lineHeight: 1.55,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {noteSnippet}
            </p>
          </div>
        )}
      </div>

      {/* Arrow */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-3)' }}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  )
})

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[
        'question-list-skeleton-1',
        'question-list-skeleton-2',
        'question-list-skeleton-3',
        'question-list-skeleton-4',
        'question-list-skeleton-5',
        'question-list-skeleton-6',
        'question-list-skeleton-7',
        'question-list-skeleton-8',
      ].map((key) => (
        <div
          key={key}
          className="card"
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <Skeleton width={3} height={52} rounded="sm" />
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <Skeleton width="75%" height={14} />
            <Skeleton width="45%" height={12} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Sort Button ──────────────────────────────────────────────────────────────

type SortOption = {
  value: string
  label: string
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'default', label: '默认排序' },
  { value: 'note-updated', label: '最近笔记' },
  { value: 'difficulty-asc', label: '难度↑' },
  { value: 'difficulty-desc', label: '难度↓' },
  { value: 'module', label: '按模块' },
]

const SORT_VALUES = new Set(SORT_OPTIONS.map((option) => option.value))
const STATUS_VALUES = new Set<StudyStatus>(['unlearned', 'review', 'mastered'])
const DIFFICULTY_VALUES = new Set<Difficulty>([1, 2, 3])

function parseListParam(params: URLSearchParams, key: string): string[] {
  return params
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
}

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function areArraysEqual<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function parseModuleParams(params: URLSearchParams): Module[] {
  return uniqueValues(parseListParam(params, 'module') as Module[])
}

function parseDifficultyParams(params: URLSearchParams): Difficulty[] {
  return uniqueValues(
    parseListParam(params, 'difficulty')
      .map((value) => Number(value))
      .filter((value): value is Difficulty => DIFFICULTY_VALUES.has(value as Difficulty)),
  )
}

function parseStatusParams(params: URLSearchParams): StudyStatus[] {
  return uniqueValues(
    parseListParam(params, 'status').filter((value): value is StudyStatus =>
      STATUS_VALUES.has(value as StudyStatus),
    ),
  )
}

function parseSortParam(params: URLSearchParams): string {
  const value = params.get('sort') ?? 'default'
  return SORT_VALUES.has(value) ? value : 'default'
}

function parseNotesOnlyParam(params: URLSearchParams): boolean {
  return params.get('notes') === '1'
}

function parseStarredOnlyParam(params: URLSearchParams): boolean {
  return params.get('starred') === '1'
}

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase()
}

function questionMatchesKeyword(question: Question, keyword: string): boolean {
  if (!keyword) return true
  return (
    question.question.toLowerCase().includes(keyword) ||
    question.tags.some((tag) => tag.toLowerCase().includes(keyword)) ||
    question.module.toLowerCase().includes(keyword) ||
    Boolean(question.source?.toLowerCase().includes(keyword))
  )
}

function getNoteSearchSnippet(content: string, keyword: string): string {
  const text = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_[\]`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return ''

  const index = keyword ? text.toLowerCase().indexOf(keyword) : -1
  if (index === -1) return text.length > 120 ? `${text.slice(0, 120)}...` : text

  const start = Math.max(0, index - 36)
  const end = Math.min(text.length, index + keyword.length + 64)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < text.length ? '...' : ''
  return `${prefix}${text.slice(start, end)}${suffix}`
}

function sortQuestionsByRecentNote(
  questions: Question[],
  noteByQuestionId: Map<string, QuestionNote>,
): Question[] {
  return [...questions].sort((a, b) => {
    const aUpdatedAt = noteByQuestionId.get(a.id)?.updatedAt ?? 0
    const bUpdatedAt = noteByQuestionId.get(b.id)?.updatedAt ?? 0
    if (aUpdatedAt !== bUpdatedAt) return bUpdatedAt - aUpdatedAt
    return 0
  })
}

function buildQuestionListParams({
  modules,
  difficulties,
  statuses,
  starredOnly,
  notesOnly,
  search,
  sort,
}: {
  modules: Module[]
  difficulties: Difficulty[]
  statuses: StudyStatus[]
  starredOnly: boolean
  notesOnly: boolean
  search: string
  sort: string
}): URLSearchParams {
  const params = new URLSearchParams()
  if (modules.length > 0) params.set('module', modules.join(','))
  if (difficulties.length > 0) params.set('difficulty', difficulties.join(','))
  if (statuses.length > 0) params.set('status', statuses.join(','))
  if (starredOnly) params.set('starred', '1')
  if (notesOnly) params.set('notes', '1')
  if (search.trim()) params.set('q', search.trim())
  if (sort !== 'default') params.set('sort', sort)
  return params
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 30

export default function QuestionList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { allQuestions, initializing } = useQuestions()
  const { records, getStatus, hiddenCategories } = useStudyStore()
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({ ...DEFAULT_CATEGORY_MAP })

  useEffect(() => {
    getCategoryMap().then(setCategoryMap)
  }, [])

  const hiddenModules = useMemo(
    () => getHiddenModules(categoryMap, hiddenCategories),
    [categoryMap, hiddenCategories],
  )
  const visibleQuestions = useMemo(
    () => filterVisibleQuestions(allQuestions, hiddenModules),
    [allQuestions, hiddenModules],
  )

  // ── Filter state (sync with URL) ──
  // Derive sorted module list from actual questions (built-ins first, then custom alphabetically)
  const availableModules = useMemo<Module[]>(() => {
    const moduleSet = new Set(visibleQuestions.map((q) => q.module))
    const builtins = (BUILTIN_MODULES as readonly string[]).filter((m) => moduleSet.has(m))
    const custom = [...moduleSet]
      .filter((m) => !(BUILTIN_MODULES as readonly string[]).includes(m))
      .sort((a, b) => a.localeCompare(b))
    return [...builtins, ...custom]
  }, [visibleQuestions])

  const [selectedModules, setSelectedModules] = useState<Module[]>(() =>
    parseModuleParams(searchParams),
  )
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>(() =>
    parseDifficultyParams(searchParams),
  )
  const [selectedStatuses, setSelectedStatuses] = useState<StudyStatus[]>(() =>
    parseStatusParams(searchParams),
  )
  const [starredOnly, setStarredOnly] = useState(() => parseStarredOnlyParam(searchParams))
  const [notesOnly, setNotesOnly] = useState(() => parseNotesOnlyParam(searchParams))
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [sort, setSort] = useState<string>(() => parseSortParam(searchParams))
  const [page, setPage] = useState(1)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [questionFlags, setQuestionFlags] = useState<QuestionFlag[]>([])
  const [questionNotes, setQuestionNotes] = useState<QuestionNote[]>([])

  const searchRef = useRef<HTMLInputElement>(null)
  const mobileFilterButtonRef = useRef<HTMLButtonElement>(null)
  const mobileFilterPanelRef = useRef<HTMLDivElement>(null)
  const lastSyncedSearchRef = useRef(searchParams.toString())

  useEffect(() => {
    let cancelled = false

    const loadQuestionMeta = async () => {
      const [notesResult, flagsResult] = await Promise.allSettled([
        getAllQuestionNotes(),
        getAllQuestionFlags(),
      ])

      if (cancelled) return
      setQuestionNotes(notesResult.status === 'fulfilled' ? notesResult.value : [])
      setQuestionFlags(flagsResult.status === 'fulfilled' ? flagsResult.value : [])
    }

    void loadQuestionMeta()
    window.addEventListener('focus', loadQuestionMeta)
    return () => {
      cancelled = true
      window.removeEventListener('focus', loadQuestionMeta)
    }
  }, [])

  const noteByQuestionId = useMemo(() => {
    const map = new Map<string, QuestionNote>()
    for (const note of questionNotes) {
      if (note.content.trim()) map.set(note.questionId, note)
    }
    return map
  }, [questionNotes])

  const noteIds = useMemo(() => new Set(noteByQuestionId.keys()), [noteByQuestionId])
  const starredIds = useMemo(
    () => new Set(questionFlags.filter((flag) => flag.starred).map((flag) => flag.questionId)),
    [questionFlags],
  )

  // ── Debounced search ──
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(t)
  }, [search])

  // ── Sync URL params ──
  useEffect(() => {
    const currentSearch = searchParams.toString()
    const desiredParams = buildQuestionListParams({
      modules: selectedModules,
      difficulties: selectedDifficulties,
      statuses: selectedStatuses,
      starredOnly,
      notesOnly,
      search: debouncedSearch,
      sort,
    })
    const desiredSearch = desiredParams.toString()

    if (currentSearch !== lastSyncedSearchRef.current && currentSearch !== desiredSearch) {
      const nextParams = new URLSearchParams(currentSearch)
      const nextModules = parseModuleParams(nextParams)
      const nextDifficulties = parseDifficultyParams(nextParams)
      const nextStatuses = parseStatusParams(nextParams)
      const nextStarredOnly = parseStarredOnlyParam(nextParams)
      const nextNotesOnly = parseNotesOnlyParam(nextParams)
      const nextSearch = nextParams.get('q') ?? ''
      const nextSort = parseSortParam(nextParams)
      let changed = false

      if (!areArraysEqual(selectedModules, nextModules)) {
        setSelectedModules(nextModules)
        changed = true
      }
      if (!areArraysEqual(selectedDifficulties, nextDifficulties)) {
        setSelectedDifficulties(nextDifficulties)
        changed = true
      }
      if (!areArraysEqual(selectedStatuses, nextStatuses)) {
        setSelectedStatuses(nextStatuses)
        changed = true
      }
      if (notesOnly !== nextNotesOnly) {
        setNotesOnly(nextNotesOnly)
        changed = true
      }
      if (starredOnly !== nextStarredOnly) {
        setStarredOnly(nextStarredOnly)
        changed = true
      }
      if (search !== nextSearch) {
        setSearch(nextSearch)
        changed = true
      }
      if (debouncedSearch !== nextSearch) {
        setDebouncedSearch(nextSearch)
        changed = true
      }
      if (sort !== nextSort) {
        setSort(nextSort)
        changed = true
      }
      if (changed) setPage(1)
      lastSyncedSearchRef.current = currentSearch
      return
    }

    if (currentSearch !== desiredSearch) {
      lastSyncedSearchRef.current = desiredSearch
      setSearchParams(desiredParams, { replace: true })
    } else {
      lastSyncedSearchRef.current = currentSearch
    }
  }, [
    searchParams,
    selectedModules,
    selectedDifficulties,
    selectedStatuses,
    starredOnly,
    notesOnly,
    search,
    debouncedSearch,
    sort,
    setSearchParams,
  ])

  // ── Keyboard shortcut: / to focus search ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== searchRef.current &&
        !['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName ?? '')
      ) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!mobileFilterOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = window.requestAnimationFrame(() => {
      mobileFilterPanelRef.current?.focus({ preventScroll: true })
    })

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileFilterOpen(false)
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = previousOverflow
      if (mobileFilterButtonRef.current?.isConnected) {
        mobileFilterButtonRef.current.focus({ preventScroll: true })
      }
    }
  }, [mobileFilterOpen])

  // ── Filter helpers ──
  const toggleModule = useCallback((m: Module) => {
    setPage(1)
    setSelectedModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }, [])

  const toggleDifficulty = useCallback((d: Difficulty) => {
    setPage(1)
    setSelectedDifficulties((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    )
  }, [])

  const toggleStatus = useCallback((s: StudyStatus) => {
    setPage(1)
    setSelectedStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }, [])

  const toggleNotesOnly = useCallback(() => {
    setPage(1)
    setNotesOnly((prev) => !prev)
  }, [])

  const toggleStarredOnly = useCallback(() => {
    setPage(1)
    setStarredOnly((prev) => !prev)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null
      const activeTag = activeElement?.tagName ?? ''
      const isTyping =
        activeElement?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)

      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey || isTyping) return
      e.preventDefault()
      toggleNotesOnly()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleNotesOnly])

  const clearFilters = useCallback(() => {
    setPage(1)
    setSelectedModules([])
    setSelectedDifficulties([])
    setSelectedStatuses([])
    setStarredOnly(false)
    setNotesOnly(false)
    setSearch('')
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setPage(1)
    setSearch(value)
  }, [])

  const handleSortChange = useCallback((value: string) => {
    setPage(1)
    setSort(value)
  }, [])

  // ── Filtered questions ──
  const filteredResult = useMemo(() => {
    const structuralSort: SortKey = sort === 'note-updated' ? 'default' : (sort as SortKey)
    const structuralQuestions = applyFilters(
      visibleQuestions,
      {
        modules: selectedModules,
        difficulties: selectedDifficulties,
        statuses: selectedStatuses,
        search: '',
      },
      records,
      structuralSort,
    )

    const keyword = normalizeKeyword(debouncedSearch)
    const noteSearchMatchedIds = new Set<string>()
    const noteSearchSnippets = new Map<string, string>()
    const searchedQuestions = keyword
      ? structuralQuestions.filter((q) => {
          const questionMatched = questionMatchesKeyword(q, keyword)
          const noteContent = noteByQuestionId.get(q.id)?.content
          const noteMatched = noteContent?.toLowerCase().includes(keyword)
          if (noteMatched && noteContent) {
            noteSearchMatchedIds.add(q.id)
            noteSearchSnippets.set(q.id, getNoteSearchSnippet(noteContent, keyword))
          }
          return questionMatched || noteMatched
        })
      : structuralQuestions

    const starredQuestions = starredOnly
      ? searchedQuestions.filter((q) => starredIds.has(q.id))
      : searchedQuestions
    const questions = notesOnly
      ? starredQuestions.filter((q) => noteIds.has(q.id))
      : starredQuestions
    const sortedQuestions =
      sort === 'note-updated' ? sortQuestionsByRecentNote(questions, noteByQuestionId) : questions

    return { questions: sortedQuestions, noteSearchMatchedIds, noteSearchSnippets }
  }, [
    visibleQuestions,
    selectedModules,
    selectedDifficulties,
    selectedStatuses,
    starredOnly,
    starredIds,
    notesOnly,
    noteIds,
    noteByQuestionId,
    debouncedSearch,
    sort,
    records,
  ])

  const filteredQuestions = filteredResult.questions
  const noteSearchMatchedIds = filteredResult.noteSearchMatchedIds
  const noteSearchSnippets = filteredResult.noteSearchSnippets

  const notedQuestionCount = useMemo(
    () =>
      visibleQuestions.reduce((count, question) => count + (noteIds.has(question.id) ? 1 : 0), 0),
    [visibleQuestions, noteIds],
  )
  const starredQuestionCount = useMemo(
    () =>
      visibleQuestions.reduce(
        (count, question) => count + (starredIds.has(question.id) ? 1 : 0),
        0,
      ),
    [visibleQuestions, starredIds],
  )

  const currentSessionIds = useMemo(() => filteredQuestions.map((q) => q.id), [filteredQuestions])

  const handleStartFilteredSession = useCallback(() => {
    if (currentSessionIds.length === 0) return
    navigate(createPracticeSessionPath(currentSessionIds[0], currentSessionIds))
  }, [currentSessionIds, navigate])

  // ── Paginated ──
  const pagedQuestions = useMemo(
    () => filteredQuestions.slice(0, page * PAGE_SIZE),
    [filteredQuestions, page],
  )
  const hasMore = pagedQuestions.length < filteredQuestions.length

  // ── Load more on scroll ──
  const loaderRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setPage((p) => p + 1)
      },
      { threshold: 0.1 },
    )
    observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [hasMore])

  const hasFilters =
    selectedModules.length > 0 ||
    selectedDifficulties.length > 0 ||
    selectedStatuses.length > 0 ||
    starredOnly ||
    notesOnly ||
    debouncedSearch.length > 0

  // Keep selectedModules valid when availableModules changes (e.g. after import)
  useEffect(() => {
    if (allQuestions.length === 0 && availableModules.length === 0) return
    setSelectedModules((prev) => prev.filter((m) => availableModules.includes(m)))
  }, [allQuestions.length, availableModules])

  const allHidden = allQuestions.length > 0 && visibleQuestions.length === 0
  const emptyStateTitle = allHidden
    ? '所有题库已关闭展示'
    : !hasFilters
      ? '题库为空'
      : starredOnly && starredQuestionCount === 0
        ? '还没有重点题'
        : notesOnly && notedQuestionCount === 0
          ? '还没有题目笔记'
          : '没有匹配的题目'
  const emptyStateDescription = allHidden
    ? '在「设置 → 刷题偏好 → 题库展示」中启用题库后，这里会重新显示题目'
    : !hasFilters
      ? '请前往「导入题目」页面加载题库'
      : starredOnly && starredQuestionCount === 0
        ? '在题目详情中标记重点题后，可在这里集中复习'
        : notesOnly && notedQuestionCount === 0
          ? '打开任意题目的笔记入口，记录理解或把 AI 复盘保存为笔记'
          : starredOnly
            ? '当前筛选条件下没有重点题，可以清除部分条件再试'
            : notesOnly
              ? '当前筛选条件下没有带笔记的题目，可以清除部分条件再试'
              : '试试调整筛选条件，或搜索题目、标签、模块和笔记内容'

  return (
    <div className="page-container">
      {/* ── Page header ── */}
      <div
        className="animate-fade-in"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.015em',
            }}
          >
            题库
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {hasFilters
              ? `当前显示 ${filteredQuestions.length} / ${visibleQuestions.length} 道题`
              : `共 ${visibleQuestions.length} 道题`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Mobile filter toggle */}
          <button
            type="button"
            ref={mobileFilterButtonRef}
            onClick={() => setMobileFilterOpen((v) => !v)}
            style={{
              display: 'none',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 'var(--control-font-size)',
              whiteSpace: 'nowrap',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
              background: 'var(--surface)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            className="mobile-filter-btn"
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
              style={{ flexShrink: 0 }}
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
            <span style={{ whiteSpace: 'nowrap' }}>筛选</span>
            {hasFilters && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
            )}
          </button>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            style={{
              fontSize: 'var(--control-font-size)',
              padding: '6px 10px',
              borderRadius: 8,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {currentSessionIds.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartFilteredSession}
              icon={
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              }
              className="question-list-start-btn"
            >
              练习当前
              <span className="question-list-start-count">{currentSessionIds.length}</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="animate-fade-in" style={{ position: 'relative', marginBottom: 16 }}>
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
            left: 12,
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
          ref={searchRef}
          type="search"
          placeholder="搜索题目、标签、模块或笔记…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="input-base"
          style={{
            paddingLeft: 36,
            paddingRight: 60,
            borderRadius: 10,
            boxShadow: 'var(--shadow-xs)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {search ? (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              style={{
                color: 'var(--text-3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                padding: 2,
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : (
            <span className="kbd">/</span>
          )}
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {hasFilters && (
        <div
          className="animate-fade-in"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            marginBottom: 14,
          }}
        >
          {starredOnly && (
            <button
              type="button"
              onClick={toggleStarredOnly}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 10px',
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 500,
                background: 'rgba(245,158,11,0.1)',
                color: '#b45309',
                border: '1px solid rgba(245,158,11,0.22)',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
            >
              重点题
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          {notesOnly && (
            <button
              type="button"
              onClick={toggleNotesOnly}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 10px',
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 500,
                background: 'rgba(99,102,241,0.08)',
                color: 'var(--primary)',
                border: '1px solid rgba(var(--primary-rgb), 0.18)',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
            >
              有笔记
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          {selectedModules.map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => toggleModule(m)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 10px',
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 500,
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                border: '1px solid rgba(var(--primary-rgb), 0.2)',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
            >
              {m}
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ))}
          {selectedDifficulties.map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => toggleDifficulty(d)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 10px',
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 500,
                border: '1px solid',
                cursor: 'pointer',
                transition: 'all 0.15s',
                color: DIFFICULTY_STYLES[d].color,
                background: DIFFICULTY_STYLES[d].background,
                borderColor: DIFFICULTY_STYLES[d].borderColor,
              }}
            >
              {DIFFICULTY_LABELS[d]}
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ))}
          {selectedStatuses.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => toggleStatus(s)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 10px',
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 500,
                border: '1px solid',
                cursor: 'pointer',
                transition: 'all 0.15s',
                color: STATUS_STYLES[s].color,
                background: STATUS_STYLES[s].background,
                borderColor: STATUS_STYLES[s].borderColor,
              }}
            >
              {STATUS_LABELS[s]}
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ))}
          {debouncedSearch && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 10px',
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 500,
                background: 'var(--surface-3)',
                color: 'var(--text-2)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              "{debouncedSearch}"
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* ── Main layout ── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* ── Sidebar filter (desktop) ── */}
        <div
          style={{
            position: 'sticky',
            top: 'calc(var(--navbar-h) + 20px)',
            width: 200,
            flexShrink: 0,
          }}
          className="ql-sidebar"
        >
          <FilterPanel
            selectedModules={selectedModules}
            selectedDifficulties={selectedDifficulties}
            selectedStatuses={selectedStatuses}
            starredOnly={starredOnly}
            notesOnly={notesOnly}
            starredCount={starredQuestionCount}
            noteCount={notedQuestionCount}
            onModuleToggle={toggleModule}
            onDifficultyToggle={toggleDifficulty}
            onStatusToggle={toggleStatus}
            onStarredOnlyToggle={toggleStarredOnly}
            onNotesOnlyToggle={toggleNotesOnly}
            onClear={clearFilters}
            totalFiltered={filteredQuestions.length}
            totalAll={visibleQuestions.length}
            availableModules={availableModules}
          />
        </div>

        {/* ── Mobile filter drawer ── */}
        {mobileFilterOpen && (
          <>
            <button
              type="button"
              aria-label="关闭筛选面板"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 40,
                background: 'rgba(0,0,0,0.2)',
                backdropFilter: 'blur(2px)',
                border: 'none',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
              }}
              onClick={() => setMobileFilterOpen(false)}
            />
            <div
              ref={mobileFilterPanelRef}
              role="dialog"
              aria-modal="true"
              aria-label="题库筛选"
              tabIndex={-1}
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 50,
                outline: 'none',
              }}
              className="animate-slide-up"
            >
              <div
                className="glass"
                style={{
                  borderRadius: '18px 18px 0 0',
                  padding: 20,
                  boxShadow: 'var(--shadow-xl)',
                  maxHeight: '80dvh',
                  overflowY: 'auto',
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: 'var(--text)',
                    }}
                  >
                    筛选
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setMobileFilterOpen(false)}>
                    完成
                  </Button>
                </div>
                <FilterPanel
                  selectedModules={selectedModules}
                  selectedDifficulties={selectedDifficulties}
                  selectedStatuses={selectedStatuses}
                  starredOnly={starredOnly}
                  notesOnly={notesOnly}
                  starredCount={starredQuestionCount}
                  noteCount={notedQuestionCount}
                  onModuleToggle={toggleModule}
                  onDifficultyToggle={toggleDifficulty}
                  onStatusToggle={toggleStatus}
                  onStarredOnlyToggle={toggleStarredOnly}
                  onNotesOnlyToggle={toggleNotesOnly}
                  onClear={clearFilters}
                  totalFiltered={filteredQuestions.length}
                  totalAll={visibleQuestions.length}
                  availableModules={availableModules}
                />
              </div>
            </div>
          </>
        )}

        {/* ── Question list ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {initializing ? (
            <ListSkeleton />
          ) : filteredQuestions.length === 0 ? (
            <div className="card">
              <EmptyState
                title={emptyStateTitle}
                description={emptyStateDescription}
                action={
                  hasFilters ? (
                    <Button variant="secondary" size="sm" onClick={clearFilters}>
                      清除筛选
                    </Button>
                  ) : (
                    <Link to="/import">
                      <Button variant="primary" size="sm">
                        去导入
                      </Button>
                    </Link>
                  )
                }
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pagedQuestions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  status={getStatus(q.id)}
                  index={i}
                  starred={starredIds.has(q.id)}
                  hasNote={noteIds.has(q.id)}
                  noteSearchMatched={noteSearchMatchedIds.has(q.id)}
                  noteSnippet={noteSearchSnippets.get(q.id)}
                />
              ))}

              {/* Infinite scroll loader */}
              {hasMore && (
                <div ref={loaderRef} style={{ paddingTop: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      'question-list-loader-skeleton-1',
                      'question-list-loader-skeleton-2',
                      'question-list-loader-skeleton-3',
                    ].map((key) => (
                      <div
                        key={key}
                        className="card"
                        style={{
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 14,
                        }}
                      >
                        <Skeleton width={3} height={48} rounded="sm" />
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                          }}
                        >
                          <Skeleton width="70%" height={13} />
                          <Skeleton width="40%" height={11} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!hasMore && filteredQuestions.length > PAGE_SIZE && (
                <p
                  style={{
                    textAlign: 'center',
                    fontSize: 12,
                    color: 'var(--text-3)',
                    paddingTop: 16,
                  }}
                >
                  已显示全部 {filteredQuestions.length} 道题
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
				@media (max-width: 768px) {
					.ql-sidebar { display: none !important; }
					.mobile-filter-btn { display: flex !important; }
				}
				.question-list-start-count {
					font-variant-numeric: tabular-nums;
					opacity: 0.85;
				}
				@media (max-width: 480px) {
					.question-list-start-btn {
						padding-left: 8px !important;
						padding-right: 8px !important;
					}
					.question-list-start-count { display: none; }
				}
			`}</style>
    </div>
  )
}
