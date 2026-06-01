import { existsSync, readFileSync } from 'node:fs'

interface Failure {
  file: string
  message: string
}

interface ExternalSmokeRecord {
  generatedAt?: unknown
  packageVersion?: unknown
  targets?: {
    ai?: unknown
    gist?: unknown
  }
  ok?: unknown
  evidence?: Array<{
    check?: unknown
    details?: unknown
  }>
  failures?: unknown[]
}

interface RecordSpec {
  file: string
  target: 'ai' | 'gist'
  checks: string[]
}

const specs: RecordSpec[] = [
  {
    file: 'docs/external-ai-smoke-result.json',
    target: 'ai',
    checks: ['ai.chat', 'ai.feedback'],
  },
  {
    file: 'docs/external-gist-smoke-result.json',
    target: 'gist',
    checks: ['gist.read', 'gist.update', 'gist.cleanup'],
  },
]
const failures: Failure[] = []
const EXTERNAL_SMOKE_MAX_AGE_DAYS = 7
const EXTERNAL_SMOKE_MAX_AGE_MS = EXTERNAL_SMOKE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
const EXTERNAL_SMOKE_MAX_FUTURE_SKEW_MS = 10 * 60 * 1000

const secretPatterns: Array<{ name: string; pattern: RegExp }> = [
  { name: 'OpenAI-style API Key', pattern: /\bsk-[A-Za-z0-9_-]{16,}\b/ },
  { name: 'GitHub token', pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/ },
  { name: 'GitHub fine-grained token', pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { name: 'Authorization header', pattern: /\bAuthorization\b/i },
  { name: 'Bearer token', pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i },
  { name: 'API key field', pattern: /"apiKey"\s*:/i },
  { name: 'access token field', pattern: /"access[_-]?token"\s*:/i },
]

function addFailure(file: string, message: string): void {
  failures.push({ file, message })
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version?: unknown }
const packageVersion = typeof pkg.version === 'string' ? pkg.version : ''

function positiveNumber(details: unknown, key: string): boolean {
  return (
    typeof details === 'object' &&
    details !== null &&
    typeof (details as Record<string, unknown>)[key] === 'number' &&
    ((details as Record<string, unknown>)[key] as number) > 0
  )
}

function stringValue(details: unknown, key: string): boolean {
  return (
    typeof details === 'object' &&
    details !== null &&
    typeof (details as Record<string, unknown>)[key] === 'string' &&
    ((details as Record<string, unknown>)[key] as string).trim().length > 0
  )
}

function inspectRecord({ file, target, checks }: RecordSpec): void {
  if (!existsSync(file)) return

  const raw = readFileSync(file, 'utf8')
  let record: ExternalSmokeRecord
  try {
    record = JSON.parse(raw) as ExternalSmokeRecord
  } catch (err) {
    addFailure(file, `不是有效 JSON：${err instanceof Error ? err.message : String(err)}`)
    return
  }

  for (const { name, pattern } of secretPatterns) {
    if (pattern.test(raw)) {
      addFailure(file, `外部 smoke 记录疑似包含 ${name}`)
    }
  }

  if (record.ok !== true) {
    addFailure(file, '外部 smoke 记录必须是通过状态 ok=true')
  }

  if (record.packageVersion !== packageVersion) {
    addFailure(
      file,
      `外部 smoke 记录版本 ${String(record.packageVersion ?? '<missing>')} 必须等于 package.json version ${packageVersion}`,
    )
  }

  if (record.targets?.[target] !== true) {
    addFailure(file, `外部 smoke 记录必须标记 targets.${target}=true`)
  }
  const otherTarget = target === 'ai' ? 'gist' : 'ai'
  if (record.targets?.[otherTarget] !== false) {
    addFailure(file, `外部 smoke 记录必须标记 targets.${otherTarget}=false`)
  }

  if (!Array.isArray(record.failures) || record.failures.length > 0) {
    addFailure(file, '外部 smoke 记录存在失败项或 failures 不是数组')
  }

  const generatedAt =
    typeof record.generatedAt === 'string' ? Date.parse(record.generatedAt) : Number.NaN
  if (Number.isNaN(generatedAt)) {
    addFailure(file, '外部 smoke 记录缺少有效 generatedAt')
  } else {
    const ageMs = Date.now() - generatedAt
    if (ageMs > EXTERNAL_SMOKE_MAX_AGE_MS) {
      addFailure(file, `外部 smoke 记录已超过 ${EXTERNAL_SMOKE_MAX_AGE_DAYS} 天，请重新运行`)
    }
    if (ageMs < -EXTERNAL_SMOKE_MAX_FUTURE_SKEW_MS) {
      addFailure(file, '外部 smoke 记录 generatedAt 晚于当前时间，请检查系统时间后重跑')
    }
  }

  const evidenceEntries = Array.isArray(record.evidence) ? record.evidence : []
  const evidenceByCheck = new Map(
    evidenceEntries
      .filter((item) => typeof item.check === 'string')
      .map((item) => [item.check as string, item.details]),
  )

  for (const check of checks) {
    if (!evidenceByCheck.has(check)) {
      addFailure(file, `外部 smoke 记录缺少 evidence：${check}`)
    }
  }

  if (target === 'ai') {
    const chat = evidenceByCheck.get('ai.chat')
    if (
      !positiveNumber(chat, 'responseChars') ||
      !positiveNumber(chat, 'streamedChars') ||
      !stringValue(chat, 'model') ||
      !stringValue(chat, 'baseUrlHost')
    ) {
      addFailure(file, 'ai.chat 证据缺少模型、接口域名或有效响应长度')
    }

    const feedback = evidenceByCheck.get('ai.feedback')
    if (
      !positiveNumber(feedback, 'feedbackChars') ||
      !positiveNumber(feedback, 'streamedChars') ||
      !positiveNumber(feedback, 'noteChars') ||
      !stringValue(feedback, 'model') ||
      !stringValue(feedback, 'baseUrlHost')
    ) {
      addFailure(file, 'ai.feedback 证据缺少模型、接口域名、反馈长度或笔记长度')
    }
  }

  if (target === 'gist') {
    const read = evidenceByCheck.get('gist.read')
    const readRecord = read as Record<string, unknown> | undefined
    if (
      readRecord?.backupVersion !== 8 ||
      !positiveNumber(read, 'noteCount') ||
      !positiveNumber(read, 'answerAnnotationCount') ||
      !positiveNumber(read, 'starredCount') ||
      !positiveNumber(read, 'aiSessionCount') ||
      !positiveNumber(read, 'customQuestionCount')
    ) {
      addFailure(file, 'gist.read 证据缺少 v8 备份、笔记、答案标注、重点题、AI 会话或自定义题')
    }

    const update = evidenceByCheck.get('gist.update')
    const updateRecord = update as Record<string, unknown> | undefined
    if (updateRecord?.backupVersion !== 8 || !positiveNumber(update, 'customSourceCount')) {
      addFailure(file, 'gist.update 证据缺少 v8 备份或自定义来源计数')
    }

    const cleanup = evidenceByCheck.get('gist.cleanup') as Record<string, unknown> | undefined
    if (cleanup?.temporaryGistDeleted !== true) {
      addFailure(file, 'gist.cleanup 证据必须确认临时 Gist 已删除')
    }
  }
}

for (const spec of specs) {
  inspectRecord(spec)
}

if (failures.length > 0) {
  console.error(`外部 smoke 记录安全检查失败：${failures.length} 个问题`)
  for (const failure of failures) {
    console.error(`- ${failure.file}: ${failure.message}`)
  }
  process.exit(1)
}

const presentCount = specs.filter((spec) => existsSync(spec.file)).length
console.log(
  presentCount === 0
    ? '外部 smoke 记录安全检查通过：当前没有记录文件，等待真实外部验证生成'
    : `外部 smoke 记录安全检查通过：已检查 ${presentCount} 个记录文件，结构、版本和密钥扫描正常`,
)
