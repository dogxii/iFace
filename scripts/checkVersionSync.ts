import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface Failure {
  file: string
  message: string
}

const root = process.cwd()
const failures: Failure[] = []

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function addFailure(file: string, message: string): void {
  failures.push({ file, message })
}

function expectIncludes(file: string, content: string, expected: string, message: string): void {
  if (!content.includes(expected)) {
    addFailure(file, `${message}：缺少 ${expected}`)
  }
}

const pkg = JSON.parse(read('package.json')) as { version?: unknown }
const version = typeof pkg.version === 'string' ? pkg.version : ''

if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  addFailure('package.json', `version 不是有效 semver：${String(pkg.version)}`)
}

const readme = read('README.md')
const readmeBadge = readme.match(/version-([0-9A-Za-z.+-]+)-6366f1/)
if (readmeBadge?.[1] !== version) {
  addFailure(
    'README.md',
    `版本徽章应为 package.json 的 ${version}，实际为 ${readmeBadge?.[1] ?? '<missing>'}`,
  )
}

const roadmap = read('docs/ROADMAP.md')
expectIncludes(
  'docs/ROADMAP.md',
  roadmap,
  `当前版本：\`${version}\``,
  'Roadmap 当前版本应跟随 package.json',
)

const smokeResult = read('docs/SMOKE_RESULT_2026-05-05.md')
expectIncludes(
  'docs/SMOKE_RESULT_2026-05-05.md',
  smokeResult,
  `应用版本：\`${version}\``,
  'Smoke Result 应记录当前应用版本',
)

const viteConfig = read('vite.config.ts')
expectIncludes('vite.config.ts', viteConfig, 'const pkg = JSON.parse', 'Vite 应读取 package.json')
expectIncludes(
  'vite.config.ts',
  viteConfig,
  '__APP_VERSION__: JSON.stringify(pkg.version)',
  'Vite 应注入 __APP_VERSION__',
)

const viteEnv = read('src/vite-env.d.ts')
expectIncludes(
  'src/vite-env.d.ts',
  viteEnv,
  'declare const __APP_VERSION__: string',
  '类型声明应包含 __APP_VERSION__',
)

const settingsDrawer = read('src/components/layout/SettingsDrawer.tsx')
expectIncludes(
  'src/components/layout/SettingsDrawer.tsx',
  settingsDrawer,
  'v{__APP_VERSION__}',
  '设置页应展示注入的应用版本',
)

const releaseScript = read('scripts/release.sh')
expectIncludes(
  'scripts/release.sh',
  releaseScript,
  'VERSION_OVERRIDE" != "$PACKAGE_VERSION"',
  '发版脚本应阻止命令行版本与 package.json 不一致',
)
expectIncludes(
  'scripts/release.sh',
  releaseScript,
  "Version argument '$VERSION_OVERRIDE' does not match package.json version '$PACKAGE_VERSION'",
  '发版脚本应给出版本不一致错误',
)

if (failures.length > 0) {
  console.error(`版本一致性检查失败：${failures.length} 个问题`)
  for (const failure of failures) {
    console.error(`- ${failure.file}: ${failure.message}`)
  }
  process.exit(1)
}

console.log(`版本一致性检查通过：${version}`)
