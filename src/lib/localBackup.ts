import type { AIMessage, AISession } from '../store/useAIStore'
import type {
  JdMatchReport,
  MockInterviewSession,
  Question,
  QuestionAnswerAnnotation,
  QuestionAnswerOverride,
  QuestionFlag,
  QuestionNote,
  StudyRecord,
  StudyStatus,
} from '../types'
import { type CategoryMap, DEFAULT_CATEGORY_MAP } from './db'

export interface ImportPreview {
  fileName: string
  formatVersion?: number
  exportedAt?: string
  questions: Question[]
  studyRecords: StudyRecord[]
  questionNotes: QuestionNote[]
  questionAnswerAnnotations: QuestionAnswerAnnotation[]
  questionAnswerOverrides: QuestionAnswerOverride[]
  questionFlags: QuestionFlag[]
  aiSessions: AISession[]
  mockInterviews: MockInterviewSession[]
  jdMatchReports: JdMatchReport[]
  customSources: string[]
  customCategories: CategoryMap
  impact: ImportImpact
}

export interface ImportImpact {
  questions: ImportImpactItem
  studyRecords: ImportImpactItem
  questionNotes: ImportImpactItem
  questionAnswerAnnotations: ImportImpactItem
  questionAnswerOverrides: ImportImpactItem
  questionFlags: ImportImpactItem
  aiSessions: ImportImpactItem
  mockInterviews: ImportImpactItem
  jdMatchReports: ImportImpactItem
}

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

function isQuestion(value: unknown): value is Question {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.module === 'string' &&
    (value.difficulty === 1 || value.difficulty === 2 || value.difficulty === 3) &&
    typeof value.question === 'string' &&
    typeof value.answer === 'string' &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === 'string') &&
    (value.source === undefined || typeof value.source === 'string')
  )
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

function isCategoryEntry(value: unknown): value is CategoryMap[string] {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    Array.isArray(value.modules) &&
    value.modules.every((moduleName) => typeof moduleName === 'string') &&
    typeof value.builtin === 'boolean' &&
    typeof value.order === 'number'
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

function parseImportArray<T>(
  data: Record<string, unknown>,
  key:
    | 'questions'
    | 'studyRecords'
    | 'questionNotes'
    | 'questionAnswerAnnotations'
    | 'questionAnswerOverrides'
    | 'questionFlags'
    | 'aiSessions'
    | 'mockInterviews'
    | 'jdMatchReports',
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

function parseStringArray(data: Record<string, unknown>, key: string, label: string): string[] {
  const value = data[key]
  if (value === undefined) return []
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`${label} 必须是字符串数组`)
  }
  return value
}

function parseCustomCategories(data: Record<string, unknown>): CategoryMap {
  const value = data.customCategories
  if (value === undefined) return {}
  if (!isRecord(value) || Array.isArray(value)) throw new Error('自定义分类必须是对象')

  const categories: CategoryMap = {}
  for (const [key, entry] of Object.entries(value)) {
    if (!isCategoryEntry(entry)) throw new Error(`自定义分类 ${key} 格式无效`)
    if (!entry.builtin) categories[key] = entry
  }
  return categories
}

function deriveCategoryName(sourceName: string): string {
  const normalized = sourceName
    .replace(/\.(json|md)$/i, '')
    .replace(/[-_]/g, ' ')
    .trim()
  return normalized ? normalized.replace(/\b\w/g, (char) => char.toUpperCase()) : '自定义题库'
}

function deriveCustomSources(questions: Question[]): string[] {
  return [
    ...new Set(
      questions
        .filter((question) => question.id.startsWith('custom_') && question.source?.trim())
        .map((question) => question.source?.trim() ?? ''),
    ),
  ]
}

