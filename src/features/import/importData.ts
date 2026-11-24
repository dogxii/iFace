import { mdToQuestions } from '@/lib/markdownQuestions'
import { parseJSONSafe } from '@/lib/questionLoader'
import type { Question } from '@/types'

export type PasteFormat = 'json' | 'markdown'

/** JSON if it looks like an array/object, otherwise the Markdown block format. */
export function detectPasteFormat(text: string): PasteFormat {
  const first = text.trimStart()[0]
  return first === '[' || first === '{' ? 'json' : 'markdown'
}

export type ParsedImport =
  | { ok: true; format: PasteFormat; data: unknown; count: number | null; skipped: string[] }
  | { ok: false; format: PasteFormat; errors: string[] }

/** Parse pasted or file content into importable data, without touching the database. */
export function parseImportText(text: string, format = detectPasteFormat(text)): ParsedImport {
  if (format === 'json') {
    const parsed = parseJSONSafe(text.trim())
    if (!parsed.ok) return { ok: false, format, errors: [`JSON 解析失败：${parsed.error}`] }
    const data = parsed.data
    const count = Array.isArray(data)
      ? data.length
      : data &&
          typeof data === 'object' &&
          Array.isArray((data as { questions?: unknown }).questions)
        ? (data as { questions: unknown[] }).questions.length
        : null
    return { ok: true, format, data, count, skipped: [] }
  }
  const { questions, errors } = mdToQuestions(text)
  if (questions.length === 0) {
    return { ok: false, format, errors: errors.length > 0 ? errors : ['没有识别到题目'] }
  }
  return { ok: true, format, data: questions, count: questions.length, skipped: errors }
}

/** Source name for an imported file: its name without the extension. */
export function sourceNameFromFile(fileName: string): string {
  return fileName.replace(/\.(json|md|markdown)$/i, '').trim() || fileName
}

/** Number of stored questions per custom source. */
export function countBySource(questions: Question[], sources: string[]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(sources.map((s) => [s, 0]))
  for (const q of questions) {
    if (!q.source) continue
    const name = q.source.startsWith('custom_') ? q.source.slice('custom_'.length) : q.source
    if (name in counts) counts[name] += 1
  }
  return counts
}
