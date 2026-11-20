import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

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

const root = process.cwd()
const failures: Failure[] = []
const EXTERNAL_SMOKE_MAX_AGE_DAYS = 7
const EXTERNAL_SMOKE_MAX_AGE_MS = EXTERNAL_SMOKE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
const EXTERNAL_SMOKE_MAX_FUTURE_SKEW_MS = 10 * 60 * 1000

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function addFailure(file: string, message: string): void {
  failures.push({ file, message })
}

function includesAny(content: string, markers: string[]): string | undefined {
  return markers.find((marker) => content.includes(marker))
}

function parseJsonFile<T>(file: string): T | null {
  try {
    return JSON.parse(read(file)) as T
  } catch (err) {
    addFailure(file, `无法解析 JSON：${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}

function expectExternalSmokeRecord(
  file: string,
  target: 'ai' | 'gist',
  expectedChecks: string[],
): void {
  if (!existsSync(join(root, file))) {
    addFailure(file, `缺少外部服务 smoke 记录，请先运行 bun run smoke:external:${target}`)
    return
  }

  const record = parseJsonFile<ExternalSmokeRecord>(file)
  if (!record) return

  if (record.ok !== true) {
    addFailure(file, '外部服务 smoke 记录不是通过状态 ok=true')
  }

  if (record.packageVersion !== packageVersion) {
    addFailure(
      file,
      `外部服务 smoke 记录版本 ${String(record.packageVersion ?? '<missing>')} 必须等于 package.json version ${packageVersion}`,
    )
  }

  if (record.targets?.[target] !== true) {
    addFailure(file, `外部服务 smoke 记录没有标记 targets.${target}=true`)
  }
  const otherTarget = target === 'ai' ? 'gist' : 'ai'
  if (record.targets?.[otherTarget] !== false) {
    addFailure(file, `外部服务 smoke 记录必须标记 targets.${otherTarget}=false`)
  }

  if (!Array.isArray(record.failures) || record.failures.length > 0) {
    addFailure(file, '外部服务 smoke 记录存在失败项或 failures 不是数组')
  }

  const generatedAt =
    typeof record.generatedAt === 'string' ? Date.parse(record.generatedAt) : Number.NaN
  if (Number.isNaN(generatedAt)) {
    addFailure(file, '外部服务 smoke 记录缺少有效 generatedAt')
  } else {
    const ageMs = Date.now() - generatedAt
    if (ageMs > EXTERNAL_SMOKE_MAX_AGE_MS) {
      addFailure(file, `外部服务 smoke 记录已超过 ${EXTERNAL_SMOKE_MAX_AGE_DAYS} 天，请重新运行`)
    }
    if (ageMs < -EXTERNAL_SMOKE_MAX_FUTURE_SKEW_MS) {
      addFailure(file, '外部服务 smoke 记录 generatedAt 晚于当前时间，请检查系统时间后重跑')
    }
  }

  const evidenceEntries = Array.isArray(record.evidence) ? record.evidence : []
  const evidenceByCheck = new Map(
    evidenceEntries
      .filter((item) => typeof item.check === 'string')
      .map((item) => [item.check as string, item.details]),
  )

  for (const check of expectedChecks) {
    if (!evidenceByCheck.has(check)) {
      addFailure(file, `外部服务 smoke 记录缺少 evidence：${check}`)
    }
  }

  const positiveNumber = (details: unknown, key: string) =>
    typeof details === 'object' &&
    details !== null &&
    typeof (details as Record<string, unknown>)[key] === 'number' &&
    ((details as Record<string, unknown>)[key] as number) > 0

  const stringValue = (details: unknown, key: string) =>
    typeof details === 'object' &&
    details !== null &&
    typeof (details as Record<string, unknown>)[key] === 'string' &&
    ((details as Record<string, unknown>)[key] as string).trim().length > 0

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
      readRecord?.backupVersion !== 6 ||
      !positiveNumber(read, 'noteCount') ||
      !positiveNumber(read, 'starredCount') ||
      !positiveNumber(read, 'aiSessionCount') ||
      !positiveNumber(read, 'customQuestionCount')
    ) {
      addFailure(file, 'gist.read 证据缺少 v6 备份、笔记、重点题、AI 会话或自定义题')
    }

    const update = evidenceByCheck.get('gist.update')
    const updateRecord = update as Record<string, unknown> | undefined
    if (updateRecord?.backupVersion !== 6 || !positiveNumber(update, 'customSourceCount')) {
      addFailure(file, 'gist.update 证据缺少 v6 备份或自定义来源计数')
    }

    const cleanup = evidenceByCheck.get('gist.cleanup') as Record<string, unknown> | undefined
    if (cleanup?.temporaryGistDeleted !== true) {
      addFailure(file, 'gist.cleanup 证据必须确认临时 Gist 已删除')
    }
  }
}

const pkg = JSON.parse(read('package.json')) as { version?: unknown }
const packageVersion = typeof pkg.version === 'string' ? pkg.version : ''
const targetVersion = process.argv[2]?.trim()
const version = targetVersion || packageVersion

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  addFailure('release target', `目标版本不是有效 semver：${version || '<empty>'}`)
}

if (version !== packageVersion) {
  addFailure(
    'package.json',
    `发版目标 ${version} 必须等于 package.json version ${packageVersion}，否则应用内版本展示会和 Git tag 不一致`,
  )
}

if (version === '1.0.0') {
  const auditFile = 'docs/RELEASE_AUDIT_1.0.md'
  const audit = read(auditFile)
  const auditBlocker = includesAny(audit, [
    '状态：未完成',
    '| 未完成 |',
    '未执行',
    '还不能',
    '剩余阻断项',
  ])
  if (auditBlocker) {
    addFailure(auditFile, `1.0 审计仍包含未完成标记：${auditBlocker}`)
  }

  const releaseNotesFile = 'docs/RELEASE_NOTES_1.0.md'
  const releaseNotes = read(releaseNotesFile)
  const notesBlocker = includesAny(releaseNotes, [
    '状态：草稿',
    'Release Notes Draft',
    '发布说明草稿',
    '已知注意事项',
  ])
  if (notesBlocker) {
    addFailure(releaseNotesFile, `1.0 发布说明仍不是正式发布状态：${notesBlocker}`)
  }
  if (!releaseNotes.includes('## iFace v1.0.0')) {
    addFailure(releaseNotesFile, '发布说明缺少 iFace v1.0.0 标题')
  }

  const smokeResultFile = 'docs/SMOKE_RESULT_2026-05-05.md'
  const smokeResult = read(smokeResultFile)
  const smokeBlocker = includesAny(smokeResult, [
    '阶段性验收记录',
    '仍需正式发布前确认',
    '仍需人工补齐',
    '当前还不能把 1.0.0 目标标记为完成',
  ])
  if (smokeBlocker) {
    addFailure(smokeResultFile, `1.0 Smoke 记录仍包含待补齐项：${smokeBlocker}`)
  }

  expectExternalSmokeRecord('docs/external-ai-smoke-result.json', 'ai', ['ai.chat', 'ai.feedback'])
  expectExternalSmokeRecord('docs/external-gist-smoke-result.json', 'gist', [
    'gist.read',
    'gist.update',
    'gist.cleanup',
  ])
}

if (failures.length > 0) {
  console.error(`发版就绪检查失败：${failures.length} 个问题`)
  for (const failure of failures) {
    console.error(`- ${failure.file}: ${failure.message}`)
  }
  process.exit(1)
}

if (version === '1.0.0') {
  console.log('发版就绪检查通过：1.0.0 审计、Smoke 记录、外部服务证据和发布说明均为正式状态')
} else {
  console.log(`发版就绪检查通过：${version} 与 package.json 一致`)
}
