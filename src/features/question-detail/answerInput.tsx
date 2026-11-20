import { useCallback, useEffect, useRef, useState } from 'react'
import { Spinner } from '@/components/ui'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { SpeechInputButton } from '@/components/ui/SpeechInputButton'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { appendQuestionNoteContent } from '@/lib/db'
import { buildReviewNoteMarkdown } from '@/lib/feedbackNote'
import {
  buildAnswerFeedbackContext,
  buildAnswerFeedbackSystemSuffix,
  useAIStore,
} from '@/store/useAIStore'

// ─── My Answer Input ("我的作答") ─────────────────────────────────────────────
// Design principle: 先作答，再看答案 — shown ABOVE the answer card.
// Always starts open. Collapses only if user explicitly closes it.
// StudyMode affects placement and behavior:
//   answer-first    → shown above answer card, answer hidden until ready
//   answer-alongside → shown inside answer card (side-by-side)
//   memory-only     → hidden entirely

export const MY_ANSWER_DRAFT_PREFIX = 'iface_my_answer_draft_'

export function getMyAnswerDraftKey(questionId: string): string {
  return `${MY_ANSWER_DRAFT_PREFIX}${questionId}`
}

export function loadMyAnswerDraft(questionId: string): string {
  if (!questionId) return ''

  try {
    return localStorage.getItem(getMyAnswerDraftKey(questionId)) ?? ''
  } catch {
    return ''
  }
}

export function saveMyAnswerDraft(questionId: string, text: string): void {
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

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}

export function blurActiveControl() {
  const activeElement = document.activeElement
  if (
    activeElement instanceof HTMLElement &&
    activeElement.matches('button, a, [role="button"], [role="tab"]')
  ) {
    activeElement.blur()
  }
}

export function withLearningCheckSearch(search: string): string {
  const params = new URLSearchParams(search)
  params.set('check', '1')
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}

export function appendSpeechTranscript(current: string, transcript: string): string {
  const next = transcript.trim()
  if (!next) return current
  if (!current.trim()) return next
  return `${current.trimEnd()} ${next}`
}

export interface FeedbackScoreDimension {
  label: string
  score: number
  max: number
}

export interface FeedbackScoreSummary {
  total: number
  dimensions: FeedbackScoreDimension[]
  note: string
}

export function clampScore(score: number, max: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(max, Math.round(score)))
}

export function parseScoreValue(section: string, labelPattern: string, max: number): number | null {
  const match = section.match(
    new RegExp(`${labelPattern}\\s*[：:]\\s*(\\d+(?:\\.\\d+)?)\\s*(?:[/／]\\s*${max})?`, 'i'),
  )
  if (!match) return null

  return clampScore(Number.parseFloat(match[1]), max)
}

export function splitFeedbackScore(markdown: string): {
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

export function FeedbackScorePanel({ score }: { score: FeedbackScoreSummary }) {
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

export interface MyAnswerInputProps {
  questionId: string
  questionText: string
  answerText: string
  onOpenAIPanel: () => void
  onOpenNote?: () => void
  isAiEnabled: boolean
  onNoteSaved?: () => void
  /** When true the component is in "compact / inside answer card" mode */
  compact?: boolean
  autoFocus?: boolean
}

export function MyAnswerInput({
  questionId,
  questionText,
  answerText,
  onOpenAIPanel,
  onOpenNote,
  isAiEnabled,
  onNoteSaved,
  compact = false,
  autoFocus = true,
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
    if (autoFocus && !compact && !collapsed && !feedback) {
      setTimeout(() => textareaRef.current?.focus(), 80)
    }
  }, [autoFocus, collapsed, compact, feedback])

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
