/**
 * Backup files (设置 → 数据管理). Format v9 (2.0):
 *
 * - `banks`: local banks as `iface-bank@1` snapshots
 * - `bankStates`: every other bank by reference — enabled, order, and for GitHub / URL banks
 *   where they came from, so restoring reinstalls them (GitHub ones at the backed-up commit)
 * - study data keyed by bank-scoped question ids (`iface.frontend:js-001`)
 *
 * Older backups (1.x, format ≤ 8) are upgraded on import by `compat/legacy15`.
 */
import { hasLegacyIds, isLegacyQuestion, upgradeLegacyData } from '../compat/legacy15/data'
import type { AIMessage, AISession } from '../store/useAIStore'
import type {
  JdMatchReport,
  MockInterviewSession,
  QuestionAnswerAnnotation,
  QuestionAnswerOverride,
  QuestionFlag,
  QuestionNote,
  StudyRecord,
  StudyStatus,
} from '../types'
import { type BankSnapshot, isBankSnapshot } from './banks/package'

export const BACKUP_FORMAT_VERSION = 9

export interface BankState {
  id: string
  enabled: boolean
  order: number
  /** GitHub / URL banks: where to reinstall them from. */
  origin?: RemoteBankOrigin
  name?: string
  version?: string
}

export type RemoteBankOrigin =
  | { kind: 'github'; owner: string; repo: string; sha: string; path?: string }
  | { kind: 'url'; url: string }

function isRemoteOrigin(value: unknown): value is RemoteBankOrigin {
  if (!isRecord(value)) return false
  if (value.kind === 'url') return typeof value.url === 'string' && value.url.startsWith('https://')
  return (
    value.kind === 'github' &&
    typeof value.owner === 'string' &&
    typeof value.repo === 'string' &&
    typeof value.sha === 'string' &&
    /^[0-9a-f]{40}$/.test(value.sha) &&
    (value.path === undefined || typeof value.path === 'string')
  )
}

export interface BackupData {
  banks: BankSnapshot[]
  bankStates: BankState[]
  studyRecords: StudyRecord[]
  questionNotes: QuestionNote[]
  questionAnswerAnnotations: QuestionAnswerAnnotation[]
  questionAnswerOverrides: QuestionAnswerOverride[]
  questionFlags: QuestionFlag[]
  aiSessions: AISession[]
  mockInterviews: MockInterviewSession[]
  jdMatchReports: JdMatchReport[]
}

export interface BackupFile extends BackupData {
  formatVersion: typeof BACKUP_FORMAT_VERSION
  exportedAt: string
}

export interface ImportPreview extends BackupData {
  fileName: string
  formatVersion?: number
  exportedAt?: string
  /** Converted from a pre-2.0 backup. */
  upgraded: boolean
  impact: ImportImpact
}

export type ImportImpact = Record<
  | 'banks'
  | 'studyRecords'
  | 'questionNotes'
  | 'questionAnswerAnnotations'
  | 'questionAnswerOverrides'
  | 'questionFlags'
  | 'aiSessions'
  | 'mockInterviews'
  | 'jdMatchReports',
  ImportImpactItem
>

export interface ImportImpactItem {
  created: number
  overwritten: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStudyStatus(value: unknown): value is StudyStatus {
  return value === 'unlearned' || value === 'mastered' || value === 'review'
}

function isStudyRecord(value: unknown): value is StudyRecord {
  return (
    isRecord(value) &&
    typeof value.questionId === 'string' &&
    isStudyStatus(value.status) &&
    typeof value.lastUpdated === 'number' &&
    typeof value.reviewCount === 'number'
  )
}

function isQuestionNote(value: unknown): value is QuestionNote {
  return (
    isRecord(value) &&
    typeof value.questionId === 'string' &&
    typeof value.content === 'string' &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  )
}

function isQuestionAnswerOverride(value: unknown): value is QuestionAnswerOverride {
  return (
    isRecord(value) &&
    typeof value.questionId === 'string' &&
    typeof value.content === 'string' &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  )
}

function isQuestionAnswerAnnotation(value: unknown): value is QuestionAnswerAnnotation {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.questionId === 'string' &&
    typeof value.answerHash === 'string' &&
    (value.kind === 'highlight' || value.kind === 'comment') &&
    (value.color === 'yellow' ||
      value.color === 'green' ||
      value.color === 'blue' ||
      value.color === 'pink') &&
    (value.highlightColor === undefined ||
      value.highlightColor === null ||
      value.highlightColor === 'yellow' ||
      value.highlightColor === 'green' ||
      value.highlightColor === 'blue' ||
      value.highlightColor === 'pink') &&
    typeof value.start === 'number' &&
    typeof value.end === 'number' &&
    typeof value.selectedText === 'string' &&
    typeof value.note === 'string' &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  )
}

