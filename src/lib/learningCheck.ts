import type { BankLearningCheck } from '@/data/bank/schema'
import { getLearningChecks } from '@/lib/db'
import type { Question } from '@/types'

export type LearningCheckQuestion = BankLearningCheck

/** Learning checks the question's bank ships for it (none for most community banks). */
export async function loadLearningChecksForQuestion(
  question: Question,
): Promise<LearningCheckQuestion[]> {
  return (await getLearningChecks(question.id))?.checks ?? []
}

export function isLearningCheckAnswerCorrect(
  check: LearningCheckQuestion,
  selectedIds: string[],
): boolean {
  if (check.answerIds.length !== selectedIds.length) return false
  const selected = new Set(selectedIds)
  return check.answerIds.every((id) => selected.has(id))
}
