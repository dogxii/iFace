import {
  CircleAlert,
  CircleHelp,
  Flag,
  Plus,
  Repeat2,
  Send,
  Settings2,
  Sparkles,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SpeechInputButton } from '@/components/ui/SpeechInputButton'
import { useBufferedText } from '@/hooks/useBufferedText'
import { useDraft } from '@/hooks/useDraft'
import { useQuestions } from '@/hooks/useQuestions'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { type ChatCompletionMessage, requestChatCompletionStream } from '@/lib/aiClient'
import { deleteMockInterview, getAllMockInterviews, putMockInterview } from '@/lib/db'
import {
  buildInterviewerMessages,
  buildPlanMessages,
  buildReviewMessages,
  createMockInterviewSession,
  createMockInterviewTurn,
  extractDimensionScores,
  extractOverallScore,
  MOCK_LEVEL_LABELS,
  MOCK_TYPE_LABELS,
  type MockInterviewSetupInput,
  parseInterviewerReply,
  parsePlan,
  recommendPracticeQuestions,
} from '@/lib/mockInterview'
import { createPracticeSessionPath } from '@/lib/practiceSession'
import { useAIStore } from '@/store/useAIStore'
import { useUIState } from '@/store/useUIStore'
import type { MockInterviewSession, Question } from '@/types'
import { Breadcrumb, Button, Callout, Composer, PageHeader, PageTitle, Tag, toast } from '@/ui'
import {
  type BusyState,
  DEFAULT_FORM,
  EMPTY_ANSWER_DRAFT,
  formatSessionTime,
  formFromSession,
  parseAnswerDraft,
  parseSetupDraft,
  type SetupForm,
  sessionProgress,
  sortSessions,
} from './mockSession'
import {
  HistoryList,
  HowItWorks,
  PendingBubble,
  ReportView,
  SessionOverview,
  SetupPanel,
  TurnBubble,
} from './parts'

const SUBMIT_SHORTCUT = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘↵' : 'Ctrl ↵'

