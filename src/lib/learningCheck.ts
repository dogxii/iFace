import { BUILTIN_MODULE_CATEGORY, type Question } from '@/types'

export type LearningCheckKind = 'single' | 'multiple'

export interface LearningCheckOption {
  id: string
  text: string
}

export interface LearningCheckQuestion {
  id: string
  kind: LearningCheckKind
  prompt: string
  options: LearningCheckOption[]
  answerIds: string[]
  explanation: string
  focus: string
}

export interface LearningCheckBundle {
  questionId: string
  checks: LearningCheckQuestion[]
}

const ELIGIBLE_CATEGORIES = new Set(['前端', 'AI Agent'])

const LEARNING_CHECK_FILES: Record<string, string> = {
  // 前端
  JS基础: '/learning-checks/frontend/js.json',
  React: '/learning-checks/frontend/react.json',
  Vue: '/learning-checks/frontend/vue.json',
  CSS: '/learning-checks/frontend/css.json',
  TypeScript: '/learning-checks/frontend/typescript.json',
  网络: '/learning-checks/frontend/network.json',
  性能优化: '/learning-checks/frontend/performance.json',
  手写题: '/learning-checks/frontend/algorithm.json',
  项目深挖: '/learning-checks/frontend/project.json',
  // AI Agent
  LLM基础: '/learning-checks/ai-agent/llm.json',
  Prompt工程: '/learning-checks/ai-agent/prompt.json',
  Agent架构: '/learning-checks/ai-agent/agent.json',
  RAG与知识库: '/learning-checks/ai-agent/rag.json',
  工具调用与工作流: '/learning-checks/ai-agent/tools.json',
  评测与线上优化: '/learning-checks/ai-agent/evaluation.json',
  AI工程化: '/learning-checks/ai-agent/engineering.json',
  AI应用实践: '/learning-checks/ai-agent/application.json',
}

const bundleCache = new Map<string, Promise<LearningCheckBundle[]>>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLearningCheckOption(value: unknown): value is LearningCheckOption {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.text === 'string' &&
    value.text.trim().length > 0
  )
}

function isLearningCheckQuestion(value: unknown): value is LearningCheckQuestion {
  if (!isRecord(value)) return false
  if (value.kind !== 'single' && value.kind !== 'multiple') return false
  if (typeof value.id !== 'string' || value.id.trim().length === 0) return false
  if (typeof value.prompt !== 'string' || value.prompt.trim().length === 0) return false
  if (typeof value.explanation !== 'string' || value.explanation.trim().length === 0) {
    return false
  }
  if (typeof value.focus !== 'string' || value.focus.trim().length === 0) return false
  if (!Array.isArray(value.options) || !value.options.every(isLearningCheckOption)) return false
  if (!Array.isArray(value.answerIds) || !value.answerIds.every((id) => typeof id === 'string')) {
    return false
  }

  const optionIds = new Set(value.options.map((option) => option.id))
  if (optionIds.size !== value.options.length) return false
  if (value.answerIds.length === 0 || value.answerIds.some((id) => !optionIds.has(id))) return false
  return value.kind !== 'single' || value.answerIds.length === 1
}

function isLearningCheckBundle(value: unknown): value is LearningCheckBundle {
  return (
    isRecord(value) &&
    typeof value.questionId === 'string' &&
    value.questionId.trim().length > 0 &&
    Array.isArray(value.checks) &&
    value.checks.every(isLearningCheckQuestion)
  )
}

async function loadLearningCheckFile(file: string): Promise<LearningCheckBundle[]> {
  if (!bundleCache.has(file)) {
    bundleCache.set(
      file,
      fetch(file)
        .then((response) => {
          if (!response.ok) return []
          return response.json()
        })
        .then((data: unknown) => {
          if (!Array.isArray(data)) return []
          return data.filter(isLearningCheckBundle)
        })
        .catch(() => []),
    )
  }

  return bundleCache.get(file) ?? Promise.resolve([])
}

export function supportsLearningCheck(question: Question): boolean {
  return ELIGIBLE_CATEGORIES.has(BUILTIN_MODULE_CATEGORY[question.module] ?? '')
}

export async function loadLearningChecksForQuestion(
  question: Question,
): Promise<LearningCheckQuestion[]> {
  if (!supportsLearningCheck(question)) return []

  const file = LEARNING_CHECK_FILES[question.module]
  if (!file) return []

  const bundles = await loadLearningCheckFile(file)
  return bundles.find((bundle) => bundle.questionId === question.id)?.checks ?? []
}

export function isLearningCheckAnswerCorrect(
  check: LearningCheckQuestion,
  selectedIds: string[],
): boolean {
  if (check.answerIds.length !== selectedIds.length) return false
  const selected = new Set(selectedIds)
  return check.answerIds.every((id) => selected.has(id))
}
