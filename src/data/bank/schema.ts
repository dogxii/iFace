/**
 * The `iface-bank@1` package format.
 *
 * This module is the single source of truth for the format: the app, the bundled official
 * banks, the published JSON Schema (`public/schema/iface-bank-1.json`) and the `iface-bank`
 * CLI all use these schemas. Keep it free of app imports so it can be bundled on its own.
 *
 * Human-readable spec: docs/bank-format.md
 */
import { z } from 'zod'
import { LOCAL_ID_PATTERN } from './ids'

export const BANK_FORMAT = 'iface-bank@1'
export const BANK_MANIFEST_FILE = 'iface-bank.json'
export const BANK_TOPIC = 'iface-bank'
export const BANK_SCHEMA_URL = 'https://face.dogxi.me/schema/iface-bank-1.json'

export const BANK_LIMITS = {
  /** Manifest plus every referenced file, in bytes. */
  totalBytes: 5 * 1024 * 1024,
  questions: 3000,
  /** Manifest plus referenced question files. */
  files: 50,
  modules: 50,
  nameLength: 40,
  descriptionLength: 200,
  moduleNameLength: 20,
  moduleDescriptionLength: 200,
  questionLength: 2000,
  answerLength: 50_000,
  tagsPerQuestion: 10,
  tagLength: 30,
  bankTags: 10,
  sourceLength: 30,
  checksPerQuestion: 10,
  checkOptions: 8,
} as const

/** Colours a module may ask for; matches the app's `hue-*` design tokens. */
export const BANK_MODULE_COLORS = [
  'blue',
  'violet',
  'pink',
  'rose',
  'orange',
  'amber',
  'green',
  'teal',
  'cyan',
] as const

/** Icons a module may ask for (lucide names). Unknown names are ignored, not rejected. */
export const BANK_MODULE_ICONS = [
  'atom',
  'bot',
  'braces',
  'brain',
  'chart-line',
  'coffee',
  'cog',
  'cpu',
  'database',
  'database-zap',
  'file-code',
  'folder-search',
  'gauge',
  'globe',
  'leaf',
  'library',
  'memory-stick',
  'message-square-text',
  'network',
  'palette',
  'pen-line',
  'server',
  'shield',
  'smartphone',
  'sparkles',
  'split',
  'terminal',
  'triangle',
  'workflow',
  'wrench',
] as const

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/

/** Relative path to a question file inside the package: no leading slash, no `..`. */
export const BANK_FILE_PATH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[\w.\-/]+\.(?:json|md)$/

const BANK_CHECKS_PATH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[\w.\-/]+\.md$/

const trimmed = (max: number) => z.string().trim().min(1).max(max)

const localId = z
  .string()
  .regex(LOCAL_ID_PATTERN, '只能用小写字母、数字和 . _ -，以字母或数字开头，最长 64 个字符')

export const LearningCheckOptionSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{1,8}$/, '选项 id 只能是 1–8 个小写字母或数字'),
  text: trimmed(500),
})

export const LearningCheckSchema = z
  .object({
    id: localId,
    kind: z.enum(['single', 'multiple']),
    prompt: trimmed(2000),
    options: z.array(LearningCheckOptionSchema).min(2).max(BANK_LIMITS.checkOptions),
    answerIds: z.array(z.string()).min(1),
    explanation: trimmed(2000),
    focus: z.string().trim().max(60).optional(),
  })
  .superRefine((check, ctx) => {
    const optionIds = new Set(check.options.map((option) => option.id))
    if (optionIds.size !== check.options.length) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: '选项 id 不能重复' })
    }
    for (const answerId of check.answerIds) {
      if (!optionIds.has(answerId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['answerIds'],
          message: `答案 ${answerId} 不在选项里`,
        })
      }
    }
    if (check.kind === 'single' && check.answerIds.length !== 1) {
      ctx.addIssue({ code: 'custom', path: ['answerIds'], message: '单选题只能有一个答案' })
    }
  })

