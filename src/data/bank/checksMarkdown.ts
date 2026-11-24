/**
 * Markdown learning-check files (`checks/*.md`) for `iface-bank@1`.
 *
 *   ## basics-001                      ← question id the checks belong to
 *
 *   ### Q1 single | 数组类型            ← number, single | multiple, focus
 *
 *   `[3]int` 和 `[4]int` 是同一种类型吗？
 *
 *   - [ ] A. 是，长度不是类型的一部分
 *   - [x] B. 不是，长度是数组类型的一部分
 *
 *   **解释**：数组长度是类型的一部分……
 *
 * Check ids are derived as `<question id>-check-<NN>`. Everything before the first `##` is
 * ignored. The resulting checks still go through `LearningCheckSchema`.
 */

export interface ParsedCheck {
  id: string
  kind: 'single' | 'multiple'
  prompt: string
  options: { id: string; text: string }[]
  answerIds: string[]
  explanation: string
  focus: string
}

export interface ParsedChecks {
  /** Checks grouped by question id, in file order. */
  byQuestion: Map<string, { line: number; checks: (ParsedCheck & { line: number })[] }>
  issues: { line: number; message: string }[]
}

const QUESTION_PATTERN = /^##\s+(\S+)\s*$/
const CHECK_PATTERN = /^###\s+Q(\d+)\s+(single|multiple)\s*(?:\|\s*(.*?))?\s*$/i
const OPTION_PATTERN = /^-\s+\[(x| )\]\s+([A-Ha-h])[.、．]\s+(.+)$/i
const EXPLANATION_PATTERN = /^\*\*(?:解释|解析|explanation)\*\*\s*[:：]\s*(.*)$/i
const FENCE_PATTERN = /^\s{0,3}(`{3,}|~{3,})/

interface Draft {
  line: number
  number: number
  kind: 'single' | 'multiple'
  focus: string
  promptLines: string[]
  options: { id: string; text: string; correct: boolean }[]
  explanationLines: string[] | null
}

export function parseChecksMarkdown(md: string): ParsedChecks {
  const byQuestion: ParsedChecks['byQuestion'] = new Map()
  const issues: ParsedChecks['issues'] = []
  let questionId: string | null = null
  let draft: Draft | null = null
  let fence: string | null = null

  const finish = () => {
    if (!draft || !questionId) return
    const group = byQuestion.get(questionId)
    group?.checks.push({
      line: draft.line,
      id: `${questionId}-check-${String(draft.number).padStart(2, '0')}`,
      kind: draft.kind,
      focus: draft.focus,
      prompt: draft.promptLines.join('\n').trim(),
      options: draft.options.map(({ id, text }) => ({ id, text })),
      answerIds: draft.options.filter((option) => option.correct).map((option) => option.id),
      explanation: (draft.explanationLines ?? []).join('\n').trim(),
    })
    draft = null
  }

  md.replace(/\r\n?/g, '\n')
    .split('\n')
    .forEach((text, index) => {
      const line = index + 1
      const fenceMatch = text.match(FENCE_PATTERN)
      const inFence = fence !== null
      if (fenceMatch) {
        const marker = fenceMatch[1]
        if (fence === null) fence = marker
        else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null
      }

      if (!inFence && !fenceMatch) {
        const question = text.match(QUESTION_PATTERN)
        if (question) {
          finish()
          questionId = question[1]
          if (byQuestion.has(questionId)) {
            issues.push({ line, message: `题目 ${questionId} 的学习检验重复出现` })
          } else {
            byQuestion.set(questionId, { line, checks: [] })
          }
          return
        }

        const check = text.match(CHECK_PATTERN)
        if (check) {
          finish()
          if (!questionId) {
            issues.push({ line, message: '学习检验必须写在「## 题目 id」下面' })
            return
          }
          draft = {
            line,
            number: Number(check[1]),
            kind: check[2].toLowerCase() as Draft['kind'],
            focus: check[3] ?? '',
            promptLines: [],
            options: [],
            explanationLines: null,
          }
          return
        }
      }

      if (!draft) return
      const current: Draft = draft

      if (!inFence && !fenceMatch) {
        const explanation = text.match(EXPLANATION_PATTERN)
        if (explanation) {
          current.explanationLines = [explanation[1]]
          return
        }
        if (current.explanationLines === null) {
          const option = text.match(OPTION_PATTERN)
          if (option) {
            current.options.push({
              id: option[2].toLowerCase(),
              text: option[3].trim(),
              correct: option[1].toLowerCase() === 'x',
            })
            return
          }
        }
      }

      if (current.explanationLines !== null) current.explanationLines.push(text)
      else current.promptLines.push(text)
    })

  finish()
  return { byQuestion, issues }
}

export interface ChecksMarkdownInput {
  questionId: string
  checks: {
    kind: 'single' | 'multiple'
    prompt: string
    options: { id: string; text: string }[]
    answerIds: string[]
    explanation: string
    focus?: string
  }[]
}

/** Serialises checks into the Markdown file format. Option ids must be single letters a–h. */
export function checksToMarkdown(groups: ChecksMarkdownInput[], title?: string): string {
  const parts: string[] = []
  if (title) parts.push(`# ${title}\n`)
  for (const group of groups) {
    parts.push(`## ${group.questionId}\n`)
    group.checks.forEach((check, index) => {
      const focus = check.focus ? ` | ${check.focus}` : ''
      const options = check.options.map((option) => {
        if (!/^[a-h]$/.test(option.id)) {
          throw new Error(`${group.questionId}: 选项 id「${option.id}」不是 a–h 的单个字母`)
        }
        const mark = check.answerIds.includes(option.id) ? 'x' : ' '
        return `- [${mark}] ${option.id.toUpperCase()}. ${option.text}`
      })
      parts.push(
        [
          `### Q${index + 1} ${check.kind}${focus}`,
          '',
          check.prompt.trim(),
          '',
          ...options,
          '',
          `**解释**：${check.explanation.trim()}`,
          '',
        ].join('\n'),
      )
    })
  }
  return `${parts.join('\n').trimEnd()}\n`
}
