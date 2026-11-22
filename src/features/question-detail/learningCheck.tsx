import { Check, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { isLearningCheckAnswerCorrect, type LearningCheckQuestion } from '@/lib/learningCheck'
import { Button, cn } from '@/ui'

type Responses = Record<string, string[]>

function answerText(check: LearningCheckQuestion): string {
  return check.options
    .filter((option) => check.answerIds.includes(option.id))
    .map((option) => option.text)
    .join('；')
}

/** Markdown inside quiz prompts, options and explanations, styled to inherit its container. */
function CheckMarkdown({ content }: { content: string }) {
  return <MarkdownRenderer className="learning-check-markdown" content={content} />
}

function optionClasses(selected: boolean, correct: boolean, submitted: boolean): string {
  if (submitted && correct) return 'border-success/35 bg-success-subtle text-fg'
  if (submitted && selected) return 'border-danger/35 bg-danger-subtle text-fg'
  if (selected) return 'border-accent/40 bg-accent-subtle text-fg'
  return 'border-line bg-subtle text-fg-muted hover:border-line-strong hover:text-fg'
}

function Summary({
  checks,
  responses,
  onRestart,
}: {
  checks: LearningCheckQuestion[]
  responses: Responses
  onRestart: () => void
}) {
  const correctCount = checks.filter((check) =>
    isLearningCheckAnswerCorrect(check, responses[check.id] ?? []),
  ).length
  const percent = checks.length > 0 ? Math.round((correctCount / checks.length) * 100) : 0
  const passed = correctCount === checks.length

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          'flex items-center gap-4 rounded-xl border border-line p-4',
          passed ? 'bg-success-subtle' : 'bg-subtle',
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-fg-subtle">检验结果</p>
          <h3 className="mt-1 text-lg font-semibold text-fg">
            {passed ? '这组检验全部通过' : '还有几个点值得回看'}
          </h3>
          <p className="mt-1 text-sm text-fg-muted">
            {passed
              ? '说明你已经抓住这道题的核心主线，可以继续下一题。'
              : '先看错题解释，再回参考答案补一下薄弱处。'}
          </p>
        </div>
        <div className="flex size-18 shrink-0 flex-col items-center justify-center rounded-2xl border border-line bg-canvas">
          <span
            className={cn(
              'text-2xl leading-none font-bold tabular-nums',
              passed ? 'text-success' : 'text-accent',
            )}
          >
            {percent}%
          </span>
          <span className="mt-1 text-2xs text-fg-subtle tabular-nums">
            {correctCount}/{checks.length}
          </span>
        </div>
      </div>

      <ol className="flex flex-col gap-2.5">
        {checks.map((check, index) => {
          const correct = isLearningCheckAnswerCorrect(check, responses[check.id] ?? [])
          return (
            <li key={check.id} className="rounded-xl border border-line bg-subtle px-3.5 py-3">
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-5.5 shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5',
                    correct ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger',
                  )}
                >
                  {correct ? <Check /> : <X />}
                  <span className="sr-only">{correct ? '答对' : '答错'}</span>
                </span>
                <p className="text-sm font-medium text-fg">
                  {index + 1}. {check.prompt}
                </p>
              </div>
              {!correct && (
                <p className="mb-1.5 text-xs text-fg-muted">正确答案：{answerText(check)}</p>
              )}
              <div className="text-xs leading-relaxed text-fg-subtle">
                <CheckMarkdown content={check.explanation} />
              </div>
            </li>
          )
        })}
      </ol>

      <div>
        <Button variant="secondary" onClick={onRestart}>
          再测一次
        </Button>
      </div>
    </div>
  )
}

