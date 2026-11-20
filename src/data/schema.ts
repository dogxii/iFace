import { z } from 'zod'

// Accept any non-empty string so users can import custom topics (Golang, Java, etc.)
export const ModuleSchema = z.string().min(1)

export const DifficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3)])

export const QuestionSchema = z.object({
  id: z.string().min(1),
  module: ModuleSchema,
  difficulty: DifficultySchema,
  question: z.string().min(1),
  answer: z.string().min(1),
  tags: z.array(z.string()),
  source: z.string().optional(),
})

export const QuestionArraySchema = z.array(QuestionSchema)

export type ValidatedQuestion = z.infer<typeof QuestionSchema>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stableHash(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export function normalizeQuestionsForImport(data: unknown): unknown {
  if (!Array.isArray(data)) return data

  return data.map((item, index) => {
    if (!isRecord(item)) return item

    const next: Record<string, unknown> = { ...item }
    const id = typeof next.id === 'string' ? next.id.trim() : ''
    if (id) {
      next.id = id
    } else {
      const seed = [
        typeof next.module === 'string' ? next.module : '',
        typeof next.question === 'string' ? next.question : '',
        typeof next.answer === 'string' ? next.answer : '',
        String(index + 1),
      ].join('\n')
      next.id = `auto-${index + 1}-${stableHash(seed)}`
    }

    if (next.tags === undefined) {
      next.tags = []
    }

    return next
  })
}

export function validateQuestions(data: unknown): {
  valid: ValidatedQuestion[]
  errors: { index: number; message: string }[]
} {
  if (!Array.isArray(data)) {
    return {
      valid: [],
      errors: [{ index: -1, message: '顶层数据必须是数组' }],
    }
  }

  const valid: ValidatedQuestion[] = []
  const errors: { index: number; message: string }[] = []

  for (let i = 0; i < data.length; i++) {
    const result = QuestionSchema.safeParse(data[i])
    if (result.success) {
      valid.push(result.data)
    } else {
      errors.push({
        index: i,
        message: result.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; '),
      })
    }
  }

  return { valid, errors }
}
