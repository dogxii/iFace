import {
  deleteBackupGist,
  findBackupGistId,
  loadFromGist,
  mergeGistBackupData,
  parseGistBackupPayload,
  type SyncData,
  type SyncMergeStats,
  saveBackupToGist,
  serializeGistBackup,
} from '../src/lib/gistSync.ts'
import type { AISession } from '../src/store/useAIStore.ts'
import type {
  Question,
  QuestionAnswerAnnotation,
  QuestionAnswerOverride,
  QuestionFlag,
  QuestionNote,
  StudyRecord,
} from '../src/types'

interface Failure {
  name: string
  message: string
}

const failures: Failure[] = []

function assert(name: string, condition: boolean, message: string): void {
  if (!condition) failures.push({ name, message })
}

async function assertRejects(
  name: string,
  fn: () => Promise<unknown>,
  expected: string,
): Promise<void> {
  try {
    await fn()
    failures.push({ name, message: '预期抛出错误，但实际通过了' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes(expected)) {
      failures.push({ name, message: `错误信息不匹配：${message}` })
    }
  }
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

function question(id: string): Question {
  return {
    id,
    module: '自定义模块',
    difficulty: 2,
    question: `题目 ${id}`,
    answer: `答案 ${id}`,
    tags: ['同步', '兼容'],
    source: 'sync-smoke',
  }
}

function record(
  questionId: string,
  status: StudyRecord['status'],
  lastUpdated: number,
): StudyRecord {
  return { questionId, status, lastUpdated, reviewCount: status === 'mastered' ? 2 : 1 }
}

function note(questionId: string, content: string, updatedAt: number): QuestionNote {
  return { questionId, content, createdAt: updatedAt - 100, updatedAt }
}

function answerOverride(
  questionId: string,
  content: string,
  updatedAt: number,
): QuestionAnswerOverride {
  return { questionId, content, createdAt: updatedAt - 100, updatedAt }
}

function answerAnnotation(
  id: string,
  questionId: string,
  selectedText: string,
  updatedAt: number,
): QuestionAnswerAnnotation {
  return {
    id,
    questionId,
    answerHash: `hash-${questionId}`,
    kind: 'comment',
    color: 'yellow',
    start: 0,
    end: selectedText.length,
    selectedText,
    note: `note ${selectedText}`,
    createdAt: updatedAt - 100,
    updatedAt,
  }
}

function flag(questionId: string, starred: boolean, updatedAt: number): QuestionFlag {
  return { questionId, starred, createdAt: updatedAt - 100, updatedAt }
}

function session(questionId: string, content: string, updatedAt: number): AISession {
  return {
    questionId,
    messages: [{ role: 'assistant', content }],
    createdAt: updatedAt - 100,
    updatedAt,
  }
}

function compact(records: StudyRecord[]) {
  const statusMap: Record<StudyRecord['status'], number> = {
    unlearned: 0,
    mastered: 1,
    review: 2,
  }
  return {
    ids: records.map((item) => item.questionId),
    statuses: records.map((item) => statusMap[item.status]),
    times: records.map((item) => Math.floor(item.lastUpdated / 1000)),
    counts: records.map((item) => item.reviewCount),
  }
}

async function withMockFetch<T>(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>,
  run: () => Promise<T>,
): Promise<T> {
  const originalFetch = globalThis.fetch
  try {
    sessionStorage.clear()
  } catch {}
  globalThis.fetch = handler as typeof fetch
  try {
    return await run()
  } finally {
    globalThis.fetch = originalFetch
    try {
      sessionStorage.clear()
    } catch {}
  }
}

const legacyRecord = record('legacy-001', 'review', 1700000000000)
const v3Record = record('v3-001', 'mastered', 1700000100000)
const v4Note = note('v4-001', 'v4 note', 1700000200000)
const v5Session = session('v5-001', 'v5 session', 1700000300000)
const v6Flag = flag('v6-001', true, 1700000400000)
const v7AnswerOverride = answerOverride('v7-001', 'v7 custom answer', 1700000500000)
const v8AnswerAnnotation = answerAnnotation('v8-annotation', 'v8-001', 'v8 selected', 1700000600000)

const legacy = parseGistBackupPayload(
  JSON.stringify({
    version: 1,
    exportedAt: '2026-01-01T00:00:00.000Z',
    studyRecords: [legacyRecord],
    customQuestions: [question('builtin-001'), question('custom_sync_001')],
    categoryMap: {
      Builtin: { name: 'Builtin', modules: ['JS基础'], builtin: true, order: 0 },
      Custom: { name: 'Custom', modules: ['自定义模块'], builtin: false, order: 9 },
    },
    customSources: ['legacy-source'],
  }),
)

assert('v1 keeps study records', legacy.studyRecords.length === 1, 'v1 学习记录未恢复')
assert(
  'v1 filters built-in questions',
  legacy.customQuestions.length === 1 && legacy.customQuestions[0]?.id === 'custom_sync_001',
  'v1 应只保留 custom_ 题目',
)
assert('v1 has no notes', legacy.questionNotes.length === 0, 'v1 不应产生题目笔记')
assert(
  'v1 has no answer overrides',
  legacy.questionAnswerOverrides.length === 0,
  'v1 不应产生自定义答案',
)
assert(
  'v1 has no answer annotations',
  legacy.questionAnswerAnnotations.length === 0,
  'v1 不应产生答案标注',
)
assert('v1 has no flags', legacy.questionFlags.length === 0, 'v1 不应产生题目标记')
assert('v1 has no ai sessions', legacy.aiSessions.length === 0, 'v1 不应产生 AI 会话')
assert(
  'v1 keeps custom categories only',
  Object.keys(legacy.customCategories).length === 1 && Boolean(legacy.customCategories.Custom),
  'v1 应只恢复自定义分类',
)

const v3 = parseGistBackupPayload(
  JSON.stringify({
    version: 3,
    exportedAt: '2026-01-02T00:00:00.000Z',
    records: compact([v3Record]),
    customQuestions: [question('custom_sync_v3')],
    customCategories: {},
    customSources: ['v3-source'],
  }),
)

assert('v3 decodes compact records', v3.studyRecords[0]?.questionId === 'v3-001', 'v3 记录解码失败')
assert('v3 has no notes', v3.questionNotes.length === 0, 'v3 不应产生题目笔记')
assert(
  'v3 has no answer overrides',
  v3.questionAnswerOverrides.length === 0,
  'v3 不应产生自定义答案',
)
assert(
  'v3 has no answer annotations',
  v3.questionAnswerAnnotations.length === 0,
  'v3 不应产生答案标注',
)
assert('v3 has no flags', v3.questionFlags.length === 0, 'v3 不应产生题目标记')
assert('v3 has no ai sessions', v3.aiSessions.length === 0, 'v3 不应产生 AI 会话')

const v4 = parseGistBackupPayload(
  JSON.stringify({
    version: 4,
    exportedAt: '2026-01-03T00:00:00.000Z',
    records: compact([v3Record]),
    questionNotes: [v4Note],
    customQuestions: [],
    customCategories: {},
    customSources: [],
  }),
)

assert('v4 keeps notes', v4.questionNotes[0]?.content === 'v4 note', 'v4 题目笔记未恢复')
assert('v4 has no flags', v4.questionFlags.length === 0, 'v4 不应产生题目标记')
assert('v4 has no ai sessions', v4.aiSessions.length === 0, 'v4 不应产生 AI 会话')

const v5 = parseGistBackupPayload(
  JSON.stringify({
    version: 5,
    exportedAt: '2026-01-04T00:00:00.000Z',
    records: compact([v3Record]),
    questionNotes: [v4Note],
    aiSessions: [v5Session],
    customQuestions: [question('custom_sync_v5')],
    customCategories: {},
    customSources: ['v5-source'],
  }),
)

assert('v5 keeps notes', v5.questionNotes.length === 1, 'v5 题目笔记未恢复')
assert('v5 has no flags', v5.questionFlags.length === 0, 'v5 不应产生题目标记')
assert('v5 keeps ai sessions', v5.aiSessions[0]?.questionId === 'v5-001', 'v5 AI 会话未恢复')

const v6 = parseGistBackupPayload(
  JSON.stringify({
    version: 6,
    exportedAt: '2026-01-04T00:00:00.000Z',
    records: compact([v3Record]),
    questionNotes: [v4Note],
    questionFlags: [v6Flag],
    aiSessions: [v5Session],
    customQuestions: [question('custom_sync_v6')],
    customCategories: {},
    customSources: ['v6-source'],
  }),
)

assert('v6 keeps flags', v6.questionFlags[0]?.questionId === 'v6-001', 'v6 题目标记未恢复')
assert('v6 keeps ai sessions', v6.aiSessions[0]?.questionId === 'v5-001', 'v6 AI 会话未恢复')

const v7 = parseGistBackupPayload(
  JSON.stringify({
    version: 7,
    exportedAt: '2026-01-04T00:00:00.000Z',
    records: compact([v3Record]),
    questionNotes: [v4Note],
    questionAnswerOverrides: [v7AnswerOverride],
    questionFlags: [v6Flag],
    aiSessions: [v5Session],
    customQuestions: [question('custom_sync_v7')],
    customCategories: {},
    customSources: ['v7-source'],
  }),
)

assert(
  'v7 keeps answer overrides',
  v7.questionAnswerOverrides[0]?.content === 'v7 custom answer',
  'v7 自定义答案未恢复',
)

const v8 = parseGistBackupPayload(
  JSON.stringify({
    version: 8,
    exportedAt: '2026-01-04T00:00:00.000Z',
    records: compact([v3Record]),
    questionNotes: [v4Note],
    questionAnswerAnnotations: [v8AnswerAnnotation],
    questionAnswerOverrides: [v7AnswerOverride],
    questionFlags: [v6Flag],
    aiSessions: [v5Session],
    customQuestions: [question('custom_sync_v8')],
    customCategories: {},
    customSources: ['v8-source'],
  }),
)

assert(
  'v8 keeps answer annotations',
  v8.questionAnswerAnnotations[0]?.selectedText === 'v8 selected',
  'v8 答案标注未恢复',
)
assertThrows(
  'future version rejected',
  () => parseGistBackupPayload(JSON.stringify({ version: 999 })),
  'newer version',
)
assertThrows('invalid json rejected', () => parseGistBackupPayload('{'), 'invalid JSON')

const local: SyncData = {
  studyRecords: [record('same-record', 'mastered', 3000), record('local-record', 'review', 4000)],
  questionNotes: [note('same-note', 'local newer', 5000), note('local-note', 'local only', 4500)],
  questionAnswerAnnotations: [
    answerAnnotation('same-annotation', 'same-answer', 'local newer', 5550),
    answerAnnotation('local-annotation', 'local-answer', 'local only', 5650),
  ],
  questionAnswerOverrides: [
    answerOverride('same-answer', 'local newer', 5500),
    answerOverride('local-answer', 'local only', 5600),
  ],
  questionFlags: [flag('same-flag', false, 7000), flag('local-flag', true, 7200)],
  aiSessions: [
    session('same-session', 'local newer', 6000),
    session('local-session', 'local only', 6500),
  ],
  customQuestions: [question('custom_local'), question('custom_same')],
  customCategories: {
    Local: { name: 'Local', modules: ['本地模块'], builtin: false, order: 1 },
  },
  customSources: ['local-source'],
}

const remote = {
  version: 5,
  exportedAt: '2026-01-05T00:00:00.000Z',
  studyRecords: [record('same-record', 'review', 2000), record('remote-record', 'mastered', 7000)],
  questionNotes: [
    note('same-note', 'remote older', 4000),
    note('remote-note', 'remote only', 8000),
  ],
  questionAnswerAnnotations: [
    answerAnnotation('same-annotation', 'same-answer', 'remote older', 5050),
    answerAnnotation('remote-annotation', 'remote-answer', 'remote only', 8150),
  ],
  questionAnswerOverrides: [
    answerOverride('same-answer', 'remote older', 5000),
    answerOverride('remote-answer', 'remote only', 8100),
  ],
  questionFlags: [flag('same-flag', true, 6500), flag('remote-flag', true, 8200)],
  aiSessions: [
    session('same-session', 'remote older', 5000),
    session('remote-session', 'remote only', 9000),
  ],
  customQuestions: [question('custom_same'), question('custom_remote')],
  customCategories: {
    Local: { name: 'Local', modules: ['本地模块', '云端模块'], builtin: false, order: 1 },
    Remote: { name: 'Remote', modules: ['远端模块'], builtin: false, order: 2 },
  },
  customSources: ['local-source', 'remote-source'],
}

const merged = mergeGistBackupData(local, remote)
const mergedRecord = merged.backup.studyRecords.find((item) => item.questionId === 'same-record')
const mergedNote = merged.backup.questionNotes.find((item) => item.questionId === 'same-note')
const mergedAnswerAnnotation = merged.backup.questionAnswerAnnotations.find(
  (item) => item.id === 'same-annotation',
)
const mergedAnswerOverride = merged.backup.questionAnswerOverrides.find(
  (item) => item.questionId === 'same-answer',
)
const mergedFlag = merged.backup.questionFlags.find((item) => item.questionId === 'same-flag')
const mergedSession = merged.backup.aiSessions.find((item) => item.questionId === 'same-session')

assert(
  'merge keeps newer local record',
  mergedRecord?.status === 'mastered',
  '较新的本地记录被覆盖',
)
assert(
  'merge adds remote record',
  merged.backup.studyRecords.some((item) => item.questionId === 'remote-record'),
  '云端新记录未合并',
)
assert(
  'merge keeps newer local note',
  mergedNote?.content === 'local newer',
  '较新的本地笔记被覆盖',
)
assert(
  'merge adds remote note',
  merged.backup.questionNotes.some((item) => item.questionId === 'remote-note'),
  '云端新笔记未合并',
)
assert(
  'merge keeps newer local answer annotation',
  mergedAnswerAnnotation?.selectedText === 'local newer',
  '较新的本地答案标注被覆盖',
)
assert(
  'merge adds remote answer annotation',
  merged.backup.questionAnswerAnnotations.some((item) => item.id === 'remote-annotation'),
  '云端新答案标注未合并',
)
assert(
  'merge keeps newer local answer override',
  mergedAnswerOverride?.content === 'local newer',
  '较新的本地自定义答案被覆盖',
)
assert(
  'merge adds remote answer override',
  merged.backup.questionAnswerOverrides.some((item) => item.questionId === 'remote-answer'),
  '云端新自定义答案未合并',
)
assert(
  'merge keeps newer local flag',
  mergedFlag?.starred === false,
  '较新的本地重点题取消标记被覆盖',
)
assert(
  'merge adds remote flag',
  merged.backup.questionFlags.some((item) => item.questionId === 'remote-flag'),
  '云端新重点题标记未合并',
)
assert(
  'merge keeps newer local ai session',
  mergedSession?.messages[0]?.content === 'local newer',
  '较新的本地 AI 会话被覆盖',
)
assert(
  'merge adds remote ai session',
  merged.backup.aiSessions.some((item) => item.questionId === 'remote-session'),
  '云端新 AI 会话未合并',
)
assert(
  'merge unions custom questions',
  merged.backup.customQuestions.some((item) => item.id === 'custom_remote') &&
    merged.backup.customQuestions.some((item) => item.id === 'custom_local'),
  '自定义题没有取并集',
)
assert(
  'merge unions custom sources',
  merged.backup.customSources.includes('local-source') &&
    merged.backup.customSources.includes('remote-source'),
  '自定义来源没有取并集',
)
assert(
  'merge unions category modules',
  merged.backup.customCategories.Local.modules.includes('云端模块') &&
    Boolean(merged.backup.customCategories.Remote),
  '自定义分类没有合并云端模块',
)

const stats: SyncMergeStats = merged.stats
assert('merge stats records', stats.remoteRecordsApplied === 1, '云端记录合并计数不正确')
assert('merge stats notes', stats.remoteNotesApplied === 1, '云端笔记合并计数不正确')
assert(
  'merge stats answer annotations',
  stats.remoteAnswerAnnotationsApplied === 1,
  '云端答案标注合并计数不正确',
)
assert(
  'merge stats answer overrides',
  stats.remoteAnswerOverridesApplied === 1,
  '云端自定义答案合并计数不正确',
)
assert('merge stats flags', stats.remoteFlagsApplied === 1, '云端重点题标记合并计数不正确')
assert('merge stats ai sessions', stats.remoteAISessionsApplied === 1, '云端 AI 会话合并计数不正确')
assert('merge stats questions', stats.remoteQuestionsAdded === 1, '云端自定义题合并计数不正确')
assert('merge stats sources', stats.remoteSourcesAdded === 1, '云端来源合并计数不正确')
assert('merge stats categories', stats.remoteCategoriesAdded === 2, '云端分类合并计数不正确')

const serialized = serializeGistBackup(local, '2026-01-06T00:00:00.000Z')
const serializedPayload = JSON.parse(serialized)
assert('serialized payload version', serializedPayload.version === 8, '写入 payload 版本应为 v8')
assert(
  'serialized payload compacts records',
  serializedPayload.records?.ids?.includes('same-record') &&
    serializedPayload.records?.times?.includes(3),
  `写入 payload 未压缩学习记录：${serialized}`,
)
assert(
  'serialized payload keeps flags',
  serializedPayload.questionFlags?.some((item: QuestionFlag) => item.questionId === 'local-flag'),
  '写入 payload 未包含重点题标记',
)
assert(
  'serialized payload keeps answer annotations',
  serializedPayload.questionAnswerAnnotations?.some(
    (item: QuestionAnswerAnnotation) => item.id === 'local-annotation',
  ),
  '写入 payload 未包含答案标注',
)
assert(
  'serialized payload keeps answer overrides',
  serializedPayload.questionAnswerOverrides?.some(
    (item: QuestionAnswerOverride) => item.questionId === 'local-answer',
  ),
  '写入 payload 未包含自定义答案',
)
assert(
  'serialized payload keeps ai sessions',
  serializedPayload.aiSessions?.some((session: AISession) => session.questionId === 'same-session'),
  '写入 payload 未包含 AI 会话',
)
assert(
  'serialized payload excludes api key fields',
  !serialized.includes('apiKey') && !serialized.includes('sk-test'),
  '写入 payload 不应包含 API Key 字段或测试密钥',
)

const gistCalls: Array<{ url: string; init?: RequestInit }> = []
await withMockFetch(
  async (input, init) => {
    const url = String(input)
    gistCalls.push({ url, init })
    return new Response(
      JSON.stringify([
        { id: 'unrelated', files: { 'notes.json': { filename: 'notes.json' } } },
        { id: 'iface-gist-id', files: { 'iface-backup.json': { filename: 'iface-backup.json' } } },
      ]),
      { status: 200 },
    )
  },
  async () => {
    const gistId = await findBackupGistId('ghp_mock_token')
    assert(
      'gist id found by backup filename',
      gistId === 'iface-gist-id',
      '未按文件名定位备份 Gist',
    )
  },
)
const firstGistCall = gistCalls[0]
const firstGistHeaders = firstGistCall?.init?.headers as Record<string, string> | undefined
assert(
  'gist lookup calls github api',
  firstGistCall?.url === 'https://api.github.com/gists?per_page=30&page=1',
  `Gist 列表 URL 错误：${firstGistCall?.url ?? '<missing>'}`,
)
assert(
  'gist lookup sends auth headers',
  firstGistHeaders?.Authorization === 'Bearer ghp_mock_token' &&
    firstGistHeaders?.Accept === 'application/vnd.github+json',
  `Gist 请求 header 错误：${JSON.stringify(firstGistHeaders)}`,
)

const loadCalls: string[] = []
await withMockFetch(
  async (input) => {
    const url = String(input)
    loadCalls.push(url)

    if (url.endsWith('/gists?per_page=30&page=1')) {
      return new Response(
        JSON.stringify([
          {
            id: 'iface-load-id',
            files: { 'iface-backup.json': { filename: 'iface-backup.json' } },
          },
        ]),
        { status: 200 },
      )
    }

    if (url.endsWith('/gists/iface-load-id')) {
      return new Response(
        JSON.stringify({
          id: 'iface-load-id',
          description: 'mock backup',
          updated_at: '2026-01-04T00:00:00.000Z',
          html_url: 'https://gist.github.com/mock/iface-load-id',
          files: {
            'iface-backup.json': {
              filename: 'iface-backup.json',
              truncated: false,
              content: JSON.stringify({
                version: 6,
                exportedAt: '2026-01-04T00:00:00.000Z',
                records: compact([v3Record]),
                questionNotes: [v4Note],
                questionFlags: [v6Flag],
                aiSessions: [v5Session],
                customQuestions: [question('custom_sync_v5')],
                customCategories: {},
                customSources: ['v5-source'],
              }),
            },
          },
        }),
        { status: 200 },
      )
    }

    return new Response(JSON.stringify({ message: 'unexpected url' }), { status: 404 })
  },
  async () => {
    const loaded = await loadFromGist('ghp_mock_token')
    assert('gist backup loaded through api', loaded?.version === 6, 'Gist 备份版本读取失败')
    assert(
      'gist backup restores flags through api',
      loaded?.questionFlags[0]?.questionId === 'v6-001',
      'Gist API 读取未恢复题目标记',
    )
    assert(
      'gist backup restores ai sessions through api',
      loaded?.aiSessions[0]?.questionId === 'v5-001',
      'Gist API 读取未恢复 AI 会话',
    )
  },
)
assert(
  'gist load fetches list and detail',
  loadCalls.includes('https://api.github.com/gists?per_page=30&page=1') &&
    loadCalls.includes('https://api.github.com/gists/iface-load-id'),
  `Gist 读取 API 路径不完整：${loadCalls.join(', ')}`,
)

const deleteCalls: Array<{ url: string; method?: string }> = []
await withMockFetch(
  async (input, init) => {
    const url = String(input)
    deleteCalls.push({ url, method: init?.method })

    if (url.endsWith('/gists?per_page=30&page=1')) {
      return new Response(
        JSON.stringify([
          {
            id: 'iface-delete-id',
            files: { 'iface-backup.json': { filename: 'iface-backup.json' } },
          },
        ]),
        { status: 200 },
      )
    }

    if (url.endsWith('/gists/iface-delete-id') && init?.method === 'DELETE') {
      return new Response(null, { status: 204 })
    }

    return new Response(JSON.stringify({ message: 'unexpected url' }), { status: 404 })
  },
  async () => {
    const result = await deleteBackupGist('ghp_mock_token')
    assert('gist delete result ok', result.ok, `删除云端备份失败：${result.error ?? '<none>'}`)
  },
)
assert(
  'gist delete uses delete method',
  deleteCalls.some(
    (call) =>
      call.url === 'https://api.github.com/gists/iface-delete-id' && call.method === 'DELETE',
  ),
  `Gist 删除请求未发出：${JSON.stringify(deleteCalls)}`,
)

await assertRejects(
  'gist api errors include github message',
  () =>
    withMockFetch(
      async () => new Response(JSON.stringify({ message: 'Bad credentials' }), { status: 401 }),
      () => findBackupGistId('bad-token'),
    ),
  'GitHub API 401: Bad credentials',
)

const createCalls: Array<{ url: string; method?: string; body?: unknown }> = []
await withMockFetch(
  async (input, init) => {
    const url = String(input)
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    createCalls.push({ url, method: init?.method, body })

    if (url.endsWith('/gists?per_page=30&page=1')) {
      return new Response(JSON.stringify([]), { status: 200 })
    }

    if (url.endsWith('/gists') && init?.method === 'POST') {
      return new Response(
        JSON.stringify({
          id: 'created-gist-id',
          description: 'mock created backup',
          updated_at: '2026-01-06T00:00:00.000Z',
          html_url: 'https://gist.github.com/mock/created-gist-id',
          files: {},
        }),
        { status: 201 },
      )
    }

    return new Response(JSON.stringify({ message: 'unexpected url' }), { status: 404 })
  },
  async () => {
    const result = await saveBackupToGist('ghp_mock_token', local)
    assert('gist create result ok', result.ok, `创建云端备份失败：${result.error ?? '<none>'}`)
    assert('gist create result counts', result.aiSessionCount === 2, '创建结果 AI 会话计数错误')
  },
)
const createRequest = createCalls.find(
  (call) => call.url === 'https://api.github.com/gists' && call.method === 'POST',
)
const createBody = createRequest?.body as
  | { public?: boolean; files?: Record<string, { content?: string }> }
  | undefined
const createdContent = createBody?.files?.['iface-backup.json']?.content ?? ''
const createdPayload = createdContent ? JSON.parse(createdContent) : null
assert('gist create uses private gist', createBody?.public === false, '创建 Gist 必须是 private')
assert(
  'gist create writes backup file',
  createdPayload?.version === 8 &&
    createdPayload?.questionAnswerAnnotations?.length === 2 &&
    createdPayload?.questionAnswerOverrides?.length === 2 &&
    createdPayload?.questionFlags?.length === 2 &&
    createdPayload?.aiSessions?.length === 2,
  `创建 Gist 文件内容错误：${createdContent}`,
)

const patchCalls: Array<{ url: string; method?: string; body?: unknown }> = []
await withMockFetch(
  async (input, init) => {
    const url = String(input)
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    patchCalls.push({ url, method: init?.method, body })

    if (url.endsWith('/gists?per_page=30&page=1')) {
      return new Response(
        JSON.stringify([
          {
            id: 'existing-gist-id',
            files: { 'iface-backup.json': { filename: 'iface-backup.json' } },
          },
        ]),
        { status: 200 },
      )
    }

    if (url.endsWith('/gists/existing-gist-id') && init?.method === 'PATCH') {
      return new Response(
        JSON.stringify({
          id: 'existing-gist-id',
          description: 'mock updated backup',
          updated_at: '2026-01-06T00:00:00.000Z',
          html_url: 'https://gist.github.com/mock/existing-gist-id',
          files: {},
        }),
        { status: 200 },
      )
    }

    return new Response(JSON.stringify({ message: 'unexpected url' }), { status: 404 })
  },
  async () => {
    const result = await saveBackupToGist('ghp_mock_token', local, stats)
    assert('gist patch result ok', result.ok, `更新云端备份失败：${result.error ?? '<none>'}`)
    assert(
      'gist patch keeps merge stats',
      result.mergedRemoteRecordCount === stats.remoteRecordsApplied,
      '更新结果未保留合并统计',
    )
  },
)
assert(
  'gist patch uses patch method',
  patchCalls.some(
    (call) =>
      call.url === 'https://api.github.com/gists/existing-gist-id' && call.method === 'PATCH',
  ),
  `Gist 更新请求未发出：${JSON.stringify(patchCalls)}`,
)

if (failures.length > 0) {
  console.error(`Gist 同步兼容检查失败：${failures.length} 个问题`)
  for (const failure of failures) {
    console.error(`- ${failure.name}: ${failure.message}`)
  }
  process.exit(1)
}

console.log(
  'Gist 同步兼容检查通过：v1-v8 解析、未来版本拒绝、双端合并和 mock GitHub API 读写路径正常',
)
