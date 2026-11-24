import {
  Check,
  CircleAlert,
  NotebookPen,
  PenLine,
  RotateCcw,
  Save,
  Send,
  Settings2,
  Sparkles,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import { Button, Callout, Composer, cn } from '@/ui'

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

export { isEditableTarget } from '@/lib/dom'

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
    <div className="not-prose mt-3 border-t border-dashed border-line-strong pt-3 text-fg-muted">
      <div className="mb-2 flex items-center gap-2 text-xs">
        <span className="font-semibold text-fg">参考评分</span>
        <span className="font-semibold text-fg tabular-nums">{score.total}/100</span>
      </div>
      {score.dimensions.length > 0 ? (
        <div className="grid gap-1.5">
          {score.dimensions.map((dimension) => {
            const percent = dimension.max > 0 ? (dimension.score / dimension.max) * 100 : 0
            return (
              <div
                key={dimension.label}
                className="grid grid-cols-[48px_minmax(56px,112px)_42px] items-center gap-2 text-2xs"
              >
                <span>{dimension.label}</span>
                <span className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="tabular-nums">
                  {dimension.score}/{dimension.max}
                </span>
              </div>
            )
          })}
        </div>
      ) : null}
      <p className="mt-2 text-2xs leading-relaxed">{score.note}</p>
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
  /** Collapse to one line when this turns true and nothing was written (answer revealed). */
  collapseWhenEmpty?: boolean
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
  collapseWhenEmpty = false,
}: MyAnswerInputProps) {
  const { sendMessage, streaming, streamingQuestionId } = useAIStore()

  const [collapsed, setCollapsed] = useState(false)
  const [text, setText] = useState(() => loadMyAnswerDraft(questionId))
  const textRef = useRef(text)
  textRef.current = text
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

  // Once the answer is revealed an empty box only pushes it down; fold it away.
  useEffect(() => {
    if (collapseWhenEmpty && !textRef.current.trim()) setCollapsed(true)
  }, [collapseWhenEmpty])

  useEffect(() => {
    if (feedback || streamingFeedback) return
    saveMyAnswerDraft(questionId, text)
  }, [feedback, questionId, streamingFeedback, text])

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
      } else if (e.key === 'Escape') {
        // Leave the box so Space / 1 / 2 / 3 / arrows work again.
        e.currentTarget.blur()
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

  const wrapperClass = compact
    ? 'mt-1 border-t border-line pt-3.5'
    : 'overflow-hidden rounded-2xl border border-line bg-canvas'

  if (collapsed) {
    return (
      <div className={wrapperClass}>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className={cn(
            'flex w-full items-center gap-2 text-left text-sm text-fg-subtle transition-colors hover:bg-accent-subtle hover:text-accent',
            compact ? 'rounded-lg border border-dashed border-line-strong px-3 py-2' : 'px-4 py-3',
          )}
        >
          <PenLine className="size-3.5" />
          {text.trim() ? '我的作答已收起，点击展开…' : '写下自己的作答…'}
        </button>
      </div>
    )
  }

  return (
    <div className={wrapperClass}>
      <div
        className={cn(
          'flex items-center justify-between',
          compact ? 'pb-2.5' : 'border-b border-line px-4 py-2.5',
        )}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-fg">
          <PenLine className="size-3.5 text-accent" />
          我的作答
          <span className="text-xs font-normal text-fg-subtle max-sm:hidden">
            先写再看，记得更牢
          </span>
        </span>
        <Button variant="ghost" size="sm" className="h-7 text-fg-subtle" onClick={handleCollapse}>
          收起
        </Button>
      </div>

      <div className={cn('flex flex-col gap-2.5', compact ? 'pt-2.5' : 'p-3')}>
        {!displayFeedback ? (
          <Composer
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="用自己的话说说你对这道题的理解……不用完整，写核心思路就行"
            aria-label="我的作答"
            rows={3}
            textareaClassName="min-h-20 resize-y text-base max-sm:text-[16px]"
            toolbar={
              <>
                <SpeechInputButton
                  supported={speech.supported}
                  listening={speech.listening}
                  disabled={isStreaming}
                  onToggle={speech.toggle}
                />
                <div className="flex min-w-0 flex-1 items-center text-xs">
                  {speech.interimTranscript ? (
                    <span
                      title={speech.interimTranscript}
                      className={cn('truncate text-accent', compact ? 'max-w-40' : 'max-w-64')}
                    >
                      正在识别：{speech.interimTranscript}
                    </span>
                  ) : isAiEnabled ? (
                    <span className="text-fg-subtle max-sm:hidden">提交后由 AI 点评</span>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-6 px-1 text-xs"
                      onClick={onOpenAIPanel}
                    >
                      <Settings2 />
                      配置 AI 才能获得反馈
                    </Button>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={text.trim() && isAiEnabled ? 'primary' : 'secondary'}
                  onClick={handleSubmit}
                  disabled={!text.trim() || !isAiEnabled || isStreaming}
                  shortcut="⌘↵"
                >
                  <Send />
                  提交作答
                </Button>
              </>
            }
          />
        ) : null}

        {displayFeedback || isStreaming ? (
          <div className="overflow-hidden rounded-xl border border-line bg-subtle/60">
            <div className="border-b border-line px-3.5 py-2.5">
              <p className="mb-1 text-2xs font-medium text-fg-subtle">我的作答</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-fg-muted">{text}</p>
            </div>

            <div className="px-3.5 py-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-fg">
                <Sparkles className="size-3.5 text-accent" />
                AI 点评
                {isStreaming ? (
                  <span className="ml-1 inline-flex gap-[3px]">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="inline-block size-1 rounded-full bg-accent"
                        style={{ animation: `ai-dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                      />
                    ))}
                  </span>
                ) : null}
              </div>
              {feedbackContent ? (
                <div className="prose text-sm">
                  <MarkdownRenderer content={feedbackContent} />
                  {feedbackScore ? <FeedbackScorePanel score={feedbackScore} /> : null}
                </div>
              ) : null}
            </div>

            {feedback && !isStreaming ? (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2">
                <Button
                  size="sm"
                  variant={noteSaved ? 'ghost' : 'secondary'}
                  onClick={handleSaveFeedbackToNote}
                  disabled={savingNote || noteSaved}
                  loading={savingNote}
                  className={cn(noteSaved && 'text-success disabled:opacity-100')}
                >
                  {savingNote ? null : noteSaved ? <Check /> : <Save />}
                  {savingNote ? '保存中…' : noteSaved ? '已保存到笔记' : '保存为复盘笔记'}
                </Button>
                {noteSaved && onOpenNote ? (
                  <Button size="sm" variant="ghost" onClick={onOpenNote}>
                    <NotebookPen />
                    打开笔记
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={onOpenAIPanel}>
                  <Sparkles />
                  深入讨论
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={handleReset}>
                  <RotateCcw />
                  重新作答
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <Callout tone="danger" icon={<CircleAlert />}>
            <span className="text-danger">{error}</span>
            <Button
              variant="link"
              size="sm"
              className="ml-2 h-auto p-0 text-xs text-danger"
              onClick={() => setError(null)}
            >
              关闭
            </Button>
          </Callout>
        ) : null}
      </div>
    </div>
  )
}
