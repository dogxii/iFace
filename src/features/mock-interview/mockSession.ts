import type {
  MockInterviewLevel,
  MockInterviewSession,
  MockInterviewTurn,
  MockInterviewType,
} from '@/types'

export type BusyState = 'idle' | 'planning' | 'interviewing' | 'reviewing'

export const BUSY_LABELS: Record<Exclude<BusyState, 'idle'>, string> = {
  planning: '正在生成面试计划',
  interviewing: '面试官正在思考',
  reviewing: '正在生成复盘报告',
}

export interface SetupForm {
  roleTitle: string
  level: MockInterviewLevel
  interviewType: MockInterviewType
  durationMinutes: number
  targetQuestionCount: number
  jdText: string
  resumeText: string
  resumeFileName?: string
}

export const DEFAULT_FORM: SetupForm = {
  roleTitle: '前端工程师',
  level: 'mid',
  interviewType: 'comprehensive',
  durationMinutes: 30,
  targetQuestionCount: 6,
  jdText: '',
  resumeText: '',
}

const LEVELS: readonly MockInterviewLevel[] = ['junior', 'mid', 'senior']
const TYPES: readonly MockInterviewType[] = ['technical', 'project', 'comprehensive']

/** Restore a saved setup draft, falling back field by field to the defaults. */
export function parseSetupDraft(value: unknown): SetupForm | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const str = (key: keyof SetupForm, fallback: string) =>
    typeof v[key] === 'string' ? (v[key] as string) : fallback
  const num = (key: keyof SetupForm, allowed: number[], fallback: number) =>
    allowed.includes(v[key] as number) ? (v[key] as number) : fallback
  return {
    roleTitle: str('roleTitle', DEFAULT_FORM.roleTitle),
    level: LEVELS.includes(v.level as MockInterviewLevel)
      ? (v.level as MockInterviewLevel)
      : DEFAULT_FORM.level,
    interviewType: TYPES.includes(v.interviewType as MockInterviewType)
      ? (v.interviewType as MockInterviewType)
      : DEFAULT_FORM.interviewType,
    durationMinutes: num('durationMinutes', DURATION_OPTIONS, DEFAULT_FORM.durationMinutes),
    targetQuestionCount: num(
      'targetQuestionCount',
      QUESTION_COUNT_OPTIONS,
      DEFAULT_FORM.targetQuestionCount,
    ),
    jdText: str('jdText', ''),
    resumeText: str('resumeText', ''),
    ...(typeof v.resumeFileName === 'string' ? { resumeFileName: v.resumeFileName } : {}),
  }
}

/** Unsent answer in the interview room, tied to the session it was typed for. */
export interface AnswerDraft {
  sessionId: string
  text: string
}

export const EMPTY_ANSWER_DRAFT: AnswerDraft = { sessionId: '', text: '' }

export function parseAnswerDraft(value: unknown): AnswerDraft | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  return typeof v.sessionId === 'string' && typeof v.text === 'string'
    ? { sessionId: v.sessionId, text: v.text }
    : null
}

export const DURATION_OPTIONS = [15, 30, 45, 60]
export const QUESTION_COUNT_OPTIONS = [4, 6, 8, 10]

export function formFromSession(session: MockInterviewSession): SetupForm {
  return {
    roleTitle: session.roleTitle,
    level: session.level,
    interviewType: session.interviewType,
    durationMinutes: session.durationMinutes,
    targetQuestionCount: session.targetQuestionCount,
    jdText: session.jdText,
    resumeText: session.resumeText,
    resumeFileName: session.resumeFileName,
  }
}

export function isQuestionTurn(turn: MockInterviewTurn): boolean {
  return turn.role === 'interviewer' && (turn.kind === 'question' || turn.kind === 'follow_up')
}

export function sessionProgress(session: MockInterviewSession) {
  return {
    answers: session.turns.filter((t) => t.role === 'candidate').length,
    asked: session.turns.filter(isQuestionTurn).length,
    mainQuestions: session.turns.filter((t) => t.role === 'interviewer' && t.kind === 'question')
      .length,
    target: session.targetQuestionCount,
  }
}

/** The latest interviewer question the candidate is expected to answer. */
export function currentQuestion(session: MockInterviewSession): MockInterviewTurn | null {
  for (let i = session.turns.length - 1; i >= 0; i--) {
    const turn = session.turns[i]
    if (turn.role === 'interviewer' && turn.kind !== 'closing') return turn
  }
  return null
}

export type ScoreTone = 'success' | 'warning' | 'danger'

export function scoreTone(score: number): ScoreTone {
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
}

export function cleanDimensionComment(comment: string): string {
  return comment.replace(/[*_`]/g, '').trim()
}

export function sortSessions(sessions: MockInterviewSession[]): MockInterviewSession[] {
  return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)
}

export function formatSessionTime(timestamp?: number): string {
  if (!timestamp) return '未开始'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

export function formatClock(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(timestamp)
}