export const BankQuestionSchema = z.object({
  id: localId,
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  question: trimmed(BANK_LIMITS.questionLength),
  answer: trimmed(BANK_LIMITS.answerLength),
  tags: z
    .array(trimmed(BANK_LIMITS.tagLength))
    .max(BANK_LIMITS.tagsPerQuestion)
    .optional()
    .default([]),
  source: z.string().trim().max(BANK_LIMITS.sourceLength).optional(),
  checks: z.array(LearningCheckSchema).max(BANK_LIMITS.checksPerQuestion).optional(),
})

export const BankQuestionListSchema = z.array(z.unknown())

export const BankModuleSchema = z.object({
  id: localId,
  name: trimmed(BANK_LIMITS.moduleNameLength),
  description: z.string().trim().max(BANK_LIMITS.moduleDescriptionLength).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  /** Inline questions, or a path to a `.json` (array) or `.md` file in the package. */
  questions: z.union([
    z.string().regex(BANK_FILE_PATH_PATTERN, '必须是包内的相对路径，以 .json 或 .md 结尾'),
    BankQuestionListSchema,
  ]),
  /** Optional learning checks for this module's questions, as a `.md` file in the package. */
  checks: z
    .string()
    .regex(BANK_CHECKS_PATH_PATTERN, '必须是包内的相对路径，以 .md 结尾')
    .optional(),
})

export const BankManifestSchema = z.object({
  $schema: z.string().optional(),
  format: z.literal(BANK_FORMAT, { error: `format 必须是 "${BANK_FORMAT}"` }),
  name: trimmed(BANK_LIMITS.nameLength),
  description: z.string().trim().max(BANK_LIMITS.descriptionLength).optional(),
  version: z.string().regex(SEMVER_PATTERN, 'version 必须是 semver，例如 1.0.0'),
  license: trimmed(64),
  authors: z.array(trimmed(60)).max(20).optional().default([]),
  language: z.string().trim().max(20).optional().default('zh-CN'),
  tags: z.array(trimmed(20)).max(BANK_LIMITS.bankTags).optional().default([]),
  homepage: z.url({ protocol: /^https$/ }).optional(),
  modules: z.array(BankModuleSchema).min(1).max(BANK_LIMITS.modules),
})

export type BankManifest = z.infer<typeof BankManifestSchema>
export type BankModuleInput = z.infer<typeof BankModuleSchema>
export type BankQuestion = z.infer<typeof BankQuestionSchema>
export type BankLearningCheck = z.infer<typeof LearningCheckSchema>
export type BankModuleColor = (typeof BANK_MODULE_COLORS)[number]
export type BankModuleIcon = (typeof BANK_MODULE_ICONS)[number]

/**
 * JSON Schema for a single-file package (what editors and agents validate against).
 * Module `questions` accepts a path or an inline array of fully-specified questions.
 */
export function bankJsonSchema(): Record<string, unknown> {
  const PublishedModule = BankModuleSchema.extend({
    icon: z.enum(BANK_MODULE_ICONS).optional(),
    color: z.enum(BANK_MODULE_COLORS).optional(),
    questions: z.union([
      z.string().regex(BANK_FILE_PATH_PATTERN),
      z.array(BankQuestionSchema).max(BANK_LIMITS.questions),
    ]),
  })
  const Published = BankManifestSchema.extend({
    modules: z.array(PublishedModule).min(1).max(BANK_LIMITS.modules),
  })
  const schema = z.toJSONSchema(Published, { io: 'input', unrepresentable: 'any' })
  return {
    ...schema,
    $id: BANK_SCHEMA_URL,
    title: 'iFace question bank (iface-bank@1)',
    description:
      'A question bank for iFace (https://face.dogxi.me). Spec: https://github.com/dogxii/iFace/blob/main/docs/bank-format.md',
  }
}
