import type { ChatCompletionMessage } from '@/lib/aiClient'

export const DEFAULT_ROLE = '前端工程师'

export const RESUME_ACCEPT =
  '.pdf,.docx,.txt,.md,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const REPORT_SECTION_TITLES = new Set([
  '总体判断',
  '匹配点',
  '风险点',
  '缺失关键词',
  '可能追问',
  '准备建议',
])

export function formatReportTime(timestamp?: number): string {
  if (!timestamp) return '未保存'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function normalizeGeneratedTitle(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\*+|\*+$/g, '')
    .replace(/^标题[:：]\s*/, '')
    .replace(/[*#`]/g, '')
    .trim()
}

function isGeneratedTitleLine(line: string): boolean {
  const trimmed = line.trim()
  const cleaned = normalizeGeneratedTitle(trimmed)
  if (!cleaned) return false
  if (/^#{0,6}\s*\*{0,2}标题[:：]/.test(trimmed)) return true
  return /^#{1,6}\s+/.test(trimmed) && !REPORT_SECTION_TITLES.has(cleaned)
}

/** Pull the model's "标题：…" line (or a leading non-section heading) out as the report title. */
export function extractGeneratedTitle(markdown: string, roleTitle: string): string {
  const titleLine = markdown.split('\n').find(isGeneratedTitleLine)
  const title = titleLine ? normalizeGeneratedTitle(titleLine) : ''
  if (title) return title.slice(0, 32)
  return `${roleTitle || DEFAULT_ROLE} · JD 诊断`
}

/** Remove the title line when it is the first non-empty line of the report. */
export function stripGeneratedTitle(markdown: string): string {
  const lines = markdown.split('\n')
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0)
  if (firstContentIndex === -1 || !isGeneratedTitleLine(lines[firstContentIndex])) {
    return markdown.trim()
  }
  return [...lines.slice(0, firstContentIndex), ...lines.slice(firstContentIndex + 1)]
    .join('\n')
    .trim()
}

/** Find the 0-100 match score the prompt asks for in the 总体判断 section. */
export function extractMatchScore(markdown: string): number | null {
  const match =
    markdown.match(
      /匹配(?:度|分)?\s*(?:分数|得分)?\s*[:：为是]?\s*\**\s*(\d{1,3})\s*(?:分|\/\s*100)?/,
    ) ?? markdown.match(/(\d{1,3})\s*\/\s*100/)
  if (!match) return null
  const score = Number(match[1])
  return score >= 0 && score <= 100 ? score : null
}

export function buildJdMatchMessages(input: {
  roleTitle: string
  jdText: string
  resumeText: string
}): ChatCompletionMessage[] {
  return [
    {
      role: 'system',
      content: `你是 iFace 的中文技术招聘顾问，负责做简历与岗位 JD 的面试前匹配诊断。
要求：
- 只基于用户提供的 JD 和简历判断，不要编造候选人经历。
- 结论要具体，可直接用于准备面试。
- 语气克制、专业，不要写客套话。
- 风险点要指出面试中可能被质疑的原因。
- 追问要像真实面试官会问的问题。`,
    },
    {
      role: 'user',
      content: `请诊断下面候选人与目标岗位的匹配度。

目标岗位：${input.roleTitle || DEFAULT_ROLE}

请用 Markdown 输出，并严格包含这些部分：
标题：用 12 个字以内生成本次诊断标题

## 总体判断
给出 1 段结论，并给出 0-100 的匹配分。

## 匹配点
列出 4-6 条，说明 JD 需求与简历证据如何对应。

## 风险点
列出 3-5 条，说明哪些地方可能被面试官追问或质疑。

## 缺失关键词
列出简历里缺少或不够突出的 JD 关键词，并说明是否需要补充。

## 可能追问
列出 6-8 个真实面试追问，优先围绕项目真实性、技术深度、岗位关键要求。

## 准备建议
给出 3-5 条下一步准备动作。

<JD>
${input.jdText}
</JD>

<简历>
${input.resumeText}
</简历>`,
    },
  ]
}
