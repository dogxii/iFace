import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'

interface Failure {
  file: string
  message: string
}

const failures: Failure[] = []
const markdownFiles = [
  'README.md',
  'docs/ROADMAP.md',
  'docs/SMOKE_TEST.md',
  'docs/SMOKE_RESULT_2026-05-05.md',
  'docs/RELEASE_AUDIT_1.0.md',
  'docs/RELEASE_NOTES_1.0.md',
]
const requiredFiles = [
  '.env.example',
  'LICENSE',
  ...markdownFiles,
  'docs/screenshots/dashboard.png',
  'docs/screenshots/practice.png',
  'docs/screenshots/question-detail.png',
  'docs/screenshots/settings.png',
  'docs/screenshots/dashboard.webp',
  'docs/screenshots/practice.webp',
  'docs/screenshots/question-detail.webp',
  'docs/screenshots/settings.webp',
]

function addFailure(file: string, message: string): void {
  failures.push({ file, message })
}

function stripQueryAndHash(target: string): string {
  return target.split('#')[0]?.split('?')[0]?.trim() ?? ''
}

function isExternalLink(target: string): boolean {
  return /^(?:https?:|mailto:|tel:|#)/i.test(target)
}

function resolveLocalTarget(fromFile: string, target: string): string | null {
  const clean = stripQueryAndHash(target.replace(/^<|>$/g, ''))
  if (!clean || isExternalLink(clean)) return null
  return normalize(join(dirname(fromFile), clean))
}

function checkExists(file: string): void {
  if (!existsSync(file)) addFailure(file, '文件不存在')
}

function checkMarkdownLinks(file: string): void {
  if (!existsSync(file)) return
  const raw = readFileSync(file, 'utf8')
  const linkPattern = /!?\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g
  const imageSrcPattern = /<img\b[^>]*\bsrc="([^"]+)"/g
  const references = [
    ...[...raw.matchAll(linkPattern)].map((match) => match[1] ?? ''),
    ...[...raw.matchAll(imageSrcPattern)].map((match) => match[1] ?? ''),
  ]

  for (const reference of references) {
    const target = resolveLocalTarget(file, reference)
    if (!target) continue
    if (!existsSync(target)) {
      addFailure(file, `本地链接不存在：${reference}`)
    }
  }
}

function checkPng(file: string): void {
  if (!existsSync(file)) return
  const stat = statSync(file)
  if (stat.size < 8 * 1024) {
    addFailure(file, `截图文件过小：${stat.size} bytes`)
    return
  }

  const header = readFileSync(file).subarray(0, 8)
  const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (!pngHeader.every((byte, index) => header[index] === byte)) {
    addFailure(file, 'PNG 文件头无效')
  }
}

function checkWebp(file: string): void {
  if (!existsSync(file)) return
  const stat = statSync(file)
  if (stat.size < 8 * 1024) {
    addFailure(file, `WebP 文件过小：${stat.size} bytes`)
    return
  }

  const header = readFileSync(file).subarray(0, 12).toString('ascii')
  if (!header.startsWith('RIFF') || header.slice(8, 12) !== 'WEBP') {
    addFailure(file, 'WebP 文件头无效')
  }
}

function checkEnvExample(): void {
  const file = '.env.example'
  if (!existsSync(file)) return
  const raw = readFileSync(file, 'utf8')
  const requiredMarkers = [
    'VITE_GITHUB_CLIENT_ID',
    'IFACE_AI_API_KEY',
    'IFACE_AI_BASE_URL',
    'IFACE_AI_MODEL',
    'IFACE_AI_TIMEOUT_MS',
    'IFACE_GIST_TOKEN',
    'GITHUB_TOKEN',
  ]

  for (const marker of requiredMarkers) {
    if (!raw.includes(marker)) {
      addFailure(file, `缺少环境变量模板说明：${marker}`)
    }
  }
}

for (const file of requiredFiles) {
  checkExists(file)
}

checkEnvExample()

for (const file of markdownFiles) {
  checkMarkdownLinks(file)
}

for (const file of requiredFiles.filter((file) => file.endsWith('.png'))) {
  checkPng(file)
}

for (const file of requiredFiles.filter((file) => file.endsWith('.webp'))) {
  checkWebp(file)
}

if (failures.length > 0) {
  console.error(`文档资产检查失败：${failures.length} 个问题`)
  for (const failure of failures) {
    console.error(`- ${failure.file}: ${failure.message}`)
  }
  process.exit(1)
}

console.log('文档资产检查通过：README/docs 本地链接、.env.example、License 和截图资源正常')
