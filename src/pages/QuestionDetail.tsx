import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { SettingsDrawer } from '@/components/layout/SettingsDrawer'
import { Badge, Button, Kbd, Skeleton, Spinner } from '@/components/ui'
import { AIPanelWithStyles } from '@/components/ui/AIPanel'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { LearningCheckPanel } from '@/components/ui/LearningCheckPanel'
import { SpeechInputButton } from '@/components/ui/SpeechInputButton'
import { useQuestion, useQuestions } from '@/hooks/useQuestions'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import {
  appendQuestionNoteContent,
  deleteQuestionAnswerAnnotation,
  deleteQuestionAnswerOverride,
  deleteUnusedQuestionNoteImages,
  getQuestionAnswerAnnotations,
  getQuestionAnswerOverride,
  getQuestionFlag,
  getQuestionNote,
  getQuestionNoteImages,
  putQuestionAnswerAnnotation,
  putQuestionAnswerOverride,
  putQuestionNote,
  putQuestionNoteImage,
  setQuestionStarred,
} from '@/lib/db'
import { buildReviewNoteMarkdown, formatReviewNoteTime } from '@/lib/feedbackNote'
import { type LearningCheckQuestion, loadLearningChecksForQuestion } from '@/lib/learningCheck'
import { createPracticeSessionPath, readPracticeSession } from '@/lib/practiceSession'
import {
  buildAnswerFeedbackContext,
  buildAnswerFeedbackSystemSuffix,
  useAIStore,
} from '@/store/useAIStore'
import { clearSessionReview, useStudyStore } from '@/store/useStudyStore'
import {
  type AnswerAnnotationColor,
  DIFFICULTY_LABELS,
  DIFFICULTY_STYLES,
  type Question,
  type QuestionAnswerAnnotation,
  type QuestionAnswerOverride,
  type QuestionNote,
  type QuestionNoteImage,
  STATUS_LABELS,
  STATUS_STYLES,
  type StudyStatus,
} from '@/types'

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

// ─── Session Completion ──────────────────────────────────────────────────────

interface SessionCompletionCardProps {
  mastered: number
  review: number
  unlearned: number
  total: number
  retryCount: number
  onRetry: () => void
  onBackToPractice: () => void
  onDashboard: () => void
}

function SessionCompletionCard({
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

// ─── Related Practice ────────────────────────────────────────────────────────

interface RelatedPracticeItem {
  question: Question
  status: StudyStatus
  matchedTags: string[]
}

interface RelatedPracticeCardProps {
  items: RelatedPracticeItem[]
  onStartPractice: () => void
}

function RelatedPracticeCard({ items, onStartPractice }: RelatedPracticeCardProps) {
  if (items.length === 0) return null

  return (
    <div
      className="card animate-fade-in"
      style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <div
        className="related-practice-header"
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
            同主题加练
          </p>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.35 }}>
            继续巩固相近考点
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 5, lineHeight: 1.6 }}>
            已按标签、模块和掌握状态挑出最相关的题目。
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onStartPractice}
          icon={
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          }
        >
          练这 {items.length} 题
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.slice(0, 3).map((item) => {
          const difficultyStyle = DIFFICULTY_STYLES[item.question.difficulty]
          const statusStyle = STATUS_STYLES[item.status]
          const detailParts = [
            item.question.module,
            item.matchedTags.length > 0 ? item.matchedTags.slice(0, 2).join(' / ') : null,
          ].filter(Boolean)

          return (
            <Link
              key={item.question.id}
              to={`/questions/${item.question.id}`}
              className="related-practice-row"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 12,
                alignItems: 'center',
                padding: '11px 12px',
                borderRadius: 10,
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-2)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text)',
                    lineHeight: 1.45,
                    marginBottom: 5,
                  }}
                >
                  {item.question.question}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {detailParts.join(' · ')}
                </p>
              </div>
              <div
                style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}
              >
                <Badge size="sm" variant="ghost" style={difficultyStyle}>
                  {DIFFICULTY_LABELS[item.question.difficulty]}
                </Badge>
                <Badge size="sm" variant="ghost" style={statusStyle}>
                  {STATUS_LABELS[item.status]}
                </Badge>
              </div>
            </Link>
          )
        })}
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

const MY_ANSWER_DRAFT_PREFIX = 'iface_my_answer_draft_'

function getMyAnswerDraftKey(questionId: string): string {
  return `${MY_ANSWER_DRAFT_PREFIX}${questionId}`
}

function loadMyAnswerDraft(questionId: string): string {
  if (!questionId) return ''

  try {
    return localStorage.getItem(getMyAnswerDraftKey(questionId)) ?? ''
  } catch {
    return ''
  }
}

function saveMyAnswerDraft(questionId: string, text: string): void {
  if (!questionId) return

  try {
    const key = getMyAnswerDraftKey(questionId)
    if (text.trim()) {
      localStorage.setItem(key, text)
    } else {
      localStorage.removeItem(key)
    }
  } catch {
    // ignore storage failures
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}

function appendSpeechTranscript(current: string, transcript: string): string {
  const next = transcript.trim()
  if (!next) return current
  if (!current.trim()) return next
  return `${current.trimEnd()} ${next}`
}

interface FeedbackScoreDimension {
  label: string
  score: number
  max: number
}

interface FeedbackScoreSummary {
  total: number
  dimensions: FeedbackScoreDimension[]
  note: string
}

function clampScore(score: number, max: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(max, Math.round(score)))
}

function parseScoreValue(section: string, labelPattern: string, max: number): number | null {
  const match = section.match(
    new RegExp(`${labelPattern}\\s*[：:]\\s*(\\d+(?:\\.\\d+)?)\\s*(?:[/／]\\s*${max})?`, 'i'),
  )
  if (!match) return null

  return clampScore(Number.parseFloat(match[1]), max)
}

