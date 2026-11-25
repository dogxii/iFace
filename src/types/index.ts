export * from './bank'

/** Display name of a module, e.g. 「JS基础」. Group and filter by `Question.moduleKey` instead. */
export type Module = string

export type Difficulty = 1 | 2 | 3

export type StudyStatus = 'unlearned' | 'mastered' | 'review'

export interface Question {
  /** `<bankId>:<localId>`, e.g. `iface.frontend:js-001`. */
  id: string
  /** Bank the question was installed from. */
  bankId: string
  /** `<bankId>/<moduleId>`, unique across banks; use it to group and filter. */
  moduleKey: string
  /** Module display name. */
  module: Module
  difficulty: Difficulty
  question: string
  answer: string
  tags: string[]
  /** Where the question comes from, e.g. 「高频」「字节跳动」. */
  source?: string
  /** Position inside its bank, to keep the author's order. */
  position: number
}

export interface StudyRecord {
  questionId: string
  status: StudyStatus
  lastUpdated: number // timestamp
  reviewCount: number
}

export type StudyRecordMap = Record<string, StudyRecord>

export interface QuestionNote {
  questionId: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface QuestionNoteImage {
  id: string
  questionId: string
  name: string
  mimeType: string
  size: number
  dataUrl: string
  createdAt: number
  updatedAt: number
}

export interface QuestionAnswerOverride {
  questionId: string
  content: string
  createdAt: number
  updatedAt: number
}

export type AnswerAnnotationKind = 'highlight' | 'comment'

export type AnswerAnnotationColor = 'yellow' | 'green' | 'blue' | 'pink'

export interface QuestionAnswerAnnotation {
  id: string
  questionId: string
  answerHash: string
  kind: AnswerAnnotationKind
  color: AnswerAnnotationColor
  highlightColor?: AnswerAnnotationColor | null
  start: number
  end: number
  selectedText: string
  note: string
  createdAt: number
  updatedAt: number
}

export interface QuestionFlag {
  questionId: string
  starred: boolean
  createdAt: number
  updatedAt: number
}

export interface FilterState {
  modules: Module[]
  difficulties: Difficulty[]
  statuses: StudyStatus[]
  search: string
}

export interface PracticeSession {
  module: Module | null
  difficulty: Difficulty | null
  questionIds: string[]
  currentIndex: number
}

export type MockInterviewLevel = 'junior' | 'mid' | 'senior'

export type MockInterviewType = 'technical' | 'project' | 'comprehensive'

export type MockInterviewStatus = 'planning' | 'interviewing' | 'completed'

export type MockInterviewTurnRole = 'interviewer' | 'candidate'

export type MockInterviewTurnKind =
  | 'question'
  | 'follow_up'
  | 'clarification'
  | 'answer'
  | 'closing'

export interface MockInterviewPlanSection {
  title: string
  weight: number
  intent: string
}

export interface MockInterviewPlan {
  summary: string
  focusAreas: string[]
  sections: MockInterviewPlanSection[]
  openingQuestion: string
}

export interface MockInterviewTurn {
  id: string
  role: MockInterviewTurnRole
  kind: MockInterviewTurnKind
  content: string
  createdAt: number
}

export interface MockInterviewDimensionScore {
  label: string
  score: number
  comment: string
}

export interface MockInterviewReport {
  markdown: string
  overallScore: number | null
  dimensions: MockInterviewDimensionScore[]
  recommendedQuestionIds: string[]
  createdAt: number
}

export interface MockInterviewSession {
  id: string
  title: string
  roleTitle: string
  level: MockInterviewLevel
  interviewType: MockInterviewType
  durationMinutes: number
  targetQuestionCount: number
  jdText: string
  resumeText: string
  resumeFileName?: string
  plan?: MockInterviewPlan
  turns: MockInterviewTurn[]
  status: MockInterviewStatus
  questionIndex: number
  followUpDepth: number
  model?: string
  report?: MockInterviewReport
  startedAt?: number
  completedAt?: number
  createdAt: number
  updatedAt: number
}

export interface JdMatchReport {
  id: string
  title: string
  roleTitle: string
  jdText: string
  resumeText: string
  resumeFileName?: string
  markdown: string
  model?: string
  createdAt: number
  updatedAt: number
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: '初级',
  2: '中级',
  3: '高级',
}

export const STATUS_LABELS: Record<StudyStatus, string> = {
  unlearned: '未学习',
  mastered: '已掌握',
  review: '待复习',
}
