import { readFileSync } from 'node:fs'

interface Failure {
  file: string
  message: string
}

const failures: Failure[] = []

function addFailure(file: string, message: string): void {
  failures.push({ file, message })
}

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, unknown> }
const scripts = pkg.scripts ?? {}

const requiredScripts = [
  'check',
  'check:version',
  'check:release',
  'check:quality-gate',
  'check:docs',
  'check:external-records',
  'smoke:external:ai',
  'smoke:external:gist',
  'check:backup',
  'check:questions',
  'check:sync',
  'check:ai',
  'build',
  'check:pwa',
]

for (const scriptName of requiredScripts) {
  if (typeof scripts[scriptName] !== 'string' || !scripts[scriptName]) {
    addFailure('package.json', `缺少 npm script：${scriptName}`)
  }
}

const expectedScriptCommands: Record<string, string> = {
  'smoke:external:ai': 'bun run check:external -- --ai --record docs/external-ai-smoke-result.json',
  'smoke:external:gist':
    'bun run check:external -- --gist --record docs/external-gist-smoke-result.json',
}

for (const [scriptName, expected] of Object.entries(expectedScriptCommands)) {
  if (scripts[scriptName] !== expected) {
    addFailure('package.json', `${scriptName} 必须固定写入 1.0 外部 smoke 证据路径：${expected}`)
  }
}

const checkAll = typeof scripts['check:all'] === 'string' ? scripts['check:all'] : ''
if (!checkAll) {
  addFailure('package.json', '缺少 npm script：check:all')
}

const expectedCheckAll = [
  'bun run check',
  'bun run check:version',
  'bun run check:release',
  'bun run check:quality-gate',
  'bun run check:docs',
  'bun run check:external-records',
  'bun run check:backup',
  'bun run check:questions',
  'bun run check:sync',
  'bun run check:ai',
  'bun run build',
  'bun run check:pwa',
]

const actualCheckAllParts = checkAll.split('&&').map((part) => part.trim())
if (actualCheckAllParts.join('\n') !== expectedCheckAll.join('\n')) {
  addFailure(
    'package.json',
    `check:all 顺序或内容不符合 1.0 门禁：\n实际：${actualCheckAllParts.join(' -> ')}\n预期：${expectedCheckAll.join(' -> ')}`,
  )
}

const releaseScript = read('scripts/release.sh')
if (!releaseScript.includes('bun run check:all')) {
  addFailure('scripts/release.sh', '发版脚本必须执行 bun run check:all')
}
if (!releaseScript.includes('bun scripts/checkReleaseReadiness.ts "$VERSION"')) {
  addFailure('scripts/release.sh', '发版脚本必须在发布前执行 checkReleaseReadiness')
}

const docsWithFullGate = ['docs/RELEASE_NOTES_1.0.md', 'docs/SMOKE_TEST.md']
for (const file of docsWithFullGate) {
  const content = read(file)
  for (const command of expectedCheckAll) {
    if (!content.includes(command)) {
      addFailure(file, `文档缺少完整门禁命令：${command}`)
    }
  }
}

const smokeResult = read('docs/SMOKE_RESULT_2026-05-05.md')
for (const command of expectedCheckAll) {
  if (!smokeResult.includes(command)) {
    addFailure('docs/SMOKE_RESULT_2026-05-05.md', `阶段性验收记录缺少门禁结果：${command}`)
  }
}

if (failures.length > 0) {
  console.error(`质量门禁完整性检查失败：${failures.length} 个问题`)
  for (const failure of failures) {
    console.error(`- ${failure.file}: ${failure.message}`)
  }
  process.exit(1)
}

console.log('质量门禁完整性检查通过：check:all 子门禁、发版脚本和文档门禁列表正常')
