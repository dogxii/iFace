/**
 * Official bank gate: the sources in `banks/official/` pass the strict official rules, the
 * generated `public/banks/` files and the JSON Schema are up to date.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BANK_SCHEMA_FILE, bankSchemaIsCurrent } from './buildBankSchema.ts'
import { buildOfficialBanks, OFFICIAL_SOURCE_DIR } from './officialBanks.ts'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const failures: { file: string; message: string }[] = []

const officialBuild = await buildOfficialBanks(repoRoot)
for (const failure of officialBuild.failures) {
  failures.push({ file: OFFICIAL_SOURCE_DIR, message: failure })
}
for (const [file, content] of officialBuild.outputs) {
  let current = ''
  try {
    current = readFileSync(join(repoRoot, file), 'utf8')
  } catch {
    // Reported as stale below.
  }
  if (current !== content) {
    failures.push({ file, message: '官方题库生成文件已过期，运行 bun run build:banks 后提交' })
  }
}

if (!bankSchemaIsCurrent()) {
  failures.push({
    file: BANK_SCHEMA_FILE,
    message: '题库包 JSON Schema 已过期，运行 bun run build:bank-schema 后提交',
  })
}

if (failures.length > 0) {
  console.error(`题库质量检查失败：${failures.length} 个问题`)
  for (const failure of failures) console.error(`- ${failure.file}: ${failure.message}`)
  process.exit(1)
}

const questions = officialBuild.banks.flatMap(({ bank }) =>
  bank.modules.flatMap((mod) =>
    mod.questions.map((question) => ({ ...question, module: mod.name })),
  ),
)
const count = (keyFor: (q: (typeof questions)[number]) => string) => {
  const counts = new Map<string, number>()
  for (const question of questions)
    counts.set(keyFor(question), (counts.get(keyFor(question)) ?? 0) + 1)
  return [...counts]
}

console.log(
  `题库质量检查通过：${officialBuild.banks.length} 个官方题库，${questions.length} 道题，${
    questions.filter((q) => q.checks?.length).length
  } 道带学习检验`,
)
console.log(
  `难度分布：${count((q) => String(q.difficulty))
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([difficulty, n]) => `${difficulty}=${n}`)
    .join(', ')}`,
)
console.log(
  `模块覆盖：${count((q) => q.module)
    .map(([module, n]) => `${module}=${n}`)
    .join(', ')}`,
)
