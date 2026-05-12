import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SettingsDrawer } from '@/components/layout/SettingsDrawer'
import { Badge, Button, Spinner } from '@/components/ui'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { SpeechInputButton } from '@/components/ui/SpeechInputButton'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { type ChatCompletionMessage, requestChatCompletionStream } from '@/lib/aiClient'
import {
  deleteMockInterview,
  getAllMockInterviews,
  getAllQuestions,
  putMockInterview,
} from '@/lib/db'
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
import { parseResumeFile } from '@/lib/resumeParser'
import { useAIStore } from '@/store/useAIStore'
import type { MockInterviewLevel, MockInterviewSession, MockInterviewType, Question } from '@/types'

type BusyState = 'idle' | 'planning' | 'interviewing' | 'reviewing'

interface SetupForm {
  roleTitle: string
  level: MockInterviewLevel
  interviewType: MockInterviewType
  durationMinutes: number
  targetQuestionCount: number
  jdText: string
  resumeText: string
  resumeFileName?: string
}

const DEFAULT_FORM: SetupForm = {
  roleTitle: '前端工程师',
  level: 'mid',
  interviewType: 'comprehensive',
  durationMinutes: 30,
  targetQuestionCount: 6,
  jdText: '',
  resumeText: '',
}

const levelOptions: MockInterviewLevel[] = ['junior', 'mid', 'senior']
const typeOptions: MockInterviewType[] = ['technical', 'project', 'comprehensive']

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return '未开始'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function countCandidateAnswers(session: MockInterviewSession): number {
  return session.turns.filter((turn) => turn.role === 'candidate').length
}

function countInterviewerQuestions(session: MockInterviewSession): number {
  return session.turns.filter(
    (turn) =>
      turn.role === 'interviewer' && (turn.kind === 'question' || turn.kind === 'follow_up'),
  ).length
}

function updatedSession(session: MockInterviewSession): MockInterviewSession {
  return { ...session, updatedAt: Date.now() }
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
      {hint && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{hint}</span>}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      style={{
        height: 38,
        width: '100%',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--surface)',
        color: 'var(--text)',
        padding: '0 12px',
        fontSize: 13,
        outline: 'none',
      }}
    />
  )
}

function SelectInput<T extends string>({
  value,
  options,
  labels,
  onChange,
}: {
  value: T
  options: T[]
  labels: Record<T, string>
  onChange: (value: T) => void
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      style={{
        height: 38,
        width: '100%',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--surface)',
        color: 'var(--text)',
        padding: '0 10px',
        fontSize: 13,
        outline: 'none',
      }}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels[option]}
        </option>
      ))}
    </select>
  )
}

function TextArea({
  value,
  onChange,
  placeholder,
  minHeight = 120,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  minHeight?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        minHeight,
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--surface)',
        color: 'var(--text)',
        padding: '10px 12px',
        fontSize: 13,
        lineHeight: 1.6,
        resize: 'vertical',
        outline: 'none',
        fontFamily: 'var(--font-sans)',
      }}
    />
  )
}

function ScorePill({ score, size = 'md' }: { score: number | null; size?: 'sm' | 'md' }) {
  if (score === null)
    return (
      <Badge variant="ghost" size={size}>
        未评分
      </Badge>
    )
  const variant = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'
  return (
    <Badge variant={variant} size={size}>
      {score}/100
    </Badge>
  )
}

