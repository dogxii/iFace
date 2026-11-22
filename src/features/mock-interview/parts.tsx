import {
  ArrowRight,
  Code2,
  FolderGit2,
  Layers,
  type LucideIcon,
  MessagesSquare,
  Play,
  Trash2,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ResumeInput } from '@/components/ResumeInput'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { MOCK_LEVEL_LABELS, MOCK_TYPE_LABELS } from '@/lib/mockInterview'
import type {
  MockInterviewLevel,
  MockInterviewReport,
  MockInterviewSession,
  MockInterviewTurn,
  MockInterviewType,
  Question,
} from '@/types'
import {
  Box,
  Button,
  cn,
  Field,
  Input,
  Progress,
  ProgressRing,
  SegmentedControl,
  Select,
  Spinner,
  Tag,
  Textarea,
} from '@/ui'
import {
  type BusyState,
  cleanDimensionComment,
  DURATION_OPTIONS,
  formatClock,
  formatSessionTime,
  QUESTION_COUNT_OPTIONS,
  type ScoreTone,
  type SetupForm,
  scoreTone,
} from './mockSession'

const SCORE_TEXT: Record<ScoreTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}
const SCORE_STROKE: Record<ScoreTone, string> = {
  success: 'stroke-success',
  warning: 'stroke-warning',
  danger: 'stroke-danger',
}

const TYPE_CARDS: { value: MockInterviewType; icon: LucideIcon; description: string }[] = [
  { value: 'technical', icon: Code2, description: '基础、原理与场景题' },
  { value: 'project', icon: FolderGit2, description: '围绕简历项目连续追问' },
  { value: 'comprehensive', icon: Layers, description: '技术 + 项目 + 软素质' },
]

const LEVEL_OPTIONS = (Object.keys(MOCK_LEVEL_LABELS) as MockInterviewLevel[]).map((value) => ({
  value,
  label: MOCK_LEVEL_LABELS[value],
}))

// ─── Setup ──────────────────────────────────────────────────────────────────────

export function SetupPanel({
  form,
  onChange,
  onError,
  footer,
}: {
  form: SetupForm
  onChange: (patch: Partial<SetupForm>) => void
  onError: (message: string) => void
  footer: React.ReactNode
}) {
  return (
    <Box className="flex flex-col">
      <div className="flex flex-col gap-5 p-5">
        <Field label="目标岗位" htmlFor="mock-role">
          <Input
            id="mock-role"
            value={form.roleTitle}
            onChange={(e) => onChange({ roleTitle: e.target.value })}
            placeholder="例如：前端工程师"
            className="text-sm"
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg">面试类型</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {TYPE_CARDS.map(({ value, icon: Icon, description }) => {
              const active = form.interviewType === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ interviewType: value })}
                  className={cn(
                    'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                    active
                      ? 'border-accent bg-accent-subtle'
                      : 'border-line hover:border-line-strong hover:bg-subtle',
                  )}
                >
                  <Icon
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      active ? 'text-accent' : 'text-fg-subtle',
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-fg">
                      {MOCK_TYPE_LABELS[value]}
                    </span>
                    <span className="block text-xs text-fg-subtle">{description}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[auto_1fr_1fr]">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-fg">级别</span>
            <SegmentedControl
              value={form.level}
              onValueChange={(level) => onChange({ level })}
              options={LEVEL_OPTIONS}
              label="级别"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-fg">时长</span>
            <Select
              value={String(form.durationMinutes)}
              onValueChange={(v) => onChange({ durationMinutes: Number(v) })}
              options={DURATION_OPTIONS.map((m) => ({ value: String(m), label: `${m} 分钟` }))}
              label="时长"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-fg">主问题数</span>
            <Select
              value={String(form.targetQuestionCount)}
              onValueChange={(v) => onChange({ targetQuestionCount: Number(v) })}
              options={QUESTION_COUNT_OPTIONS.map((n) => ({ value: String(n), label: `${n} 题` }))}
              label="主问题数"
            />
          </div>
        </div>

        <Field
          label="岗位 JD"
          htmlFor="mock-jd"
          hint={form.jdText ? `${form.jdText.trim().length} 字` : 'JD 和简历至少提供一项'}
        >
          <Textarea
            id="mock-jd"
            value={form.jdText}
            onChange={(e) => onChange({ jdText: e.target.value })}
            placeholder="粘贴岗位职责、任职要求、技术栈关键词…"
            rows={5}
            className="text-sm"
          />
        </Field>

        <ResumeInput
          id="mock-resume"
          value={{ text: form.resumeText, fileName: form.resumeFileName ?? null }}
          onChange={(next) =>
            onChange({ resumeText: next.text, resumeFileName: next.fileName ?? undefined })
          }
          onError={onError}
        />
      </div>
      <div className="border-t border-line p-4">{footer}</div>
    </Box>
  )
}

