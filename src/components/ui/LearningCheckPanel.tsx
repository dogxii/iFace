import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { isLearningCheckAnswerCorrect, type LearningCheckQuestion } from '@/lib/learningCheck'

interface LearningCheckPanelProps {
  checks: LearningCheckQuestion[]
}

type LearningCheckResponses = Record<string, string[]>

function getAnswerText(check: LearningCheckQuestion): string {
  return check.options
    .filter((option) => check.answerIds.includes(option.id))
    .map((option) => option.text)
    .join('；')
}

function getOptionStyle(params: {
  check: LearningCheckQuestion
  optionId: string
  selectedIds: string[]
  submitted: boolean
}): CSSProperties {
  const isSelected = params.selectedIds.includes(params.optionId)
  const isCorrect = params.check.answerIds.includes(params.optionId)

  if (params.submitted && isCorrect) {
    return {
      borderColor: 'rgba(16,185,129,0.34)',
      background: 'var(--success-light)',
      color: 'var(--text)',
    }
  }

  if (params.submitted && isSelected && !isCorrect) {
    return {
      borderColor: 'rgba(239,68,68,0.34)',
      background: 'var(--danger-light)',
      color: 'var(--text)',
    }
  }

  if (isSelected) {
    return {
      borderColor: 'rgba(var(--primary-rgb),0.34)',
      background: 'var(--primary-light)',
      color: 'var(--text)',
    }
  }

  return {
    borderColor: 'var(--border-subtle)',
    background: 'var(--surface-2)',
    color: 'var(--text-2)',
  }
}

function LearningCheckMarkdown({ content }: { content: string }) {
  return <MarkdownRenderer className="learning-check-markdown" content={content} />
}

function LearningCheckSummary({
  checks,
  responses,
  onRestart,
}: {
  checks: LearningCheckQuestion[]
  responses: LearningCheckResponses
  onRestart: () => void
}) {
  const correctCount = checks.filter((check) =>
    isLearningCheckAnswerCorrect(check, responses[check.id] ?? []),
  ).length
  const percent = checks.length > 0 ? Math.round((correctCount / checks.length) * 100) : 0
  const passed = correctCount === checks.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: 16,
          alignItems: 'center',
          padding: 16,
          borderRadius: 12,
          border: '1px solid var(--border-subtle)',
          background: passed ? 'var(--success-light)' : 'var(--surface-2)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 5 }}>
            检验结果
          </p>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1.35 }}>
            {passed ? '这组检验全部通过' : '还有几个点值得回看'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginTop: 5 }}>
            {passed
              ? '说明你已经抓住这道题的核心主线，可以继续下一题。'
              : '先看错题解释，再回参考答案补一下薄弱处。'}
          </p>
        </div>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: passed ? 'var(--success)' : 'var(--primary)',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {percent}%
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            {correctCount}/{checks.length}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {checks.map((check, index) => {
          const selectedIds = responses[check.id] ?? []
          const correct = isLearningCheckAnswerCorrect(check, selectedIds)

          return (
            <div
              key={check.id}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 7,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    background: correct ? 'var(--success-light)' : 'var(--danger-light)',
                    color: correct ? 'var(--success)' : '#ef4444',
                    flexShrink: 0,
                  }}
                >
                  {correct ? '✓' : '×'}
                </span>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.5 }}>
                  {index + 1}. {check.prompt}
                </p>
              </div>
              {!correct && (
                <p
                  style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 6 }}
                >
                  正确答案：{getAnswerText(check)}
                </p>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.65 }}>
                <LearningCheckMarkdown content={check.explanation} />
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onRestart}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 34,
            padding: '0 13px',
            borderRadius: 9,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          再测一次
        </button>
      </div>
    </div>
  )
}

