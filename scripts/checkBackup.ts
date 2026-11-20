import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { CategoryMap } from '../src/lib/db.ts'
import {
  countMergedAISessions,
  mergeCategoryMaps,
  parseImportPreview,
} from '../src/lib/localBackup.ts'
import type { AISession } from '../src/store/useAIStore.ts'
import type { Question } from '../src/types'

interface Failure {
  name: string
  message: string
}

const failures: Failure[] = []

function assert(name: string, condition: boolean, message: string): void {
  if (!condition) failures.push({ name, message })
}

function assertThrows(name: string, fn: () => unknown, expected: string): void {
  try {
    fn()
    failures.push({ name, message: '预期抛出错误，但实际通过了' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes(expected)) {
      failures.push({ name, message: `错误信息不匹配：${message}` })
    }
  }
}

function question(overrides: Partial<Question> = {}): Question {
  return {
    id: 'custom_legacy-pack_001',
    module: 'Legacy Module',
    difficulty: 2,
    question: '旧版备份为什么需要推导自定义来源？',
    answer: '为了让旧备份恢复后仍能出现在来源管理和分类筛选里。',
    tags: ['备份'],
    source: 'legacy-pack.json',
    ...overrides,
  }
}

function session(questionId: string, content: string, updatedAt = 1777777777000): AISession {
  return {
    questionId,
    messages: [{ role: 'assistant', content }],
    createdAt: updatedAt - 100,
    updatedAt,
  }
}

const fixturePath = fileURLToPath(new URL('./fixtures/smoke-backup.json', import.meta.url))
const fixturePreview = parseImportPreview('smoke-backup.json', readFileSync(fixturePath, 'utf8'))

assert(
  'fixture version',
  fixturePreview.formatVersion === 3,
  `备份格式版本错误：${fixturePreview.formatVersion ?? '<missing>'}`,
)
assert(
  'fixture exported time',
  fixturePreview.exportedAt === '2026-05-05T00:00:00.000Z',
  `导出时间错误：${fixturePreview.exportedAt ?? '<missing>'}`,
)
assert('fixture questions', fixturePreview.questions.length === 1, '题目数量应为 1')
assert('fixture study records', fixturePreview.studyRecords.length === 1, '学习记录数量应为 1')
assert('fixture notes', fixturePreview.questionNotes.length === 1, '题目笔记数量应为 1')
assert('fixture flags', fixturePreview.questionFlags.length === 1, '题目标记数量应为 1')
assert(
  'fixture starred flag',
  fixturePreview.questionFlags[0]?.starred === true,
  '重点题标记应恢复为 true',
)
assert('fixture ai sessions', fixturePreview.aiSessions.length === 1, 'AI 会话数量应为 1')
assert(
  'fixture custom source',
  fixturePreview.customSources.includes('smoke-backup'),
  `自定义来源未恢复：${fixturePreview.customSources.join(', ')}`,
)
assert(
  'fixture custom category',
  fixturePreview.customCategories['Smoke Backup']?.modules.includes('Smoke Backup') ?? false,
  `自定义分类未恢复：${JSON.stringify(fixturePreview.customCategories)}`,
)
assert(
  'fixture excludes api key',
  !('apiKey' in fixturePreview) && !JSON.stringify(fixturePreview).includes('sk-test'),
  '本地备份预览不应包含 API Key',
)

const legacyPreview = parseImportPreview(
  'legacy-v1.json',
  JSON.stringify({
    formatVersion: 1,
    questions: [question()],
  }),
)

assert(
  'legacy derives custom source',
  legacyPreview.customSources.includes('legacy-pack.json'),
  `旧备份自定义来源推导失败：${legacyPreview.customSources.join(', ')}`,
)
assert(
  'legacy derives custom category',
  legacyPreview.customCategories['Legacy Pack']?.modules.includes('Legacy Module') ?? false,
  `旧备份自定义分类推导失败：${JSON.stringify(legacyPreview.customCategories)}`,
)

const categoryPreview = parseImportPreview(
  'categories.json',
  JSON.stringify({
    questions: [question({ id: 'custom_category_001', source: 'category-pack' })],
    customCategories: {
      前端: { name: '前端', modules: ['JS基础'], builtin: true, order: 0 },
      Custom: { name: 'Custom', modules: ['Legacy Module'], builtin: false, order: 9 },
    },
  }),
)

assert(
  'import filters builtin categories',
  !categoryPreview.customCategories.前端 && Boolean(categoryPreview.customCategories.Custom),
  `本地备份不应导入内置分类：${JSON.stringify(categoryPreview.customCategories)}`,
)

assertThrows('invalid json rejected', () => parseImportPreview('bad.json', '{'), '有效 JSON')
assertThrows(
  'empty backup rejected',
  () => parseImportPreview('empty.json', JSON.stringify({ questions: [] })),
  '没有可导入的数据',
)
assertThrows(
  'questions must be array',
  () => parseImportPreview('bad-questions.json', JSON.stringify({ questions: {} })),
  '题目 必须是数组',
)
assertThrows(
  'invalid question rejected',
  () =>
    parseImportPreview(
      'bad-question.json',
      JSON.stringify({ questions: [question({ difficulty: 9 as Question['difficulty'] })] }),
    ),
  '题目 第 1 项格式无效',
)
assertThrows(
  'invalid question flag rejected',
  () =>
    parseImportPreview(
      'bad-flag.json',
      JSON.stringify({
        questions: [question()],
        questionFlags: [
          {
            questionId: 'custom_legacy-pack_001',
            starred: 'yes',
            createdAt: 1777777777000,
            updatedAt: 1777777777000,
          },
        ],
      }),
    ),
  '题目标记 第 1 项格式无效',
)
assertThrows(
  'custom sources must be string array',
  () =>
    parseImportPreview(
      'bad-sources.json',
      JSON.stringify({ questions: [question()], customSources: ['ok', 1] }),
    ),
  '自定义来源 必须是字符串数组',
)
assertThrows(
  'custom categories must be object',
  () =>
    parseImportPreview(
      'bad-categories.json',
      JSON.stringify({ questions: [question()], customCategories: [] }),
    ),
  '自定义分类必须是对象',
)
assertThrows(
  'bad custom category shape rejected',
  () =>
    parseImportPreview(
      'bad-category-shape.json',
      JSON.stringify({
        questions: [question()],
        customCategories: {
          Bad: { name: 'Bad', modules: ['Legacy Module'], builtin: false },
        },
      }),
    ),
  '自定义分类 Bad 格式无效',
)

const baseCategories: CategoryMap = {
  前端: { name: '前端', modules: ['JS基础'], builtin: true, order: 0 },
  Custom: { name: 'Custom', modules: ['A'], builtin: false, order: 3 },
}
const mergedCategories = mergeCategoryMaps(baseCategories, {
  前端: { name: '前端', modules: ['React'], builtin: false, order: 99 },
  Custom: { name: 'Custom', modules: ['A', 'B'], builtin: false, order: 4 },
  Extra: { name: 'Extra', modules: ['C'], builtin: false, order: 5 },
})

assert(
  'merge preserves builtin flag',
  mergedCategories.前端?.builtin === true && mergedCategories.前端.modules.includes('React'),
  `内置分类合并错误：${JSON.stringify(mergedCategories.前端)}`,
)
assert(
  'merge unions category modules',
  mergedCategories.Custom?.modules.join(',') === 'A,B' && Boolean(mergedCategories.Extra),
  `自定义分类模块合并错误：${JSON.stringify(mergedCategories)}`,
)

const aiCount = countMergedAISessions({ 'q-1': session('q-1', 'existing') }, [
  session('q-1', 'incoming'),
  session('q-2', 'incoming'),
])
assert('merged ai session count', aiCount === 2, `AI 会话合并计数错误：${aiCount}`)

if (failures.length > 0) {
  console.error(`本地备份检查失败：${failures.length} 项`)
  for (const failure of failures) {
    console.error(`- ${failure.name}: ${failure.message}`)
  }
  process.exit(1)
}

console.log('✓ 本地备份导入检查通过：v3 fixture、旧备份推导、分类合并和错误输入拒绝正常')