export function HowItWorks() {
  const steps = [
    { title: '生成面试计划', body: 'AI 根据 JD、简历和面试类型规划考察重点。' },
    { title: '一问一答', body: '像真实面试一样作答，可语音输入、请求澄清或重复问题。' },
    { title: '复盘报告', body: '结束后给出总分、分维度评价和推荐练习题。' },
  ]
  return (
    <Box padding="md">
      <h2 className="text-sm font-semibold text-fg">流程</h2>
      <ol className="mt-3 flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-2xs font-semibold text-fg-muted tabular-nums">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">{step.title}</p>
              <p className="text-xs text-fg-subtle">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Box>
  )
}

// ─── History ────────────────────────────────────────────────────────────────────

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-canvas text-xs font-semibold tabular-nums',
        score == null ? 'text-fg-subtle' : SCORE_TEXT[scoreTone(score)],
      )}
    >
      {score ?? '—'}
    </span>
  )
}

export function HistoryList({
  sessions,
  activeId,
  disabled,
  onSelect,
  onDelete,
}: {
  sessions: MockInterviewSession[]
  activeId: string | null
  disabled: boolean
  onSelect: (session: MockInterviewSession) => void
  onDelete: (session: MockInterviewSession) => void
}) {
  return (
    <Box>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">历史面试</h2>
        <span className="text-xs text-fg-subtle tabular-nums">{sessions.length}</span>
      </div>
      {sessions.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-fg-subtle">还没有面试记录</p>
      ) : (
        <ul className="flex max-h-[420px] flex-col gap-0.5 overflow-y-auto overscroll-contain p-1.5">
          {sessions.map((session) => {
            const active = session.id === activeId
            return (
              <li
                key={session.id}
                className={cn(
                  'group flex items-center gap-1 rounded-lg transition-colors',
                  active ? 'bg-accent-subtle' : 'hover:bg-subtle',
                )}
              >
                <button
                  type="button"
                  disabled={disabled}
                  aria-current={active || undefined}
                  onClick={() => onSelect(session)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-2.5 text-left disabled:opacity-60"
                >
                  <ScoreBadge score={session.report?.overallScore} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-fg">{session.title}</span>
                    <span className="block truncate text-xs text-fg-subtle">
                      {session.status === 'completed' ? '已完成' : '未完成'} ·{' '}
                      {formatSessionTime(session.updatedAt)}
                    </span>
                  </span>
                </button>
                <Button
                  variant="danger-ghost"
                  size="icon-sm"
                  aria-label={`删除 ${session.title}`}
                  disabled={disabled}
                  onClick={() => onDelete(session)}
                  className="mr-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
                >
                  <Trash2 />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </Box>
  )
}

// ─── Session overview ───────────────────────────────────────────────────────────

export function SessionOverview({
  session,
  progress,
}: {
  session: MockInterviewSession
  progress: { answers: number; mainQuestions: number; target: number }
}) {
  return (
    <Box padding="md" className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between gap-2 text-xs text-fg-muted">
          <span>主问题进度</span>
          <span className="tabular-nums">
            {Math.min(progress.mainQuestions, progress.target)} / {progress.target}
          </span>
        </div>
        <Progress
          className="mt-2"
          value={Math.min(progress.mainQuestions, progress.target)}
          max={progress.target}
          tone={session.status === 'completed' ? 'success' : 'accent'}
        />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-fg-subtle">岗位</dt>
        <dd className="truncate text-fg">{session.roleTitle}</dd>
        <dt className="text-fg-subtle">模式</dt>
        <dd className="text-fg">
          {MOCK_TYPE_LABELS[session.interviewType]} · {MOCK_LEVEL_LABELS[session.level]}
        </dd>
        <dt className="text-fg-subtle">作答</dt>
        <dd className="text-fg tabular-nums">{progress.answers} 次</dd>
        {session.model ? (
          <>
            <dt className="text-fg-subtle">模型</dt>
            <dd className="truncate font-mono text-xs leading-5 text-fg-muted">{session.model}</dd>
          </>
        ) : null}
      </dl>
      {session.plan ? (
        <div className="border-t border-line pt-4">
          <p className="text-xs font-medium text-fg-muted">面试重点</p>
          <p className="mt-1.5 text-sm text-fg">{session.plan.summary}</p>
          {session.plan.focusAreas.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {session.plan.focusAreas.map((item) => (
                <Tag key={item} variant="soft">
                  {item}
                </Tag>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </Box>
  )
}

// ─── Transcript ─────────────────────────────────────────────────────────────────

const KIND_LABELS: Partial<Record<MockInterviewTurn['kind'], string>> = {
  follow_up: '追问',
  clarification: '澄清',
  closing: '结束',
}

function InterviewerAvatar() {
  return (
    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-subtle text-fg-muted">
      <MessagesSquare className="size-4" />
    </span>
  )
}

function CandidateAvatar() {
  return (
    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
      <UserRound className="size-4" />
    </span>
  )
}

export function TurnBubble({
  turn,
  questionNumber,
}: {
  turn: MockInterviewTurn
  questionNumber?: number
}) {
  const fromInterviewer = turn.role === 'interviewer'
  const kindLabel =
    turn.kind === 'question' && questionNumber ? `第 ${questionNumber} 题` : KIND_LABELS[turn.kind]
  return (
    <div className={cn('flex gap-3', !fromInterviewer && 'flex-row-reverse')}>
      {fromInterviewer ? <InterviewerAvatar /> : <CandidateAvatar />}
      <div
        className={cn(
          'flex min-w-0 max-w-[min(560px,85%)] flex-col gap-1',
          !fromInterviewer && 'items-end',
        )}
      >
        <div className="flex items-center gap-2 text-xs text-fg-subtle">
          <span className="font-medium text-fg-muted">{fromInterviewer ? '面试官' : '我'}</span>
          {kindLabel ? <span>{kindLabel}</span> : null}
          <span className="tabular-nums">{formatClock(turn.createdAt)}</span>
        </div>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-md leading-relaxed whitespace-pre-wrap break-words',
            fromInterviewer
              ? 'rounded-tl-md border border-line bg-subtle text-fg'
              : 'rounded-tr-md bg-accent-subtle text-fg',
            turn.kind === 'closing' && 'text-fg-muted',
          )}
        >
          {turn.content}
        </div>
      </div>
    </div>
  )
}

export function PendingBubble({ busy, text }: { busy: BusyState; text: string }) {
  if (busy === 'idle') return null
  const label =
    busy === 'planning' ? '准备面试计划' : busy === 'reviewing' ? '撰写复盘报告' : '面试官'
  return (
    <div className="flex gap-3" aria-live="polite">
      <InterviewerAvatar />
      <div className="flex min-w-0 max-w-[min(560px,85%)] flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-fg-subtle">
          <span className="font-medium text-fg-muted">{label}</span>
          <Spinner size="sm" className="size-3 text-accent" />
        </div>
        <div className="rounded-2xl rounded-tl-md border border-line bg-subtle px-4 py-2.5 text-md leading-relaxed whitespace-pre-wrap break-words text-fg">
          {text && busy === 'interviewing' ? (
            text
          ) : (
            <span className="inline-flex items-center gap-1 py-1">
              <span className="sr-only">正在输入</span>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-pulse rounded-full bg-fg-subtle"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Report ─────────────────────────────────────────────────────────────────────

export function ReportView({
  report,
  streamingMarkdown,
  recommendations,
  onPractice,
  ref,
}: {
  report: MockInterviewReport | null
  streamingMarkdown?: string
  recommendations: Question[]
  onPractice: () => void
  ref?: React.Ref<HTMLDivElement>
}) {
  const score = report?.overallScore ?? null
  return (
    <Box ref={ref} className="scroll-mt-20 overflow-hidden">
      <div className="flex items-center gap-4 border-b border-line px-5 py-4">
        {score !== null ? (
          <div className="relative">
            <ProgressRing
              value={score}
              max={100}
              size={56}
              stroke={5}
              indicatorClassName={SCORE_STROKE[scoreTone(score)]}
            />
            <span
              className={cn(
                'absolute inset-0 flex items-center justify-center text-md font-semibold tabular-nums',
                SCORE_TEXT[scoreTone(score)],
              )}
            >
              {score}
            </span>
          </div>
        ) : (
          <span className="flex size-14 items-center justify-center rounded-full border border-line">
            {report ? '—' : <Spinner className="text-accent" />}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-fg">复盘报告</h2>
          <p className="text-xs text-fg-subtle">
            {report ? `${formatSessionTime(report.createdAt)} 生成` : '正在根据面试记录撰写…'}
          </p>
        </div>
      </div>

      {report && report.dimensions.length > 0 ? (
        <div className="grid gap-x-6 gap-y-4 border-b border-line px-5 py-4 sm:grid-cols-2">
          {report.dimensions.map((dimension) => {
            const comment = cleanDimensionComment(dimension.comment)
            return (
              <div key={dimension.label} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-fg">{dimension.label}</span>
                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      SCORE_TEXT[scoreTone(dimension.score)],
                    )}
                  >
                    {dimension.score}
                  </span>
                </div>
                <Progress
                  className="mt-1.5"
                  size="xs"
                  value={dimension.score}
                  tone={scoreTone(dimension.score)}
                />
                {comment ? (
                  <p className="mt-1.5 line-clamp-2 text-xs text-fg-subtle">{comment}</p>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="px-5 py-5">
        <MarkdownRenderer
          content={report?.markdown ?? streamingMarkdown ?? ''}
          className="prose text-sm"
        />
      </div>

      {recommendations.length > 0 ? (
        <div className="border-t border-line px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-fg">推荐练习</h3>
            <Button variant="secondary" size="sm" onClick={onPractice}>
              <Play />
              练习这 {recommendations.length} 题
            </Button>
          </div>
          <ul className="mt-2 flex flex-col">
            {recommendations.map((question) => (
              <li key={question.id}>
                <Link
                  to={`/questions/${question.id}`}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 hover:bg-subtle"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">
                    {question.question}
                  </span>
                  <span className="shrink-0 text-xs text-fg-subtle">{question.module}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Box>
  )
}
