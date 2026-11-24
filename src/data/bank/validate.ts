/**
 * Resolves and validates an `iface-bank@1` package.
 *
 * `resolveBank` reads the manifest, follows module file references through the `readFile`
 * callback (fetch, filesystem, zip — the caller decides), validates every question and enforces
 * the package limits. Broken questions are skipped and reported; only problems with the package
 * as a whole (bad manifest, over the limits, no questions at all) make `bank` null.
 */
import { type ZodError, z } from 'zod'
import { parseChecksMarkdown } from './checksMarkdown'
import { parseMarkdownQuestions } from './markdown'
import {
  BANK_LIMITS,
  BANK_MODULE_COLORS,
  BANK_MODULE_ICONS,
  type BankLearningCheck,
  type BankManifest,
  BankManifestSchema,
  type BankModuleColor,
  type BankModuleIcon,
  type BankQuestion,
  BankQuestionSchema,
  LearningCheckSchema,
} from './schema'

export type BankIssueLevel = 'error' | 'warning'

export interface BankIssue {
  level: BankIssueLevel
  /** Stable machine-readable code, e.g. `question-invalid`. */
  code: string
  message: string
  /** Package-relative file the issue is in; the manifest when absent. */
  file?: string
  /** JSON path inside the file, e.g. `modules[0].questions[3].answer`. */
  path?: string
  /** 1-based line, for Markdown question files. */
  line?: number
}

export interface ResolvedBankModule {
  id: string
  name: string
  description?: string
  icon?: BankModuleIcon
  color?: BankModuleColor
  questions: BankQuestion[]
}

export interface ResolvedBank {
  name: string
  description?: string
  version: string
  license: string
  authors: string[]
  language: string
  tags: string[]
  homepage?: string
  modules: ResolvedBankModule[]
  questionCount: number
  /** Manifest plus every referenced file. */
  bytes: number
  /** Package-relative files that were read, manifest first. */
  files: string[]
}

export interface BankValidation {
  bank: ResolvedBank | null
  issues: BankIssue[]
}

/** Reads a package-relative file; throw (any error) when it does not exist. */
export type ReadBankFile = (path: string) => Promise<string>

const zhCN = z.locales.zhCN().localeError

function formatPath(prefix: string, path: readonly PropertyKey[]): string {
  return path.reduce<string>((acc, key) => {
    if (typeof key === 'number') return `${acc}[${key}]`
    return acc ? `${acc}.${String(key)}` : String(key)
  }, prefix)
}

