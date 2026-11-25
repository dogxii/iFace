import { parseMarkdownQuestions } from '@/data/bank/markdown'
import { BANK_FORMAT } from '@/data/bank/schema'
import type { ImportQuestion } from '@/lib/banks/localImport'
import { mdToQuestions } from '@/lib/markdownQuestions'

export type PasteFormat = 'json' | 'markdown'

/** JSON if it looks like an array/object, otherwise one of the Markdown formats. */
export function detectPasteFormat(text: string): PasteFormat {
  const first = text.trimStart()[0]
  return first === '[' || first === '{' ? 'json' : 'markdown'
}

export type ParsedImport =
  /** Loose questions, merged into a local bank. */
  | {
      ok: true
      kind: 'questions'
      format: PasteFormat
      questions: ImportQuestion[]
      count: number
      skipped: string[]
    }
  /** A whole `iface-bank@1` package (single file), installed as its own local bank. */
  | { ok: true; kind: 'package'; format: 'json'; name: string; text: string; count: number }
  | { ok: false; format: PasteFormat; errors: string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/** Maps loose objects (`{ module, difficulty, question, answer, tags }`) to import questions. */
export function toImportQuestions(
  items: readonly unknown[],
  fallbackModule: string,
): { questions: ImportQuestion[]; skipped: string[] } {
  const questions: ImportQuestion[] = []
  const skipped: string[] = []
  items.forEach((item, index) => {
    const label = `第 ${index + 1} 题`
    if (!isRecord(item)) {
      skipped.push(`${label}：不是对象`)
      return
    }
    const question = text(item.question).trim()
    const answer = text(item.answer).trim()
    if (!question || !answer) {
      skipped.push(`${label}：缺少 ${question ? 'answer' : 'question'}`)
      return
    }
    const difficulty =
      typeof item.difficulty === 'number' ? item.difficulty : Number(item.difficulty)
    questions.push({
      ...(text(item.id).trim() ? { id: text(item.id).trim() } : {}),
      module: text(item.module).trim() || fallbackModule,
      difficulty: Number.isFinite(difficulty) ? difficulty : 2,
      question,
      answer,
      tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === 'string') : [],
      ...(text(item.source).trim() ? { source: text(item.source).trim() } : {}),
    })
  })
  return { questions, skipped }
}

function packageQuestionCount(manifest: Record<string, unknown>): number {
  if (!Array.isArray(manifest.modules)) return 0
  return manifest.modules.reduce<number>(
    (sum, mod) => sum + (isRecord(mod) && Array.isArray(mod.questions) ? mod.questions.length : 0),
    0,
  )
}

/**
 * Parses pasted or file content without touching the database. Accepts:
 * - an `iface-bank@1` package with inline questions
 * - a JSON array of questions (or `{ "questions": [...] }`)
 * - iface-bank Markdown (`<!-- id: … -->` blocks), all in `fallbackModule`
 * - the AI prompt Markdown (`## 题目` / `**模块**:` blocks separated by `---`)
 */
export function parseImportText(
  input: string,
  format = detectPasteFormat(input),
  fallbackModule = '未分组',
): ParsedImport {
  if (format === 'json') {
    let data: unknown
    try {
      data = JSON.parse(input.trim())
    } catch (error) {
      return { ok: false, format, errors: [`JSON 解析失败：${String(error)}`] }
    }
    if (isRecord(data) && data.format === BANK_FORMAT) {
      return {
        ok: true,
        kind: 'package',
        format,
        name: text(data.name).trim() || '未命名题库',
        text: input,
        count: packageQuestionCount(data),
      }
    }
    const items = Array.isArray(data)
      ? data
      : isRecord(data) && Array.isArray(data.questions)
        ? data.questions
        : null
    if (!items) {
      return {
        ok: false,
        format,
        errors: [`需要题目数组、{ "questions": [...] } 或 format 为 ${BANK_FORMAT} 的题库包`],
      }
    }
    const { questions, skipped } = toImportQuestions(items, fallbackModule)
    if (questions.length === 0) {
      return { ok: false, format, errors: skipped.length > 0 ? skipped : ['没有识别到题目'] }
    }
    return { ok: true, kind: 'questions', format, questions, count: questions.length, skipped }
  }

  const bankFormat = /^\s*<!--\s*id\s*[:：]/m.test(input)
  const parsed = bankFormat
    ? (() => {
        const result = parseMarkdownQuestions(input)
        return {
          items: result.questions,
          skipped: result.issues.map((issue) => `第 ${issue.line} 行：${issue.message}`),
        }
      })()
    : (() => {
        const result = mdToQuestions(input)
        return { items: result.questions, skipped: result.errors }
      })()
  const { questions, skipped } = toImportQuestions(parsed.items, fallbackModule)
  const allSkipped = [...parsed.skipped, ...skipped]
  if (questions.length === 0) {
    return { ok: false, format, errors: allSkipped.length > 0 ? allSkipped : ['没有识别到题目'] }
  }
  return {
    ok: true,
    kind: 'questions',
    format,
    questions,
    count: questions.length,
    skipped: allSkipped,
  }
}

/** Default bank or module name for an imported file: its name without the extension. */
export function sourceNameFromFile(fileName: string): string {
  return fileName.replace(/\.(json|md|markdown)$/i, '').trim() || fileName
}

export function isImportableFile(file: File): boolean {
  return /\.(json|md|markdown)$/i.test(file.name)
}

export function isMarkdownFile(file: File): boolean {
  return /\.(md|markdown)$/i.test(file.name)
}
