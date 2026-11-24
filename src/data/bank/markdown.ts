/**
 * Markdown question files (`questions/*.md`) for `iface-bank@1`.
 *
 * Each question starts with a one-line metadata comment, followed by the question as a level-1
 * heading and the answer. Both comments are invisible when GitHub renders the file.
 *
 *   <!-- id: basics-001; difficulty: 1; tags: slice, array -->
 *   # slice 和数组有什么区别？
 *
 *   ## 区别
 *   ...answer markdown...
 *
 * A question that needs more than its heading (a code snippet, say) puts the extra lines after
 * the heading and ends them with `<!-- answer -->`:
 *
 *   <!-- id: basics-002; difficulty: 2 -->
 *   # 以下代码输出什么？
 *
 *   ```go
 *   fmt.Println(len("你好"))
 *   ```
 *
 *   <!-- answer -->
 *   输出 6……
 *
 * Markers inside fenced code blocks are ignored. Text before the first marker is ignored, so a
 * file can open with its own title and notes.
 */

export interface MarkdownIssue {
  line: number
  message: string
}

export interface ParsedMarkdownQuestions {
  questions: Record<string, unknown>[]
  issues: MarkdownIssue[]
}

const META_PATTERN = /^<!--\s*id\s*[:：](.*?)-->\s*$/i
const ANSWER_MARKER_PATTERN = /^<!--\s*answer\s*-->\s*$/i
const FENCE_PATTERN = /^\s{0,3}(`{3,}|~{3,})/

const DIFFICULTY_WORDS: Record<string, 1 | 2 | 3> = {
  '1': 1,
  初级: 1,
  简单: 1,
  easy: 1,
  '2': 2,
  中级: 2,
  中等: 2,
  medium: 2,
  '3': 3,
  高级: 3,
  困难: 3,
  hard: 3,
}

interface Block {
  line: number
  meta: string
  lines: { text: string; line: number; inFence: boolean }[]
}

function splitBlocks(md: string): Block[] {
  const blocks: Block[] = []
  let fence: string | null = null
  let current: Block | null = null

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
        const meta = text.match(META_PATTERN)
        if (meta) {
          current = { line, meta: `id:${meta[1]}`, lines: [] }
          blocks.push(current)
          return
        }
      }
      current?.lines.push({ text, line, inFence: inFence || Boolean(fenceMatch) })
    })

  return blocks
}

function parseMeta(raw: string): Record<string, string> {
  const meta: Record<string, string> = {}
  for (const part of raw.split(/[;；|]/)) {
    const match = part.match(/^\s*([a-zA-Z]+)\s*[:：]\s*(.*?)\s*$/)
    if (match) meta[match[1].toLowerCase()] = match[2]
  }
  return meta
}

function joinLines(lines: { text: string }[]): string {
  return lines
    .map((l) => l.text)
    .join('\n')
    .trim()
}

export function parseMarkdownQuestions(md: string): ParsedMarkdownQuestions {
  const questions: Record<string, unknown>[] = []
  const issues: MarkdownIssue[] = []

  for (const block of splitBlocks(md)) {
    const meta = parseMeta(block.meta)
    const id = meta.id ?? ''
    const at = (message: string) => issues.push({ line: block.line, message })

    const headingIndex = block.lines.findIndex((l) => l.text.trim() !== '')
    const heading = block.lines[headingIndex]
    const headingMatch =
      heading && !heading.inFence ? heading.text.match(/^#\s+(.+?)(?:\s+#+)?\s*$/) : null
    if (!headingMatch) {
      at(`题目 ${id || '(无 id)'}：元信息下一行必须是一级标题「# 题目」`)
      continue
    }

    const rest = block.lines.slice(headingIndex + 1)
    const markerIndex = rest.findIndex((l) => !l.inFence && ANSWER_MARKER_PATTERN.test(l.text))
    const questionBody = markerIndex >= 0 ? joinLines(rest.slice(0, markerIndex)) : ''
    const answer = joinLines(markerIndex >= 0 ? rest.slice(markerIndex + 1) : rest)
    const question = questionBody ? `${headingMatch[1]}\n\n${questionBody}` : headingMatch[1]

    const rawDifficulty = (meta.difficulty ?? '').toLowerCase()
    const difficulty = DIFFICULTY_WORDS[rawDifficulty]
    if (!difficulty) {
      at(`题目 ${id || '(无 id)'}：difficulty 必须是 1 / 2 / 3（或 初级 / 中级 / 高级）`)
      continue
    }

    const tags = (meta.tags ?? '')
      .split(/[,，、]/)
      .map((tag) => tag.trim())
      .filter(Boolean)

    questions.push({
      id,
      difficulty,
      question,
      answer,
      tags,
      ...(meta.source ? { source: meta.source } : {}),
      // Kept so validation errors can point at the line.
      __line: block.line,
    })
  }

  if (questions.length === 0 && issues.length === 0) {
    issues.push({
      line: 1,
      message: '没有找到题目：每道题以 <!-- id: ...; difficulty: ... --> 开头',
    })
  }

  return { questions, issues }
}

export interface MarkdownQuestionInput {
  id: string
  difficulty: 1 | 2 | 3
  question: string
  answer: string
  tags?: string[]
  source?: string
}

function hasMarkerLine(text: string, pattern: RegExp): boolean {
  let fence: string | null = null
  for (const line of text.split('\n')) {
    const fenceMatch = line.match(FENCE_PATTERN)
    if (fenceMatch) {
      const marker = fenceMatch[1]
      if (fence === null) fence = marker
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null
      continue
    }
    if (fence === null && pattern.test(line)) return true
  }
  return false
}

/**
 * Serialises questions into the Markdown file format. Throws when an answer contains a line that
 * would be read back as the start of another question.
 */
export function questionsToMarkdown(questions: MarkdownQuestionInput[], title?: string): string {
  const parts: string[] = []
  if (title) parts.push(`# ${title}\n`)

  for (const q of questions) {
    if (hasMarkerLine(q.answer, META_PATTERN)) {
      throw new Error(`题目 ${q.id} 的答案里有一行以 <!-- id: 开头，无法写成 Markdown`)
    }
    const meta = [`id: ${q.id}`, `difficulty: ${q.difficulty}`]
    if (q.tags && q.tags.length > 0) meta.push(`tags: ${q.tags.join(', ')}`)
    if (q.source) meta.push(`source: ${q.source}`)

    const [firstLine, ...moreLines] = q.question.trim().split('\n')
    const questionBody = moreLines.join('\n').trim()
    const needsMarker = questionBody !== '' || hasMarkerLine(q.answer, ANSWER_MARKER_PATTERN)

    const lines = [`<!-- ${meta.join('; ')} -->`, `# ${firstLine.trim()}`, '']
    if (questionBody) lines.push(questionBody, '')
    if (needsMarker) lines.push('<!-- answer -->', '')
    lines.push(q.answer.trim(), '')
    parts.push(lines.join('\n'))
  }

  return `${parts.join('\n').trimEnd()}\n`
}