function cleanDimensionComment(comment: string): string {
  const cleaned = comment.replace(/[*_`]/g, '').trim()
  return cleaned.length > 0 ? cleaned : ''
}

export default function MockInterview() {
  const navigate = useNavigate()
  const { config } = useAIStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState<SetupForm>(DEFAULT_FORM)
  const [sessions, setSessions] = useState<MockInterviewSession[]>([])
  const [activeSession, setActiveSession] = useState<MockInterviewSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [draftAnswer, setDraftAnswer] = useState('')
  const [busy, setBusy] = useState<BusyState>('idle')
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resumeMessage, setResumeMessage] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [parsingResume, setParsingResume] = useState(false)
  const [setupCollapsed, setSetupCollapsed] = useState(false)
  const [scrollToReportOnReady, setScrollToReportOnReady] = useState(false)

  const isBusy = busy !== 'idle'
  const aiReady = config.enabled && config.apiKey.trim().length > 0
  const setupIsCollapsed = Boolean(activeSession) && setupCollapsed
  const transcriptScrollKey = `${activeSession?.id ?? ''}:${activeSession?.turns.length ?? 0}:${streamingText.length}`
  const reportReadyKey = activeSession?.report?.createdAt ?? 0
  const busyLabel =
    busy === 'planning'
      ? '正在生成面试计划'
      : busy === 'reviewing'
        ? '正在生成复盘报告'
        : busy === 'interviewing'
          ? '面试官正在思考'
          : ''

  const loadSessions = useCallback(async () => {
    const loaded = await getAllMockInterviews()
    setSessions(loaded)
  }, [])

  useEffect(() => {
    loadSessions()
    getAllQuestions().then(setQuestions)
  }, [loadSessions])

  useEffect(() => {
    if (!transcriptScrollKey) return
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [transcriptScrollKey])

  useEffect(() => {
    if (!reportReadyKey || !scrollToReportOnReady) return
    window.requestAnimationFrame(() => {
      reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setScrollToReportOnReady(false)
    })
  }, [reportReadyKey, scrollToReportOnReady])

  const saveSession = useCallback(async (session: MockInterviewSession) => {
    const next = updatedSession(session)
    await putMockInterview(next)
    setActiveSession(next)
    setSessions((prev) =>
      [next, ...prev.filter((item) => item.id !== next.id)].sort(
        (a, b) => b.updatedAt - a.updatedAt,
      ),
    )
    return next
  }, [])

  const requestAI = useCallback(
    async (
      messages: ChatCompletionMessage[],
      onDelta: (delta: string) => void,
      maxTokens = 1800,
    ) => {
      if (!config.enabled) throw new Error('请先在设置中启用 AI 功能')
      if (!config.apiKey.trim()) throw new Error('请先在设置中配置 API Key')

      return requestChatCompletionStream({
        config: {
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model,
          temperature: Math.min(0.8, Math.max(0.3, config.temperature)),
          maxTokens,
        },
        messages,
        onDelta,
      })
    },
    [config],
  )

  const speech = useSpeechRecognition({
    lang: 'zh-CN',
    onFinalTranscript: (text) => {
      setDraftAnswer((prev) => `${prev}${prev.trim() ? '\n' : ''}${text}`)
    },
  })

  const updateForm = useCallback((patch: Partial<SetupForm>) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleResumeFile = useCallback(
    async (file: File) => {
      setParsingResume(true)
      setResumeMessage(null)
      setError(null)
      try {
        const parsed = await parseResumeFile(file)
        updateForm({
          resumeText: parsed.text,
          resumeFileName: parsed.fileName,
        })
        setResumeMessage(parsed.warning ?? `已解析 ${parsed.fileName}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : '简历解析失败')
      } finally {
        setParsingResume(false)
        if (fileRef.current) fileRef.current.value = ''
      }
    },
    [updateForm],
  )

  const finishSession = useCallback(
    async (session: MockInterviewSession) => {
      setBusy('reviewing')
      setStreamingText('')
      setError(null)

      try {
        const rawReport = await requestAI(
          buildReviewMessages(session),
          (delta) => setStreamingText((prev) => prev + delta),
          2600,
        )
        const report = {
          markdown: rawReport,
          overallScore: extractOverallScore(rawReport),
          dimensions: extractDimensionScores(rawReport),
          recommendedQuestionIds: [],
          createdAt: Date.now(),
        }
        const sessionWithReport: MockInterviewSession = {
          ...session,
          status: 'completed',
          completedAt: Date.now(),
          report,
        }
        const recommended = recommendPracticeQuestions(sessionWithReport, questions)
        await saveSession({
          ...sessionWithReport,
          report: {
            ...report,
            recommendedQuestionIds: recommended.map((question) => question.id),
          },
        })
        setScrollToReportOnReady(true)
        setStreamingText('')
      } catch (err) {
        setError(err instanceof Error ? err.message : '生成复盘失败')
      } finally {
        setBusy('idle')
      }
    },
    [questions, requestAI, saveSession],
  )

  const handleStartInterview = useCallback(async () => {
    if (!aiReady) {
      setError('请先在设置中启用 AI 并配置 API Key')
      return
    }

    if (!form.roleTitle.trim()) {
      setError('请填写目标岗位')
      return
    }

    if (!form.jdText.trim() && !form.resumeText.trim()) {
      setError('请至少提供 JD 或简历文本')
      return
    }

    setBusy('planning')
    setStreamingText('')
    setError(null)

    const input: MockInterviewSetupInput = { ...form, model: config.model }
    const draftSession = createMockInterviewSession(input)
    setActiveSession(draftSession)

    try {
      const rawPlan = await requestAI(
        buildPlanMessages(input),
        (delta) => setStreamingText((prev) => prev + delta),
        1400,
      )
      const fallbackQuestion = `我们先从你的经历开始。请结合简历，介绍一个和 ${form.roleTitle} 最相关的项目。`
      const plan = parsePlan(rawPlan, fallbackQuestion)
      const next: MockInterviewSession = {
        ...draftSession,
        status: 'interviewing',
        plan,
        questionIndex: 1,
        startedAt: Date.now(),
        turns: [createMockInterviewTurn('interviewer', 'question', plan.openingQuestion)],
      }
      await saveSession(next)
      setSetupCollapsed(true)
      setStreamingText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成面试计划失败')
      setActiveSession(null)
    } finally {
      setBusy('idle')
    }
  }, [aiReady, config.model, form, requestAI, saveSession])

  const handleSubmitAnswer = useCallback(async () => {
    if (!activeSession || activeSession.status !== 'interviewing' || isBusy) return
    const answer = draftAnswer.trim()
    if (!answer) return

    speech.stop()
    setDraftAnswer('')
    setBusy('interviewing')
    setStreamingText('')
    setError(null)

    const answeredSession = await saveSession({
      ...activeSession,
      turns: [...activeSession.turns, createMockInterviewTurn('candidate', 'answer', answer)],
    })

    try {
      const rawReply = await requestAI(
        buildInterviewerMessages(answeredSession, answer, 'answer'),
        (delta) => setStreamingText((prev) => prev + delta),
        900,
      )
      const reply = parseInterviewerReply(rawReply)
      const kind =
        reply.action === 'complete'
          ? 'closing'
          : reply.action === 'next_question'
            ? 'question'
            : 'follow_up'
      const nextSession: MockInterviewSession = {
        ...answeredSession,
        turns: [
          ...answeredSession.turns,
          createMockInterviewTurn('interviewer', kind, reply.question),
        ],
        questionIndex:
          reply.action === 'next_question'
            ? Math.min(answeredSession.targetQuestionCount, answeredSession.questionIndex + 1)
            : answeredSession.questionIndex,
        followUpDepth: reply.action === 'follow_up' ? answeredSession.followUpDepth + 1 : 0,
      }
      const saved = await saveSession(nextSession)
      setStreamingText('')

      if (reply.action === 'complete') {
        await finishSession(saved)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '面试官响应失败')
    } finally {
      setBusy('idle')
    }
  }, [activeSession, draftAnswer, finishSession, isBusy, requestAI, saveSession, speech])

  const handleClarify = useCallback(async () => {
    if (!activeSession || activeSession.status !== 'interviewing' || isBusy) return

    setBusy('interviewing')
    setStreamingText('')
    setError(null)

    const clarifyText = '请你澄清一下当前问题。'
    const clarifiedSession = await saveSession({
      ...activeSession,
      turns: [...activeSession.turns, createMockInterviewTurn('candidate', 'answer', clarifyText)],
    })

    try {
      const rawReply = await requestAI(
        buildInterviewerMessages(clarifiedSession, clarifyText, 'clarify'),
        (delta) => setStreamingText((prev) => prev + delta),
        600,
      )
      const reply = parseInterviewerReply(rawReply)
      await saveSession({
        ...clarifiedSession,
        turns: [
          ...clarifiedSession.turns,
          createMockInterviewTurn('interviewer', 'clarification', reply.question),
        ],
      })
      setStreamingText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '澄清问题失败')
    } finally {
      setBusy('idle')
    }
  }, [activeSession, isBusy, requestAI, saveSession])

  const handleRepeatQuestion = useCallback(async () => {
    if (!activeSession || activeSession.status !== 'interviewing' || isBusy) return
    const lastQuestion = [...activeSession.turns]
      .reverse()
      .find((turn) => turn.role === 'interviewer' && turn.kind !== 'closing')
    if (!lastQuestion) return

    await saveSession({
      ...activeSession,
      turns: [
        ...activeSession.turns,
        createMockInterviewTurn(
          'interviewer',
          'clarification',
          `我重复一下：${lastQuestion.content}`,
        ),
      ],
    })
  }, [activeSession, isBusy, saveSession])

  const handleFinishNow = useCallback(async () => {
    if (!activeSession || activeSession.status === 'completed' || isBusy) return
    speech.stop()
    const closing = createMockInterviewTurn(
      'interviewer',
      'closing',
      '好的，本次模拟面试到这里。接下来我会基于刚才的表现做复盘。',
    )
    const next = await saveSession({
      ...activeSession,
      turns: [...activeSession.turns, closing],
    })
    await finishSession(next)
  }, [activeSession, finishSession, isBusy, saveSession, speech])

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      await deleteMockInterview(sessionId)
      setSessions((prev) => prev.filter((session) => session.id !== sessionId))
      if (activeSession?.id === sessionId) {
        setActiveSession(null)
        setSetupCollapsed(false)
      }
    },
    [activeSession?.id],
  )

  const handleSelectSession = useCallback((session: MockInterviewSession) => {
    setActiveSession(session)
    setForm({
      roleTitle: session.roleTitle,
      level: session.level,
      interviewType: session.interviewType,
      durationMinutes: session.durationMinutes,
      targetQuestionCount: session.targetQuestionCount,
      jdText: session.jdText,
      resumeText: session.resumeText,
      resumeFileName: session.resumeFileName,
    })
    setDraftAnswer('')
    setStreamingText('')
    setError(null)
    setSetupCollapsed(true)
  }, [])

  const handleNewInterview = useCallback(() => {
    speech.stop()
    setActiveSession(null)
    setDraftAnswer('')
    setStreamingText('')
    setError(null)
    setSetupCollapsed(false)
  }, [speech.stop])

  const activeRecommendations = useMemo(() => {
    const ids = activeSession?.report?.recommendedQuestionIds ?? []
    if (!ids.length) return []
    const byId = new Map(questions.map((question) => [question.id, question]))
    return ids.map((id) => byId.get(id)).filter((item): item is Question => Boolean(item))
  }, [activeSession?.report?.recommendedQuestionIds, questions])

  const handleStartPractice = useCallback(() => {
    const ids = activeRecommendations.map((question) => question.id)
    if (!ids.length) return
    navigate(createPracticeSessionPath(ids[0], ids))
  }, [activeRecommendations, navigate])

  const answerCount = activeSession ? countCandidateAnswers(activeSession) : 0
  const interviewerQuestionCount = activeSession ? countInterviewerQuestions(activeSession) : 0

  return (
    <>
      <div className={`page-container mock-page ${activeSession ? 'has-active-session' : ''}`}>
        <div
          className="animate-fade-in"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--text)',
                letterSpacing: '-0.015em',
                marginBottom: 4,
              }}
            >
              模拟面试
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
              基于岗位 JD 和简历进行一问一答，结束后查看评分与改进建议
            </p>
          </div>
          {!aiReady && (
            <Button variant="primary" size="sm" onClick={() => setSettingsOpen(true)}>
              配置 AI
            </Button>
          )}
        </div>

        {error && (
          <div
            style={{
              border: '1px solid rgba(239,68,68,0.22)',
              background: 'var(--danger-light)',
              color: 'var(--danger)',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div
          className={`mock-interview-grid ${setupIsCollapsed ? 'is-collapsed' : ''} ${
            activeSession ? 'has-active' : ''
          }`}
          style={{
            display: 'grid',
            gap: 16,
            alignItems: 'start',
          }}
        >
          <aside className="mock-sidebar">
            {setupIsCollapsed ? (
              <section className="mock-panel mock-context-panel">
                <div className="mock-panel-header">
                  <h2>本场面试</h2>
                  <Badge variant="success">{config.model}</Badge>
                </div>
                <div className="mock-context-meta">
                  <span>岗位</span>
                  <strong>{activeSession?.roleTitle || form.roleTitle || '未指定'}</strong>
                  <span>模式</span>
                  <strong>
                    {activeSession
                      ? `${MOCK_TYPE_LABELS[activeSession.interviewType]} · ${
                          MOCK_LEVEL_LABELS[activeSession.level]
                        }`
                      : `${MOCK_TYPE_LABELS[form.interviewType]} · ${MOCK_LEVEL_LABELS[form.level]}`}
                  </strong>
                  <span>进度</span>
                  <strong>
                    {answerCount} 次作答 · {interviewerQuestionCount}/
                    {activeSession?.targetQuestionCount ?? form.targetQuestionCount} 问
                  </strong>
                </div>
                <div className="mock-context-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => setSetupCollapsed(false)}
                  >
                    面试资料
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={handleNewInterview}
                  >
                    新面试
                  </Button>
                </div>
              </section>
            ) : (
              <section className="mock-panel">
                <div className="mock-panel-header">
                  <h2>{activeSession ? '面试资料' : '准备面试'}</h2>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Badge variant={aiReady ? 'success' : 'warning'}>
                      {aiReady ? config.model : 'AI 未配置'}
                    </Badge>
                    {activeSession && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSetupCollapsed(true)}
                      >
                        收起
                      </Button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <FieldLabel label="目标岗位" />
                    <TextInput
                      value={form.roleTitle}
                      onChange={(value) => updateForm({ roleTitle: value })}
                      placeholder="例如：前端工程师"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <FieldLabel label="级别" />
                      <SelectInput
                        value={form.level}
                        options={levelOptions}
                        labels={MOCK_LEVEL_LABELS}
                        onChange={(value) => updateForm({ level: value })}
                      />
                    </div>
                    <div>
                      <FieldLabel label="面试类型" />
                      <SelectInput
                        value={form.interviewType}
                        options={typeOptions}
                        labels={MOCK_TYPE_LABELS}
                        onChange={(value) => updateForm({ interviewType: value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <FieldLabel label="时长" />
                      <select
                        value={form.durationMinutes}
                        onChange={(event) =>
                          updateForm({ durationMinutes: Number(event.target.value) })
                        }
                        className="mock-select"
                      >
                        {[15, 30, 45, 60].map((minute) => (
                          <option key={minute} value={minute}>
                            {minute} 分钟
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel label="题数" />
                      <select
                        value={form.targetQuestionCount}
                        onChange={(event) =>
                          updateForm({ targetQuestionCount: Number(event.target.value) })
                        }
                        className="mock-select"
                      >
                        {[4, 6, 8, 10].map((count) => (
                          <option key={count} value={count}>
                            {count} 题
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="岗位 JD" />
                    <TextArea
                      value={form.jdText}
                      onChange={(value) => updateForm({ jdText: value })}
                      placeholder="粘贴岗位职责、任职要求、技术栈关键词..."
                      minHeight={120}
                    />
                  </div>

                  <div>
                    <FieldLabel
                      label="简历"
                      hint={form.resumeFileName ?? '支持 PDF、DOCX、TXT、MD'}
                    />
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.md,text/plain,text/markdown,application/pdf"
                      style={{ display: 'none' }}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) handleResumeFile(file)
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={parsingResume}
                        onClick={() => fileRef.current?.click()}
                      >
                        上传解析
                      </Button>
                      {form.resumeText && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateForm({ resumeText: '', resumeFileName: undefined })}
                        >
                          清空
                        </Button>
                      )}
                    </div>
                    {resumeMessage && (
                      <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
                        {resumeMessage}
                      </p>
                    )}
                    <TextArea
                      value={form.resumeText}
                      onChange={(value) => updateForm({ resumeText: value })}
                      placeholder="也可以直接粘贴简历文本..."
                      minHeight={120}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    loading={busy === 'planning'}
                    onClick={handleStartInterview}
                  >
                    开始面试
                  </Button>
                </div>
              </section>
            )}

            <section className="mock-panel">
              <div className="mock-panel-header">
                <h2>历史记录</h2>
                <Badge variant="ghost">{sessions.length}</Badge>
              </div>
              <div className="mock-history-list">
                {sessions.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>暂无记录</p>
                ) : (
                  sessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleSelectSession(session)}
                      className="mock-history-item"
                      data-active={activeSession?.id === session.id}
                    >
                      <span className="mock-history-main">
                        <strong>{session.title}</strong>
                        <span>{formatDateTime(session.updatedAt)}</span>
                      </span>
                      <span className="mock-history-score">
                        <ScorePill score={session.report?.overallScore ?? null} size="sm" />
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>
          </aside>

          <section className="mock-room">
            {!activeSession ? (
              <div className="mock-empty">
                <h2>面试室待开始</h2>
                <p>填入岗位资料后开始。</p>
              </div>
            ) : (
              <>
                <div className="mock-room-header">
                  <div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                    >
                      <h2>{activeSession.title}</h2>
                      <Badge variant={activeSession.status === 'completed' ? 'success' : 'primary'}>
                        {activeSession.status === 'completed' ? '已完成' : '进行中'}
                      </Badge>
                    </div>
                    <p>
                      {MOCK_TYPE_LABELS[activeSession.interviewType]} ·{' '}
                      {MOCK_LEVEL_LABELS[activeSession.level]} · {answerCount} 次作答 ·{' '}
                      {interviewerQuestionCount}/{activeSession.targetQuestionCount} 问
                    </p>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {activeSession.status !== 'completed' && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={isBusy}
                        onClick={handleFinishNow}
                      >
                        结束并复盘
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleDeleteSession(activeSession.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>

                {isBusy && busyLabel && (
                  <output className="mock-busy-banner" aria-live="polite">
                    <Spinner size="sm" />
                    <span>{busyLabel}…</span>
                  </output>
                )}

                {activeSession.plan && (
                  <div className="mock-plan">
                    <div>
                      <strong>面试重点</strong>
                      <p>{activeSession.plan.summary}</p>
                    </div>
                    <div className="mock-focus-list">
                      {activeSession.plan.focusAreas.map((item) => (
                        <Badge key={item} variant="ghost">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mock-transcript">
                  {activeSession.turns.map((turn) => (
                    <div key={turn.id} className={`mock-turn mock-turn-${turn.role}`}>
                      <div className="mock-turn-label">
                        {turn.role === 'interviewer' ? '面试官' : '候选人'}
                        <span>{formatDateTime(turn.createdAt)}</span>
                      </div>
                      <p>{turn.content}</p>
                    </div>
                  ))}

                  {streamingText && (
                    <div className="mock-turn mock-turn-interviewer">
                      <div className="mock-turn-label">
                        {busy === 'reviewing'
                          ? '复盘生成中'
                          : busy === 'planning'
                            ? '计划生成中'
                            : '面试官'}
                      </div>
                      {busy === 'reviewing' ? (
                        <MarkdownRenderer content={streamingText} className="mock-markdown" />
                      ) : (
                        <p>{streamingText}</p>
                      )}
                    </div>
                  )}
                  {isBusy && !streamingText && (
                    <div className="mock-turn mock-turn-interviewer mock-turn-pending">
                      <div className="mock-turn-label">{busyLabel}</div>
                      <p>正在整理下一步内容，请稍等。</p>
                    </div>
                  )}
                  <div ref={transcriptEndRef} />
                </div>

                {activeSession.status === 'interviewing' && (
                  <div className="mock-answer-box">
                    <textarea
                      value={draftAnswer}
                      onChange={(event) => setDraftAnswer(event.target.value)}
                      placeholder="像真实面试一样作答，可以用语音输入。"
                      disabled={isBusy}
                    />
                    <div className="mock-answer-actions">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <SpeechInputButton
                          supported={speech.supported}
                          listening={speech.listening}
                          disabled={isBusy}
                          showLabel
                          onToggle={speech.toggle}
                        />
                        {speech.interimTranscript && (
                          <span className="mock-interim">正在识别：{speech.interimTranscript}</span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          flexWrap: 'wrap',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={handleRepeatQuestion}
                        >
                          重复问题
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isBusy}
                          onClick={handleClarify}
                        >
                          澄清题意
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          loading={busy === 'interviewing'}
                          disabled={!draftAnswer.trim()}
                          onClick={handleSubmitAnswer}
                        >
                          提交回答
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {activeSession.report && (
                  <div className="mock-report" ref={reportRef}>
                    <div className="mock-report-header">
                      <div>
                        <h2>复盘报告</h2>
                        <p>{formatDateTime(activeSession.report.createdAt)}</p>
                      </div>
                      <ScorePill score={activeSession.report.overallScore} />
                    </div>

                    {activeSession.report.dimensions.length > 0 && (
                      <div className="mock-dimensions">
                        {activeSession.report.dimensions.map((dimension) => (
                          <div key={dimension.label}>
                            <strong>{dimension.label}</strong>
                            <span>{dimension.score}/100</span>
                            {cleanDimensionComment(dimension.comment) && (
                              <p>{cleanDimensionComment(dimension.comment)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <MarkdownRenderer
                      content={activeSession.report.markdown}
                      className="mock-markdown"
                    />

                    {activeRecommendations.length > 0 && (
                      <div className="mock-recommendations">
                        <div className="mock-panel-header">
                          <h2>相关练习</h2>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={handleStartPractice}
                          >
                            开始练习
                          </Button>
                        </div>
                        <div style={{ display: 'grid', gap: 8 }}>
                          {activeRecommendations.map((question) => (
                            <Link
                              key={question.id}
                              to={`/questions/${question.id}`}
                              className="mock-question-link"
                            >
                              <span>{question.question}</span>
                              <Badge variant="ghost">{question.module}</Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <style>{`
        .mock-page {
          max-width: 1100px;
        }

        .mock-interview-grid {
          grid-template-columns: 330px minmax(0, 1fr);
        }

        .mock-interview-grid.is-collapsed {
          grid-template-columns: 238px minmax(0, 1fr);
        }

        .mock-sidebar {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-width: 0;
        }

        .mock-panel,
        .mock-room {
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          background: var(--surface);
          box-shadow: var(--shadow-sm);
        }

        .mock-panel {
          padding: 14px;
          min-width: 0;
          overflow: hidden;
        }

        .mock-context-panel {
          position: sticky;
          top: calc(var(--navbar-h) + 14px);
        }

        .mock-context-meta {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 8px 10px;
          align-items: baseline;
          margin-bottom: 12px;
        }

        .mock-context-meta span {
          font-size: 11px;
          color: var(--text-3);
        }

        .mock-context-meta strong {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          color: var(--text);
        }

        .mock-context-actions {
          display: grid;
          gap: 8px;
        }

        .mock-panel-header,
        .mock-room-header,
        .mock-report-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .mock-panel-header h2,
        .mock-room-header h2,
        .mock-report-header h2 {
          font-size: 15px;
          line-height: 1.3;
          font-weight: 700;
          color: var(--text);
        }

        .mock-room-header p,
        .mock-report-header p {
          margin-top: 4px;
          font-size: 12px;
          color: var(--text-3);
        }

        .mock-select {
          height: 38px;
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--text);
          padding: 0 10px;
          font-size: 13px;
          outline: none;
        }

        .mock-history-list {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .mock-history-item {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          width: 100%;
          min-width: 0;
          max-width: 100%;
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          background: var(--surface-2);
          color: var(--text);
          padding: 10px;
          text-align: left;
          cursor: pointer;
          overflow: hidden;
        }

        .mock-history-main {
          min-width: 0;
          overflow: hidden;
        }

        .mock-history-score {
          display: flex;
          justify-content: flex-end;
          min-width: 0;
          max-width: 52px;
          overflow: hidden;
        }

        .mock-history-score > span {
          max-width: 100%;
          overflow: hidden;
        }

        .mock-history-item[data-active='true'] {
          border-color: rgba(var(--primary-rgb), 0.32);
          background: var(--primary-light);
        }

        .mock-history-item strong,
        .mock-history-main > span {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .mock-history-item strong {
          font-size: 12px;
          color: var(--text);
        }

        .mock-history-main > span {
          margin-top: 3px;
          font-size: 11px;
          color: var(--text-3);
        }

        .mock-room {
          min-height: 720px;
          min-width: 0;
          overflow: hidden;
          padding: 16px;
        }

        .mock-busy-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(var(--primary-rgb), 0.18);
          border-radius: 8px;
          background: var(--primary-light);
          color: var(--primary);
          padding: 9px 11px;
          margin-bottom: 14px;
          font-size: 12px;
          font-weight: 600;
        }

        .mock-empty {
          min-height: 520px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 8px;
          color: var(--text-3);
        }

        .mock-empty h2 {
          font-size: 18px;
          color: var(--text);
        }

        .mock-empty p {
          max-width: 420px;
          font-size: 13px;
        }

        .mock-plan {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: start;
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          background: var(--surface-2);
          padding: 12px;
          margin-bottom: 14px;
        }

        .mock-plan strong {
          display: block;
          font-size: 12px;
          color: var(--text);
          margin-bottom: 4px;
        }

        .mock-plan p {
          font-size: 12px;
          color: var(--text-2);
        }

        .mock-focus-list {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
          max-width: 340px;
        }

        .mock-transcript {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
          max-height: 520px;
          overflow: auto;
          padding: 2px 2px 12px;
        }

        .mock-turn {
          min-width: 0;
          max-width: min(760px, 92%);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 12px;
        }

        .mock-turn-interviewer {
          align-self: flex-start;
          background: var(--surface-2);
        }

        .mock-turn-candidate {
          align-self: flex-end;
          background: var(--primary-light);
          border-color: rgba(var(--primary-rgb), 0.16);
        }

        .mock-turn-pending {
          opacity: 0.82;
        }

        .mock-turn-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-2);
        }

        .mock-turn-label span {
          font-weight: 400;
          color: var(--text-3);
        }

        .mock-turn p {
          white-space: pre-wrap;
          word-break: break-word;
          overflow-wrap: anywhere;
          font-size: 14px;
          line-height: 1.7;
          color: var(--text);
        }

        .mock-answer-box {
          border-top: 1px solid var(--border-subtle);
          margin-top: 14px;
          padding-top: 14px;
        }

        .mock-answer-box textarea {
          width: 100%;
          min-height: 110px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--text);
          padding: 12px;
          font-size: 14px;
          line-height: 1.7;
          resize: vertical;
          outline: none;
          font-family: var(--font-sans);
        }

        .mock-answer-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 10px;
          flex-wrap: wrap;
        }

        .mock-interim {
          max-width: 260px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          color: var(--primary);
        }

        .mock-report {
          border-top: 1px solid var(--border-subtle);
          margin-top: 18px;
          padding-top: 18px;
        }

        .mock-dimensions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
          margin-bottom: 16px;
        }

        .mock-dimensions div {
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          background: var(--surface-2);
          padding: 10px;
        }

        .mock-dimensions strong,
        .mock-dimensions span {
          display: block;
          font-size: 12px;
          color: var(--text);
        }

        .mock-dimensions span {
          margin-top: 4px;
          font-weight: 700;
          color: var(--primary);
        }

        .mock-dimensions p {
          margin-top: 6px;
          font-size: 11px;
          color: var(--text-3);
          line-height: 1.5;
        }

        .mock-markdown {
          font-size: 14px;
          color: var(--text);
          overflow-wrap: anywhere;
        }

        .mock-recommendations {
          margin-top: 18px;
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          background: var(--surface-2);
          padding: 12px;
        }

        .mock-question-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          background: var(--surface);
          padding: 10px 12px;
          color: var(--text);
          text-decoration: none;
        }

        .mock-question-link span:first-child {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        @media (max-width: 920px) {
          .mock-interview-grid {
            grid-template-columns: 1fr !important;
          }

          .mock-interview-grid.has-active .mock-sidebar {
            order: 2;
          }

          .mock-interview-grid.has-active .mock-room {
            order: 1;
          }

          .mock-context-panel {
            position: static;
          }

          .mock-room {
            min-height: 560px;
          }

          .mock-turn {
            width: 100%;
            max-width: 100%;
          }

          .mock-plan {
            grid-template-columns: 1fr;
          }

          .mock-focus-list {
            justify-content: flex-start;
            max-width: none;
          }
        }
      `}</style>
    </>
  )
}
