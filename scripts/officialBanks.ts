/**
 * Official banks: sources live in `banks/official/<name>/` as regular `iface-bank@1` packages
 * (Markdown questions and checks). The app loads a generated single-file version of each from
 * `public/banks/iface.<name>.json`, listed in `public/banks/official.json`.
 *
 * Official content is held to stricter rules than community banks (see `qualityFailures`).
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { officialBankId } from '../src/data/bank/ids.ts'
import { BANK_FORMAT } from '../src/data/bank/schema.ts'
import { type ResolvedBank, resolveBank } from '../src/data/bank/validate.ts'

export const OFFICIAL_SOURCE_DIR = 'banks/official'
export const OFFICIAL_OUTPUT_DIR = 'public/banks'
export const OFFICIAL_INDEX_FILE = 'official.json'

const MIN_ANSWER_LENGTH = 180
const MIN_TAGS = 2
const CHECKS_PER_QUESTION = [3, 5] as const
const OPTIONS_PER_CHECK = [4, 6] as const

export interface OfficialIndexEntry {
  id: string
  name: string
  description?: string
  version: string
  /** First 16 hex chars of the generated file's sha256; changes whenever content changes. */
  hash: string
  file: string
  questionCount: number
}

export interface OfficialBuild {
  /** Output path relative to the repo root → file content. */
  outputs: Map<string, string>
  failures: string[]
  banks: { id: string; bank: ResolvedBank }[]
}

function qualityFailures(dir: string, bank: ResolvedBank): string[] {
  const failures: string[] = []
  for (const mod of bank.modules) {
    for (const question of mod.questions) {
      const where = `${dir}/${mod.id}/${question.id}`
      if (question.answer.length < MIN_ANSWER_LENGTH) {
        failures.push(
          `${where}: 答案过短（${question.answer.length} 字符，至少 ${MIN_ANSWER_LENGTH}）`,
        )
      }
      if (question.tags.length < MIN_TAGS) {
        failures.push(`${where}: 标签少于 ${MIN_TAGS} 个`)
      }
      if (!question.checks) continue
      const [minChecks, maxChecks] = CHECKS_PER_QUESTION
      if (question.checks.length < minChecks || question.checks.length > maxChecks) {
        failures.push(`${where}: 学习检验应为 ${minChecks}–${maxChecks} 道`)
      }
      for (const check of question.checks) {
        const [minOptions, maxOptions] = OPTIONS_PER_CHECK
        if (check.options.length < minOptions || check.options.length > maxOptions) {
          failures.push(`${where}/${check.id}: 选项应为 ${minOptions}–${maxOptions} 个`)
        }
        if (check.kind === 'multiple' && check.answerIds.length < 2) {
          failures.push(`${where}/${check.id}: 多选题至少两个正确项`)
        }
        if (!check.focus) failures.push(`${where}/${check.id}: 缺少考察点`)
      }
    }
  }
  return failures
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export async function buildOfficialBanks(repoRoot: string): Promise<OfficialBuild> {
  const sourceRoot = join(repoRoot, OFFICIAL_SOURCE_DIR)
  const outputs = new Map<string, string>()
  const failures: string[] = []
  const banks: OfficialBuild['banks'] = []
  const index: OfficialIndexEntry[] = []
  const seenIds = new Map<string, string>()
  const seenTexts = new Map<string, string>()

  const dirs = readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  for (const dir of dirs) {
    const bankRoot = join(sourceRoot, dir)
    const result = await resolveBank(
      readFileSync(join(bankRoot, 'iface-bank.json'), 'utf8'),
      async (path) => readFileSync(join(bankRoot, path), 'utf8'),
    )
    for (const issue of result.issues) {
      const where = [issue.file, issue.line ?? issue.path].filter(Boolean).join(':')
      failures.push(`${OFFICIAL_SOURCE_DIR}/${dir}/${where}: ${issue.message}`)
    }
    const bank = result.bank
    if (!bank) continue

    failures.push(...qualityFailures(`${OFFICIAL_SOURCE_DIR}/${dir}`, bank))

    // Official local ids are unique across all official banks: pre-2.0 data refers to them
    // without a bank prefix, and the legacy migration relies on that.
    for (const mod of bank.modules) {
      for (const question of mod.questions) {
        const where = `${dir}/${mod.id}`
        const otherId = seenIds.get(question.id)
        if (otherId) failures.push(`题目 id ${question.id} 同时出现在 ${otherId} 和 ${where}`)
        seenIds.set(question.id, where)
        const text = normalizeText(question.question)
        const otherText = seenTexts.get(text)
        if (otherText) failures.push(`重复题干：${question.id} 与 ${otherText}`)
        seenTexts.set(text, question.id)
      }
    }

    const id = officialBankId(dir)
    const single = {
      format: BANK_FORMAT,
      name: bank.name,
      ...(bank.description ? { description: bank.description } : {}),
      version: bank.version,
      license: bank.license,
      authors: bank.authors,
      language: bank.language,
      tags: bank.tags,
      ...(bank.homepage ? { homepage: bank.homepage } : {}),
      modules: bank.modules,
    }
    const content = `${JSON.stringify(single)}\n`
    const file = `${OFFICIAL_OUTPUT_DIR}/${id}.json`
    outputs.set(file, content)
    index.push({
      id,
      name: bank.name,
      ...(bank.description ? { description: bank.description } : {}),
      version: bank.version,
      hash: createHash('sha256').update(content).digest('hex').slice(0, 16),
      file: `/banks/${id}.json`,
      questionCount: bank.questionCount,
    })
    banks.push({ id, bank })
  }

  // Keep the order users know: 前端, Golang, AI Agent, Java.
  const ORDER = ['iface.frontend', 'iface.golang', 'iface.ai-agent', 'iface.java']
  index.sort((a, b) => {
    const ai = ORDER.indexOf(a.id)
    const bi = ORDER.indexOf(b.id)
    return (ai < 0 ? ORDER.length : ai) - (bi < 0 ? ORDER.length : bi) || a.id.localeCompare(b.id)
  })
  outputs.set(
    `${OFFICIAL_OUTPUT_DIR}/${OFFICIAL_INDEX_FILE}`,
    `${JSON.stringify({ banks: index }, null, 2)}\n`,
  )

  return { outputs, failures, banks }
}
