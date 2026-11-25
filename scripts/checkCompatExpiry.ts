/**
 * Compat code is time-boxed: every file under `src/compat/` starts with
 * `// COMPAT: remove after YYYY-MM-DD`, and compat lines elsewhere in `src/` carry the same
 * comment. This check fails once a date has passed (so the code gets deleted instead of
 * lingering) and when a compat file has no date at all.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const COMPAT_DIR = 'src/compat'
const HEADER = /^\/\/ COMPAT: remove after (\d{4}-\d{2}-\d{2})\s*$/
const INLINE = /COMPAT: remove after (\d{4}-\d{2}-\d{2})/g

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : []
  })
}

const today = new Date().toISOString().slice(0, 10)
const failures: string[] = []
const dates = new Map<string, string[]>()

for (const file of files('src')) {
  const content = readFileSync(file, 'utf8')
  if (file.startsWith(COMPAT_DIR) && !HEADER.test(content.split('\n', 1)[0])) {
    failures.push(`${file}: 第一行必须是 "// COMPAT: remove after YYYY-MM-DD"`)
  }
  for (const [, date] of content.matchAll(INLINE)) {
    if (date < today) failures.push(`${file}: 兼容代码已于 ${date} 到期，请删除`)
    const list = dates.get(date) ?? []
    if (!list.includes(file)) dates.set(date, [...list, file])
  }
}

if (failures.length > 0) {
  console.error(`兼容代码检查失败：${failures.length} 个问题`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

const summary = [...dates].map(([date, list]) => `${date}（${list.length} 个文件）`).join('、')
console.log(`兼容代码检查通过：${summary || '没有兼容代码'}`)
