/**
 * Parse AI-generated Markdown into a Question JSON array.
 *
 * Expected Markdown block format (one per question):
 * ---
 * ## Q: <question text>
 * **模块**: <module>
 * **难度**: 初级 | 中级 | 高级
 * **标签**: tag1, tag2
 * **来源**: 高频          ← optional
 * **ID**: js-001          ← optional, auto-generated if missing
 *
 * <answer markdown, any content until next --- or end>
 * ---
 */
export function mdToQuestions(md: string): {
  questions: Record<string, unknown>[]
  errors: string[]
} {
  const questions: Record<string, unknown>[] = []
  const errors: string[] = []

  // Split on horizontal rules (--- or ***) at start of line
  const blocks = md
    .split(/\n(?:---|\*\*\*)\n/)
    .map((b) => b.trim())
    .filter(Boolean)

  const diffMap: Record<string, number> = {
    初级: 1,
    入门: 1,
    easy: 1,
    '1': 1,
    中级: 2,
    中等: 2,
    medium: 2,
    '2': 2,
    高级: 3,
    进阶: 3,
    hard: 3,
    '3': 3,
  }

  const moduleAlias: Record<string, string> = {
    js: 'JS基础',
    javascript: 'JS基础',
    js基础: 'JS基础',
    react: 'React',
    vue: 'Vue',
    css: 'CSS',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    网络: '网络',
    network: '网络',
    http: '网络',
    性能: '性能优化',
    performance: '性能优化',
    性能优化: '性能优化',
    手写: '手写题',
    algorithm: '手写题',
    手写题: '手写题',
    项目: '项目深挖',
    project: '项目深挖',
    项目深挖: '项目深挖',
    llm: 'LLM基础',
    llm基础: 'LLM基础',
    prompt: 'Prompt工程',
    prompt工程: 'Prompt工程',
    agent: 'Agent架构',
    agent架构: 'Agent架构',
    rag: 'RAG与知识库',
    rag与知识库: 'RAG与知识库',
    tool: '工具调用与工作流',
    tools: '工具调用与工作流',
    工具调用: '工具调用与工作流',
    工具调用与工作流: '工具调用与工作流',
    eval: '评测与线上优化',
    evaluation: '评测与线上优化',
    评测优化: '评测与线上优化',
    评测与线上优化: '评测与线上优化',
  }

  const idCounters: Record<string, number> = {}

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi]
    if (!block) continue

    // Extract question line: "## Q: ..." or "## <number>. ..." or "## ..."
    const titleMatch =
      block.match(/^##\s+(?:Q:\s*|【.*?】\s*|\d+[.、]\s*)?(.+)/m) ?? block.match(/^###?\s+(.+)/m)
    if (!titleMatch) {
      errors.push(`第 ${bi + 1} 块：未找到题目标题（需以 ## 开头）`)
      continue
    }
    const questionText = titleMatch[1]
      .trim()
      .replace(/^\*+|\*+$/g, '')
      .trim()

    // Extract meta fields
    const getField = (key: string) => {
      const re = new RegExp(`\\*\\*${key}\\*\\*[:：]\\s*(.+)`, 'i')
      return block.match(re)?.[1]?.trim() ?? ''
    }

    const rawModule = getField('模块') || getField('module')
    const rawDiff = getField('难度') || getField('difficulty')
    const rawTags = getField('标签') || getField('tags')
    const rawSource = getField('来源') || getField('source')
    const rawId = getField('ID') || getField('id')

    // Resolve module
    const moduleKey = (rawModule || '').toLowerCase().replace(/\s/g, '')
    const resolvedModule = moduleAlias[moduleKey] ?? rawModule
    if (!resolvedModule) {
      errors.push(`第 ${bi + 1} 块「${questionText.slice(0, 20)}…」：缺少模块字段`)
      continue
    }

    // Resolve difficulty
    const diffKey = (rawDiff || '').toLowerCase().trim()
    const difficulty = diffMap[rawDiff] ?? diffMap[diffKey] ?? 2

    // Tags
    const tags = rawTags
      ? rawTags
          .split(/[,，、]/)
          .map((t) => t.trim())
          .filter(Boolean)
      : []

    // Auto-generate ID
    let id = rawId
    if (!id) {
      const prefix = resolvedModule
        .toLowerCase()
        .replace('js基础', 'js')
        .replace('性能优化', 'perf')
        .replace('手写题', 'code')
        .replace('项目深挖', 'proj')
        .replace('llm基础', 'llm')
        .replace('prompt工程', 'prompt')
        .replace('agent架构', 'agent')
        .replace('rag与知识库', 'rag')
        .replace('工具调用与工作流', 'tools')
        .replace('评测与线上优化', 'eval')
        .replace(/[^a-z]/g, '')
        .slice(0, 6)
      idCounters[prefix] = (idCounters[prefix] ?? 0) + 1
      id = `${prefix}-${String(idCounters[prefix]).padStart(3, '0')}`
    }

    // Extract answer: everything after the meta block
    // Remove the header line + all **Field**: lines
    const answerRaw = block
      .replace(/^##\s+.+/m, '')
      .replace(/^###?\s+.+/m, '')
      .replace(
        /^\*\*(?:模块|module|难度|difficulty|标签|tags|来源|source|ID|id)\*\*[:：].+$/gim,
        '',
      )
      .trim()

    if (!answerRaw) {
      errors.push(`第 ${bi + 1} 块「${questionText.slice(0, 20)}…」：答案为空`)
      continue
    }

    questions.push({
      id,
      module: resolvedModule,
      difficulty,
      question: questionText,
      answer: answerRaw,
      tags,
      ...(rawSource ? { source: rawSource } : {}),
    })
  }

  return { questions, errors }
}
