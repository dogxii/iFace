// Built-in modules across all built-in categories (used for icon/color mapping & default filter UI)
export const BUILTIN_MODULES = [
  // 前端
  'JS基础',
  'React',
  'Vue',
  '性能优化',
  '网络',
  'CSS',
  'TypeScript',
  '手写题',
  '项目深挖',
  // Golang
  'Go基础',
  '并发编程',
  '内存与GC',
  '工程化',
  'Web开发',
  // AI Agent
  'LLM基础',
  'Prompt工程',
  'Agent架构',
  'RAG与知识库',
  '工具调用与工作流',
  '评测与线上优化',
  'AI工程化',
  'AI应用实践',
  // Java
  'Java基础',
  'Java并发',
  'JVM',
  'Spring框架',
  '计算机网络',
  'MySQL',
  'Redis',
] as const

export type BuiltinModule = (typeof BUILTIN_MODULES)[number]

/** Maps each built-in module to its display category label */
export const BUILTIN_MODULE_CATEGORY: Record<string, string> = {
  // 前端
  JS基础: '前端',
  React: '前端',
  Vue: '前端',
  性能优化: '前端',
  网络: '前端',
  CSS: '前端',
  TypeScript: '前端',
  手写题: '前端',
  项目深挖: '前端',
  // Golang
  Go基础: 'Go',
  并发编程: 'Go',
  内存与GC: 'Go',
  工程化: 'Go',
  Web开发: 'Go',
  // AI Agent
  LLM基础: 'AI Agent',
  Prompt工程: 'AI Agent',
  Agent架构: 'AI Agent',
  RAG与知识库: 'AI Agent',
  工具调用与工作流: 'AI Agent',
  评测与线上优化: 'AI Agent',
  AI工程化: 'AI Agent',
  AI应用实践: 'AI Agent',
  // Java
  Java基础: 'Java',
  Java并发: 'Java',
  JVM: 'Java',
  Spring框架: 'Java',
  计算机网络: 'Java',
  MySQL: 'Java',
  Redis: 'Java',
}

// Module is now open — any string is valid, enabling custom topics like Golang, Java, etc.
export type Module = string

export type Difficulty = 1 | 2 | 3

export type StudyStatus = 'unlearned' | 'mastered' | 'review'

export interface Question {
  id: string
  module: Module
  difficulty: Difficulty
  question: string
  answer: string
  tags: string[]
  source?: string
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

// Static built-in list (for sidebar defaults when no custom modules are imported)
export const MODULE_LIST: Module[] = [...BUILTIN_MODULES]

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
