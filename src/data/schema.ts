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
