import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { requestChatCompletionStream } from '../src/lib/aiClient.ts'
import { buildReviewNoteMarkdown } from '../src/lib/feedbackNote.ts'
import { parseGistBackupPayload, type SyncData, serializeGistBackup } from '../src/lib/gistSync.ts'
import {
  buildAnswerFeedbackContext,
  buildAnswerFeedbackSystemSuffix,
  DEFAULT_AI_CONFIG,
  DEFAULT_SYSTEM_PROMPT,
} from '../src/store/useAIStore.ts'

interface Failure {
  name: string
  message: string
}

interface Evidence {
  check: string
  details: Record<string, number | string | boolean>
}

interface GistFileResponse {
  filename?: string
  content?: string
  raw_url?: string
}

interface GistResponse {
  id?: string
  files?: Record<string, GistFileResponse>
}

const GH_API = 'https://api.github.com'
const failures: Failure[] = []
const evidence: Evidence[] = []

function packageVersion(): string {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version?: unknown }
  return typeof pkg.version === 'string' ? pkg.version : ''
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function getFlagValue(flag: string): string {
  const inline = process.argv.find((arg) => arg.startsWith(`${flag}=`))
  if (inline) return inline.slice(flag.length + 1)

  const index = process.argv.indexOf(flag)
  if (index === -1) return ''
  const value = process.argv[index + 1]
  return value && !value.startsWith('--') ? value : ''
}

function env(name: string): string {
  return process.env[name]?.trim() ?? ''
}

function requireEnv(name: string): string {
  const value = env(name)
  if (!value) throw new Error(`缺少环境变量 ${name}`)
  return value
}

function assert(name: string, condition: boolean, message: string): void {
  if (!condition) throw new Error(`${name}: ${message}`)
}

function addEvidence(check: string, details: Evidence['details']): void {
  evidence.push({ check, details })
}

function hostname(value: string): string {
  try {
    return new URL(value).host
  } catch {
    return '<invalid-url>'
  }
}

function createTimeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  }
}

async function runStep(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
    console.log(`OK ${name}`)
  } catch (err) {
    failures.push({ name, message: err instanceof Error ? err.message : String(err) })
    console.error(`FAIL ${name}`)
  }
}

async function runAIExternalSmoke(): Promise<void> {
  const apiKey = requireEnv('IFACE_AI_API_KEY')
  const baseUrl = env('IFACE_AI_BASE_URL') || DEFAULT_AI_CONFIG.baseUrl
  const model = env('IFACE_AI_MODEL') || DEFAULT_AI_CONFIG.model
  const timeoutMs = Number(env('IFACE_AI_TIMEOUT_MS') || 60_000)

  const chatTimeout = createTimeoutSignal(timeoutMs)
  let chatStream = ''
  try {
    const chatText = await requestChatCompletionStream({
      config: {
        apiKey,
        baseUrl,
        model,
        temperature: 0.2,
        maxTokens: 80,
      },
      messages: [
        { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: '这是 iFace 外部服务 smoke test。请用中文简单回复：连接正常。',
        },
      ],
      signal: chatTimeout.signal,
      onDelta: (delta) => {
        chatStream += delta
      },
    })
    assert('AI chat response', chatText.trim().length > 0, '真实 AI 对话没有返回内容')
    assert('AI chat streaming', chatStream.trim().length > 0, '真实 AI 对话没有产生流式片段')
    addEvidence('ai.chat', {
      model,
      baseUrlHost: hostname(baseUrl),
      responseChars: chatText.trim().length,
      streamedChars: chatStream.trim().length,
    })
    console.log(`  AI chat OK: model=${model}, chars=${chatText.trim().length}`)
  } finally {
    chatTimeout.clear()
  }

  const feedbackTimeout = createTimeoutSignal(timeoutMs)
  let feedbackStream = ''
  try {
    const feedbackText = await requestChatCompletionStream({
      config: {
        apiKey,
        baseUrl,
        model,
        temperature: 0.2,
        maxTokens: 500,
      },
      messages: [
        {
          role: 'system',
          content: DEFAULT_SYSTEM_PROMPT + buildAnswerFeedbackSystemSuffix(),
        },
        ...buildAnswerFeedbackContext({
          questionText: '解释 JavaScript 事件循环中宏任务和微任务的执行顺序。',
          referenceAnswer:
            '同步代码先执行；一次宏任务结束后会清空当前微任务队列，然后浏览器再考虑渲染和下一个宏任务。',
          userAnswer: '先执行同步代码，然后 Promise 回调，最后再执行 setTimeout。',
        }),
      ],
      signal: feedbackTimeout.signal,
      onDelta: (delta) => {
        feedbackStream += delta
      },
    })

    assert('AI feedback response', feedbackText.trim().length >= 20, '真实作答反馈内容过短')
    assert('AI feedback streaming', feedbackStream.trim().length > 0, '真实作答反馈没有流式片段')

    const note = buildReviewNoteMarkdown({
      questionText: '解释 JavaScript 事件循环中宏任务和微任务的执行顺序。',
      userAnswer: '先执行同步代码，然后 Promise 回调，最后再执行 setTimeout。',
      feedback: feedbackText,
      timestamp: Date.now(),
    })
    assert('AI feedback note', note.includes('### AI 点评'), '作答反馈无法生成复盘笔记')
    addEvidence('ai.feedback', {
      model,
      baseUrlHost: hostname(baseUrl),
      feedbackChars: feedbackText.trim().length,
      streamedChars: feedbackStream.trim().length,
      noteChars: note.length,
    })
    console.log(`  AI feedback OK: chars=${feedbackText.trim().length}, note=${note.length}`)
  } finally {
    feedbackTimeout.clear()
  }
}

