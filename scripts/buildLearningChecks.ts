import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'

interface QuestionRecord {
  id: string
}

interface LearningCheckOption {
  id: string
  text: string
}

interface LearningCheckQuestion {
  id: string
  kind: 'single' | 'multiple'
  prompt: string
  options: LearningCheckOption[]
  answerIds: string[]
  explanation: string
  focus: string
}

interface LearningCheckBundle {
  questionId: string
  checks: LearningCheckQuestion[]
}

interface DraftQuestion {
  kind: LearningCheckQuestion['kind']
  focus: string
  promptLines: string[]
  options: Array<LearningCheckOption & { correct: boolean }>
  explanation: string
}

const sourceRoot = 'content/learning-checks'
const outputRoot = 'public/learning-checks'
const questionRoot = 'public/questions'

function stringifyBundles(bundles: LearningCheckBundle[]): string {
  return `${JSON.stringify(bundles, null, 2).replace(
    /(\s*)"answerIds": \[\n([\s\S]*?)\n\1\]/g,
    (_, indent: string, body: string) => {
      const ids = body
        .trim()
        .split('\n')
        .map((line) => line.trim().replace(/,$/, ''))
        .filter(Boolean)
        .join(', ')

      return `${indent}"answerIds": [${ids}]`
    },
  )}\n`
}

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(root, entry.name)
      if (entry.isDirectory()) return listFiles(path)
      return entry.isFile() ? [path] : []
    }),
  )
  return files.flat()
}

function parseQuestionHeading(line: string): {
  number: number
  kind: LearningCheckQuestion['kind']
  focus: string
} | null {
  const match = line.match(/^###\s+Q(\d+)\s+(single|multiple)\s+\|\s+(.+)$/)
  if (!match) return null
  return {
    number: Number(match[1]),
    kind: match[2] as LearningCheckQuestion['kind'],
    focus: match[3].trim(),
  }
}

function finishDraft(
  bundles: LearningCheckBundle[],
  questionId: string | null,
  draft: DraftQuestion | null,
  questionNumber: number,
  file: string,
) {
  if (!draft || !questionId) return

  const prompt = draft.promptLines.join('\n').trim()
  const answerIds = draft.options.filter((option) => option.correct).map((option) => option.id)

  const check: LearningCheckQuestion = {
    id: `${questionId}-check-${String(questionNumber).padStart(2, '0')}`,
    kind: draft.kind,
    prompt,
    options: draft.options.map(({ id, text }) => ({ id, text })),
    answerIds,
    explanation: draft.explanation.trim(),
    focus: draft.focus,
  }

  validateCheck(check, file)

  let bundle = bundles.find((item) => item.questionId === questionId)
  if (!bundle) {
    bundle = { questionId, checks: [] }
    bundles.push(bundle)
  }
  bundle.checks.push(check)
}

function validateCheck(check: LearningCheckQuestion, file: string) {
  const prefix = `${file} ${check.id}`
  if (!check.prompt) throw new Error(`${prefix}: missing prompt`)
  if (!check.explanation) throw new Error(`${prefix}: missing explanation`)
  if (check.options.length < 4 || check.options.length > 6) {
    throw new Error(`${prefix}: expected 4-6 options, got ${check.options.length}`)
  }

  const optionIds = new Set(check.options.map((option) => option.id))
  if (optionIds.size !== check.options.length) throw new Error(`${prefix}: duplicate option id`)
  if (check.answerIds.some((id) => !optionIds.has(id))) {
    throw new Error(`${prefix}: answer id does not exist`)
  }
  if (check.kind === 'single' && check.answerIds.length !== 1) {
    throw new Error(`${prefix}: single choice must have exactly one answer`)
  }
  if (check.kind === 'multiple' && check.answerIds.length < 2) {
    throw new Error(`${prefix}: multiple choice must have at least two answers`)
  }
}

function parseLearningCheckMarkdown(markdown: string, file: string): LearningCheckBundle[] {
  const bundles: LearningCheckBundle[] = []
  const lines = markdown.split(/\r?\n/)
  let currentQuestionId: string | null = null
  let currentDraft: DraftQuestion | null = null
  let currentQuestionNumber = 0
  let readingExplanation = false

  for (const line of lines) {
    const bundleMatch = line.match(/^##\s+([a-z0-9-]+)\s*$/)
    if (bundleMatch) {
      finishDraft(bundles, currentQuestionId, currentDraft, currentQuestionNumber, file)
      currentQuestionId = bundleMatch[1]
      currentDraft = null
      readingExplanation = false
      continue
    }

    const heading = parseQuestionHeading(line)
    if (heading) {
      finishDraft(bundles, currentQuestionId, currentDraft, currentQuestionNumber, file)
      currentQuestionNumber = heading.number
      currentDraft = {
        kind: heading.kind,
        focus: heading.focus,
        promptLines: [],
        options: [],
        explanation: '',
      }
      readingExplanation = false
      continue
    }

    if (!currentDraft) continue

    const explanationMatch = line.match(/^\*\*解释\*\*[：:]\s*(.*)$/)
    if (explanationMatch) {
      currentDraft.explanation = explanationMatch[1].trim()
      readingExplanation = true
      continue
    }

    if (readingExplanation) {
      if (line.trim()) currentDraft.explanation += `${currentDraft.explanation ? '\n' : ''}${line}`
      continue
    }

    const optionMatch = line.match(/^-\s+\[(x| )\]\s+([A-F])\.\s+(.+)$/i)
    if (optionMatch) {
      currentDraft.options.push({
        id: optionMatch[2].toLowerCase(),
        text: optionMatch[3].trim(),
        correct: optionMatch[1].toLowerCase() === 'x',
      })
      continue
    }

    currentDraft.promptLines.push(line)
  }

  finishDraft(bundles, currentQuestionId, currentDraft, currentQuestionNumber, file)

  for (const bundle of bundles) {
    if (bundle.checks.length < 3 || bundle.checks.length > 5) {
      throw new Error(
        `${file} ${bundle.questionId}: expected 3-5 checks, got ${bundle.checks.length}`,
      )
    }
  }

  return bundles
}

async function readQuestionIds(): Promise<Set<string>> {
  const files = (await listFiles(questionRoot)).filter((file) => file.endsWith('.json'))
  const ids = new Set<string>()

  for (const file of files) {
    const data = JSON.parse(await readFile(file, 'utf8')) as QuestionRecord[]
    for (const question of data) {
      ids.add(question.id)
    }
  }

  return ids
}

async function main() {
  const questionIds = await readQuestionIds()
  const files = (await listFiles(sourceRoot)).filter((file) => file.endsWith('.md')).sort()
  let bundleCount = 0
  let checkCount = 0

  for (const file of files) {
    const markdown = await readFile(file, 'utf8')
    const bundles = parseLearningCheckMarkdown(markdown, file)

    for (const bundle of bundles) {
      if (!questionIds.has(bundle.questionId)) {
        throw new Error(`${file}: unknown question id ${bundle.questionId}`)
      }
    }

    const output = join(outputRoot, relative(sourceRoot, file).replace(/\.md$/, '.json'))
    await mkdir(dirname(output), { recursive: true })
    await writeFile(output, stringifyBundles(bundles))
    bundleCount += bundles.length
    checkCount += bundles.reduce((sum, bundle) => sum + bundle.checks.length, 0)
  }

  console.log(`Generated ${bundleCount} learning-check bundles with ${checkCount} checks.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