function splitFeedbackScore(markdown: string): {
  content: string
  score: FeedbackScoreSummary | null
} {
  const match = markdown.match(/\n?#{3,5}\s*参考评分\s*\n([\s\S]*?)\s*$/)
  if (!match || match.index === undefined) return { content: markdown, score: null }

  const section = match[1]
  const total = parseScoreValue(section, '总分', 100)
  if (total === null) return { content: markdown, score: null }

  const dimensions = [
    { label: '覆盖度', score: parseScoreValue(section, '覆盖度', 40), max: 40 },
    { label: '准确性', score: parseScoreValue(section, '准确性', 40), max: 40 },
    { label: '表达', score: parseScoreValue(section, '表达(?:质量)?', 20), max: 20 },
  ].filter((item): item is FeedbackScoreDimension => item.score !== null)

  const noteMatch = section.match(/提示\s*[：:]\s*(.+)/)
  const note = noteMatch?.[1]?.trim() || '评分仅供自测参考，以具体改进建议优先。'

  return {
    content: markdown.slice(0, match.index).trimEnd(),
    score: { total, dimensions, note },
  }
}

function FeedbackScorePanel({ score }: { score: FeedbackScoreSummary }) {
  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: '1px dashed var(--border)',
        color: 'var(--text-3)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>参考评分</span>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-2)',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {score.total}/100
        </span>
      </div>

      {score.dimensions.length > 0 && (
        <div style={{ display: 'grid', gap: 7 }}>
          {score.dimensions.map((dimension) => {
            const percent = dimension.max > 0 ? (dimension.score / dimension.max) * 100 : 0

            return (
              <div
                key={dimension.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px minmax(56px, 112px) 42px',
                  alignItems: 'center',
                  gap: 8,
                  justifyContent: 'start',
                  fontSize: 11,
                }}
              >
                <span>{dimension.label}</span>
                <span
                  style={{
                    height: 4,
                    width: '100%',
                    borderRadius: 999,
                    background: 'var(--surface-3)',
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      width: `${percent}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: 'var(--text-3)',
                    }}
                  />
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {dimension.score}/{dimension.max}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <p style={{ marginTop: 8, fontSize: 11, lineHeight: 1.55 }}>{score.note}</p>
    </div>
  )
}

interface MyAnswerInputProps {
  questionId: string
  questionText: string
  answerText: string
  onOpenAIPanel: () => void
  onOpenNote?: () => void
  isAiEnabled: boolean
  onNoteSaved?: () => void
  /** When true the component is in "compact / inside answer card" mode */
  compact?: boolean
}

function MyAnswerInput({
  questionId,
  questionText,
  answerText,
  onOpenAIPanel,
  onOpenNote,
  isAiEnabled,
  onNoteSaved,
  compact = false,
}: MyAnswerInputProps) {
  const { sendMessage, streaming, streamingQuestionId } = useAIStore()

  // Always start expanded — no collapsed gate
  const [collapsed, setCollapsed] = useState(false)
  const [text, setText] = useState(() => loadMyAnswerDraft(questionId))
  const [feedback, setFeedback] = useState<string | null>(null)
  const [streamingFeedback, setStreamingFeedback] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [savingNote, setSavingNote] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isStreaming = streaming && streamingQuestionId === `${questionId}_selfcheck`

  const handleSpeechTranscript = useCallback((transcript: string) => {
    setText((prev) => appendSpeechTranscript(prev, transcript))
    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }, [])

  const speech = useSpeechRecognition({
    lang: 'zh-CN',
    onFinalTranscript: handleSpeechTranscript,
    onError: setError,
  })

  // Reset when question changes — always open again, but restore that question's draft.
  useEffect(() => {
    speech.stop()
    setCollapsed(false)
    setText(loadMyAnswerDraft(questionId))
    setFeedback(null)
    setStreamingFeedback('')
    setError(null)
    setSavingNote(false)
    setNoteSaved(false)
  }, [questionId, speech.stop])

  useEffect(() => {
    if (feedback || streamingFeedback) return
    saveMyAnswerDraft(questionId, text)
  }, [feedback, questionId, streamingFeedback, text])

  // Auto-focus only in answer-first mode. In answer-alongside mode the input
  // mounts after pressing Space, so focusing it would unexpectedly scroll down.
  useEffect(() => {
    if (!compact && !collapsed && !feedback) {
      setTimeout(() => textareaRef.current?.focus(), 80)
    }
  }, [collapsed, compact, feedback])

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || isStreaming) return

    speech.stop()
    setError(null)
    setStreamingFeedback('')

    const contextMessages = buildAnswerFeedbackContext({
      questionText,
      referenceAnswer: answerText,
      userAnswer: text.trim(),
    })

    // Use a dedicated sub-id so it doesn't pollute the main AI chat
    await sendMessage(
      `${questionId}_selfcheck`,
      '请批改我的作答，并给出一版更适合面试口述的修正版。',
      contextMessages,
      buildAnswerFeedbackSystemSuffix(),
      (chunk) => setStreamingFeedback((prev) => prev + chunk),
      (full) => {
        setFeedback(full)
        setStreamingFeedback('')
        saveMyAnswerDraft(questionId, '')
      },
      (err) => {
        setError(err)
        setStreamingFeedback('')
      },
    )
  }, [text, isStreaming, speech.stop, questionId, questionText, answerText, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const handleCollapse = useCallback(() => {
    speech.stop()
    setCollapsed(true)
  }, [speech.stop])

  const handleReset = useCallback(() => {
    speech.stop()
    setFeedback(null)
    setStreamingFeedback('')
    setText('')
    setError(null)
    setSavingNote(false)
    setNoteSaved(false)
    saveMyAnswerDraft(questionId, '')
    setTimeout(() => textareaRef.current?.focus(), 60)
  }, [questionId, speech.stop])

  const handleSaveFeedbackToNote = useCallback(async () => {
    if (!feedback || savingNote || noteSaved) return

    setSavingNote(true)
    setError(null)
    try {
      await appendQuestionNoteContent(
        questionId,
        buildReviewNoteMarkdown({
          questionText,
          userAnswer: text,
          feedback,
        }),
      )
      setNoteSaved(true)
      onNoteSaved?.()
    } catch (err) {
      setError(`保存笔记失败：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSavingNote(false)
    }
  }, [feedback, noteSaved, onNoteSaved, questionId, questionText, savingNote, text])

  const displayFeedback = feedback ?? (streamingFeedback || null)
  const parsedFeedback = feedback ? splitFeedbackScore(feedback) : null
  const feedbackContent = parsedFeedback?.content || displayFeedback
  const feedbackScore = parsedFeedback?.score ?? null

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
            fontSize: 'var(--control-font-size)',
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
            fontSize: 'var(--control-font-size)',
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
          onClick={handleCollapse}
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
                fontSize: 'var(--control-font-size)',
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
                gap: 10,
                padding: '6px 10px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--surface-2)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 0,
                  flex: 1,
                  flexWrap: 'wrap',
                }}
              >
                <SpeechInputButton
                  supported={speech.supported}
                  listening={speech.listening}
                  disabled={isStreaming}
                  onToggle={speech.toggle}
                />
                {speech.interimTranscript ? (
                  <span
                    title={speech.interimTranscript}
                    style={{
                      minWidth: 0,
                      maxWidth: compact ? 160 : 260,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 11,
                      color: 'var(--primary)',
                    }}
                  >
                    正在识别：{speech.interimTranscript}
                  </span>
                ) : (
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
                )}
              </div>
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
              {feedbackContent && (
                <div className="prose" style={{ fontSize: 13 }}>
                  <MarkdownRenderer content={feedbackContent} />
                  {feedbackScore && <FeedbackScorePanel score={feedbackScore} />}
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
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={handleSaveFeedbackToNote}
                  disabled={savingNote || noteSaved}
                  style={{
                    fontSize: 12,
                    color: noteSaved ? 'var(--success)' : 'var(--primary)',
                    background: noteSaved ? 'var(--success-light)' : 'var(--primary-light)',
                    border: '1px solid',
                    borderColor: noteSaved
                      ? 'rgba(16,185,129,0.2)'
                      : 'rgba(var(--primary-rgb),0.2)',
                    cursor: savingNote || noteSaved ? 'default' : 'pointer',
                    padding: '3px 8px',
                    borderRadius: 6,
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    opacity: savingNote ? 0.65 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!savingNote && !noteSaved) {
                      ;(e.currentTarget as HTMLElement).style.borderColor =
                        'rgba(var(--primary-rgb),0.35)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = noteSaved
                      ? 'rgba(16,185,129,0.2)'
                      : 'rgba(var(--primary-rgb),0.2)'
                  }}
                >
                  {savingNote ? (
                    <Spinner size="sm" />
                  ) : (
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
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                  )}
                  {savingNote ? '保存中…' : noteSaved ? '已保存到笔记' : '保存为复盘笔记'}
                </button>
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
                {noteSaved && onOpenNote && (
                  <button
                    type="button"
                    onClick={onOpenNote}
                    style={{
                      fontSize: 12,
                      color: 'var(--text-2)',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      padding: '3px 8px',
                      borderRadius: 6,
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--primary)'
                      ;(e.currentTarget as HTMLElement).style.borderColor =
                        'rgba(var(--primary-rgb),0.25)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
                      ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'
                    }}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" />
                      <path d="M8 7h6" />
                      <path d="M8 11h8" />
                    </svg>
                    打开笔记
                  </button>
                )}
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

// ─── Question Notes ──────────────────────────────────────────────────────────

interface QuestionNotesProps {
  questionId: string
  refreshKey: number
  embedded?: boolean
  autoFocus?: boolean
  onContentStateChange?: (hasContent: boolean) => void
}

type NoteSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const NOTE_IMAGE_SRC_PREFIX = 'iface-note-image:'
const MAX_NOTE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

const NOTE_FORMAT_ACTIONS = [
  { id: 'bold', label: 'B', title: '加粗' },
  { id: 'heading', label: 'H2', title: '二级标题' },
  { id: 'bullet', label: '- ', title: '无序列表' },
  { id: 'todo', label: '[ ]', title: '待办项' },
  { id: 'quote', label: '>', title: '引用' },
  { id: 'code', label: '</>', title: '代码块' },
  { id: 'link', label: 'link', title: '链接' },
  { id: 'table', label: 'table', title: '表格' },
] as const

type NoteFormatActionId = (typeof NOTE_FORMAT_ACTIONS)[number]['id']

function createLocalNoteImageId() {
  const cryptoId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `note-image-${Date.now()}-${cryptoId}`
}

function sanitizeImageAlt(name: string) {
  const baseName = name.replace(/\.[^.]+$/, '').trim()
  return (baseName || '本地图片').replace(/[[\]\n\r]/g, ' ')
}

function extractNoteImageIds(content: string): string[] {
  const ids = new Set<string>()
  const regex = /!\[[^\]]*]\(iface-note-image:([^)]+)\)/g
  let match = regex.exec(content)
  while (match) {
    if (match[1]) ids.add(match[1])
    match = regex.exec(content)
  }
  return Array.from(ids)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('invalid image data'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('failed to read image'))
    reader.readAsDataURL(file)
  })
}

function buildNoteInsertion(
  content: string,
  insertText: string,
  start: number,
  end: number,
): { nextContent: string; nextCursor: number } {
  const before = content.slice(0, start)
  const after = content.slice(end)
  const prefix = before.trim().length > 0 && !before.endsWith('\n\n') ? '\n\n' : ''
  const suffix = after.trim().length > 0 && !after.startsWith('\n\n') ? '\n\n' : ''
  const insertion = `${prefix}${insertText}${suffix}`

  return {
    nextContent: `${before}${insertion}${after}`,
    nextCursor: before.length + insertion.length,
  }
}

function getSelectedLineRange(content: string, start: number, end: number) {
  const lineStart = content.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  const nextNewline = content.indexOf('\n', end)
  const lineEnd = nextNewline === -1 ? content.length : nextNewline
  return { lineStart, lineEnd }
}

function prefixSelectedLines(
  content: string,
  start: number,
  end: number,
  prefix: string,
): { nextContent: string; nextCursor: number } {
  const { lineStart, lineEnd } = getSelectedLineRange(content, start, end)
  const block = content.slice(lineStart, lineEnd)
  const nextBlock = block
    .split('\n')
    .map((line) =>
      line.trim()
        ? `${prefix}${line.replace(/^(- \[ \] |- |\* |\d+\. |> )/, '')}`
        : prefix.trimEnd(),
    )
    .join('\n')

  return {
    nextContent: `${content.slice(0, lineStart)}${nextBlock}${content.slice(lineEnd)}`,
    nextCursor: lineStart + nextBlock.length,
  }
}

function wrapSelection(
  content: string,
  start: number,
  end: number,
  before: string,
  after: string,
  fallback: string,
): { nextContent: string; nextCursor: number } {
  const selected = content.slice(start, end)
  const value = selected || fallback
  const insertion = `${before}${value}${after}`

  return {
    nextContent: `${content.slice(0, start)}${insertion}${content.slice(end)}`,
    nextCursor: selected ? start + insertion.length : start + before.length + value.length,
  }
}

function applyNoteFormat(
  content: string,
  actionId: NoteFormatActionId,
  start: number,
  end: number,
): { nextContent: string; nextCursor: number } {
  switch (actionId) {
    case 'bold':
      return wrapSelection(content, start, end, '**', '**', '重点')
    case 'heading':
      return prefixSelectedLines(content, start, end, '## ')
    case 'bullet':
      return prefixSelectedLines(content, start, end, '- ')
    case 'todo':
      return prefixSelectedLines(content, start, end, '- [ ] ')
    case 'quote':
      return prefixSelectedLines(content, start, end, '> ')
    case 'code': {
      const selected = content.slice(start, end).trim()
      return buildNoteInsertion(content, `\`\`\`ts\n${selected || '代码'}\n\`\`\``, start, end)
    }
    case 'link':
      return wrapSelection(content, start, end, '[', '](https://)', '链接文字')
    case 'table':
      return buildNoteInsertion(content, '| 项目 | 说明 |\n| --- | --- |\n|  |  |', start, end)
  }
}

function NoteToolbarButton({
  label,
  title,
  onClick,
  disabled,
}: {
  label: string
  title: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        minWidth: 28,
        height: 26,
        padding: '0 7px',
        borderRadius: 7,
        border: '1px solid transparent',
        background: 'transparent',
        color: 'var(--text-3)',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: label === 'B' || label === 'H2' ? 'var(--font-sans)' : 'var(--font-mono)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color 0.15s, color 0.15s, background 0.15s',
      }}
      onMouseEnter={(event) => {
        if (disabled) return
        event.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.28)'
        event.currentTarget.style.color = 'var(--primary)'
        event.currentTarget.style.background = 'var(--primary-light)'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = 'transparent'
        event.currentTarget.style.color = 'var(--text-3)'
        event.currentTarget.style.background = 'transparent'
      }}
    >
      {label}
    </button>
  )
}