async function githubFetch<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${GH_API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...init.headers,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    let message = `GitHub API HTTP ${response.status}`
    try {
      message = JSON.parse(text)?.message ?? message
    } catch {}
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function createSmokeBackup(now: number): SyncData {
  return {
    studyRecords: [
      {
        questionId: 'external-smoke-question',
        status: 'review',
        lastUpdated: now,
        reviewCount: 2,
      },
    ],
    questionNotes: [
      {
        questionId: 'external-smoke-question',
        content: 'External smoke note',
        createdAt: now - 1_000,
        updatedAt: now,
      },
    ],
    questionAnswerOverrides: [
      {
        questionId: 'external-smoke-question',
        content: 'External smoke custom answer',
        createdAt: now - 1_000,
        updatedAt: now,
      },
    ],
    questionFlags: [
      {
        questionId: 'external-smoke-question',
        starred: true,
        createdAt: now - 1_000,
        updatedAt: now,
      },
    ],
    aiSessions: [
      {
        questionId: 'external-smoke-question',
        messages: [
          { role: 'user', content: 'smoke question' },
          { role: 'assistant', content: 'smoke answer' },
        ],
        createdAt: now - 2_000,
        updatedAt: now,
      },
    ],
    customQuestions: [
      {
        id: 'custom_external-smoke_external-smoke-question',
        module: 'External Smoke',
        difficulty: 1,
        question: 'External smoke question',
        answer: 'External smoke answer',
        tags: ['smoke'],
        source: 'external-smoke',
      },
    ],
    customCategories: {
      'External Smoke': {
        name: 'External Smoke',
        modules: ['External Smoke'],
        builtin: false,
        order: 99,
      },
    },
    customSources: ['external-smoke'],
  }
}

async function readGistFile(token: string, gist: GistResponse, filename: string): Promise<string> {
  const file = gist.files?.[filename]
  if (!file) throw new Error(`Gist 响应缺少文件 ${filename}`)
  if (typeof file.content === 'string') return file.content
  if (!file.raw_url) throw new Error(`Gist 文件 ${filename} 缺少 content 和 raw_url`)

  const response = await fetch(file.raw_url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) throw new Error(`读取 Gist raw 文件失败：HTTP ${response.status}`)
  return response.text()
}

async function runGistExternalSmoke(): Promise<void> {
  const token = env('IFACE_GIST_TOKEN') || env('GITHUB_TOKEN')
  if (!token) throw new Error('缺少环境变量 IFACE_GIST_TOKEN 或 GITHUB_TOKEN')

  const now = Date.now()
  const filename = `iface-external-smoke-${now}.json`
  const initialContent = serializeGistBackup(createSmokeBackup(now), new Date(now).toISOString())
  let gistId = ''
  let cleanupError: string | null = null

  try {
    const created = await githubFetch<GistResponse>(token, '/gists', {
      method: 'POST',
      body: JSON.stringify({
        description: `iFace external smoke temporary gist ${now}`,
        public: false,
        files: { [filename]: { content: initialContent } },
      }),
    })

    gistId = created.id ?? ''
    assert('Gist create', Boolean(gistId), 'GitHub 没有返回临时 Gist ID')

    const loaded = await githubFetch<GistResponse>(token, `/gists/${gistId}`)
    const loadedContent = await readGistFile(token, loaded, filename)
    const parsed = parseGistBackupPayload(loadedContent)
    assert('Gist read payload', parsed.version === 7, '真实 Gist 读取到的备份版本不是 v7')
    assert(
      'Gist read data',
      parsed.questionNotes.some((note) => note.questionId === 'external-smoke-question'),
      '真实 Gist 读取内容缺少题目笔记',
    )
    addEvidence('gist.read', {
      backupVersion: parsed.version,
      noteCount: parsed.questionNotes.length,
      answerOverrideCount: parsed.questionAnswerOverrides.length,
      starredCount: parsed.questionFlags.filter((flag) => flag.starred).length,
      aiSessionCount: parsed.aiSessions.length,
      customQuestionCount: parsed.customQuestions.length,
    })

    const updatedContent = serializeGistBackup(
      {
        ...createSmokeBackup(now + 1_000),
        customSources: ['external-smoke', 'external-smoke-updated'],
      },
      new Date(now + 1_000).toISOString(),
    )

    await githubFetch<GistResponse>(token, `/gists/${gistId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        files: { [filename]: { content: updatedContent } },
      }),
    })

    const updated = await githubFetch<GistResponse>(token, `/gists/${gistId}`)
    const updatedRaw = await readGistFile(token, updated, filename)
    const updatedParsed = parseGistBackupPayload(updatedRaw)
    assert(
      'Gist update payload',
      updatedParsed.customSources.includes('external-smoke-updated'),
      '真实 Gist 更新后没有读到新内容',
    )
    addEvidence('gist.update', {
      backupVersion: updatedParsed.version,
      customSourceCount: updatedParsed.customSources.length,
      temporaryGistDeleted: false,
    })

    console.log(`  Gist API OK: temporary gist ${gistId} created, read, patched`)
  } finally {
    if (gistId) {
      try {
        await githubFetch<void>(token, `/gists/${gistId}`, { method: 'DELETE' })
        addEvidence('gist.cleanup', {
          temporaryGistDeleted: true,
        })
        console.log(`  Gist cleanup OK: ${gistId}`)
      } catch (err) {
        cleanupError = err instanceof Error ? err.message : String(err)
      }
    }
  }

  if (cleanupError) {
    throw new Error(`临时 Gist ${gistId} 删除失败：${cleanupError}`)
  }
}

function printHelp(): void {
  console.log(`Usage:
  bun scripts/checkExternalServices.ts [--ai] [--gist] [--record <file>]

Package script shortcuts:
  bun run smoke:external:ai
  bun run smoke:external:gist

Environment:
  IFACE_AI_API_KEY      Required for --ai.
  IFACE_AI_BASE_URL     Optional, defaults to app default.
  IFACE_AI_MODEL        Optional, defaults to app default.
  IFACE_AI_TIMEOUT_MS   Optional, defaults to 60000.
  IFACE_GIST_TOKEN      Required for --gist, or use GITHUB_TOKEN.

Default:
  With no flags, runs both AI and Gist external smoke checks.

Safety:
  The Gist check creates a temporary private gist, verifies create/read/update,
  then deletes it. It does not touch the app's iface-backup.json gist.

Evidence:
  --record docs/external-smoke-result.json writes a no-secret JSON summary
  after a successful run with the current packageVersion, so 1.0 release
  checks can reject stale records. Records older than 7 days are treated as stale.`)
}

function writeRecord(path: string, runAI: boolean, runGist: boolean): void {
  const record = {
    generatedAt: new Date().toISOString(),
    packageVersion: packageVersion(),
    targets: {
      ai: runAI,
      gist: runGist,
    },
    ok: failures.length === 0,
    evidence,
    failures,
  }

  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(`${path}`, `${JSON.stringify(record, null, 2)}\n`)
  console.log(`外部服务 smoke 记录已写入：${path}`)
}

if (hasFlag('--help') || hasFlag('-h')) {
  printHelp()
  process.exit(0)
}

const explicitTarget = hasFlag('--ai') || hasFlag('--gist')
const runAI = hasFlag('--ai') || !explicitTarget
const runGist = hasFlag('--gist') || !explicitTarget
const recordPath = getFlagValue('--record')

if (runAI) {
  await runStep('AI external smoke', runAIExternalSmoke)
}

if (runGist) {
  await runStep('GitHub Gist external smoke', runGistExternalSmoke)
}

if (recordPath && failures.length === 0) {
  writeRecord(recordPath, runAI, runGist)
}

if (failures.length > 0) {
  if (recordPath) {
    console.error(`外部服务 smoke 未通过，未写入记录：${recordPath}`)
  }
  console.error(`外部服务 smoke 失败：${failures.length} 个问题`)
  for (const failure of failures) {
    console.error(`- ${failure.name}: ${failure.message}`)
  }
  process.exit(1)
}

console.log('外部服务 smoke 通过')