export function LearningCheckPanel({ checks }: LearningCheckPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [draftSelection, setDraftSelection] = useState<string[]>([])
  const [responses, setResponses] = useState<LearningCheckResponses>({})
  const [summaryVisible, setSummaryVisible] = useState(false)

  const currentCheck = checks[currentIndex]
  const submittedSelection = currentCheck ? responses[currentCheck.id] : undefined
  const submitted = Boolean(submittedSelection)
  const selectedIds = submittedSelection ?? draftSelection
  const allAnswered = checks.length > 0 && checks.every((check) => responses[check.id])

  const currentCorrect = useMemo(() => {
    if (!currentCheck || !submittedSelection) return false
    return isLearningCheckAnswerCorrect(currentCheck, submittedSelection)
  }, [currentCheck, submittedSelection])

  useEffect(() => {
    if (!currentCheck) return
    setDraftSelection(responses[currentCheck.id] ?? [])
  }, [currentCheck, responses])

  const submitResponse = (selection: string[]) => {
    if (!currentCheck || selection.length === 0 || submitted) return
    setResponses((current) => ({ ...current, [currentCheck.id]: selection }))
  }

  const handleOptionClick = (optionId: string) => {
    if (!currentCheck || submitted) return

    if (currentCheck.kind === 'single') {
      submitResponse([optionId])
      return
    }

    setDraftSelection((current) =>
      current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId],
    )
  }

  const handleNext = () => {
    if (currentIndex < checks.length - 1) {
      setCurrentIndex((index) => index + 1)
      return
    }

    if (allAnswered) {
      setSummaryVisible(true)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setDraftSelection([])
    setResponses({})
    setSummaryVisible(false)
  }

  if (checks.length === 0) {
    return (
      <div
        style={{
          padding: 16,
          borderRadius: 12,
          border: '1px solid var(--border-subtle)',
          background: 'var(--surface-2)',
          color: 'var(--text-2)',
          fontSize: 13,
          lineHeight: 1.7,
        }}
      >
        这道题暂时还没有检验题。
      </div>
    )
  }

  if (summaryVisible) {
    return <LearningCheckSummary checks={checks} responses={responses} onRestart={handleRestart} />
  }

  if (!currentCheck) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>
        {`
          .learning-check-markdown p {
            margin-bottom: 0 !important;
            font-size: inherit !important;
            line-height: inherit !important;
            color: inherit !important;
          }

          .learning-check-markdown ul,
          .learning-check-markdown ol {
            margin: 6px 0 0 !important;
          }

          .learning-check-markdown li {
            font-size: inherit !important;
            line-height: inherit !important;
            color: inherit !important;
          }

          .learning-check-markdown .code-block-wrap {
            margin-top: 10px;
          }

          .learning-check-markdown pre {
            margin: 8px 0 0 !important;
            font-weight: 400 !important;
          }

          .learning-check-markdown code {
            font-weight: 400 !important;
          }
        `}
      </style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.45 }}>
            第 {currentIndex + 1} 题 / 共 {checks.length} 题
          </h3>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            color: 'var(--text-3)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {checks.map((check, index) => {
            const answered = Boolean(responses[check.id])
            const active = index === currentIndex
            return (
              <span
                key={check.id}
                style={{
                  width: active ? 18 : 7,
                  height: 7,
                  borderRadius: 99,
                  background: answered
                    ? 'var(--primary)'
                    : active
                      ? 'rgba(var(--primary-rgb),0.35)'
                      : 'var(--border)',
                  transition: 'all 0.18s',
                }}
              />
            )
          })}
        </div>
      </div>

      <div
        style={{
          paddingBottom: 2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 22,
              padding: '0 8px',
              borderRadius: 99,
              background:
                currentCheck.kind === 'multiple' ? 'var(--warning-light)' : 'var(--primary-light)',
              color: currentCheck.kind === 'multiple' ? 'var(--warning)' : 'var(--primary)',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {currentCheck.kind === 'multiple' ? '多选' : '单选'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{currentCheck.focus}</span>
        </div>
        <div
          style={{
            fontSize: 15,
            color: 'var(--text)',
            lineHeight: 1.6,
          }}
        >
          <LearningCheckMarkdown content={currentCheck.prompt} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {currentCheck.options.map((option) => {
          const optionStyle = getOptionStyle({
            check: currentCheck,
            optionId: option.id,
            selectedIds,
            submitted,
          })
          const selected = selectedIds.includes(option.id)
          const correctOption = currentCheck.answerIds.includes(option.id)

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleOptionClick(option.id)}
              disabled={submitted}
              style={{
                display: 'grid',
                gridTemplateColumns: '26px minmax(0, 1fr) auto',
                gap: 10,
                alignItems: 'center',
                width: '100%',
                minHeight: 46,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid',
                textAlign: 'left',
                cursor: submitted ? 'default' : 'pointer',
                transition: 'all 0.15s',
                ...optionStyle,
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: currentCheck.kind === 'multiple' ? 6 : 99,
                  border: '1px solid',
                  borderColor: selected ? 'currentColor' : 'var(--border)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: selected ? 'var(--primary)' : 'var(--text-3)',
                  background: selected ? 'var(--surface)' : 'transparent',
                }}
              >
                {option.id.toUpperCase()}
              </span>
              <div style={{ minWidth: 0, fontSize: 13, lineHeight: 1.6, color: 'inherit' }}>
                <LearningCheckMarkdown content={option.text} />
              </div>
              {submitted && (correctOption || selected) && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: correctOption ? 'var(--success)' : '#ef4444',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {correctOption ? '正确' : '误选'}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {currentCheck.kind === 'multiple' && !submitted && (
        <button
          type="button"
          onClick={() => submitResponse(draftSelection)}
          disabled={draftSelection.length === 0}
          style={{
            alignSelf: 'flex-end',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 34,
            padding: '0 13px',
            borderRadius: 9,
            border: '1px solid',
            borderColor:
              draftSelection.length > 0 ? 'rgba(var(--primary-rgb),0.28)' : 'var(--border)',
            background: draftSelection.length > 0 ? 'var(--primary)' : 'var(--surface-3)',
            color: draftSelection.length > 0 ? 'white' : 'var(--text-3)',
            fontSize: 13,
            fontWeight: 600,
            cursor: draftSelection.length > 0 ? 'pointer' : 'default',
            opacity: draftSelection.length > 0 ? 1 : 0.72,
          }}
        >
          提交选择
        </button>
      )}

      {submitted && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            border: '1px solid',
            borderColor: currentCorrect ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.26)',
            background: currentCorrect ? 'var(--success-light)' : 'var(--danger-light)',
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: currentCorrect ? 'var(--success)' : '#ef4444',
              marginBottom: 6,
            }}
          >
            {currentCorrect ? '答对了' : '答案解析'}
          </p>
          {!currentCorrect && (
            <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 6 }}>
              正确答案：{getAnswerText(currentCheck)}
            </p>
          )}
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65 }}>
            <LearningCheckMarkdown content={currentCheck.explanation} />
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {submitted && (
          <button
            type="button"
            onClick={handleNext}
            disabled={!submitted || (currentIndex === checks.length - 1 && !allAnswered)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 34,
              padding: '0 13px',
              borderRadius: 9,
              border: '1px solid rgba(var(--primary-rgb),0.24)',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {currentIndex < checks.length - 1 ? '下一题' : '查看结果'}
          </button>
        )}
      </div>
    </div>
  )
}
