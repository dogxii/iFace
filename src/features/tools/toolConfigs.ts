import type { ChatCompletionMessage } from '@/lib/aiClient'

export type FieldType = 'input' | 'textarea'

export interface ToolField {
  id: string
  label: string
  placeholder: string
  type: FieldType
  required?: boolean
  rows?: number
}

export interface AIToolConfig {
  id: string
  title: string
  description: string
  actionLabel: string
  loadingText: string
  emptyTitle: string
  emptyDescription: string
  fields: ToolField[]
  outputGuide: string
}

export const TOOL_CONFIGS: AIToolConfig[] = [
  {
    id: 'project-deep-dive',
    title: '项目深挖',
    description: '把一段项目经历拆成面试亮点、技术难点、追问和口语化表达。',
    actionLabel: '生成项目深挖',
    loadingText: '正在拆解项目经历...',
    emptyTitle: '等待项目材料',
    emptyDescription: '填入项目经历后，生成可用于面试的深挖稿和追问清单。',
    fields: [
      {
        id: 'role',
        label: '目标岗位',
        placeholder: '例如：前端工程师 / AI Agent 工程师',
        type: 'input',
      },
      {
        id: 'project',
        label: '项目经历',
        placeholder: '粘贴项目背景、你的职责、技术方案、结果数据、遇到的问题。越具体，深挖越准。',
        type: 'textarea',
        rows: 9,
        required: true,
      },
      {
        id: 'focus',
        label: '想强调的方向',
        placeholder: '例如：性能优化、复杂状态管理、工程化、业务推进、Agent 工作流',
        type: 'textarea',
        rows: 4,
      },
    ],
    outputGuide: `
请输出 Markdown，包含：
1. 项目一句话定位
2. 面试官会感兴趣的 5 个亮点
3. 3 个技术难点，每个包含背景、方案、权衡、结果
4. 10 个高概率追问，按技术、业务、协作分组
5. 一版 90 秒口语回答
6. STAR 项目版回答
7. 容易被追问穿的风险点和补强建议
`,
  },
  {
    id: 'interview-questions',
    title: '面试问题',
    description: '基于简历、JD 或项目关键词预测这场面试最可能被问的问题。',
    actionLabel: '预测面试问题',
    loadingText: '正在预测高概率问题...',
    emptyTitle: '等待面试材料',
    emptyDescription: '填入 JD、简历或项目关键词后，生成这场面试的重点问题。',
    fields: [
      {
        id: 'role',
        label: '目标岗位',
        placeholder: '例如：中级前端工程师',
        type: 'input',
        required: true,
      },
      {
        id: 'jd',
        label: '岗位 JD',
        placeholder: '粘贴岗位要求、技术栈、业务方向。',
        type: 'textarea',
        rows: 7,
      },
      {
        id: 'resume',
        label: '简历 / 项目关键词',
        placeholder: '粘贴简历摘要、项目关键词、技术栈或你想让面试官关注的经历。',
        type: 'textarea',
        rows: 7,
      },
      {
        id: 'round',
        label: '面试轮次',
        placeholder: '例如：一面技术面 / 二面项目深挖 / HR 面',
        type: 'input',
      },
    ],
    outputGuide: `
请输出 Markdown，包含：
1. 这场面试的考察重点
2. 最可能被问的 20 个问题，标注优先级和原因
3. 项目深挖问题
4. 技术基础问题
5. 行为与协作问题
6. 每类问题给 1-2 句回答提示
7. 可以直接拿去练习的 10 问清单
`,
  },
  {
    id: 'review-analysis',
    title: '复盘解析',
    description: '把真实面试记录或个人复盘转成失分点、补强项和下一轮练习清单。',
    actionLabel: '解析复盘',
    loadingText: '正在解析面试复盘...',
    emptyTitle: '等待复盘内容',
    emptyDescription: '粘贴面试记录、问题列表或自己的复盘笔记，生成改进建议。',
    fields: [
      {
        id: 'role',
        label: '目标岗位',
        placeholder: '例如：前端工程师',
        type: 'input',
      },
      {
        id: 'transcript',
        label: '面试记录 / 复盘',
        placeholder: '粘贴面试问答、面经记录、自己觉得没答好的地方。',
        type: 'textarea',
        rows: 11,
        required: true,
      },
      {
        id: 'goal',
        label: '复盘目标',
        placeholder: '例如：想知道哪里失分、下次怎么答、哪些知识点要补',
        type: 'textarea',
        rows: 4,
      },
    ],
    outputGuide: `
请输出 Markdown，包含：
1. 本场表现概览
2. 明确失分点，按严重程度排序
3. 知识漏洞和表达问题分开列
4. 关键问题的改进回答示例
5. 需要补强的知识点
6. 下一轮模拟面试建议
7. 3 天补强行动清单
`,
  },
  {
    id: 'self-intro',
    title: '自我介绍',
    description: '生成 30 秒、1 分钟、2 分钟版本，并自然埋入项目追问入口。',
    actionLabel: '生成自我介绍',
    loadingText: '正在生成自我介绍...',
    emptyTitle: '等待个人材料',
    emptyDescription: '填入背景和项目亮点后，生成不同长度的中文面试自我介绍。',
    fields: [
      {
        id: 'role',
        label: '目标岗位',
        placeholder: '例如：前端工程师',
        type: 'input',
        required: true,
      },
      {
        id: 'background',
        label: '个人背景',
        placeholder: '年限、行业、技术栈、教育或工作背景。',
        type: 'textarea',
        rows: 5,
        required: true,
      },
      {
        id: 'projects',
        label: '项目亮点',
        placeholder: '列出 1-3 个最想在面试里展开的项目或成果。',
        type: 'textarea',
        rows: 6,
      },
      {
        id: 'tone',
        label: '风格偏好',
        placeholder: '例如：稳重、简洁、有技术深度、偏业务结果',
        type: 'input',
      },
    ],
    outputGuide: `
请输出 Markdown，包含：
1. 30 秒版本
2. 1 分钟版本
3. 2 分钟版本
4. 每个版本的适用场景
5. 3 个自然引导面试官追问项目的句子
6. 需要避免的表达
`,
  },
  {
    id: 'learning-plan',
    title: '学习计划',
    description: '根据薄弱点、面试日期和可投入时间，生成可执行的补强路径。',
    actionLabel: '生成学习计划',
    loadingText: '正在规划补强路径...',
    emptyTitle: '等待计划目标',
    emptyDescription: '填入目标、薄弱点和时间安排后，生成阶段化学习计划。',
    fields: [
      {
        id: 'target',
        label: '目标',
        placeholder: '例如：7 天后前端技术面，重点准备 React、项目深挖和手写题',
        type: 'textarea',
        rows: 5,
        required: true,
      },
      {
        id: 'weakness',
        label: '当前薄弱点',
        placeholder: '粘贴薄弱点、模拟面试结果、复盘结论或自己不稳的知识点。',
        type: 'textarea',
        rows: 7,
      },
      {
        id: 'time',
        label: '每天可投入时间',
        placeholder: '例如：工作日 1.5 小时，周末 4 小时',
        type: 'input',
      },
      {
        id: 'duration',
        label: '计划周期',
        placeholder: '例如：3 天 / 7 天 / 14 天',
        type: 'input',
      },
    ],
    outputGuide: `
请输出 Markdown，包含：
1. 计划目标和优先级
2. 每日安排，按天列出任务、产出物和验收标准
3. 每天的练习题方向
4. 复盘检查点
5. 面试前最后一天的准备清单
6. 如果时间不够，哪些任务可以砍掉
`,
  },
]

export const TOOL_MAP = new Map(TOOL_CONFIGS.map((tool) => [tool.id, tool]))

export function createInitialValues(tool: AIToolConfig): Record<string, string> {
  return Object.fromEntries(tool.fields.map((field) => [field.id, '']))
}

export function buildMessages(
  tool: AIToolConfig,
  values: Record<string, string>,
): ChatCompletionMessage[] {
  const fieldText = tool.fields
    .map((field) => {
      const value = values[field.id]?.trim()
      return `## ${field.label}\n${value || '未提供'}`
    })
    .join('\n\n')

  return [
    {
      role: 'system',
      content:
        '你是一个中文技术面试教练。回答要具体、可执行、适合真实面试复盘，不要写空泛套话。输出 Markdown。',
    },
    {
      role: 'user',
      content: `请完成工具「${tool.title}」。\n\n${fieldText}\n\n## 输出要求\n${tool.outputGuide.trim()}`,
    },
  ]
}