function QuestionNotes({
  questionId,
  refreshKey,
  embedded = false,
  autoFocus = false,
  onContentStateChange,
}: QuestionNotesProps) {
  const [content, setContent] = useState('')
  const [createdAt, setCreatedAt] = useState<number | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [noteImages, setNoteImages] = useState<Record<string, QuestionNoteImage>>({})
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<NoteSaveStatus>('idle')
  const [mode, setMode] = useState<'edit' | 'preview'>('preview')
  const [editorFocused, setEditorFocused] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [imageImportError, setImageImportError] = useState<string | null>(null)

  const loadedContentRef = useRef('')
  const saveTimerRef = useRef<number | null>(null)
  const statusTimerRef = useRef<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const focusEditor = useCallback(() => {
    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }, [])

  const handleNoteSpeechTranscript = useCallback((transcript: string) => {
    setContent((prev) => appendSpeechTranscript(prev, transcript))
    setSpeechError(null)
    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }, [])

  const speech = useSpeechRecognition({
    lang: 'zh-CN',
    onFinalTranscript: handleNoteSpeechTranscript,
    onError: setSpeechError,
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey intentionally reloads the IndexedDB note after AI feedback is appended.
  useEffect(() => {
    let cancelled = false

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    speech.stop()
    setLoading(true)
    setSaveStatus('idle')
    setSpeechError(null)
    setImageImportError(null)

    Promise.all([getQuestionNote(questionId), getQuestionNoteImages(questionId)])
      .then(([note, images]: [QuestionNote | undefined, QuestionNoteImage[]]) => {
        if (cancelled) return
        const nextContent = note?.content ?? ''
        loadedContentRef.current = nextContent
        setContent(nextContent)
        setCreatedAt(note?.createdAt ?? null)
        setUpdatedAt(note?.updatedAt ?? null)
        setNoteImages(Object.fromEntries(images.map((image) => [image.id, image])))
        onContentStateChange?.(nextContent.trim().length > 0)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        loadedContentRef.current = ''
        setContent('')
        setCreatedAt(null)
        setUpdatedAt(null)
        setNoteImages({})
        onContentStateChange?.(false)
        setSaveStatus('error')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [questionId, refreshKey, onContentStateChange, speech.stop])

  useEffect(() => {
    if (!autoFocus || loading || mode !== 'edit') return
    focusEditor()
  }, [autoFocus, focusEditor, loading, mode])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
      if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (loading) return
    if (content === loadedContentRef.current) return

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current)

    setSaveStatus('saving')
    const nextContent = content

    saveTimerRef.current = window.setTimeout(async () => {
      const now = Date.now()
      try {
        await putQuestionNote({
          questionId,
          content: nextContent,
          createdAt: createdAt ?? now,
          updatedAt: now,
        })
        const keepImageIds = extractNoteImageIds(nextContent)
        await deleteUnusedQuestionNoteImages(questionId, keepImageIds)

        loadedContentRef.current = nextContent
        if (nextContent.trim()) {
          setCreatedAt((prev) => prev ?? now)
          setUpdatedAt(now)
          setNoteImages((prev) =>
            Object.fromEntries(keepImageIds.flatMap((id) => (prev[id] ? [[id, prev[id]]] : []))),
          )
        } else {
          setCreatedAt(null)
          setUpdatedAt(null)
          setNoteImages({})
        }
        onContentStateChange?.(nextContent.trim().length > 0)
        setSaveStatus('saved')
        statusTimerRef.current = window.setTimeout(() => setSaveStatus('idle'), 1600)
      } catch {
        setSaveStatus('error')
      }
    }, 650)

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [content, createdAt, loading, onContentStateChange, questionId])

  const handleModeChange = useCallback(
    (nextMode: 'edit' | 'preview') => {
      setMode(nextMode)
      if (nextMode === 'edit') focusEditor()
    },
    [focusEditor],
  )

  const handleApplyFormat = useCallback(
    (actionId: NoteFormatActionId) => {
      const editor = textareaRef.current
      const start = editor?.selectionStart ?? content.length
      const end = editor?.selectionEnd ?? content.length
      const { nextContent, nextCursor } = applyNoteFormat(content, actionId, start, end)

      setMode('edit')
      setContent(nextContent)
      window.setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.setSelectionRange(nextCursor, nextCursor)
      }, 0)
    },
    [content],
  )

  const handlePickImage = useCallback(() => {
    setMode('edit')
    setImageImportError(null)
    imageInputRef.current?.click()
  }, [])

  const handleImageFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return

      if (!file.type.startsWith('image/')) {
        setImageImportError('请选择图片文件')
        return
      }
      if (file.size > MAX_NOTE_IMAGE_SIZE_BYTES) {
        setImageImportError('图片不能超过 5MB')
        return
      }

      try {
        setImageImportError(null)
        const dataUrl = await readFileAsDataUrl(file)
        const now = Date.now()
        const image: QuestionNoteImage = {
          id: createLocalNoteImageId(),
          questionId,
          name: file.name || 'local-image',
          mimeType: file.type || 'image/*',
          size: file.size,
          dataUrl,
          createdAt: now,
          updatedAt: now,
        }
        const saved = await putQuestionNoteImage(image)
        const editor = textareaRef.current
        const start = editor?.selectionStart ?? content.length
        const end = editor?.selectionEnd ?? content.length
        const markdown = `![${sanitizeImageAlt(file.name)}](${NOTE_IMAGE_SRC_PREFIX}${saved.id})`
        const { nextContent, nextCursor } = buildNoteInsertion(content, markdown, start, end)

        setNoteImages((prev) => ({ ...prev, [saved.id]: saved }))
        setMode('edit')
        setContent(nextContent)
        window.setTimeout(() => {
          textareaRef.current?.focus()
          textareaRef.current?.setSelectionRange(nextCursor, nextCursor)
        }, 0)
      } catch {
        setImageImportError('图片导入失败')
      }
    },
    [content, questionId],
  )

  const handleNoteKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        handleApplyFormat('bold')
      }
    },
    [handleApplyFormat],
  )

  const resolveNoteImageSrc = useCallback(
    (src: string) => {
      if (!src.startsWith(NOTE_IMAGE_SRC_PREFIX)) return undefined
      const id = src.slice(NOTE_IMAGE_SRC_PREFIX.length)
      return noteImages[id]?.dataUrl
    },
    [noteImages],
  )

  const noteLength = content.trim().length

  const statusText =
    saveStatus === 'saving'
      ? '保存中…'
      : saveStatus === 'saved'
        ? '已保存'
        : saveStatus === 'error'
          ? '保存失败'
          : updatedAt
            ? `最后编辑 ${formatReviewNoteTime(updatedAt)}`
            : '自动保存'

  return (
    <div
      className={embedded ? 'animate-fade-in' : 'card animate-fade-in'}
      style={{
        padding: embedded ? 0 : 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        height: embedded ? '100%' : undefined,
        minHeight: embedded ? '100%' : undefined,
        minWidth: 0,
        overflow: embedded ? (mode === 'preview' ? 'hidden' : 'auto') : undefined,
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'inline-flex',
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
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" />
              <path d="M8 7h6" />
              <path d="M8 11h8" />
            </svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>题目笔记</h2>
            <p
              style={{
                fontSize: 11,
                color: saveStatus === 'error' ? 'var(--danger)' : 'var(--text-3)',
                marginTop: 1,
              }}
            >
              {loading ? '加载中…' : statusText}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleModeChange(mode === 'edit' ? 'preview' : 'edit')}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            background: mode === 'edit' ? 'var(--primary)' : 'var(--surface-2)',
            color: mode === 'edit' ? 'white' : 'var(--text-2)',
            fontSize: 12,
            fontWeight: 500,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.55 : 1,
            flexShrink: 0,
          }}
          title={mode === 'edit' ? '完成编辑' : '编辑题目笔记'}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {mode === 'edit' ? (
              <polyline points="20 6 9 17 4 12" />
            ) : (
              <>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </>
            )}
          </svg>
          {mode === 'edit' ? '完成' : '编辑'}
        </button>
      </div>

      {mode === 'edit' ? (
        <>
          <div
            onFocusCapture={() => setEditorFocused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setEditorFocused(false)
              }
            }}
            style={{
              width: '100%',
              overflow: 'hidden',
              borderRadius: 10,
              border: `1px solid ${editorFocused ? 'var(--primary)' : 'var(--border-subtle)'}`,
              background: 'var(--surface-2)',
              boxShadow: editorFocused ? '0 0 0 3px var(--primary-light)' : 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          >
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              style={{ display: 'none' }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap',
                padding: '7px 8px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                {NOTE_FORMAT_ACTIONS.map((action) => (
                  <NoteToolbarButton
                    key={action.id}
                    label={action.label}
                    title={action.title}
                    disabled={loading}
                    onClick={() => handleApplyFormat(action.id)}
                  />
                ))}
                <NoteToolbarButton
                  label="img"
                  title="导入本地图片"
                  disabled={loading}
                  onClick={handlePickImage}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                {(speech.interimTranscript || speechError || imageImportError) && (
                  <span
                    title={speech.interimTranscript || speechError || imageImportError || undefined}
                    style={{
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 11,
                      color: speechError || imageImportError ? 'var(--danger)' : 'var(--primary)',
                    }}
                  >
                    {speech.interimTranscript
                      ? `正在识别：${speech.interimTranscript}`
                      : speechError || imageImportError}
                  </span>
                )}
                <SpeechInputButton
                  supported={speech.supported}
                  listening={speech.listening}
                  disabled={loading}
                  onToggle={speech.toggle}
                />
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleNoteKeyDown}
              disabled={loading}
              placeholder="记录自己的理解、易错点、面试表达、下次要追问的问题…"
              rows={6}
              style={{
                width: '100%',
                minHeight: embedded ? 'min(34dvh, 340px)' : 160,
                resize: 'vertical',
                padding: '12px 13px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text)',
                outline: 'none',
                fontSize: 16,
                lineHeight: 1.65,
                fontFamily: 'var(--font-sans)',
                flex: embedded ? '0 0 auto' : undefined,
                display: 'block',
              }}
            />
          </div>
          {content.trim() && (
            <div
              className="prose"
              style={{
                maxHeight: embedded ? 'min(24dvh, 260px)' : 220,
                overflowY: 'auto',
                padding: '8px 1px 2px',
                fontSize: 13,
                minWidth: 0,
              }}
            >
              <MarkdownRenderer content={content} resolveImageSrc={resolveNoteImageSrc} />
            </div>
          )}
        </>
      ) : content.trim() ? (
        <div
          className="prose"
          style={{
            flex: embedded ? '1 1 auto' : undefined,
            minHeight: embedded ? 0 : 160,
            overflowY: embedded ? 'auto' : undefined,
            padding: embedded ? '6px 8px 0 1px' : '6px 1px 0',
            fontSize: 13,
            minWidth: 0,
          }}
        >
          <MarkdownRenderer content={content} resolveImageSrc={resolveNoteImageSrc} />
        </div>
      ) : (
        <div
          style={{
            flex: embedded ? '1 1 auto' : undefined,
            minHeight: embedded ? 0 : 160,
            padding: '6px 1px 0',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-3)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            lineHeight: 1.65,
          }}
        >
          暂无笔记
        </div>
      )}

      {embedded && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            fontSize: 11,
            color: 'var(--text-3)',
            flexShrink: 0,
          }}
        >
          <span>{saveStatus === 'saving' ? '正在自动保存' : 'Markdown'}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {noteLength.toLocaleString()} 字
          </span>
        </div>
      )}
    </div>
  )
}

interface NoteDrawerProps {
  open: boolean
  onClose: () => void
  question: Question
  refreshKey: number
  onContentStateChange: (hasContent: boolean) => void
}

function NoteDrawer({
  open,
  onClose,
  question,
  refreshKey,
  onContentStateChange,
}: NoteDrawerProps) {
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => panelRef.current?.focus(), 0)
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

  if (!open) return null

  return (
    <>
      <button
        type="button"
        aria-label="关闭题目笔记"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 169,
          background: 'rgba(0,0,0,0.28)',
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
        className="note-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="题目笔记"
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 170,
          width: 'min(420px, 100vw)',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'drawer-slide-in 0.2s var(--ease-out) both',
          outline: 'none',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>题目笔记</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Kbd>N</Kbd>
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
              {question.question}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭题目笔记"
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
            flex: 1,
            minHeight: 0,
            overflowY: 'hidden',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <QuestionNotes
            questionId={question.id}
            refreshKey={refreshKey}
            embedded
            autoFocus
            onContentStateChange={onContentStateChange}
          />
        </div>
      </aside>
    </>
  )
}

type AnswerOverrideSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AnswerOverrideEditorProps {
  draft: string
  saveStatus: AnswerOverrideSaveStatus
  canSave: boolean
  onDraftChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  onRestoreDefault: () => void
}

