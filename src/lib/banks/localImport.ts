/**
 * Merging loose questions (an imported file, pasted text, AI output) into a local bank.
 *
 * - Modules are matched by name; new names become new modules.
 * - A question with an `id` that the bank already has replaces it (and moves to the given
 *   module). Without an id, a question whose text the bank already has replaces that one, so
 *   importing the same file twice does not duplicate it.
 * - Everything is fitted to the `iface-bank@1` limits so the bank stays exportable.
 */
import { slugify, toLocalId, uniqueLocalId } from '@/data/bank/ids'
import { BANK_LIMITS, type BankLearningCheck, type BankQuestion } from '@/data/bank/schema'
import type { ResolvedBank, ResolvedBankModule } from '@/data/bank/validate'

export interface ImportQuestion {
  id?: string
  module: string
  difficulty: number
  question: string
  answer: string
  tags?: string[]
  source?: string
  checks?: BankLearningCheck[]
}

export interface ImportIssue {
  /** Index in the incoming list. */
  index: number
  message: string
}

export interface MergeResult {
  bank: ResolvedBank
  added: number
  updated: number
  errors: ImportIssue[]
  warnings: ImportIssue[]
}

export function stableHash(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '')
}

/** An empty local bank to merge into. */
export function emptyLocalBank(name: string): ResolvedBank {
  return {
    name: name.trim().slice(0, BANK_LIMITS.nameLength) || '我的题库',
    version: '1.0.0',
    license: 'NOASSERTION',
    authors: [],
    language: 'zh-CN',
    tags: [],
    modules: [],
    questionCount: 0,
    bytes: 0,
    files: [],
  }
}

/** Checks and trims one incoming question to the package limits. */
export function fitQuestion(
  raw: ImportQuestion,
  id: string,
): { question: BankQuestion; warnings: string[] } | { error: string } {
  if (raw.difficulty !== 1 && raw.difficulty !== 2 && raw.difficulty !== 3) {
    return { error: 'difficulty 只能是 1、2 或 3' }
  }
  const question = raw.question.trim()
  const answer = raw.answer.trim()
  if (!question) return { error: '题目不能为空' }
  if (!answer) return { error: '答案不能为空' }
  if (question.length > BANK_LIMITS.questionLength) {
    return { error: `题目超过 ${BANK_LIMITS.questionLength} 个字符` }
  }
  if (answer.length > BANK_LIMITS.answerLength) {
    return { error: `答案超过 ${BANK_LIMITS.answerLength} 个字符` }
  }

  const warnings: string[] = []
  const tags = [
    ...new Set(
      (raw.tags ?? []).map((tag) => tag.trim().slice(0, BANK_LIMITS.tagLength)).filter(Boolean),
    ),
  ]
  if (tags.length > BANK_LIMITS.tagsPerQuestion) {
    warnings.push(
      `标签超过 ${BANK_LIMITS.tagsPerQuestion} 个，只保留前 ${BANK_LIMITS.tagsPerQuestion} 个`,
    )
  }
  const source = raw.source?.trim().slice(0, BANK_LIMITS.sourceLength)
  const checks = raw.checks?.slice(0, BANK_LIMITS.checksPerQuestion)

  return {
    question: {
      id,
      difficulty: raw.difficulty,
      question,
      answer,
      tags: tags.slice(0, BANK_LIMITS.tagsPerQuestion),
      ...(source ? { source } : {}),
      ...(checks?.length ? { checks } : {}),
    },
    warnings,
  }
}

export function mergeIntoBank(
  base: ResolvedBank,
  incoming: readonly ImportQuestion[],
): MergeResult {
  const modules: ResolvedBankModule[] = base.modules.map((mod) => ({
    ...mod,
    questions: [...mod.questions],
  }))
  const moduleByName = new Map(modules.map((mod) => [mod.name, mod]))
  const moduleIds = new Set(modules.map((mod) => mod.id))
  const location = new Map<string, ResolvedBankModule>()
  const idByText = new Map<string, string>()
  for (const mod of modules) {
    for (const question of mod.questions) {
      location.set(question.id, mod)
      idByText.set(normalizeText(question.question), question.id)
    }
  }

  let total = base.questionCount
  let added = 0
  let updated = 0
  const errors: ImportIssue[] = []
  const warnings: ImportIssue[] = []

  incoming.forEach((raw, index) => {
    const textKey = normalizeText(raw.question ?? '')
    const explicitId = raw.id?.trim() ? toLocalId(raw.id, '') : ''
    const existingId = explicitId && location.has(explicitId) ? explicitId : idByText.get(textKey)
    const id =
      existingId ??
      uniqueLocalId(explicitId || `q-${stableHash(textKey)}`, new Set(location.keys()))

    const fitted = fitQuestion(raw, id)
    if ('error' in fitted) {
      errors.push({ index, message: fitted.error })
      return
    }
    for (const message of fitted.warnings) warnings.push({ index, message })

    if (!existingId && total >= BANK_LIMITS.questions) {
      errors.push({ index, message: `一个题库最多 ${BANK_LIMITS.questions} 道题，请新建题库` })
      return
    }

    const moduleName = raw.module.trim().slice(0, BANK_LIMITS.moduleNameLength) || '未分组'
    let target = moduleByName.get(moduleName)
    if (!target) {
      if (modules.length >= BANK_LIMITS.modules) {
        errors.push({ index, message: `一个题库最多 ${BANK_LIMITS.modules} 个模块` })
        return
      }
      const moduleId = uniqueLocalId(
        toLocalId(slugify(moduleName), `m${modules.length + 1}`),
        moduleIds,
      )
      target = { id: moduleId, name: moduleName, questions: [] }
      modules.push(target)
      moduleByName.set(moduleName, target)
    }

    if (existingId) {
      const from = location.get(existingId)
      if (from === target) {
        const at = target.questions.findIndex((question) => question.id === existingId)
        target.questions[at] = fitted.question
      } else {
        if (from) from.questions = from.questions.filter((question) => question.id !== existingId)
        target.questions.push(fitted.question)
      }
      updated++
    } else {
      target.questions.push(fitted.question)
      total++
      added++
    }
    location.set(id, target)
    idByText.set(textKey, id)
  })

  const kept = modules.filter((mod) => mod.questions.length > 0)
  return {
    bank: {
      ...base,
      modules: kept,
      questionCount: kept.reduce((sum, mod) => sum + mod.questions.length, 0),
    },
    added,
    updated,
    errors,
    warnings,
  }
}
