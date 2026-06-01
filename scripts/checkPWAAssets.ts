import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

interface Failure {
  file: string
  message: string
}

const failures: Failure[] = []
const distDir = 'dist'
const publicQuestionsDir = 'public/questions'

function addFailure(file: string, message: string): void {
  failures.push({ file, message })
}

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function expectFile(path: string, minBytes = 1): void {
  if (!existsSync(path)) {
    addFailure(path, '文件不存在，请先运行 bun run build')
    return
  }

  const size = statSync(path).size
  if (size < minBytes) {
    addFailure(path, `文件过小：${size} bytes`)
  }
}

function listFiles(dir: string, suffix: string): string[] {
  if (!existsSync(dir)) return []

  const results: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...listFiles(path, suffix))
    } else if (entry.isFile() && path.endsWith(suffix)) {
      results.push(path)
    }
  }
  return results.sort()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

expectFile(join(distDir, 'index.html'), 512)
expectFile(join(distDir, 'manifest.webmanifest'), 256)
expectFile(join(distDir, 'sw.js'), 1024)

const workboxFiles = existsSync(distDir)
  ? readdirSync(distDir).filter((file) => /^workbox-.+\.js$/.test(file))
  : []
if (workboxFiles.length === 0) {
  addFailure(distDir, '缺少 workbox runtime 文件')
}

if (existsSync(join(distDir, 'index.html'))) {
  const indexHtml = read(join(distDir, 'index.html'))
  if (!indexHtml.includes('rel="manifest"') || !indexHtml.includes('/manifest.webmanifest')) {
    addFailure(join(distDir, 'index.html'), 'HTML 缺少 manifest 引用')
  }
  if (!indexHtml.includes('/favicon.ico')) {
    addFailure(join(distDir, 'index.html'), 'HTML 缺少 favicon.ico 引用')
  }
  if (!indexHtml.includes('/favicon-32x32.png')) {
    addFailure(join(distDir, 'index.html'), 'HTML 缺少 32x32 PNG favicon 引用')
  }
  if (
    !indexHtml.includes('rel="apple-touch-icon"') ||
    !indexHtml.includes('/apple-touch-icon.png')
  ) {
    addFailure(join(distDir, 'index.html'), 'HTML 缺少 Apple touch icon 引用')
  }
  if (indexHtml.includes('data:image/svg+xml')) {
    addFailure(
      join(distDir, 'index.html'),
      'HTML favicon 不应使用 data URL，桌面保存时可能无法复用',
    )
  }
  if (!indexHtml.includes('id="root"')) {
    addFailure(join(distDir, 'index.html'), 'HTML 缺少 React root 节点')
  }
}

if (existsSync(join(distDir, 'sw.js'))) {
  const sw = read(join(distDir, 'sw.js'))
  if (!sw.includes('precacheAndRoute') && !sw.includes('workbox')) {
    addFailure(join(distDir, 'sw.js'), 'Service Worker 不像有效 Workbox 产物')
  }
  if (sw.includes('/api/')) {
    addFailure(join(distDir, 'sw.js'), 'Service Worker precache 不应包含 /api/ 路径')
  }

  const publicQuestionFiles = listFiles(publicQuestionsDir, '.json').map((file) =>
    file.replace(/^public\//, ''),
  )
  const distQuestionFiles = listFiles(join(distDir, 'questions'), '.json').map((file) =>
    file.replace(/^dist\//, ''),
  )

  if (publicQuestionFiles.length === 0) {
    addFailure(publicQuestionsDir, 'public 中缺少内置题库 JSON')
  }

  if (distQuestionFiles.length === 0) {
    addFailure(join(distDir, 'questions'), '构建产物缺少内置题库 JSON')
  }

  const publicSet = new Set(publicQuestionFiles)
  const distSet = new Set(distQuestionFiles)
  for (const file of publicQuestionFiles) {
    if (!distSet.has(file)) {
      addFailure(join(distDir, 'questions'), `构建产物缺少题库文件：${file}`)
    }
  }
  for (const file of distQuestionFiles) {
    if (!publicSet.has(file)) {
      addFailure(join(distDir, 'questions'), `构建产物包含未知题库文件：${file}`)
    }
  }

  for (const precachePath of publicQuestionFiles) {
    if (!sw.includes(precachePath)) {
      addFailure(join(distDir, 'sw.js'), `Service Worker 未预缓存题库文件：${precachePath}`)
    }
  }
}

if (existsSync(join(distDir, 'manifest.webmanifest'))) {
  let manifest: unknown
  try {
    manifest = JSON.parse(read(join(distDir, 'manifest.webmanifest')))
  } catch (err) {
    addFailure(
      join(distDir, 'manifest.webmanifest'),
      `manifest 不是有效 JSON：${err instanceof Error ? err.message : String(err)}`,
    )
  }

  if (isRecord(manifest)) {
    const requiredFields: Record<string, unknown> = {
      name: 'iFace · 面试刷题助手',
      short_name: 'iFace',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      lang: 'zh-CN',
    }

    for (const [key, expected] of Object.entries(requiredFields)) {
      if (manifest[key] !== expected) {
        addFailure(
          join(distDir, 'manifest.webmanifest'),
          `${key} 应为 ${String(expected)}，实际为 ${String(manifest[key] ?? '<missing>')}`,
        )
      }
    }

    if (!Array.isArray(manifest.icons) || manifest.icons.length < 4) {
      addFailure(join(distDir, 'manifest.webmanifest'), 'manifest icons 至少应包含 4 项')
    } else {
      const requiredIcons = [
        { src: '/icons/icon-192x192.png', purpose: 'any' },
        { src: '/icons/icon-512x512.png', purpose: 'any' },
        { src: '/icons/icon-192x192.png', purpose: 'maskable' },
        { src: '/icons/icon-512x512.png', purpose: 'maskable' },
      ]

      for (const requiredIcon of requiredIcons) {
        const matched = manifest.icons.some(
          (icon) =>
            isRecord(icon) &&
            icon.src === requiredIcon.src &&
            icon.type === 'image/png' &&
            icon.purpose === requiredIcon.purpose,
        )
        if (!matched) {
          addFailure(
            join(distDir, 'manifest.webmanifest'),
            `manifest 缺少图标 ${requiredIcon.src} (${requiredIcon.purpose})`,
          )
        }
      }
    }
  }
}

expectFile(join(distDir, 'favicon.ico'), 512)
expectFile(join(distDir, 'favicon-16x16.png'), 256)
expectFile(join(distDir, 'favicon-32x32.png'), 1024)
expectFile(join(distDir, 'apple-touch-icon.png'), 1024)

const requiredIconFiles = [
  { file: 'icon-16x16.png', minBytes: 256 },
  { file: 'icon-32x32.png', minBytes: 1024 },
  { file: 'icon-180x180.png', minBytes: 1024 },
  { file: 'icon-192x192.png', minBytes: 1024 },
  { file: 'icon-512x512.png', minBytes: 1024 },
]

for (const icon of requiredIconFiles) {
  expectFile(join(distDir, 'icons', icon.file), icon.minBytes)
}

if (failures.length > 0) {
  console.error(`PWA 产物检查失败：${failures.length} 个问题`)
  for (const failure of failures) {
    console.error(`- ${failure.file}: ${failure.message}`)
  }
  process.exit(1)
}

console.log('PWA 产物检查通过：manifest、Service Worker、Workbox、图标资源和题库 JSON 预缓存正常')