export default function MockInterviewPage() {
  const navigate = useNavigate()
  const { config } = useAIStore()
  const openSettings = useUIState((s) => s.openSettings)
  const aiReady = config.enabled && config.apiKey.trim().length > 0

  const topRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Setup, the open interview and the unsent answer all survive leaving the page.
  const [form, setForm] = useDraft<SetupForm>('mock-interview:setup', DEFAULT_FORM, parseSetupDraft)
  const [answerDraft, setAnswerDraft] = useDraft(
    'mock-interview:answer',
    EMPTY_ANSWER_DRAFT,
    parseAnswerDraft,
  )
  const [sessions, setSessions] = useState<MockInterviewSession[]>([])
  const [active, setActive] = useState<MockInterviewSession | null>(null)
  const [openId, setOpenId] = useDraft<string | null>('mock-interview:open', null, (value) =>
    typeof value === 'string' ? value : null,
  )
  const { allQuestions: questions } = useQuestions()
  const activeId = active?.id ?? null
  const draft = answerDraft.sessionId === activeId ? answerDraft.text : ''
  const setDraft = useCallback(
    (next: string | ((prev: string) => string)) =>
      setAnswerDraft((prev) => {
        const prevText = prev.sessionId === activeId ? prev.text : ''
        const text = typeof next === 'function' ? next(prevText) : next
        return text ? { sessionId: activeId ?? '', text } : EMPTY_ANSWER_DRAFT
      }),
    [activeId, setAnswerDraft],
  )
  const [busy, setBusy] = useState<BusyState>('idle')
  const [error, setError] = useState<string | null>(null)
  const { text: streamingText, appendText, resetText } = useBufferedText()
  const isBusy = busy !== 'idle'

  // Reopen the interview that was showing when the page was left.
  const restoreId = useRef(openId)
  const restoreDone = useRef(false)
  useEffect(() => {
    getAllMockInterviews().then((loaded) => {
      setSessions(sortSessions(loaded))
      const restored = loaded.find((item) => item.id === restoreId.current)
      restoreDone.current = true
      if (restored) setActive(restored)
    })
  }, [])
  useEffect(() => {
    if (restoreDone.current) setOpenId(activeId)
  }, [activeId, setOpenId])

  useEffect(() => () => abortRef.current?.abort(), [])

  // Follow the conversation while it is live.
  const liveKey =
    active && active.status !== 'completed'
      ? `${active.id}:${active.turns.length}:${streamingText.length}:${busy}`
      : ''
  useEffect(() => {
    if (!liveKey) return
    const frame = requestAnimationFrame(() =>
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }),
    )
    return () => cancelAnimationFrame(frame)
  }, [liveKey])

  const speech = useSpeechRecognition({
    lang: 'zh-CN',
    onFinalTranscript: (text) => setDraft((prev) => `${prev}${prev.trim() ? '\n' : ''}${text}`),
  })

  const saveSession = useCallback(async (session: MockInterviewSession) => {
    const next = { ...session, updatedAt: Date.now() }
    await putMockInterview(next)
    setActive(next)
    setSessions((prev) => sortSessions([next, ...prev.filter((s) => s.id !== next.id)]))
    return next
  }, [])

  const requestAI = useCallback(
    (messages: ChatCompletionMessage[], maxTokens: number, signal: AbortSignal) =>
      requestChatCompletionStream({
        config: {
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model,
          temperature: Math.min(0.8, Math.max(0.3, config.temperature)),
          maxTokens,
          provider: config.provider,
        },
        messages,
        signal,
        onDelta: appendText,
      }),
    [appendText, config],
  )

  /** Run one AI step with a fresh abort controller and shared busy/error handling. */
  const runStep = useCallback(
    async (state: Exclude<BusyState, 'idle'>, step: (signal: AbortSignal) => Promise<void>) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setBusy(state)
      setError(null)
      resetText('')
      try {
        await step(controller.signal)
        return true
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'AI 请求失败')
        }
        return false
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
          setBusy('idle')
          resetText('')
        }
      }
    },
    [resetText],
  )

  const finishSession = useCallback(
    (session: MockInterviewSession) =>
      runStep('reviewing', async (signal) => {
        const raw = await requestAI(buildReviewMessages(session), 2600, signal)
        const now = Date.now()
        const completed: MockInterviewSession = {
          ...session,
          status: 'completed',
          completedAt: now,
          report: {
            markdown: raw,
            overallScore: extractOverallScore(raw),
            dimensions: extractDimensionScores(raw),
            recommendedQuestionIds: [],
            createdAt: now,
          },
        }
        const recommended = recommendPracticeQuestions(completed, questions)
        await saveSession({
          ...completed,
          report: {
            ...(completed.report as NonNullable<MockInterviewSession['report']>),
            recommendedQuestionIds: recommended.map((q) => q.id),
          },
        })
        requestAnimationFrame(() =>
          reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        )
      }),
    [questions, requestAI, runStep, saveSession],
  )

  const handleStart = async () => {
    if (!aiReady) return setError('请先在设置中启用 AI 并配置 API Key')
    if (!form.roleTitle.trim()) return setError('请填写目标岗位')
    if (!form.jdText.trim() && !form.resumeText.trim()) {
      return setError('请至少提供 JD 或简历文本')
    }
    const input: MockInterviewSetupInput = { ...form, model: config.model }
    const draftSession = createMockInterviewSession(input)
    setActive(draftSession)
    const ok = await runStep('planning', async (signal) => {
      const raw = await requestAI(buildPlanMessages(input), 1400, signal)
      const plan = parsePlan(
        raw,
        `我们先从你的经历开始。请结合简历，介绍一个和 ${form.roleTitle} 最相关的项目。`,
      )
      await saveSession({
        ...draftSession,
        status: 'interviewing',
        plan,
        questionIndex: 1,
        startedAt: Date.now(),
        turns: [createMockInterviewTurn('interviewer', 'question', plan.openingQuestion)],
      })
    })
    if (!ok) setActive((current) => (current?.id === draftSession.id ? null : current))
  }

  const handleSubmit = async () => {
    if (!active || active.status !== 'interviewing' || isBusy) return
    const answer = draft.trim()
    if (!answer) return
    speech.stop()
    setDraft('')
    const answered = await saveSession({
      ...active,
      turns: [...active.turns, createMockInterviewTurn('candidate', 'answer', answer)],
    })
    let closed: MockInterviewSession | null = null
    await runStep('interviewing', async (signal) => {
      const reply = parseInterviewerReply(
        await requestAI(buildInterviewerMessages(answered, answer, 'answer'), 900, signal),
      )
      const kind =
        reply.action === 'complete'
          ? 'closing'
          : reply.action === 'next_question'
            ? 'question'
            : 'follow_up'
      const saved = await saveSession({
        ...answered,
        turns: [...answered.turns, createMockInterviewTurn('interviewer', kind, reply.question)],
        questionIndex:
          reply.action === 'next_question'
            ? Math.min(answered.targetQuestionCount, answered.questionIndex + 1)
            : answered.questionIndex,
        followUpDepth: reply.action === 'follow_up' ? answered.followUpDepth + 1 : 0,
      })
      if (reply.action === 'complete') closed = saved
    })
    if (closed) await finishSession(closed)
  }

  const handleClarify = async () => {
    if (!active || active.status !== 'interviewing' || isBusy) return
    const text = '请你澄清一下当前问题。'
    const asked = await saveSession({
      ...active,
      turns: [...active.turns, createMockInterviewTurn('candidate', 'answer', text)],
    })
    await runStep('interviewing', async (signal) => {
      const reply = parseInterviewerReply(
        await requestAI(buildInterviewerMessages(asked, text, 'clarify'), 600, signal),
      )
      await saveSession({
        ...asked,
        turns: [
          ...asked.turns,
          createMockInterviewTurn('interviewer', 'clarification', reply.question),
        ],
      })
    })
  }

  const handleRepeat = async () => {
    if (!active || active.status !== 'interviewing' || isBusy) return
    const last = [...active.turns]
      .reverse()
      .find((t) => t.role === 'interviewer' && t.kind !== 'closing')
    if (!last) return
    await saveSession({
      ...active,
      turns: [
        ...active.turns,
        createMockInterviewTurn('interviewer', 'clarification', `我重复一下：${last.content}`),
      ],
    })
  }

  const handleFinish = async () => {
    if (!active || active.status === 'completed' || isBusy) return
    speech.stop()
    const lastTurn = active.turns.at(-1)
    const next =
      lastTurn?.kind === 'closing'
        ? active
        : await saveSession({
            ...active,
            turns: [
              ...active.turns,
              createMockInterviewTurn(
                'interviewer',
                'closing',
                '好的，本次模拟面试到这里。接下来我会基于刚才的表现做复盘。',
              ),
            ],
          })
    await finishSession(next)
  }

  const resetRoom = () => {
    abortRef.current?.abort()
    speech.stop()
    setError(null)
    resetText('')
  }

  const handleNew = () => {
    resetRoom()
    setActive(null)
    topRef.current?.scrollIntoView({ block: 'start' })
  }

  const handleSelect = (session: MockInterviewSession) => {
    resetRoom()
    setActive(session)
    // Prefill the next interview from this one, unless the user already started a setup.
    if (JSON.stringify(form) === JSON.stringify(DEFAULT_FORM)) setForm(formFromSession(session))
    topRef.current?.scrollIntoView({ block: 'start' })
  }

  const handleDelete = async (session: MockInterviewSession) => {
    await deleteMockInterview(session.id)
    setSessions((prev) => prev.filter((s) => s.id !== session.id))
    if (active?.id === session.id) handleNew()
    toast('已删除面试记录', {
      description: session.title,
      action: {
        label: '撤销',
        onClick: async () => {
          await putMockInterview(session)
          setSessions((prev) => sortSessions([session, ...prev]))
        },
      },
    })
  }

  const recommendations = useMemo(() => {
    const ids = active?.report?.recommendedQuestionIds ?? []
    if (ids.length === 0) return []
    const byId = new Map(questions.map((q) => [q.id, q]))
    return ids.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q))
  }, [active?.report?.recommendedQuestionIds, questions])

  const startPractice = () => {
    const ids = recommendations.map((q) => q.id)
    if (ids.length > 0) navigate(createPracticeSessionPath(ids[0], ids))
  }

  const progress = active ? sessionProgress(active) : null
  const questionNumbers = useMemo(() => {
    const map = new Map<string, number>()
    let n = 0
    for (const turn of active?.turns ?? []) {
      if (turn.role === 'interviewer' && turn.kind === 'question') map.set(turn.id, ++n)
    }
    return map
  }, [active?.turns])

  const awaitingReview =
    active?.status === 'interviewing' && active.turns.at(-1)?.kind === 'closing' && !isBusy

  const aiCallout = !aiReady ? (
    <Callout tone="warning" icon={<Settings2 />} title="还没有配置 AI">
      模拟面试需要 AI 扮演面试官，先在设置中填入 API Key 并启用 AI。
      <Button
        variant="link"
        size="sm"
        className="ml-1 h-auto p-0"
        onClick={() => openSettings('ai')}
      >
        去设置
      </Button>
    </Callout>
  ) : null

  const errorCallout = error ? (
    <Callout tone="danger" icon={<CircleAlert />}>
      {error}
    </Callout>
  ) : null

  const history = (
    <HistoryList
      sessions={sessions}
      activeId={active?.id ?? null}
      disabled={isBusy}
      onSelect={handleSelect}
      onDelete={handleDelete}
    />
  )

  return (
    <>
      <PageHeader
        title={
          <Breadcrumb
            items={
              active
                ? [
                    { label: '模拟面试', onClick: isBusy ? undefined : handleNew },
                    { label: active.title },
                  ]
                : [{ label: '模拟面试' }]
            }
          />
        }
        actions={
          active ? (
            <>
              {active.status === 'interviewing' && !awaitingReview ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isBusy || !active.turns.some((t) => t.role === 'candidate')}
                  onClick={handleFinish}
                >
                  <Flag />
                  结束面试
                </Button>
              ) : null}
              <Button variant="primary" size="sm" disabled={isBusy} onClick={handleNew}>
                <Plus />
                新面试
              </Button>
            </>
          ) : null
        }
      />
      <div
        ref={topRef}
        className="mx-auto max-w-[1240px] scroll-mt-20 px-4 py-8 sm:px-8 lg:px-12 lg:py-10"
      >
        {!active ? (
          <>
            <PageTitle
              title="模拟面试"
              description="AI 扮演面试官，基于岗位 JD 和简历一问一答，结束后给出评分与改进建议。"
            />
            <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex min-w-0 flex-col gap-4">
                {aiCallout}
                {errorCallout}
                <SetupPanel
                  form={form}
                  onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                  onError={setError}
                  footer={
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-fg-subtle">
                        {MOCK_TYPE_LABELS[form.interviewType]} · {MOCK_LEVEL_LABELS[form.level]} ·
                        约 {form.durationMinutes} 分钟 · {form.targetQuestionCount} 道主问题
                      </p>
                      <Button
                        variant="primary"
                        onClick={handleStart}
                        disabled={
                          !aiReady ||
                          !form.roleTitle.trim() ||
                          (!form.jdText.trim() && !form.resumeText.trim())
                        }
                        className="max-sm:w-full"
                      >
                        <Sparkles />
                        开始面试
                      </Button>
                    </div>
                  }
                />
              </div>
              <aside className="flex min-w-0 flex-col gap-5">
                <HowItWorks />
                {history}
              </aside>
            </div>
          </>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex min-w-0 flex-col">
              <PageTitle
                title={active.title}
                description={`${MOCK_TYPE_LABELS[active.interviewType]} · ${MOCK_LEVEL_LABELS[active.level]} · ${formatSessionTime(active.startedAt ?? active.createdAt)}`}
                actions={
                  active.status === 'completed' ? (
                    <Tag variant="success">已完成</Tag>
                  ) : active.status === 'interviewing' ? (
                    <Tag variant="accent">进行中</Tag>
                  ) : null
                }
              />

              <div className="mt-8 flex flex-col gap-6">
                {active.turns.map((turn) => (
                  <TurnBubble
                    key={turn.id}
                    turn={turn}
                    questionNumber={questionNumbers.get(turn.id)}
                  />
                ))}
                {busy === 'planning' || busy === 'interviewing' ? (
                  <PendingBubble busy={busy} text={streamingText} />
                ) : null}
              </div>

              {errorCallout ? <div className="mt-6">{errorCallout}</div> : null}

              {awaitingReview ? (
                <Callout
                  tone="accent"
                  icon={<Sparkles />}
                  className="mt-6"
                  title="面试已结束，复盘报告还没有生成"
                >
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-2"
                    onClick={() => finishSession(active)}
                  >
                    生成复盘报告
                  </Button>
                </Callout>
              ) : null}

              {busy === 'reviewing' || active.report ? (
                <div className="mt-8">
                  <ReportView
                    ref={reportRef}
                    report={busy === 'reviewing' ? null : (active.report ?? null)}
                    streamingMarkdown={streamingText}
                    recommendations={busy === 'reviewing' ? [] : recommendations}
                    onPractice={startPractice}
                  />
                </div>
              ) : null}

              {active.status === 'interviewing' && !awaitingReview ? (
                <div className="sticky bottom-0 z-10 -mx-1 mt-6 bg-gradient-to-t from-canvas from-70% to-transparent px-1 pt-4 pb-4">
                  <Composer
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        handleSubmit()
                      }
                    }}
                    disabled={isBusy}
                    aria-label="你的回答"
                    placeholder={
                      speech.interimTranscript
                        ? `正在识别：${speech.interimTranscript}`
                        : '像真实面试一样作答，可以用语音输入…'
                    }
                    rows={3}
                    className="shadow-raised"
                    textareaClassName="min-h-20 max-h-[40dvh] resize-y"
                    toolbar={
                      <>
                        <SpeechInputButton
                          supported={speech.supported}
                          listening={speech.listening}
                          disabled={isBusy}
                          showLabel
                          onToggle={speech.toggle}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={handleRepeat}
                          className="max-sm:px-2"
                        >
                          <Repeat2 />
                          <span className="max-sm:hidden">重复问题</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={handleClarify}
                          className="max-sm:px-2"
                        >
                          <CircleHelp />
                          <span className="max-sm:hidden">澄清题意</span>
                        </Button>
                        <Button
                          variant="accent"
                          size="sm"
                          className="ml-auto"
                          loading={busy === 'interviewing'}
                          disabled={!draft.trim()}
                          onClick={handleSubmit}
                          shortcut={SUBMIT_SHORTCUT}
                        >
                          <Send />
                          回答
                        </Button>
                      </>
                    }
                  />
                </div>
              ) : null}
              <div ref={endRef} className="scroll-mb-4" />
            </div>

            <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-20">
              {progress ? <SessionOverview session={active} progress={progress} /> : null}
              {history}
            </aside>
          </div>
        )}
      </div>
    </>
  )
}
