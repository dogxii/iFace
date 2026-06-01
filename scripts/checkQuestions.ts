import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeQuestionsForImport, validateQuestions } from '../src/data/schema.ts'
import { DEFAULT_CATEGORY_MAP } from '../src/lib/db.ts'
import { BUILTIN_CATEGORIES, BUILTIN_MODULE_FILES } from '../src/lib/questionLoader.ts'
import {
  BUILTIN_MODULE_CATEGORY,
  BUILTIN_MODULES,
  type Difficulty,
  type Question,
} from '../src/types'

interface QuestionWithFile extends Question {
  file: string
}

interface Failure {
  file: string
  id?: string
  message: string
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(scriptDir, '..')
const questionRoot = join(repoRoot, 'public/questions')
const MIN_ANSWER_LENGTH = 180
const MIN_TAGS = 2

function findJsonFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) return findJsonFiles(fullPath)
    return entry.isFile() && entry.name.endsWith('.json') ? [fullPath] : []
  })
}

function normalizeQuestion(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function groupBy<T>(items: T[], keyFor: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const item of items) {
    const key = keyFor(item)
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  }
  return grouped
}

const failures: Failure[] = []
const questions: QuestionWithFile[] = []
const files = findJsonFiles(questionRoot).sort()
const actualQuestionFiles = files.map((file) => relative(questionRoot, file)).sort()
const registryQuestionFiles = [...BUILTIN_MODULE_FILES].sort()

function reportSetDiff(
  file: string,
  actual: readonly string[],
  expected: readonly string[],
  actualLabel: string,
  expectedLabel: string,
): void {
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)

  for (const item of expected) {
    if (!actualSet.has(item)) {
      failures.push({
        file,
        message: `${actualLabel} 缺少 ${expectedLabel} 中的条目：${item}`,
      })
    }
  }

  for (const item of actual) {
    if (!expectedSet.has(item)) {
      failures.push({
        file,
        message: `${actualLabel} 包含未登记在 ${expectedLabel} 的条目：${item}`,
      })
    }
  }
}

reportSetDiff(
  'src/lib/questionLoader.ts',
  actualQuestionFiles,
  registryQuestionFiles,
  'public/questions',
  'BUILTIN_MODULE_FILES',
)

const registryFileCounts = groupBy([...BUILTIN_MODULE_FILES], (file) => file)
for (const [file, entries] of registryFileCounts) {
  if (entries.length > 1) {
    failures.push({
      file: 'src/lib/questionLoader.ts',
      message: `BUILTIN_MODULE_FILES 重复登记：${file}`,
    })
  }
}

for (const category of BUILTIN_CATEGORIES) {
  const defaultEntry = DEFAULT_CATEGORY_MAP[category.category]
  if (!defaultEntry) {
    failures.push({
      file: 'src/lib/questionLoader.ts',
      message: `内置分类 ${category.category} 缺少 DEFAULT_CATEGORY_MAP 配置`,
    })
    continue
  }

  if (!defaultEntry.builtin) {
    failures.push({
      file: 'src/lib/db.ts',
      message: `内置分类 ${category.category} 的 builtin 应为 true`,
    })
  }
}

for (const category of Object.values(DEFAULT_CATEGORY_MAP)) {
  if (!category.builtin) continue
  if (!BUILTIN_CATEGORIES.some((item) => item.category === category.name)) {
    failures.push({
      file: 'src/lib/db.ts',
      message: `DEFAULT_CATEGORY_MAP 内置分类 ${category.name} 没有登记到 BUILTIN_CATEGORIES`,
    })
  }
}

const customImportProbe = validateQuestions(
  normalizeQuestionsForImport([
    {
      module: 'Smoke Test',
      difficulty: 1,
      question: 'Can custom imports omit id and tags?',
      answer: 'Yes. iFace should generate a stable id and default tags to an empty array.',
    },
  ]),
)
if (customImportProbe.valid.length !== 1 || customImportProbe.valid[0].tags.length !== 0) {
  failures.push({
    file: 'src/data/schema.ts',
    message: '自定义导入兼容检查失败：缺省 id/tags 未被规范化',
  })
}