function zodIssues(
  error: ZodError,
  base: Omit<BankIssue, 'message' | 'path'>,
  prefix = '',
): BankIssue[] {
  return error.issues.map((issue) => ({
    ...base,
    path: formatPath(prefix, issue.path),
    message: issue.message,
  }))
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

export function bankIsValid(result: BankValidation): boolean {
  return result.bank !== null && result.issues.every((issue) => issue.level !== 'error')
}

/** Thrown inside `resolveBank` once a package-level error has been recorded. */
class PackageFailure extends Error {}

export async function resolveBank(
  manifestText: string,
  readFile?: ReadBankFile,
  manifestFile = 'iface-bank.json',
): Promise<BankValidation> {
  const issues: BankIssue[] = []
  const failure = (code: string, message: string, extra: Partial<BankIssue> = {}) => {
    issues.push({ level: 'error', code, message, file: manifestFile, ...extra })
    return new PackageFailure(message)
  }

  try {
    const bank = await resolve()
    return { bank, issues }
  } catch (error) {
    if (error instanceof PackageFailure) return { bank: null, issues }
    throw error
  }

  async function resolve(): Promise<ResolvedBank> {
    let bytes = 0
    const files = [manifestFile]
    const addBytes = (text: string) => {
      bytes += byteLength(text)
      if (bytes > BANK_LIMITS.totalBytes) {
        throw failure('too-large', `题库超过 ${BANK_LIMITS.totalBytes / 1024 / 1024} MB`)
      }
    }
    const readPackageFile = async (file: string, path: string): Promise<string> => {
      if (!files.includes(file)) files.push(file)
      if (files.length > BANK_LIMITS.files) {
        throw failure('too-many-files', `题库最多 ${BANK_LIMITS.files} 个文件`)
      }
      if (!readFile) {
        throw failure('file-unavailable', `无法读取 ${file}：单文件上传请把内容直接写在清单里`, {
          path,
        })
      }
      let text: string
      try {
        text = await readFile(file)
      } catch {
        throw failure('file-missing', `找不到文件 ${file}`, { path })
      }
      addBytes(text)
      return text
    }

    addBytes(manifestText)

    let raw: unknown
    try {
      raw = JSON.parse(manifestText)
    } catch (error) {
      throw failure('invalid-json', `不是合法的 JSON：${(error as Error).message}`)
    }

    const parsed = BankManifestSchema.safeParse(raw, { error: zhCN })
    if (!parsed.success) {
      issues.push(
        ...zodIssues(parsed.error, {
          level: 'error',
          code: 'manifest-invalid',
          file: manifestFile,
        }),
      )
      throw new PackageFailure('manifest-invalid')
    }
    const manifest: BankManifest = parsed.data

    if (manifest.license.toUpperCase() === 'NOASSERTION') {
      issues.push({
        level: 'warning',
        code: 'license-missing',
        file: manifestFile,
        path: 'license',
        message: '没有声明协议（NOASSERTION），别人不清楚能否转载和修改',
      })
    }

    const seenModules = new Set<string>()
    const seenQuestions = new Map<string, string>()
    const modules: ResolvedBankModule[] = []
    let questionCount = 0

    for (const [moduleIndex, mod] of manifest.modules.entries()) {
      const modulePath = `modules[${moduleIndex}]`
      if (seenModules.has(mod.id)) {
        issues.push({
          level: 'error',
          code: 'module-duplicate',
          file: manifestFile,
          path: `${modulePath}.id`,
          message: `模块 id「${mod.id}」重复`,
        })
        continue
      }
      seenModules.add(mod.id)

      const icon = pickKnown(mod.icon, BANK_MODULE_ICONS, () =>
        issues.push({
          level: 'warning',
          code: 'module-icon-unknown',
          file: manifestFile,
          path: `${modulePath}.icon`,
          message: `不认识的图标「${mod.icon}」，将使用默认图标`,
        }),
      )
      const color = pickKnown(mod.color, BANK_MODULE_COLORS, () =>
        issues.push({
          level: 'warning',
          code: 'module-color-unknown',
          file: manifestFile,
          path: `${modulePath}.color`,
          message: `不支持的颜色「${mod.color}」，可选：${BANK_MODULE_COLORS.join(' / ')}`,
        }),
      )

      // Collect raw question entries with where they came from.
      let entries: { value: unknown; file: string; path: string; line?: number }[]
      if (typeof mod.questions === 'string') {
        const file = mod.questions
        const text = await readPackageFile(file, `${modulePath}.questions`)
        if (file.endsWith('.md')) {
          const md = parseMarkdownQuestions(text)
          for (const issue of md.issues) {
            issues.push({
              level: 'error',
              code: 'markdown-invalid',
              file,
              line: issue.line,
              message: issue.message,
            })
          }
          entries = md.questions.map((value) => ({
            value,
            file,
            path: '',
            line: typeof value.__line === 'number' ? value.__line : undefined,
          }))
        } else {
          let data: unknown
          try {
            data = JSON.parse(text)
          } catch (error) {
            throw failure('invalid-json', `不是合法的 JSON：${(error as Error).message}`, { file })
          }
          if (!Array.isArray(data)) {
            throw failure('questions-not-array', '题目文件的顶层必须是数组', { file })
          }
          entries = data.map((value, index) => ({ value, file, path: `[${index}]` }))
        }
      } else {
        entries = mod.questions.map((value, index) => ({
          value,
          file: manifestFile,
          path: `${modulePath}.questions[${index}]`,
        }))
      }

      const questions: BankQuestion[] = []
      for (const entry of entries) {
        const where = { file: entry.file, ...(entry.line ? { line: entry.line } : {}) }
        const result = BankQuestionSchema.safeParse(entry.value, { error: zhCN })
        if (!result.success) {
          issues.push(
            ...zodIssues(
              result.error,
              { level: 'error', code: 'question-invalid', ...where },
              entry.path,
            ),
          )
          continue
        }
        const question = result.data
        const firstSeen = seenQuestions.get(question.id)
        if (firstSeen) {
          issues.push({
            level: 'error',
            code: 'question-duplicate',
            ...where,
            path: entry.path ? `${entry.path}.id` : undefined,
            message: `题目 id「${question.id}」重复（第一次出现在 ${firstSeen}），已跳过`,
          })
          continue
        }
        seenQuestions.set(question.id, `${entry.file}${entry.line ? `:${entry.line}` : ''}`)
        questions.push(question)
      }

      if (mod.checks) {
        const file = mod.checks
        const text = await readPackageFile(file, `${modulePath}.checks`)
        attachMarkdownChecks(text, file, mod.name, questions, issues)
      }

      for (const question of questions) {
        const checkIds = new Set<string>()
        for (const check of question.checks ?? []) {
          if (checkIds.has(check.id)) {
            issues.push({
              level: 'error',
              code: 'check-duplicate',
              file: manifestFile,
              message: `题目「${question.id}」的学习检验 id「${check.id}」重复`,
            })
          }
          checkIds.add(check.id)
        }
      }

      questionCount += questions.length
      if (questionCount > BANK_LIMITS.questions) {
        throw failure('too-many-questions', `题库最多 ${BANK_LIMITS.questions} 道题`)
      }
      if (questions.length === 0) {
        issues.push({
          level: 'warning',
          code: 'module-empty',
          file: manifestFile,
          path: `${modulePath}.questions`,
          message: `模块「${mod.name}」没有可用的题目，已忽略`,
        })
        continue
      }

      modules.push({
        id: mod.id,
        name: mod.name,
        ...(mod.description ? { description: mod.description } : {}),
        ...(icon ? { icon } : {}),
        ...(color ? { color } : {}),
        questions,
      })
    }

    if (questionCount === 0) {
      throw failure('bank-empty', '题库里没有可用的题目')
    }

    return {
      name: manifest.name,
      ...(manifest.description ? { description: manifest.description } : {}),
      version: manifest.version,
      license: manifest.license,
      authors: manifest.authors,
      language: manifest.language,
      tags: manifest.tags,
      ...(manifest.homepage ? { homepage: manifest.homepage } : {}),
      modules,
      questionCount,
      bytes,
      files,
    }
  }
}

function pickKnown<T extends string>(
  value: string | undefined,
  known: readonly T[],
  onUnknown: () => void,
): T | undefined {
  if (value === undefined) return undefined
  if ((known as readonly string[]).includes(value)) return value as T
  onUnknown()
  return undefined
}

function attachMarkdownChecks(
  text: string,
  file: string,
  moduleName: string,
  questions: BankQuestion[],
  issues: BankIssue[],
): void {
  const parsed = parseChecksMarkdown(text)
  for (const issue of parsed.issues) {
    issues.push({ level: 'error', code: 'markdown-invalid', file, ...issue })
  }
  const byId = new Map(questions.map((question) => [question.id, question]))
  for (const [questionId, group] of parsed.byQuestion) {
    const question = byId.get(questionId)
    if (!question) {
      issues.push({
        level: 'error',
        code: 'check-orphan',
        file,
        line: group.line,
        message: `学习检验对应的题目「${questionId}」不在模块「${moduleName}」里`,
      })
      continue
    }
    if (question.checks?.length) {
      issues.push({
        level: 'error',
        code: 'check-conflict',
        file,
        line: group.line,
        message: `题目「${questionId}」已经在题目数据里写了学习检验，不能再在 ${file} 里写`,
      })
      continue
    }
    const checks: BankLearningCheck[] = []
    for (const { line, ...check } of group.checks) {
      const result = LearningCheckSchema.safeParse(check, { error: zhCN })
      if (result.success) checks.push(result.data)
      else
        issues.push(
          ...zodIssues(result.error, { level: 'error', code: 'check-invalid', file, line }),
        )
    }
    if (checks.length > BANK_LIMITS.checksPerQuestion) {
      issues.push({
        level: 'error',
        code: 'check-too-many',
        file,
        line: group.line,
        message: `题目「${questionId}」的学习检验超过 ${BANK_LIMITS.checksPerQuestion} 道，多出的已忽略`,
      })
    }
    if (checks.length > 0) question.checks = checks.slice(0, BANK_LIMITS.checksPerQuestion)
  }
}