function AnswerOverrideEditor({
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

interface AnswerOverrideHeaderMetaProps {
  updatedAt: number | null
  showingOriginal: boolean
  onToggleOriginal: () => void
}

function AnswerOverrideHeaderMeta({
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

type AnswerPanelView = 'answer' | 'check'

interface AnswerPanelTabsProps {
  activeView: AnswerPanelView
  answerLabel: string
  onChange: (view: AnswerPanelView) => void
}

function AnswerPanelTabs({ activeView, answerLabel, onChange }: AnswerPanelTabsProps) {
  const items: Array<{ view: AnswerPanelView; label: string }> = [
    { view: 'answer', label: answerLabel },
    { view: 'check', label: '测试一下' },
  ]

  return (
    <div
      role="tablist"
      aria-label="答案学习视图"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: 3,
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-2)',
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
              gap: 6,
              minHeight: 28,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid',
              borderColor: active ? 'rgba(var(--primary-rgb),0.22)' : 'transparent',
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--text-3)',
              fontSize: 12,
              fontWeight: active ? 700 : 600,
              cursor: 'pointer',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function AnswerAIButton({
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

// ─── Answer Annotations ──────────────────────────────────────────────────────

type AnswerSelectionDraft = {
  start: number
  end: number
  text: string
  top: number
  left: number
  placement: 'top' | 'bottom'
  toolbar: 'floating' | 'bottom'
}

const ANSWER_ANNOTATION_COLORS: AnswerAnnotationColor[] = ['yellow', 'green', 'blue', 'pink']

const ANSWER_ANNOTATION_HIGHLIGHT_NAMES: Record<AnswerAnnotationColor, string> = {
  yellow: 'iface-answer-annotation-yellow',
  green: 'iface-answer-annotation-green',
  blue: 'iface-answer-annotation-blue',
  pink: 'iface-answer-annotation-pink',
}

const ANSWER_COMMENT_DESKTOP_CLOSE_DELAY = 20
const ANSWER_COMMENT_MOBILE_SCROLL_CLOSE_DISTANCE = 28

function getAnswerAnnotationColor(color: AnswerAnnotationColor): {
  background: string
  dot: string
} {
  switch (color) {
    case 'green':
      return {
        background: 'rgba(16,185,129,0.14)',
        dot: '#10b981',
      }
    case 'blue':
      return {
        background: 'rgba(59,130,246,0.13)',
        dot: '#3b82f6',
      }
    case 'pink':
      return {
        background: 'rgba(236,72,153,0.13)',
        dot: '#ec4899',
      }
    default:
      return {
        background: 'rgba(245,158,11,0.16)',
        dot: '#f59e0b',
      }
  }
}

function answerAnnotationRangesOverlap(
  left: Pick<QuestionAnswerAnnotation, 'start' | 'end'>,
  right: Pick<QuestionAnswerAnnotation, 'start' | 'end'>,
): boolean {
  return left.start < right.end && right.start < left.end
}

function answerAnnotationRangesEqual(
  left: Pick<QuestionAnswerAnnotation, 'start' | 'end'>,
  right: Pick<QuestionAnswerAnnotation, 'start' | 'end'>,
): boolean {
  return left.start === right.start && left.end === right.end
}

function getAnswerAnnotationHighlightColor(
  annotation: QuestionAnswerAnnotation,
): AnswerAnnotationColor | null {
  if ('highlightColor' in annotation) return annotation.highlightColor ?? null
  return annotation.kind === 'highlight' ? annotation.color : null
}

function hasAnswerAnnotationNote(annotation: QuestionAnswerAnnotation): boolean {
  return annotation.note.trim().length > 0
}

function getNonOverlappingAnswerAnnotations(
  annotations: QuestionAnswerAnnotation[],
): QuestionAnswerAnnotation[] {
  const picked: QuestionAnswerAnnotation[] = []
  const newestFirst = [...annotations].sort(
    (left, right) =>
      right.updatedAt - left.updatedAt ||
      right.createdAt - left.createdAt ||
      right.id.localeCompare(left.id),
  )

  for (const annotation of newestFirst) {
    if (picked.some((item) => answerAnnotationRangesOverlap(item, annotation))) continue
    picked.push(annotation)
  }

  return picked.sort((left, right) => left.start - right.start || left.createdAt - right.createdAt)
}

function createAnswerAnnotationId(): string {
  const cryptoId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `answer-annotation-${Date.now()}-${cryptoId}`
}

function hashAnswerText(text: string): string {
  let hash = 5381
  for (let index = 0; index < text.length; index++) {
    hash = (hash * 33) ^ text.charCodeAt(index)
  }
  return (hash >>> 0).toString(36)
}

function getSelectionTextOffset(root: HTMLElement, node: Node, offset: number): number | null {
  const range = document.createRange()
  try {
    range.selectNodeContents(root)
    range.setEnd(node, offset)
    return range.toString().length
  } catch {
    return null
  } finally {
    range.detach()
  }
}

function getRangeBoundaryOffset(
  root: HTMLElement,
  range: Range,
  boundary: 'start' | 'end',
): number | null {
  return getSelectionTextOffset(
    root,
    boundary === 'start' ? range.startContainer : range.endContainer,
    boundary === 'start' ? range.startOffset : range.endOffset,
  )
}

function getRangeInsideRoot(root: HTMLElement, range: Range): Range | null {
  if (!range.intersectsNode(root)) return null

  const nextRange = range.cloneRange()

  try {
    if (!root.contains(nextRange.startContainer)) {
      nextRange.setStart(root, 0)
    }

    if (!root.contains(nextRange.endContainer)) {
      nextRange.setEnd(root, root.childNodes.length)
    }

    return nextRange
  } catch {
    nextRange.detach()
    return null
  }
}

function getSelectionToolbarRect(range: Range): DOMRect | null {
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 1 && rect.height > 1,
  )
  if (rects.length > 0) return rects[0]

  const rect = range.getBoundingClientRect()
  return rect.width > 1 && rect.height > 1 ? rect : null
}

function shouldUseBottomAnswerAnnotationToolbar(): boolean {
  return window.innerWidth <= 640 || window.matchMedia?.('(pointer: coarse)').matches === true
}

function getAnswerSelectionDraft(root: HTMLElement): AnswerSelectionDraft | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

  const sourceRange = selection.getRangeAt(0)
  const range = getRangeInsideRoot(root, sourceRange)
  if (!range) return null

  const rawStart = getRangeBoundaryOffset(root, range, 'start')
  const rawEnd = getRangeBoundaryOffset(root, range, 'end')
  if (rawStart === null || rawEnd === null || rawStart === rawEnd) return null

  const content = root.textContent ?? ''
  let start = Math.min(rawStart, rawEnd)
  let end = Math.max(rawStart, rawEnd)

  while (start < end && /\s/.test(content[start] ?? '')) start++
  while (end > start && /\s/.test(content[end - 1] ?? '')) end--

  const text = content.slice(start, end)
  if (!text.trim()) return null

  const rect = getSelectionToolbarRect(range)
  if (!rect) {
    range.detach()
    return null
  }

  const toolbarHalfWidth = Math.min(170, Math.max(96, window.innerWidth / 2 - 16))
  const left = Math.min(
    window.innerWidth - toolbarHalfWidth,
    Math.max(toolbarHalfWidth, rect.left + rect.width / 2),
  )
  const placement: AnswerSelectionDraft['placement'] = rect.top >= 64 ? 'top' : 'bottom'
  const top = placement === 'top' ? rect.top : rect.bottom
  const toolbar: AnswerSelectionDraft['toolbar'] = shouldUseBottomAnswerAnnotationToolbar()
    ? 'bottom'
    : 'floating'

  range.detach()
  return { start, end, text, top, left, placement, toolbar }
}

function createTextRange(root: HTMLElement, start: number, end: number): Range | null {
  const range = document.createRange()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let offset = 0
  let startSet = false
  let current = walker.nextNode()

  while (current) {
    const textLength = current.textContent?.length ?? 0
    const nextOffset = offset + textLength

    if (!startSet && start >= offset && start <= nextOffset) {
      range.setStart(current, Math.max(0, start - offset))
      startSet = true
    }

    if (startSet && end >= offset && end <= nextOffset) {
      range.setEnd(current, Math.max(0, end - offset))
      return range
    }

    offset = nextOffset
    current = walker.nextNode()
  }

  range.detach()
  return null
}

type AnswerCommentTargetRect = {
  left: number
  right: number
  top: number
  bottom: number
}

type AnswerCommentUnderlineRect = {
  left: number
  top: number
  width: number
}

type AnswerCommentTarget = {
  annotation: QuestionAnswerAnnotation
  rects: AnswerCommentTargetRect[]
  underlineRects: AnswerCommentUnderlineRect[]
  popoverLeft: number
  popoverTop: number
  popoverPlacement: 'top' | 'bottom'
}

function getAnswerCommentUnderlineRects(
  root: HTMLElement,
  annotation: QuestionAnswerAnnotation,
  rootRect: DOMRect,
): AnswerCommentUnderlineRect[] {
  const rects: AnswerCommentUnderlineRect[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let offset = 0
  let current = walker.nextNode()

  while (current) {
    const textLength = current.textContent?.length ?? 0
    const nextOffset = offset + textLength
    const start = Math.max(annotation.start, offset)
    const end = Math.min(annotation.end, nextOffset)

    if (start < end) {
      const range = document.createRange()
      try {
        range.setStart(current, start - offset)
        range.setEnd(current, end - offset)
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.width <= 1 || rect.height <= 1) continue
          rects.push({
            left: rect.left - rootRect.left + root.scrollLeft,
            top: rect.bottom - rootRect.top + root.scrollTop + 1,
            width: Math.max(0, rect.width),
          })
        }
      } finally {
        range.detach()
      }
    }

    offset = nextOffset
    if (offset >= annotation.end) break
    current = walker.nextNode()
  }

  return rects
}

function getAnswerCommentTarget(
  root: HTMLElement,
  annotation: QuestionAnswerAnnotation,
): AnswerCommentTarget | null {
  const range = createTextRange(root, annotation.start, annotation.end)
  if (!range) return null

  try {
    const rootRect = root.getBoundingClientRect()
    const rects = Array.from(range.getClientRects()).filter(
      (rect) => rect.width > 1 && rect.height > 1,
    )
    const rect = rects.at(-1) ?? range.getBoundingClientRect()
    if (rect.width <= 1 || rect.height <= 1) return null
    if (
      rect.bottom < 0 ||
      rect.top > window.innerHeight ||
      rect.right < 0 ||
      rect.left > window.innerWidth
    ) {
      return null
    }

    const popoverHalfWidth = Math.min(132, Math.max(120, window.innerWidth / 2 - 16))
    const popoverLeft = Math.min(
      window.innerWidth - popoverHalfWidth - 12,
      Math.max(popoverHalfWidth + 12, rect.right),
    )
    const popoverPlacement: AnswerCommentTarget['popoverPlacement'] =
      rect.top >= 118 ? 'top' : 'bottom'

    return {
      annotation,
      rects: rects.map((item) => ({
        left: item.left,
        right: item.right,
        top: item.top,
        bottom: item.bottom,
      })),
      underlineRects: getAnswerCommentUnderlineRects(root, annotation, rootRect),
      popoverLeft,
      popoverTop: popoverPlacement === 'top' ? rect.top : rect.bottom,
      popoverPlacement,
    }
  } finally {
    range.detach()
  }
}

function findAnswerCommentTargetAtPoint(
  targets: AnswerCommentTarget[],
  x: number,
  y: number,
): AnswerCommentTarget | null {
  for (const target of targets) {
    const matched = target.rects.some(
      (rect) =>
        x >= rect.left - 2 && x <= rect.right + 2 && y >= rect.top - 4 && y <= rect.bottom + 4,
    )
    if (matched) return target
  }
  return null
}

function applyAnswerAnnotationHighlights(
  root: HTMLElement,
  annotations: QuestionAnswerAnnotation[],
): () => void {
  const cssGlobal =
    'CSS' in window ? (CSS as unknown as { highlights?: HighlightRegistryLike }) : null
  const HighlightConstructor = (
    window as Window & {
      Highlight?: new (...ranges: Range[]) => unknown
    }
  ).Highlight

  if (!cssGlobal?.highlights || !HighlightConstructor) return () => {}

  const registry = cssGlobal.highlights
  for (const name of Object.values(ANSWER_ANNOTATION_HIGHLIGHT_NAMES)) {
    registry.delete(name)
  }

  const grouped = new Map<AnswerAnnotationColor, Range[]>()
  for (const annotation of annotations) {
    const range = createTextRange(root, annotation.start, annotation.end)
    if (!range) continue

    const highlightColor = getAnswerAnnotationHighlightColor(annotation)
    if (highlightColor) {
      const ranges = grouped.get(highlightColor) ?? []
      ranges.push(range.cloneRange())
      grouped.set(highlightColor, ranges)
    }

    range.detach()
  }

  for (const [color, ranges] of grouped.entries()) {
    if (ranges.length === 0) continue
    registry.set(ANSWER_ANNOTATION_HIGHLIGHT_NAMES[color], new HighlightConstructor(...ranges))
  }

  return () => {
    for (const name of Object.values(ANSWER_ANNOTATION_HIGHLIGHT_NAMES)) {
      registry.delete(name)
    }
  }
}

interface HighlightRegistryLike {
  set: (name: string, highlight: unknown) => void
  delete: (name: string) => void
}

function AnswerAnnotationToolbar({
  toolbarRef,
  selection,
  commentOpen,
  commentDraft,
  saving,
  onHighlight,
  onClearHighlight,
  onOpenComment,
  onCommentDraftChange,
  onSaveComment,
  onCancel,
}: {
  toolbarRef: React.RefObject<HTMLDivElement | null>
  selection: AnswerSelectionDraft
  commentOpen: boolean
  commentDraft: string
  saving: boolean
  onHighlight: (color: AnswerAnnotationColor) => void
  onClearHighlight: () => void
  onOpenComment: () => void
  onCommentDraftChange: (value: string) => void
  onSaveComment: () => void
  onCancel: () => void
}) {
  const commentInputRef = useRef<HTMLInputElement>(null)
  const isBottomToolbar = selection.toolbar === 'bottom'
  const toolbarButtonSize = isBottomToolbar ? 30 : 24

  useEffect(() => {
    if (!commentOpen) return
    const frame = window.requestAnimationFrame(() => commentInputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [commentOpen])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={toolbarRef}
      style={{
        position: 'fixed',
        top: isBottomToolbar ? 'auto' : selection.top,
        right: isBottomToolbar ? 12 : 'auto',
        bottom: isBottomToolbar ? 'max(12px, env(safe-area-inset-bottom))' : 'auto',
        left: isBottomToolbar ? 12 : selection.left,
        transform: isBottomToolbar
          ? 'none'
          : selection.placement === 'top'
            ? 'translate(-50%, calc(-100% - 8px))'
            : 'translate(-50%, 8px)',
        zIndex: 160,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: isBottomToolbar ? 6 : 4,
        borderRadius: isBottomToolbar ? 14 : 9,
        border: '1px solid rgba(var(--primary-rgb),0.08)',
        background: 'var(--surface-glass)',
        boxShadow: isBottomToolbar
          ? '0 12px 30px rgba(15,23,42,0.14)'
          : '0 6px 18px rgba(15,23,42,0.08)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        maxWidth: isBottomToolbar ? 'none' : 'min(360px, calc(100vw - 24px))',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isBottomToolbar ? 'center' : 'flex-start',
          gap: isBottomToolbar ? 6 : 2,
        }}
      >
        {ANSWER_ANNOTATION_COLORS.map((color) => {
          const colorStyle = getAnswerAnnotationColor(color)
          return (
            <button
              type="button"
              key={color}
              title="高亮"
              aria-label="高亮"
              disabled={saving}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onHighlight(color)}
              style={{
                height: toolbarButtonSize,
                width: toolbarButtonSize,
                borderRadius: 7,
                border: 'none',
                background: 'transparent',
                cursor: saving ? 'default' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: saving ? 0.6 : 1,
              }}
            >
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 99,
                  background: colorStyle.dot,
                  boxShadow: `0 0 0 3px ${colorStyle.background}`,
                }}
              />
            </button>
          )
        })}
        <button
          type="button"
          title="取消高亮"
          aria-label="取消高亮"
          disabled={saving}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClearHighlight}
          style={{
            height: toolbarButtonSize,
            width: toolbarButtonSize,
            borderRadius: 7,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-3)',
            cursor: saving ? 'default' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: saving ? 0.6 : 1,
          }}
        >
          <svg
            width={isBottomToolbar ? 16 : 14}
            height={isBottomToolbar ? 16 : 14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="7" />
            <path d="M5 19 19 5" />
          </svg>
        </button>
        <span
          style={{ width: 1, height: 16, background: 'var(--border-subtle)', margin: '0 3px' }}
        />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onOpenComment}
          disabled={saving}
          style={{
            height: toolbarButtonSize,
            padding: '0 8px',
            borderRadius: 7,
            border: 'none',
            background: commentOpen ? 'rgba(var(--primary-rgb),0.08)' : 'transparent',
            color: commentOpen ? 'var(--primary)' : 'var(--text-2)',
            fontSize: 11,
            fontWeight: 500,
            cursor: saving ? 'default' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          批注
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onCancel}
          title="关闭"
          aria-label="关闭"
          style={{
            width: toolbarButtonSize,
            height: toolbarButtonSize,
            borderRadius: 7,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-3)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isBottomToolbar ? 18 : 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {commentOpen && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minWidth: isBottomToolbar ? 0 : 240,
          }}
        >
          <input
            ref={commentInputRef}
            value={commentDraft}
            onChange={(event) => onCommentDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSaveComment()
              if (event.key === 'Escape') onCancel()
            }}
            placeholder="写批注…"
            style={{
              flex: 1,
              minWidth: 0,
              height: isBottomToolbar ? 34 : 28,
              border: '1px solid var(--border-subtle)',
              borderRadius: 7,
              background: 'transparent',
              color: 'var(--text)',
              fontSize: isBottomToolbar ? 16 : 12,
              outline: 'none',
              padding: '0 9px',
            }}
          />
          <button
            type="button"
            onClick={onSaveComment}
            disabled={saving || !commentDraft.trim()}
            style={{
              height: 28,
              padding: '0 9px',
              borderRadius: 7,
              border: 'none',
              background: commentDraft.trim() ? 'var(--primary)' : 'var(--surface-3)',
              color: commentDraft.trim() ? 'white' : 'var(--text-3)',
              fontSize: 12,
              fontWeight: 600,
              cursor: commentDraft.trim() && !saving ? 'pointer' : 'default',
            }}
          >
            保存
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}

