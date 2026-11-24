/**
 * Generates `public/banks/` from the official bank sources in `banks/official/`.
 *
 *   bun run build:banks
 *
 * `check:questions` fails when the generated files are out of date.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildOfficialBanks } from './officialBanks.ts'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const { outputs, failures, banks } = await buildOfficialBanks(repoRoot)

if (failures.length > 0) {
  console.error(`官方题库有 ${failures.length} 个问题，未生成：`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

for (const [file, content] of outputs) {
  mkdirSync(dirname(join(repoRoot, file)), { recursive: true })
  writeFileSync(join(repoRoot, file), content)
}
const total = banks.reduce((sum, { bank }) => sum + bank.questionCount, 0)
console.log(`已生成 ${banks.length} 个官方题库，共 ${total} 道题`)