/** Short multiple-choice quiz shown in the answer card's "测试一下" tab. */
export function LearningCheckPanel({ checks }: { checks: LearningCheckQuestion[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [draftSelection, setDraftSelection] = useState<string[]>([])
  const [responses, setResponses] = useState<Responses>({})
  const [summaryVisible, setSummaryVisible] = useState(false)

  const current = checks[currentIndex]
  const submittedSelection = current ? responses[current.id] : undefined
  const submitted = Boolean(submittedSelection)
  const selectedIds = submittedSelection ?? draftSelection
  const allAnswered = checks.length > 0 && checks.every((check) => responses[check.id])

  const currentCorrect = useMemo(
    () =>
      Boolean(current && submittedSelection) &&
      isLearningCheckAnswerCorrect(current, submittedSelection ?? []),
    [current, submittedSelection],
  )

  useEffect(() => {
    if (current) setDraftSelection(responses[current.id] ?? [])
  }, [current, responses])

  const submit = (selection: string[]) => {
    if (!current || selection.length === 0 || submitted) return
    setResponses((prev) => ({ ...prev, [current.id]: selection }))
  }

  const handleOptionClick = (optionId: string) => {
    if (!current || submitted) return
    if (current.kind === 'single') {
      submit([optionId])
      return
    }
    setDraftSelection((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
    )
  }

  const handleNext = () => {
    if (currentIndex < checks.length - 1) setCurrentIndex((index) => index + 1)
    else if (allAnswered) setSummaryVisible(true)
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setDraftSelection([])
    setResponses({})
    setSummaryVisible(false)
  }

  if (checks.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-subtle p-4 text-sm text-fg-muted">
        这道题暂时还没有检验题。
      </p>
    )
  }
  if (summaryVisible) {
    return <Summary checks={checks} responses={responses} onRestart={handleRestart} />
  }
  if (!current) return null

  const multiple = current.kind === 'multiple'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-fg">
          第 {currentIndex + 1} 题 / 共 {checks.length} 题
        </h3>
        <div className="flex items-center gap-1.5" aria-hidden>
          {checks.map((check, index) => (
            <span
              key={check.id}
              className={cn(
                'h-1.5 rounded-full transition-all duration-200',
                index === currentIndex ? 'w-4.5' : 'w-1.5',
                responses[check.id]
                  ? 'bg-accent'
                  : index === currentIndex
                    ? 'bg-accent/35'
                    : 'bg-line-strong',
              )}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2.5 flex items-center gap-2">
          <span
            className={cn(
              'inline-flex h-5.5 items-center rounded-full px-2 text-2xs font-semibold',
              multiple ? 'bg-warning-subtle text-warning' : 'bg-accent-subtle text-accent',
            )}
          >
            {multiple ? '多选' : '单选'}
          </span>
          <span className="text-xs text-fg-subtle">{current.focus}</span>
        </div>
        <div className="text-[15px] leading-relaxed text-fg">
          <CheckMarkdown content={current.prompt} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {current.options.map((option) => {
          const selected = selectedIds.includes(option.id)
          const correct = current.answerIds.includes(option.id)
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleOptionClick(option.id)}
              disabled={submitted}
              aria-pressed={selected}
              className={cn(
                'grid min-h-11.5 w-full grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-default',
                optionClasses(selected, correct, submitted),
              )}
            >
              <span
                className={cn(
                  'flex size-6 items-center justify-center border text-xs font-semibold',
                  multiple ? 'rounded-md' : 'rounded-full',
                  selected
                    ? 'border-current bg-canvas text-accent'
                    : 'border-line-strong text-fg-subtle',
                )}
              >
                {option.id.toUpperCase()}
              </span>
              <div className="min-w-0 text-sm leading-relaxed">
                <CheckMarkdown content={option.text} />
              </div>
              {submitted && (correct || selected) && (
                <span
                  className={cn(
                    'text-xs font-semibold whitespace-nowrap',
                    correct ? 'text-success' : 'text-danger',
                  )}
                >
                  {correct ? '正确' : '误选'}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {multiple && !submitted && (
        <Button
          variant="primary"
          className="self-end"
          onClick={() => submit(draftSelection)}
          disabled={draftSelection.length === 0}
        >
          提交选择
        </Button>
      )}

      {submitted && (
        <div
          className={cn(
            'rounded-xl border p-3.5',
            currentCorrect
              ? 'border-success/30 bg-success-subtle'
              : 'border-danger/30 bg-danger-subtle',
          )}
        >
          <p
            className={cn(
              'mb-1.5 text-sm font-semibold',
              currentCorrect ? 'text-success' : 'text-danger',
            )}
          >
            {currentCorrect ? '答对了' : '答案解析'}
          </p>
          {!currentCorrect && (
            <p className="mb-1.5 text-xs text-fg-muted">正确答案：{answerText(current)}</p>
          )}
          <div className="text-xs leading-relaxed text-fg-muted">
            <CheckMarkdown content={current.explanation} />
          </div>
        </div>
      )}

      {submitted && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={currentIndex === checks.length - 1 && !allAnswered}
          >
            {currentIndex < checks.length - 1 ? '下一题' : '查看结果'}
          </Button>
        </div>
      )}
    </div>
  )
}
