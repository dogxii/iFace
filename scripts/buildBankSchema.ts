/**
 * Writes the published JSON Schema for `iface-bank@1` from the zod source of truth.
 *
 *   bun run build:bank-schema   write public/schema/iface-bank-1.json
 *
 * `check:questions` fails when the committed file is out of date (see `bankSchemaIsCurrent`).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bankJsonSchema } from '../src/data/bank/schema.ts'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
export const BANK_SCHEMA_FILE = 'public/schema/iface-bank-1.json'
const target = join(repoRoot, BANK_SCHEMA_FILE)

function render(): string {
  return `${JSON.stringify(bankJsonSchema(), null, 2)}\n`
}

export function bankSchemaIsCurrent(): boolean {
  try {
    return readFileSync(target, 'utf8') === render()
  } catch {
    return false
  }
}

if (import.meta.main) {
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, render())
  console.log(`已写入 ${BANK_SCHEMA_FILE}`)
}