function isQuestionFlag(value: unknown): value is QuestionFlag {
  return (
    isRecord(value) &&
    typeof value.questionId === 'string' &&
    typeof value.starred === 'boolean' &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  )
}

function isAIMessage(value: unknown): value is AIMessage {
  return (
    isRecord(value) &&
    (value.role === 'user' || value.role === 'assistant' || value.role === 'system') &&
    typeof value.content === 'string'
  )
}

function isAISession(value: unknown): value is AISession {
  return (
    isRecord(value) &&
    typeof value.questionId === 'string' &&
    Array.isArray(value.messages) &&
    value.messages.every(isAIMessage) &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  )
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isMockInterviewDimension(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.label === 'string' &&
    typeof value.score === 'number' &&
    typeof value.comment === 'string'
  )
}

function isMockInterviewSession(value: unknown): value is MockInterviewSession {
  if (!isRecord(value)) return false

  const statusOk =
    value.status === 'planning' || value.status === 'interviewing' || value.status === 'completed'
  const levelOk = value.level === 'junior' || value.level === 'mid' || value.level === 'senior'
  const typeOk =
    value.interviewType === 'technical' ||
    value.interviewType === 'project' ||
    value.interviewType === 'comprehensive'

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.roleTitle === 'string' &&
    levelOk &&
    typeOk &&
    typeof value.durationMinutes === 'number' &&
    typeof value.targetQuestionCount === 'number' &&
    typeof value.jdText === 'string' &&
    typeof value.resumeText === 'string' &&
    (value.resumeFileName === undefined || typeof value.resumeFileName === 'string') &&
    statusOk &&
    typeof value.questionIndex === 'number' &&
    typeof value.followUpDepth === 'number' &&
    Array.isArray(value.turns) &&
    value.turns.every((turn) => {
      if (!isRecord(turn)) return false
      const roleOk = turn.role === 'interviewer' || turn.role === 'candidate'
      const kindOk =
        turn.kind === 'question' ||
        turn.kind === 'follow_up' ||
        turn.kind === 'clarification' ||
        turn.kind === 'answer' ||
        turn.kind === 'closing'
      return (
        typeof turn.id === 'string' &&
        roleOk &&
        kindOk &&
        typeof turn.content === 'string' &&
        typeof turn.createdAt === 'number'
      )
    }) &&
    (value.report === undefined ||
      (isRecord(value.report) &&
        typeof value.report.markdown === 'string' &&
        (typeof value.report.overallScore === 'number' || value.report.overallScore === null) &&
        Array.isArray(value.report.dimensions) &&
        value.report.dimensions.every(isMockInterviewDimension) &&
        isStringArray(value.report.recommendedQuestionIds) &&
        typeof value.report.createdAt === 'number')) &&
    (value.startedAt === undefined || typeof value.startedAt === 'number') &&
    (value.completedAt === undefined || typeof value.completedAt === 'number') &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  )
}

function isJdMatchReport(value: unknown): value is JdMatchReport {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.roleTitle === 'string' &&
    typeof value.jdText === 'string' &&
    typeof value.resumeText === 'string' &&
    (value.resumeFileName === undefined || typeof value.resumeFileName === 'string') &&
    typeof value.markdown === 'string' &&
    (value.model === undefined || typeof value.model === 'string') &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  )
}

type ArrayKey =
  | 'questions'
  | 'banks'
  | 'bankStates'
  | 'studyRecords'
  | 'questionNotes'
  | 'questionAnswerAnnotations'
  | 'questionAnswerOverrides'
  | 'questionFlags'
  | 'aiSessions'
  | 'mockInterviews'
  | 'jdMatchReports'

function parseImportArray<T>(
  data: Record<string, unknown>,
  key: ArrayKey,
  guard: (value: unknown) => value is T,
  label: string,
): T[] {
  const value = data[key]
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new Error(`${label} 必须是数组`)

  const invalidIndex = value.findIndex((item) => !guard(item))
  if (invalidIndex !== -1) {
    throw new Error(`${label} 第 ${invalidIndex + 1} 项格式无效`)
  }

  return value
}

function isBankState(value: unknown): value is BankState {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.enabled === 'boolean' &&
    typeof value.order === 'number' &&
    (value.origin === undefined || isRemoteOrigin(value.origin))
  )
}

