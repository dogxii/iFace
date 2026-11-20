export interface ReviewNoteInput {
  questionText: string
  userAnswer: string
  feedback: string
  timestamp?: number
}

export function formatReviewNoteTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function buildReviewNoteMarkdown({
  questionText,
  userAnswer,
  feedback,
  timestamp = Date.now(),
}: ReviewNoteInput): string {
  return [
    `## AI 复盘 · ${formatReviewNoteTime(timestamp)}`,
    '',
    '### 题目',
    questionText.trim(),
    '',
    '### 我的作答',
    userAnswer.trim() || '（未填写）',
    '',
    '### AI 点评',
    feedback.trim(),
  ].join('\n')
}