for (const absoluteFile of files) {
  const file = relative(repoRoot, absoluteFile)
  let raw: unknown

  try {
    raw = JSON.parse(readFileSync(absoluteFile, 'utf8'))
  } catch (err) {
    failures.push({ file, message: `JSON 解析失败: ${String(err)}` })
    continue
  }

  const { valid, errors } = validateQuestions(raw)
  for (const error of errors) {
    failures.push({
      file,
      message: `第 ${error.index} 项 schema 校验失败: ${error.message}`,
    })
  }

  for (const question of valid) {
    questions.push({ ...(question as Question), file })
  }
}

const ids = groupBy(questions, (question) => question.id)
for (const [id, entries] of ids) {
  if (entries.length > 1) {
    failures.push({
      file: entries.map((entry) => entry.file).join(', '),
      id,
      message: `重复题目 ID，出现 ${entries.length} 次`,
    })
  }
}

const texts = groupBy(questions, (question) => normalizeQuestion(question.question))
for (const [text, entries] of texts) {
  if (entries.length > 1) {
    failures.push({
      file: entries.map((entry) => entry.file).join(', '),
      id: entries.map((entry) => entry.id).join(', '),
      message: `重复题干: ${text}`,
    })
  }
}

for (const question of questions) {
  if (question.answer.trim().length < MIN_ANSWER_LENGTH) {
    failures.push({
      file: question.file,
      id: question.id,
      message: `答案过短，仅 ${question.answer.trim().length} 字符，至少需要 ${MIN_ANSWER_LENGTH}`,
    })
  }

  if (question.tags.length < MIN_TAGS) {
    failures.push({
      file: question.file,
      id: question.id,
      message: `tag 数量不足，仅 ${question.tags.length} 个，至少需要 ${MIN_TAGS}`,
    })
  }

  if (question.tags.some((tag) => tag.trim().length === 0)) {
    failures.push({
      file: question.file,
      id: question.id,
      message: '存在空 tag',
    })
  }
}

const moduleCounts = groupBy(questions, (question) => question.module)
const difficultyCounts = groupBy(questions, (question) => String(question.difficulty as Difficulty))
const questionsByFile = groupBy(questions, (question) =>
  relative(questionRoot, join(repoRoot, question.file)),
)

for (const category of BUILTIN_CATEGORIES) {
  const modulesInFiles = new Set<string>()
  for (const file of category.files) {
    for (const question of questionsByFile.get(file) ?? []) {
      modulesInFiles.add(question.module)
    }
  }

  const defaultEntry = DEFAULT_CATEGORY_MAP[category.category]
  if (!defaultEntry) continue

  reportSetDiff(
    'src/lib/db.ts',
    [...modulesInFiles].sort(),
    [...defaultEntry.modules].sort(),
    `${category.category} 题库模块`,
    'DEFAULT_CATEGORY_MAP',
  )
}

const defaultBuiltinModules = Object.values(DEFAULT_CATEGORY_MAP).flatMap((category) =>
  category.builtin ? category.modules : [],
)
reportSetDiff(
  'src/types/index.ts',
  [...BUILTIN_MODULES].sort(),
  [...defaultBuiltinModules].sort(),
  'BUILTIN_MODULES',
  'DEFAULT_CATEGORY_MAP 内置模块',
)

for (const module of defaultBuiltinModules) {
  if (!BUILTIN_MODULE_CATEGORY[module]) {
    failures.push({
      file: 'src/types/index.ts',
      message: `BUILTIN_MODULE_CATEGORY 缺少内置模块 ${module}`,
    })
  }
}

if (failures.length > 0) {
  console.error(`题库质量检查失败：${failures.length} 个问题`)
  for (const failure of failures) {
    const id = failure.id ? ` ${failure.id}` : ''
    console.error(`- ${failure.file}${id}: ${failure.message}`)
  }
  process.exit(1)
}

console.log(`题库质量检查通过：${questions.length} 道题，${files.length} 个 JSON 文件`)
console.log(
  `难度分布：${[...difficultyCounts.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([difficulty, entries]) => `${difficulty}=${entries.length}`)
    .join(', ')}`,
)
console.log(
  `模块覆盖：${[...moduleCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
    .map(([module, entries]) => `${module}=${entries.length}`)
    .join(', ')}`,
)