const isAnything = (_value: unknown): _value is unknown => true

const EMPTY_IMPACT: ImportImpactItem = { created: 0, overwritten: 0 }

/**
 * Parses a backup file. `officialKeys` (old official id → new key) is needed to upgrade
 * pre-2.0 backups; see `officialKeysByLegacyId`.
 */
export function parseImportPreview(
  fileName: string,
  rawText: string,
  officialKeys: ReadonlyMap<string, string> = new Map(),
): ImportPreview {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error('文件不是有效 JSON')
  }

  if (!isRecord(parsed) || Array.isArray(parsed)) throw new Error('文件格式无效')

  const formatVersion = typeof parsed.formatVersion === 'number' ? parsed.formatVersion : undefined
  if (formatVersion !== undefined && formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error('备份来自更新版本的 iFace，请先更新应用')
  }

  let data: BackupData = {
    banks: parseImportArray(parsed, 'banks', isBankSnapshot, '题库'),
    bankStates: parseImportArray(parsed, 'bankStates', isBankState, '题库状态'),
    studyRecords: parseImportArray(parsed, 'studyRecords', isStudyRecord, '学习记录'),
    questionNotes: parseImportArray(parsed, 'questionNotes', isQuestionNote, '题目笔记'),
    questionAnswerAnnotations: parseImportArray(
      parsed,
      'questionAnswerAnnotations',
      isQuestionAnswerAnnotation,
      '答案标注',
    ),
    questionAnswerOverrides: parseImportArray(
      parsed,
      'questionAnswerOverrides',
      isQuestionAnswerOverride,
      '自定义答案',
    ),
    questionFlags: parseImportArray(parsed, 'questionFlags', isQuestionFlag, '题目标记'),
    aiSessions: parseImportArray(parsed, 'aiSessions', isAISession, 'AI 会话'),
    mockInterviews: parseImportArray(parsed, 'mockInterviews', isMockInterviewSession, '模拟面试'),
    jdMatchReports: parseImportArray(parsed, 'jdMatchReports', isJdMatchReport, 'JD 诊断'),
  }

  // COMPAT: remove after 2027-06-30 — pre-2.0 backups carry question objects and unprefixed ids.
  const legacyQuestions = parseImportArray(parsed, 'questions', isAnything, '题目').filter(
    isLegacyQuestion,
  )
  const upgraded =
    (formatVersion ?? 0) < BACKUP_FORMAT_VERSION &&
    hasLegacyIds({ questions: legacyQuestions, studyRecords: data.studyRecords })
  if (upgraded) {
    const exportedAt = typeof parsed.exportedAt === 'string' ? Date.parse(parsed.exportedAt) : NaN
    data = {
      ...upgradeLegacyData(
        { ...data, questions: legacyQuestions },
        officialKeys,
        Number.isNaN(exportedAt) ? Date.now() : exportedAt,
      ),
      bankStates: [],
      jdMatchReports: data.jdMatchReports,
    }
  }

  if (
    data.banks.length +
      data.studyRecords.length +
      data.questionNotes.length +
      data.questionAnswerAnnotations.length +
      data.questionAnswerOverrides.length +
      data.questionFlags.length +
      data.aiSessions.length +
      data.mockInterviews.length +
      data.jdMatchReports.length ===
    0
  ) {
    throw new Error('备份中没有可导入的数据')
  }

  return {
    ...data,
    fileName,
    formatVersion,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
    upgraded,
    impact: {
      banks: EMPTY_IMPACT,
      studyRecords: EMPTY_IMPACT,
      questionNotes: EMPTY_IMPACT,
      questionAnswerAnnotations: EMPTY_IMPACT,
      questionAnswerOverrides: EMPTY_IMPACT,
      questionFlags: EMPTY_IMPACT,
      aiSessions: EMPTY_IMPACT,
      mockInterviews: EMPTY_IMPACT,
      jdMatchReports: EMPTY_IMPACT,
    },
  }
}

/** Number of questions in the local banks of a backup. */
export function backupQuestionCount(banks: readonly BankSnapshot[]): number {
  return banks.reduce(
    (sum, bank) =>
      sum +
      bank.package.modules.reduce(
        (count, mod) => count + (Array.isArray(mod.questions) ? mod.questions.length : 0),
        0,
      ),
    0,
  )
}

export function countMergedAISessions(
  existingAISessions: Record<string, AISession>,
  incomingSessions: AISession[],
): number {
  const ids = new Set(Object.keys(existingAISessions))
  for (const session of incomingSessions) {
    ids.add(session.questionId)
  }
  return ids.size
}