function AnswerCommentMarkers({
  rootRef,
  annotations,
  activeId,
  onActiveChange,
  onDelete,
}: {
  rootRef: React.RefObject<HTMLDivElement | null>
  annotations: QuestionAnswerAnnotation[]
  activeId: string | null
  onActiveChange: (id: string | null) => void
  onDelete: (id: string) => void
}) {
  const layerRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const [targets, setTargets] = useState<AnswerCommentTarget[]>([])

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current === null) return
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }, [])

  const scheduleClose = useCallback(
    (delay = ANSWER_COMMENT_DESKTOP_CLOSE_DELAY) => {
      cancelClose()
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null
        onActiveChange(null)
      }, delay)
    },
    [cancelClose, onActiveChange],
  )

  const updateMarkers = useCallback(() => {
    const root = rootRef.current
    if (!root) {
      setTargets([])
      return
    }

    setTargets(
      annotations
        .filter(hasAnswerAnnotationNote)
        .map((annotation) => getAnswerCommentTarget(root, annotation))
        .filter((target): target is AnswerCommentTarget => Boolean(target)),
    )
  }, [annotations, rootRef])

  useLayoutEffect(() => {
    updateMarkers()

    let frame: number | null = null
    const scheduleUpdate = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        updateMarkers()
      })
    }

    const root = rootRef.current
    const observer =
      root && typeof MutationObserver !== 'undefined' ? new MutationObserver(scheduleUpdate) : null
    observer?.observe(root as HTMLElement, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('scroll', scheduleUpdate, true)
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('scroll', scheduleUpdate, true)
    }
  }, [rootRef, updateMarkers])

  useEffect(() => {
    if (targets.length === 0) return

    const handleMouseMove = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Node && layerRef.current?.contains(target)) {
        cancelClose()
        return
      }
      if (window.matchMedia?.('(pointer: coarse)').matches === true) return

      const matchedTarget = findAnswerCommentTargetAtPoint(targets, event.clientX, event.clientY)
      if (matchedTarget) {
        cancelClose()
        onActiveChange(matchedTarget.annotation.id)
      } else if (activeId) {
        scheduleClose()
      }
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Node && layerRef.current?.contains(target)) return

      const matchedTarget = findAnswerCommentTargetAtPoint(targets, event.clientX, event.clientY)
      if (matchedTarget) {
        event.preventDefault()
        cancelClose()
        onActiveChange(
          activeId === matchedTarget.annotation.id ? null : matchedTarget.annotation.id,
        )
        return
      }

      if (activeId) onActiveChange(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick)
    return () => {
      cancelClose()
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick)
    }
  }, [activeId, cancelClose, onActiveChange, scheduleClose, targets])

  useEffect(() => {
    if (!activeId || !shouldUseBottomAnswerAnnotationToolbar()) return

    const startY = window.scrollY
    const handleScroll = () => {
      if (Math.abs(window.scrollY - startY) < ANSWER_COMMENT_MOBILE_SCROLL_CLOSE_DISTANCE) return
      onActiveChange(null)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [activeId, onActiveChange])

  const activeTarget = targets.find((target) => target.annotation.id === activeId)
  const root = rootRef.current
  if (typeof document === 'undefined' || !root || targets.length === 0) return null

  return (
    <>
      {createPortal(
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          {targets.flatMap((target) =>
            target.underlineRects.map((rect, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: rects are derived from transient layout boxes.
                key={`${target.annotation.id}-${index}`}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: 0,
                  borderBottom: '1.5px dotted rgba(37, 99, 235, 0.82)',
                  pointerEvents: 'none',
                }}
              />
            )),
          )}
        </span>,
        root,
      )}

      {activeTarget &&
        createPortal(
          <div
            ref={layerRef}
            onMouseEnter={cancelClose}
            onMouseLeave={() => scheduleClose()}
            style={{
              position: 'fixed',
              left: activeTarget.popoverLeft,
              top: activeTarget.popoverTop,
              transform:
                activeTarget.popoverPlacement === 'top'
                  ? 'translate(-50%, calc(-100% - 10px))'
                  : 'translate(-50%, 10px)',
              zIndex: 155,
              width: 'min(264px, calc(100vw - 24px))',
              padding: 10,
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface)',
              boxShadow: '0 10px 28px rgba(15,23,42,0.12)',
            }}
            role="dialog"
            aria-label="答案批注"
          >
            <p
              style={{
                fontSize: 12,
                lineHeight: 1.6,
                color: 'var(--text)',
                wordBreak: 'break-word',
              }}
            >
              {activeTarget.annotation.note}
            </p>
            <div
              style={{
                marginTop: 8,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 6,
              }}
            >
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onDelete(activeTarget.annotation.id)}
                style={{
                  height: 24,
                  padding: '0 8px',
                  borderRadius: 7,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-3)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                删除批注
              </button>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onActiveChange(null)}
                style={{
                  height: 24,
                  padding: '0 8px',
                  borderRadius: 7,
                  border: 'none',
                  background: 'var(--surface-2)',
                  color: 'var(--text-2)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                收起
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
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
  initialPrompt?: { id: string; questionId: string; text: string } | null
  onInitialPromptConsumed?: (id: string) => void
}

function AIDrawer({
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuestionDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const { question, loading } = useQuestion(id)
  const { allQuestions } = useQuestions()
  const { records, getStatus, setStatus, getRecord, studyMode, streak, incrementStreak } =
    useStudyStore()
  const { config: aiConfig } = useAIStore()

  const [answerVisible, setAnswerVisible] = useState(false)
  const [marking, setMarking] = useState(false)
  const [justMarked, setJustMarked] = useState<StudyStatus | null>(null)
  const [lastPressedKey, setLastPressedKey] = useState<'1' | '2' | '3' | null>(null)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [aiInitialPrompt, setAiInitialPrompt] = useState<{
    id: string
    questionId: string
    text: string
  } | null>(null)
  const [answerPanelView, setAnswerPanelView] = useState<AnswerPanelView>('answer')
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false)
  const [hasNote, setHasNote] = useState(false)
  const [answerOverride, setAnswerOverride] = useState<QuestionAnswerOverride | null>(null)
  const [answerOverrideLoading, setAnswerOverrideLoading] = useState(false)
  const [answerEditMode, setAnswerEditMode] = useState(false)
  const [answerDraft, setAnswerDraft] = useState('')
  const [answerSaveStatus, setAnswerSaveStatus] = useState<AnswerOverrideSaveStatus>('idle')
  const [showOriginalAnswer, setShowOriginalAnswer] = useState(false)
  const [answerAnnotations, setAnswerAnnotations] = useState<QuestionAnswerAnnotation[]>([])
  const [answerSelection, setAnswerSelection] = useState<AnswerSelectionDraft | null>(null)
  const [answerCommentOpen, setAnswerCommentOpen] = useState(false)
  const [answerCommentDraft, setAnswerCommentDraft] = useState('')
  const [activeAnswerCommentId, setActiveAnswerCommentId] = useState<string | null>(null)
  const [answerAnnotationSaving, setAnswerAnnotationSaving] = useState(false)
  const [starred, setStarred] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [celebrationStreak, setCelebrationStreak] = useState(0)
  const [sessionFinished, setSessionFinished] = useState(false)
  const [noteRefreshKey, setNoteRefreshKey] = useState(0)
  const [learningChecks, setLearningChecks] = useState<LearningCheckQuestion[]>([])
  const answerRef = useRef<HTMLDivElement>(null)
  const answerContentRef = useRef<HTMLDivElement>(null)
  const answerAnnotationToolbarRef = useRef<HTMLDivElement>(null)
  const answerSelectionTimerRef = useRef<number | null>(null)
  const answerSelectingRef = useRef(false)
  const markingRef = useRef(false)

  // Session context (from ?ids=... or a larger ?session=... stored in sessionStorage)
  const sessionKey = searchParams.get('session')
  const inlineSessionIds = useMemo(
    () => searchParams.get('ids')?.split(',').filter(Boolean) ?? [],
    [searchParams],
  )
  const [storedSessionIds, setStoredSessionIds] = useState<string[]>(() =>
    readPracticeSession(sessionKey),
  )

  const openAIWithPreset = useCallback(
    (preset: 'question' | 'concept') => {
      if (!question) return

      const text =
        preset === 'question'
          ? '请围绕这道题做一次面试题讲解：先拆解题目在问什么，再指出考察点，最后给出适合口述的答题思路。'
          : '请讲解这道题背后的核心知识点：按知识框架、关键机制、常见误区和面试延展来组织。'

      setAiInitialPrompt({
        id: `${preset}-${question.id}-${Date.now()}`,
        questionId: question.id,
        text,
      })
      setAiDrawerOpen(true)
    },
    [question],
  )

  const handleAIInitialPromptConsumed = useCallback((promptId: string) => {
    setAiInitialPrompt((current) => (current?.id === promptId ? null : current))
  }, [])

  useEffect(() => {
    setStoredSessionIds(readPracticeSession(sessionKey))
  }, [sessionKey])

  const sessionIds = inlineSessionIds.length > 0 ? inlineSessionIds : storedSessionIds
  const isInSession = sessionIds.length > 0
  const sessionIndex = isInSession ? sessionIds.indexOf(id ?? '') : -1
  const sessionSearch = sessionKey
    ? `?session=${sessionKey}`
    : sessionIds.length > 0
      ? `?ids=${sessionIds.join(',')}`
      : ''
  const sessionIdentity = sessionKey
    ? `session:${sessionKey}`
    : inlineSessionIds.length > 0
      ? `ids:${inlineSessionIds.join(',')}`
      : 'browse'

  const hasLearningCheck = learningChecks.length > 0

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

  const prevId = isInSession
    ? sessionIndex > 0
      ? sessionIds[sessionIndex - 1]
      : null
    : (searchParams.get('prev') ?? prevIdByList)
  const nextId = isInSession
    ? sessionIndex >= 0 && sessionIndex < sessionIds.length - 1
      ? sessionIds[sessionIndex + 1]
      : null
    : (searchParams.get('next') ?? nextIdByList)
  const sessionCurrent = sessionIndex + 1
  const sessionTotal = sessionIds.length

  const sessionStats = useMemo(() => {
    const counts = { mastered: 0, review: 0, unlearned: 0 }
    const retryIds: string[] = []

    for (const qid of sessionIds) {
      const status = records[qid]?.status ?? 'unlearned'
      counts[status]++
      if (status !== 'mastered') retryIds.push(qid)
    }

    return {
      ...counts,
      total: sessionIds.length,
      retryIds,
    }
  }, [records, sessionIds])

  const relatedPracticeItems = useMemo(() => {
    if (!question || allQuestions.length === 0) return []

    const currentTags = new Set(question.tags.map((tag) => tag.toLowerCase()))
    const statusRank: Record<StudyStatus, number> = {
      review: 2,
      unlearned: 1,
      mastered: 0,
    }

    return allQuestions
      .filter((candidate) => candidate.id !== question.id)
      .map((candidate) => {
        const matchedTags = candidate.tags.filter((tag) => currentTags.has(tag.toLowerCase()))
        const status = records[candidate.id]?.status ?? 'unlearned'
        const sameModule = candidate.module === question.module
        const sameDifficulty = candidate.difficulty === question.difficulty
        const score =
          matchedTags.length * 8 +
          (sameModule ? 5 : 0) +
          (sameDifficulty ? 2 : 0) +
          statusRank[status] * 3

        return {
          question: candidate,
          status,
          matchedTags,
          score,
        }
      })
      .filter((item) => item.score >= 5)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        if (statusRank[b.status] !== statusRank[a.status]) {
          return statusRank[b.status] - statusRank[a.status]
        }
        return a.question.id.localeCompare(b.question.id)
      })
      .slice(0, 5)
  }, [allQuestions, question, records])

  const hasCustomAnswer = Boolean(question && answerOverride?.content.trim())
  const effectiveAnswerText = question
    ? hasCustomAnswer
      ? (answerOverride?.content ?? '')
      : question.answer
    : ''
  const displayedAnswerText =
    question && hasCustomAnswer && showOriginalAnswer ? question.answer : effectiveAnswerText
  const displayedAnswerHash = hashAnswerText(displayedAnswerText)
  const answerAnnotationsForDisplayedAnswer = useMemo(
    () => answerAnnotations.filter((annotation) => annotation.answerHash === displayedAnswerHash),
    [answerAnnotations, displayedAnswerHash],
  )
  const visibleAnswerAnnotations = useMemo(
    () => getNonOverlappingAnswerAnnotations(answerAnnotationsForDisplayedAnswer),
    [answerAnnotationsForDisplayedAnswer],
  )

  const shouldAutoRevealAnswer = studyMode === 'memory-only'

  // Reset when the question or practice session changes. A retry session can
  // legitimately restart from the same question id with a new session key.
  // biome-ignore lint/correctness/useExhaustiveDependencies: sessionIdentity intentionally resets state when the same question restarts in a new practice session.
  useEffect(() => {
    markingRef.current = false
    setMarking(false)
    setAnswerVisible(shouldAutoRevealAnswer)
    setJustMarked(null)
    setLastPressedKey(null)
    setAiInitialPrompt(null)
    setAnswerPanelView('answer')
    setSessionFinished(false)
    setNoteDrawerOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
    // Clear per-question session review guard so the new question starts fresh
    return () => {
      if (id) clearSessionReview(id)
    }
  }, [id, sessionIdentity, shouldAutoRevealAnswer])

  useEffect(() => {
    let cancelled = false
    setLearningChecks([])

    if (!question) return

    loadLearningChecksForQuestion(question)
      .then((checks) => {
        if (!cancelled) setLearningChecks(checks)
      })
      .catch(() => {
        if (!cancelled) setLearningChecks([])
      })

    return () => {
      cancelled = true
    }
  }, [question])

  useEffect(() => {
    if (!hasLearningCheck && answerPanelView === 'check') {
      setAnswerPanelView('answer')
    }
  }, [answerPanelView, hasLearningCheck])

  useEffect(() => {
    if (searchParams.get('note') !== '1') return
    setNoteDrawerOpen(true)

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('note')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setHasNote(false)
      return
    }

    getQuestionNote(id)
      .then((note) => {
        if (!cancelled) setHasNote(Boolean(note?.content.trim()))
      })
      .catch(() => {
        if (!cancelled) setHasNote(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setAnswerOverride(null)
      setAnswerOverrideLoading(false)
      setAnswerEditMode(false)
      setAnswerDraft('')
      setAnswerSaveStatus('idle')
      setShowOriginalAnswer(false)
      return
    }

    setAnswerOverrideLoading(true)
    setAnswerEditMode(false)
    setAnswerSaveStatus('idle')
    setShowOriginalAnswer(false)

    getQuestionAnswerOverride(id)
      .then((override) => {
        if (cancelled) return
        setAnswerOverride(override?.content.trim() ? override : null)
        setAnswerDraft(override?.content ?? question?.answer ?? '')
      })
      .catch(() => {
        if (cancelled) return
        setAnswerOverride(null)
        setAnswerDraft(question?.answer ?? '')
      })
      .finally(() => {
        if (!cancelled) setAnswerOverrideLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, question?.answer])

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setAnswerAnnotations([])
      return
    }

    getQuestionAnswerAnnotations(id)
      .then((annotations) => {
        if (!cancelled) setAnswerAnnotations(annotations)
      })
      .catch(() => {
        if (!cancelled) setAnswerAnnotations([])
      })

    return () => {
      cancelled = true
    }
  }, [id])

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset draft UI when answer view or answer identity changes.
  useEffect(() => {
    setAnswerSelection(null)
    setAnswerCommentOpen(false)
    setAnswerCommentDraft('')
    setActiveAnswerCommentId(null)
  }, [answerEditMode, answerPanelView, answerVisible, displayedAnswerHash])

  useEffect(() => {
    if (!activeAnswerCommentId) return
    const commentStillVisible = visibleAnswerAnnotations.some(
      (annotation) =>
        annotation.id === activeAnswerCommentId && hasAnswerAnnotationNote(annotation),
    )
    if (!commentStillVisible) setActiveAnswerCommentId(null)
  }, [activeAnswerCommentId, visibleAnswerAnnotations])

  useEffect(() => {
    if (!answerVisible || answerPanelView !== 'answer' || answerEditMode || answerOverrideLoading) {
      return
    }
    const root = answerContentRef.current
    if (!root) return

    let cleanupHighlights: (() => void) | null = null
    let frame: number | null = null

    const applyHighlights = () => {
      cleanupHighlights?.()
      cleanupHighlights = applyAnswerAnnotationHighlights(root, visibleAnswerAnnotations)
    }

    const scheduleApply = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        applyHighlights()
      })
    }

    scheduleApply()

    const observer =
      typeof MutationObserver !== 'undefined' ? new MutationObserver(scheduleApply) : null
    observer?.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      observer?.disconnect()
      cleanupHighlights?.()
    }
  }, [
    answerEditMode,
    answerOverrideLoading,
    answerPanelView,
    answerVisible,
    visibleAnswerAnnotations,
  ])

  useEffect(() => {
    if (!answerSelection) return

    const handler = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (answerAnnotationToolbarRef.current?.contains(target)) return
      if (answerContentRef.current?.contains(target)) return
      setAnswerSelection(null)
      setAnswerCommentOpen(false)
      setAnswerCommentDraft('')
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [answerSelection])

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setStarred(false)
      return
    }

    getQuestionFlag(id)
      .then((flag) => {
        if (!cancelled) setStarred(Boolean(flag?.starred))
      })
      .catch(() => {
        if (!cancelled) setStarred(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const currentStatus = id ? getStatus(id) : 'unlearned'
  const record = id ? getRecord(id) : undefined
  const reviewCount = record?.reviewCount ?? 0

  const handleSetStatus = useCallback(
    async (status: StudyStatus, key?: '1' | '2' | '3') => {
      if (!id || markingRef.current) return
      markingRef.current = true
      setMarking(true)
      setJustMarked(status)
      if (key) setLastPressedKey(key)

      try {
        await setStatus(id, status)

        // Increment streak and trigger celebration if milestone hit
        incrementStreak()
        const newStreak = streak.currentStreak + 1
        const milestones = [3, 5, 10, 20, 50]
        if (milestones.includes(newStreak)) {
          setCelebrationStreak(newStreak)
        }

        if (isInSession && nextId) {
          setTimeout(() => {
            navigate(`/questions/${nextId}${sessionSearch}`)
          }, 600)
        } else if (isInSession) {
          setSessionFinished(true)
        }
      } finally {
        markingRef.current = false
        setMarking(false)
      }
    },
    [
      id,
      setStatus,
      isInSession,
      nextId,
      navigate,
      sessionSearch,
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
      navigate(`/questions/${targetId}${sessionSearch}`)
    },
    [navigate, sessionSearch],
  )

  const handleRetrySession = useCallback(() => {
    if (sessionStats.retryIds.length === 0) return
    for (const retryId of sessionStats.retryIds) {
      clearSessionReview(retryId)
    }
    markingRef.current = false
    setMarking(false)
    setAnswerVisible(shouldAutoRevealAnswer)
    setJustMarked(null)
    setLastPressedKey(null)
    setAiInitialPrompt(null)
    setSessionFinished(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
    navigate(createPracticeSessionPath(sessionStats.retryIds[0], sessionStats.retryIds))
  }, [navigate, sessionStats.retryIds, shouldAutoRevealAnswer])

  const handleStartRelatedPractice = useCallback(() => {
    const ids = relatedPracticeItems.map((item) => item.question.id)
    if (ids.length === 0) return
    navigate(createPracticeSessionPath(ids[0], ids))
  }, [navigate, relatedPracticeItems])

  const handleNoteSaved = useCallback(() => {
    setHasNote(true)
    setNoteRefreshKey((value) => value + 1)
  }, [])

  const handleToggleStarred = useCallback(async () => {
    if (!id) return
    const next = !starred
    setStarred(next)
    try {
      await setQuestionStarred(id, next)
    } catch {
      setStarred(!next)
    }
  }, [id, starred])

  const refreshAnswerSelection = useCallback(() => {
    if (!answerVisible || answerPanelView !== 'answer' || answerEditMode || answerOverrideLoading) {
      return
    }
    if (answerCommentOpen || answerAnnotationSaving) return
    const root = answerContentRef.current
    if (!root) return

    const draft = getAnswerSelectionDraft(root)
    if (!draft) {
      setAnswerSelection(null)
      setAnswerCommentOpen(false)
      setAnswerCommentDraft('')
      return
    }

    setAnswerSelection(draft)
    setActiveAnswerCommentId(null)
    setAnswerCommentOpen(false)
    setAnswerCommentDraft('')
  }, [
    answerAnnotationSaving,
    answerCommentOpen,
    answerEditMode,
    answerOverrideLoading,
    answerPanelView,
    answerVisible,
  ])

  const scheduleAnswerSelectionRefresh = useCallback(
    (delay = 180) => {
      if (answerSelectionTimerRef.current !== null) {
        window.clearTimeout(answerSelectionTimerRef.current)
      }

      answerSelectionTimerRef.current = window.setTimeout(() => {
        answerSelectionTimerRef.current = null
        if (!answerSelectingRef.current) refreshAnswerSelection()
      }, delay)
    },
    [refreshAnswerSelection],
  )

  const handleCreateAnswerAnnotation = useCallback(
    async (kind: QuestionAnswerAnnotation['kind'], color: AnswerAnnotationColor, note = '') => {
      if (!question || !answerSelection || answerAnnotationSaving) return

      setAnswerAnnotationSaving(true)
      try {
        const now = Date.now()
        const overlappingAnnotations = answerAnnotationsForDisplayedAnswer.filter((annotation) =>
          answerAnnotationRangesOverlap(annotation, answerSelection),
        )
        const exactAnnotation = overlappingAnnotations.find((annotation) =>
          answerAnnotationRangesEqual(annotation, answerSelection),
        )
        const replacedAnnotations = overlappingAnnotations.filter(
          (annotation) => annotation.id !== exactAnnotation?.id,
        )
        const replacedIds = new Set(replacedAnnotations.map((annotation) => annotation.id))
        const nextNote = kind === 'comment' ? note.trim() : (exactAnnotation?.note.trim() ?? '')
        const nextHighlightColor =
          kind === 'highlight'
            ? color
            : exactAnnotation
              ? getAnswerAnnotationHighlightColor(exactAnnotation)
              : null
        const annotation = await putQuestionAnswerAnnotation({
          id: exactAnnotation?.id ?? createAnswerAnnotationId(),
          questionId: question.id,
          answerHash: displayedAnswerHash,
          kind: nextNote ? 'comment' : 'highlight',
          color: nextHighlightColor ?? color,
          highlightColor: nextHighlightColor,
          start: answerSelection.start,
          end: answerSelection.end,
          selectedText: answerSelection.text,
          note: nextNote,
          createdAt: exactAnnotation?.createdAt ?? now,
          updatedAt: now,
        })
        if (replacedAnnotations.length > 0) {
          await Promise.all(
            replacedAnnotations.map((item) => deleteQuestionAnswerAnnotation(item.id)),
          ).catch(() => undefined)
        }
        setAnswerAnnotations((current) => [
          annotation,
          ...current.filter((item) => item.id !== annotation.id && !replacedIds.has(item.id)),
        ])
        window.getSelection()?.removeAllRanges()
        setActiveAnswerCommentId(nextNote ? annotation.id : null)
        setAnswerSelection(null)
        setAnswerCommentOpen(false)
        setAnswerCommentDraft('')
      } finally {
        setAnswerAnnotationSaving(false)
      }
    },
    [
      answerAnnotationSaving,
      answerAnnotationsForDisplayedAnswer,
      answerSelection,
      displayedAnswerHash,
      question,
    ],
  )

  const handleSaveAnswerComment = useCallback(() => {
    if (!answerCommentDraft.trim()) return
    handleCreateAnswerAnnotation('comment', 'blue', answerCommentDraft)
  }, [answerCommentDraft, handleCreateAnswerAnnotation])

  const handleClearAnswerHighlight = useCallback(async () => {
    if (!answerSelection || answerAnnotationSaving) return

    const highlightedAnnotations = answerAnnotationsForDisplayedAnswer.filter(
      (annotation) =>
        answerAnnotationRangesOverlap(annotation, answerSelection) &&
        getAnswerAnnotationHighlightColor(annotation),
    )
    if (highlightedAnnotations.length === 0) {
      setAnswerSelection(null)
      window.getSelection()?.removeAllRanges()
      return
    }

    setAnswerAnnotationSaving(true)
    try {
      const now = Date.now()
      const deletedIds = new Set<string>()
      const updatedAnnotations: QuestionAnswerAnnotation[] = []

      for (const annotation of highlightedAnnotations) {
        if (hasAnswerAnnotationNote(annotation)) {
          const saved = await putQuestionAnswerAnnotation({
            ...annotation,
            kind: 'comment',
            highlightColor: null,
            updatedAt: now,
          })
          updatedAnnotations.push(saved)
        } else {
          await deleteQuestionAnswerAnnotation(annotation.id)
          deletedIds.add(annotation.id)
        }
      }

      setAnswerAnnotations((current) =>
        current
          .filter((item) => !deletedIds.has(item.id))
          .map((item) => updatedAnnotations.find((updated) => updated.id === item.id) ?? item),
      )
      setActiveAnswerCommentId((current) => (current && deletedIds.has(current) ? null : current))
      setAnswerSelection(null)
      setAnswerCommentOpen(false)
      setAnswerCommentDraft('')
      window.getSelection()?.removeAllRanges()
    } catch {
      getQuestionAnswerAnnotations(id ?? '')
        .then(setAnswerAnnotations)
        .catch(() => {})
    } finally {
      setAnswerAnnotationSaving(false)
    }
  }, [answerAnnotationSaving, answerAnnotationsForDisplayedAnswer, answerSelection, id])

  const handleCancelAnswerAnnotation = useCallback(() => {
    setAnswerSelection(null)
    setAnswerCommentOpen(false)
    setAnswerCommentDraft('')
    window.getSelection()?.removeAllRanges()
  }, [])

  const handleDeleteAnswerAnnotation = useCallback(
    async (annotationId: string) => {
      setActiveAnswerCommentId((current) => (current === annotationId ? null : current))
      setAnswerAnnotations((current) => current.filter((item) => item.id !== annotationId))
      try {
        await deleteQuestionAnswerAnnotation(annotationId)
      } catch {
        getQuestionAnswerAnnotations(id ?? '')
          .then(setAnswerAnnotations)
          .catch(() => {})
      }
    },
    [id],
  )

  const handleDeleteAnswerComment = useCallback(
    async (annotationId: string) => {
      const annotation = answerAnnotations.find((item) => item.id === annotationId)
      if (!annotation) return

      const highlightColor = getAnswerAnnotationHighlightColor(annotation)
      setActiveAnswerCommentId((current) => (current === annotationId ? null : current))

      if (!highlightColor) {
        handleDeleteAnswerAnnotation(annotationId)
        return
      }

      const nextAnnotation: QuestionAnswerAnnotation = {
        ...annotation,
        kind: 'highlight',
        color: highlightColor,
        highlightColor,
        note: '',
        updatedAt: Date.now(),
      }

      setAnswerAnnotations((current) =>
        current.map((item) => (item.id === annotationId ? nextAnnotation : item)),
      )
      try {
        const saved = await putQuestionAnswerAnnotation(nextAnnotation)
        setAnswerAnnotations((current) =>
          current.map((item) => (item.id === annotationId ? saved : item)),
        )
      } catch {
        getQuestionAnswerAnnotations(id ?? '')
          .then(setAnswerAnnotations)
          .catch(() => {})
      }
    },
    [answerAnnotations, handleDeleteAnswerAnnotation, id],
  )

  useEffect(() => {
    if (!answerVisible || answerPanelView !== 'answer' || answerEditMode || answerOverrideLoading) {
      return
    }

    const clearScheduledRefresh = () => {
      if (answerSelectionTimerRef.current === null) return
      window.clearTimeout(answerSelectionTimerRef.current)
      answerSelectionTimerRef.current = null
    }

    const handleSelectStart = (event: MouseEvent | TouchEvent) => {
      const target = event.target
      if (target instanceof Node && answerAnnotationToolbarRef.current?.contains(target)) return
      answerSelectingRef.current = true
      clearScheduledRefresh()
    }

    const handleSelectEnd = () => {
      answerSelectingRef.current = false
      scheduleAnswerSelectionRefresh(140)
    }

    const handleSelectionChange = () => {
      scheduleAnswerSelectionRefresh(220)
    }

    document.addEventListener('mousedown', handleSelectStart)
    document.addEventListener('touchstart', handleSelectStart)
    document.addEventListener('selectionchange', handleSelectionChange)
    document.addEventListener('mouseup', handleSelectEnd)
    document.addEventListener('touchend', handleSelectEnd)
    document.addEventListener('keyup', handleSelectEnd)
    return () => {
      clearScheduledRefresh()
      answerSelectingRef.current = false
      document.removeEventListener('mousedown', handleSelectStart)
      document.removeEventListener('touchstart', handleSelectStart)
      document.removeEventListener('selectionchange', handleSelectionChange)
      document.removeEventListener('mouseup', handleSelectEnd)
      document.removeEventListener('touchend', handleSelectEnd)
      document.removeEventListener('keyup', handleSelectEnd)
    }
  }, [
    answerEditMode,
    answerOverrideLoading,
    answerPanelView,
    answerVisible,
    scheduleAnswerSelectionRefresh,
  ])

  const showSessionSummary =
    isInSession && !nextId && answerVisible && (sessionFinished || currentStatus !== 'unlearned')
  const showRelatedPractice =
    answerVisible && relatedPracticeItems.length > 0 && (!isInSession || showSessionSummary)

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (isEditableTarget(e.target)) return
      if (settingsOpen || aiDrawerOpen) return
      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setNoteDrawerOpen((open) => !open)
        return
      }
      if (!noteDrawerOpen && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setAiDrawerOpen(true)
        return
      }
      if (noteDrawerOpen) return
      if (answerPanelView === 'check') return
      if (markingRef.current) return

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
  }, [
    answerVisible,
    handleRevealAnswer,
    handleSetStatus,
    navigateTo,
    nextId,
    prevId,
    aiDrawerOpen,
    answerPanelView,
    noteDrawerOpen,
    settingsOpen,
  ])

  const handleStartAnswerEdit = useCallback(() => {
    if (!question) return
    setAnswerPanelView('answer')
    setAnswerDraft(answerOverride?.content ?? question.answer)
    setAnswerEditMode(true)
    setAnswerSaveStatus('idle')
    setShowOriginalAnswer(false)
  }, [answerOverride, question])

  const handleCancelAnswerEdit = useCallback(() => {
    setAnswerDraft(answerOverride?.content ?? question?.answer ?? '')
    setAnswerEditMode(false)
    setAnswerSaveStatus('idle')
  }, [answerOverride, question?.answer])

  const handleRestoreDefaultAnswer = useCallback(async () => {
    if (!question || answerSaveStatus === 'saving') return
    if (answerOverride?.content.trim()) {
      const confirmed = window.confirm('确定恢复默认参考答案吗？当前自定义答案会被删除。')
      if (!confirmed) return
    }

    setAnswerSaveStatus('saving')
    try {
      await deleteQuestionAnswerOverride(question.id)
      setAnswerOverride(null)
      setAnswerDraft(question.answer)
      setShowOriginalAnswer(false)
      setAnswerEditMode(false)
      setAnswerSaveStatus('saved')
      window.setTimeout(() => setAnswerSaveStatus('idle'), 1400)
    } catch {
      setAnswerSaveStatus('error')
    }
  }, [answerOverride?.content, answerSaveStatus, question])

  const handleSaveAnswerOverride = useCallback(async () => {
    if (!question || answerSaveStatus === 'saving') return
    const nextContent = answerDraft.trim()
    if (!nextContent) return

    setAnswerSaveStatus('saving')
    try {
      if (nextContent === question.answer.trim()) {
        await deleteQuestionAnswerOverride(question.id)
        setAnswerOverride(null)
        setAnswerDraft(question.answer)
      } else {
        const now = Date.now()
        const saved = await putQuestionAnswerOverride({
          questionId: question.id,
          content: answerDraft,
          createdAt: answerOverride?.createdAt ?? now,
          updatedAt: now,
        })
        setAnswerOverride(saved)
        setAnswerDraft(saved?.content ?? answerDraft)
      }
      setShowOriginalAnswer(false)
      setAnswerEditMode(false)
      setAnswerSaveStatus('saved')
      window.setTimeout(() => setAnswerSaveStatus('idle'), 1400)
    } catch {
      setAnswerSaveStatus('error')
    }
  }, [answerDraft, answerOverride?.createdAt, answerSaveStatus, question])

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
  const answerHeading = hasCustomAnswer
    ? showOriginalAnswer
      ? '参考答案'
      : '自定义答案'
    : '参考答案'
  const showAnswerContent = answerPanelView === 'answer'
  const answerContextQuestion = {
    ...question,
    answer: displayedAnswerText,
  }
  const canSaveAnswerOverride = answerDraft.trim().length > 0 && answerSaveStatus !== 'saving'

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

            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={handleToggleStarred}
                aria-pressed={starred}
                aria-label={starred ? '取消重点题' : '标记为重点题'}
                title={starred ? '取消重点题' : '标记为重点题'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  padding: 0,
                  borderRadius: 8,
                  border: '1px solid',
                  borderColor: starred ? 'rgba(245,158,11,0.28)' : 'transparent',
                  background: starred ? 'rgba(245,158,11,0.08)' : 'transparent',
                  color: starred ? '#b45309' : 'var(--text-3)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: starred ? 1 : 0.7,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.32)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.1)'
                  ;(e.currentTarget as HTMLElement).style.color = '#b45309'
                  ;(e.currentTarget as HTMLElement).style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.borderColor = starred
                    ? 'rgba(245,158,11,0.28)'
                    : 'transparent'
                  ;(e.currentTarget as HTMLElement).style.background = starred
                    ? 'rgba(245,158,11,0.08)'
                    : 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = starred
                    ? '#b45309'
                    : 'var(--text-3)'
                  ;(e.currentTarget as HTMLElement).style.opacity = starred ? '1' : '0.7'
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill={starred ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setNoteDrawerOpen(true)}
                aria-label={hasNote ? '打开题目笔记' : '添加题目笔记'}
                title={`${hasNote ? '打开题目笔记' : '添加题目笔记'}（N）`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  padding: 0,
                  borderRadius: 8,
                  border: '1px solid',
                  borderColor: hasNote ? 'rgba(var(--primary-rgb),0.22)' : 'transparent',
                  background: hasNote ? 'rgba(var(--primary-rgb),0.07)' : 'transparent',
                  color: hasNote ? 'var(--primary)' : 'var(--text-3)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: hasNote ? 1 : 0.7,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.borderColor =
                    'rgba(var(--primary-rgb),0.28)'
                  ;(e.currentTarget as HTMLElement).style.background =
                    'rgba(var(--primary-rgb),0.08)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--primary)'
                  ;(e.currentTarget as HTMLElement).style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.borderColor = hasNote
                    ? 'rgba(var(--primary-rgb),0.22)'
                    : 'transparent'
                  ;(e.currentTarget as HTMLElement).style.background = hasNote
                    ? 'rgba(var(--primary-rgb),0.07)'
                    : 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = hasNote
                    ? 'var(--primary)'
                    : 'var(--text-3)'
                  ;(e.currentTarget as HTMLElement).style.opacity = hasNote ? '1' : '0.7'
                }}
              >
                <span style={{ position: 'relative', display: 'inline-flex' }}>
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
                    <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" />
                    <path d="M8 7h6" />
                    <path d="M8 11h8" />
                  </svg>
                  {hasNote && (
                    <span
                      style={{
                        position: 'absolute',
                        right: -3,
                        top: -3,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        border: '1px solid var(--surface)',
                      }}
                    />
                  )}
                </span>
              </button>
            </div>
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
          {(question.tags.length > 0 || reviewCount > 0) && (
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
              {reviewCount > 0 && (
                <span
                  title={`已复习 ${reviewCount} 次`}
                  style={{
                    fontSize: 11,
                    padding: '2px 3px',
                    color: 'var(--text-3)',
                    opacity: 0.72,
                    whiteSpace: 'nowrap',
                  }}
                >
                  复习 {reviewCount} 次
                </span>
              )}
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
              key={`answer-above-${id ?? ''}`}
              questionId={id ?? ''}
              questionText={question.question}
              answerText={effectiveAnswerText}
              onOpenAIPanel={() => setAiDrawerOpen(true)}
              onOpenNote={() => setNoteDrawerOpen(true)}
              isAiEnabled={isAiEnabled}
              onNoteSaved={handleNoteSaved}
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
                gap: 12,
                flexWrap: 'wrap',
                paddingBottom: 14,
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  minWidth: 0,
                  flex: '1 1 auto',
                }}
              >
                <div
                  style={{
                    width: 3,
                    height: 18,
                    borderRadius: 99,
                    background: 'var(--primary)',
                    flexShrink: 0,
                  }}
                />
                {hasLearningCheck ? (
                  <AnswerPanelTabs
                    activeView={answerPanelView}
                    answerLabel={answerHeading}
                    onChange={(view) => {
                      if (view === 'check') {
                        setAnswerEditMode(false)
                        setAnswerSelection(null)
                      }
                      setAnswerPanelView(view)
                    }}
                  />
                ) : (
                  <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {answerHeading}
                  </h2>
                )}
                {hasCustomAnswer && !answerEditMode && (
                  <AnswerOverrideHeaderMeta
                    updatedAt={answerOverride?.updatedAt ?? null}
                    showingOriginal={showOriginalAnswer}
                    onToggleOriginal={() => {
                      setAnswerPanelView('answer')
                      setShowOriginalAnswer((value) => !value)
                    }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <AnswerAIButton
                  title={hasCustomAnswer ? '编辑自定义答案' : '编辑参考答案'}
                  active={answerEditMode}
                  onClick={handleStartAnswerEdit}
                >
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
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </AnswerAIButton>
                <AnswerAIButton
                  title={isAiEnabled ? '打开 AI 助手（A）' : 'AI 助手（请先配置，快捷键 A）'}
                  active={aiDrawerOpen}
                  onClick={() => setAiDrawerOpen(true)}
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
                </AnswerAIButton>
                <AnswerAIButton
                  title={isAiEnabled ? '讲解题目' : '讲解题目（请先配置 AI）'}
                  onClick={() => openAIWithPreset('question')}
                >
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
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.1 9a3 3 0 1 1 4.9 2.3c-.9.6-1.4 1.2-1.4 2.4" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </AnswerAIButton>
                <AnswerAIButton
                  title={isAiEnabled ? '讲解知识点' : '讲解知识点（请先配置 AI）'}
                  onClick={() => openAIWithPreset('concept')}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" />
                    <path d="M8 7h6" />
                    <path d="M8 11h8" />
                  </svg>
                </AnswerAIButton>
              </div>
            </div>

            {/* Answer body */}
            {answerPanelView === 'check' ? (
              <LearningCheckPanel
                key={`learning-check-${question.id}`}
                checks={learningChecks}
                onBackToAnswer={() => setAnswerPanelView('answer')}
              />
            ) : answerEditMode ? (
              <AnswerOverrideEditor
                draft={answerDraft}
                saveStatus={answerSaveStatus}
                canSave={canSaveAnswerOverride}
                onDraftChange={setAnswerDraft}
                onSave={handleSaveAnswerOverride}
                onCancel={handleCancelAnswerEdit}
                onRestoreDefault={handleRestoreDefaultAnswer}
              />
            ) : answerOverrideLoading ? (
              <Skeleton width="100%" height={96} />
            ) : (
              <section
                ref={answerContentRef}
                className="prose answer-annotation-content"
                aria-label="答案内容"
                style={{ minWidth: 0, position: 'relative' }}
              >
                <MarkdownRenderer content={displayedAnswerText} />
              </section>
            )}

            {showAnswerContent && answerSelection && !answerEditMode && !answerOverrideLoading && (
              <AnswerAnnotationToolbar
                toolbarRef={answerAnnotationToolbarRef}
                selection={answerSelection}
                commentOpen={answerCommentOpen}
                commentDraft={answerCommentDraft}
                saving={answerAnnotationSaving}
                onHighlight={(color) => handleCreateAnswerAnnotation('highlight', color)}
                onClearHighlight={handleClearAnswerHighlight}
                onOpenComment={() => setAnswerCommentOpen(true)}
                onCommentDraftChange={setAnswerCommentDraft}
                onSaveComment={handleSaveAnswerComment}
                onCancel={handleCancelAnswerAnnotation}
              />
            )}

            {showAnswerContent && !answerEditMode && !answerOverrideLoading && (
              <AnswerCommentMarkers
                rootRef={answerContentRef}
                annotations={visibleAnswerAnnotations}
                activeId={activeAnswerCommentId}
                onActiveChange={setActiveAnswerCommentId}
                onDelete={handleDeleteAnswerComment}
              />
            )}

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
            {showAnswerContent && showAnswerInputInside && !hideAnswerInput && (
              <MyAnswerInput
                key={`answer-inside-${id ?? ''}`}
                questionId={id ?? ''}
                questionText={question.question}
                answerText={effectiveAnswerText}
                onOpenAIPanel={() => setAiDrawerOpen(true)}
                onOpenNote={() => setNoteDrawerOpen(true)}
                isAiEnabled={isAiEnabled}
                onNoteSaved={handleNoteSaved}
                compact
              />
            )}
          </div>
        )}

        {showSessionSummary && (
          <SessionCompletionCard
            mastered={sessionStats.mastered}
            review={sessionStats.review}
            unlearned={sessionStats.unlearned}
            total={sessionStats.total}
            retryCount={sessionStats.retryIds.length}
            onRetry={handleRetrySession}
            onBackToPractice={() => navigate('/practice')}
            onDashboard={() => navigate('/')}
          />
        )}

        {showRelatedPractice && (
          <RelatedPracticeCard
            items={relatedPracticeItems}
            onStartPractice={handleStartRelatedPractice}
          />
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
        question={answerContextQuestion}
        answerVisible={answerVisible}
        initialPrompt={aiInitialPrompt}
        onInitialPromptConsumed={handleAIInitialPromptConsumed}
        onOpenSettings={() => {
          setAiDrawerOpen(false)
          setSettingsOpen(true)
        }}
      />

      <NoteDrawer
        open={noteDrawerOpen}
        onClose={() => setNoteDrawerOpen(false)}
        question={question}
        refreshKey={noteRefreshKey}
        onContentStateChange={setHasNote}
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
				::highlight(iface-answer-annotation-yellow) {
					background: rgba(245, 158, 11, 0.32);
				}
				::highlight(iface-answer-annotation-green) {
					background: rgba(16, 185, 129, 0.24);
				}
				::highlight(iface-answer-annotation-blue) {
					background: rgba(59, 130, 246, 0.22);
				}
				::highlight(iface-answer-annotation-pink) {
					background: rgba(236, 72, 153, 0.22);
				}
				@media (max-width: 520px) {
					.note-drawer-panel {
						top: auto !important;
						left: 0 !important;
						right: 0 !important;
						width: 100% !important;
						height: min(82dvh, 640px) !important;
						border-left: none !important;
						border-top: 1px solid var(--border-subtle) !important;
						border-radius: 18px 18px 0 0 !important;
						animation: slide-up 0.2s var(--ease-out) both !important;
					}
					.session-completion-stats {
						grid-template-columns: 1fr !important;
					}
					.session-completion-actions {
						flex-direction: column !important;
					}
					.session-completion-actions > button {
						width: 100% !important;
					}
					.related-practice-header {
						flex-direction: column !important;
					}
					.related-practice-row {
						grid-template-columns: 1fr !important;
					}
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
          title={isAiEnabled ? '打开 AI 助手（A）' : 'AI 助手（请先配置，快捷键 A）'}
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