function deriveCustomCategories(questions: Question[]): CategoryMap {
  const groups = new Map<string, Set<string>>()

  for (const question of questions) {
    if (!question.id.startsWith('custom_') || !question.source?.trim()) continue
    const categoryName = deriveCategoryName(question.source)
    if (!groups.has(categoryName)) groups.set(categoryName, new Set())
    groups.get(categoryName)?.add(question.module)
  }

  return Object.fromEntries(
    [...groups.entries()].map(([name, modules], index) => [
      name,
      {
        name,
        modules: [...modules],
        builtin: false,
        order: Object.keys(DEFAULT_CATEGORY_MAP).length + index,
      },
    ]),
  )
}

export function mergeCategoryMaps(base: CategoryMap, incoming: CategoryMap): CategoryMap {
  const merged: CategoryMap = { ...base }

  for (const [key, incomingEntry] of Object.entries(incoming)) {
    const current = merged[key]
    if (!current) {
      merged[key] = incomingEntry
      continue
    }

    const modules = [...new Set([...current.modules, ...incomingEntry.modules])]
    merged[key] = { ...current, ...incomingEntry, modules, builtin: current.builtin }
  }

  return merged
}

export function parseImportPreview(fileName: string, rawText: string): ImportPreview {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error('文件不是有效 JSON')
  }

  if (!isRecord(parsed)) throw new Error('文件格式无效')

  const questions = parseImportArray(parsed, 'questions', isQuestion, '题目')
  const studyRecords = parseImportArray(parsed, 'studyRecords', isStudyRecord, '学习记录')
  const questionNotes = parseImportArray(parsed, 'questionNotes', isQuestionNote, '题目笔记')
  const questionAnswerAnnotations = parseImportArray(
    parsed,
    'questionAnswerAnnotations',
    isQuestionAnswerAnnotation,
    '答案标注',
  )
  const questionAnswerOverrides = parseImportArray(
    parsed,
    'questionAnswerOverrides',
    isQuestionAnswerOverride,
    '自定义答案',
  )
  const questionFlags = parseImportArray(parsed, 'questionFlags', isQuestionFlag, '题目标记')
  const aiSessions = parseImportArray(parsed, 'aiSessions', isAISession, 'AI 会话')
  const mockInterviews = parseImportArray(
    parsed,
    'mockInterviews',
    isMockInterviewSession,
    '模拟面试',
  )
  const jdMatchReports = parseImportArray(parsed, 'jdMatchReports', isJdMatchReport, 'JD 诊断')
  const customSources = [
    ...new Set([
      ...parseStringArray(parsed, 'customSources', '自定义来源'),
      ...deriveCustomSources(questions),
    ]),
  ]
  const customCategories = mergeCategoryMaps(
    deriveCustomCategories(questions),
    parseCustomCategories(parsed),
  )

  if (
    questions.length +
      studyRecords.length +
      questionNotes.length +
      questionAnswerAnnotations.length +
      questionAnswerOverrides.length +
      questionFlags.length +
      aiSessions.length +
      mockInterviews.length +
      jdMatchReports.length ===
    0
  ) {
    throw new Error('备份中没有可导入的数据')
  }

  return {
    fileName,
    formatVersion: typeof parsed.formatVersion === 'number' ? parsed.formatVersion : undefined,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
    questions,
    studyRecords,
    questionNotes,
    questionAnswerAnnotations,
    questionAnswerOverrides,
    questionFlags,
    aiSessions,
    mockInterviews,
    jdMatchReports,
    customSources,
    customCategories,
    impact: {
      questions: { created: 0, overwritten: 0 },
      studyRecords: { created: 0, overwritten: 0 },
      questionNotes: { created: 0, overwritten: 0 },
      questionAnswerAnnotations: { created: 0, overwritten: 0 },
      questionAnswerOverrides: { created: 0, overwritten: 0 },
      questionFlags: { created: 0, overwritten: 0 },
      aiSessions: { created: 0, overwritten: 0 },
      mockInterviews: { created: 0, overwritten: 0 },
      jdMatchReports: { created: 0, overwritten: 0 },
    },
  }
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
