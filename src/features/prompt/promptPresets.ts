import {
  Bot,
  BriefcaseBusiness,
  Building2,
  Code2,
  Database,
  ListOrdered,
  type LucideIcon,
} from 'lucide-react'

// Built-in frontend modules — used in frontend preset prompts
export const BUILTIN_MODULE_VALUES = [
  'JS基础',
  'React',
  'Vue',
  '性能优化',
  '网络',
  'CSS',
  'TypeScript',
  '手写题',
  '项目深挖',
]

// Built-in AI Agent modules — used in AI Agent preset prompts
export const AI_AGENT_MODULE_VALUES = [
  'LLM基础',
  'Prompt工程',
  'Agent架构',
  'RAG与知识库',
  '工具调用与工作流',
  '评测与线上优化',
]

// All suggestions shown in the CustomBuilder dropdown (builtin + common custom)
export const MODULE_SUGGESTIONS = [
  ...BUILTIN_MODULE_VALUES,
  ...AI_AGENT_MODULE_VALUES,
  'Golang',
  'Java',
  'Python',
  'Rust',
  'Node.js',
  '数据库',
  '算法',
  '系统设计',
  'DevOps',
  'Android',
  'iOS',
]

export interface PromptPreset {
  id: string
  icon: LucideIcon
  title: string
  description: string
  prompt: string
}

/**
 * Build a prompt that asks the AI to output Markdown instead of JSON.
 * Markdown is far more natural for LLMs and avoids JSON escaping errors.
 * The import page parses it with mdToQuestions().
 */
export function buildBasePrompt(
  module: string,
  count: number,
  difficulty: string,
  extra = '',
): string {
  return `你是一位资深面试官，精通 ${module} 技术体系。请生成 ${count} 道关于「${module}」的面试题。

## 难度分布
${difficulty}

## 质量要求
- 每道题必须是**真实面试中出现过的考点**，不要编造生僻问题
- 答案要**完整、准确、有深度**，覆盖核心知识点、边界情况和最佳实践
- 答案自由使用 Markdown：代码块、表格、列表、小标题随意用，写得清晰即可
- 代码示例要**可运行、注释清晰**
- 难度梯度合理：初级考基础概念，中级考原理与应用，高级考底层实现与优化

## 内容覆盖
${extra || `覆盖 ${module} 模块的核心知识点，包括基础概念、实际应用、常见陷阱和最佳实践。`}

## 输出格式

**每道题用 \`---\` 分隔，严格按下方模板输出，不要有任何额外说明文字。**

---
## <题目内容，一句话>
**模块**: ${module}
**难度**: 初级 | 中级 | 高级  ← 三选一
**标签**: 标签1, 标签2, 标签3
**来源**: 高频  ← 可选，高频考点填"高频"，大厂题填公司名，否则省略此行

<答案正文，完整 Markdown，可包含代码块、列表、表格等>

---
## <下一题题目>
**模块**: ${module}
...

---

## 示例（仅供格式参考，请生成新内容）

---
## 请解释 JavaScript 中的事件循环机制
**模块**: JS基础
**难度**: 中级
**标签**: 事件循环, 宏任务, 微任务
**来源**: 高频

## 核心概念

JavaScript 是单线程语言，事件循环（Event Loop）是其处理异步操作的核心机制。

### 执行顺序

1. 执行同步代码（调用栈）
2. 清空微任务队列（Promise.then、queueMicrotask）
3. 执行一个宏任务（setTimeout、setInterval、I/O）
4. 重复步骤 2-3

\`\`\`js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// 输出：1 4 3 2
\`\`\`

---

现在请生成 ${count} 道题目：`
}

export function buildAIAgentPrompt(
  modules: string[],
  defaultModule = 'LLM基础',
  count = 20,
): string {
  return [
    '你是一位资深 AI Agent 面试官，熟悉大模型应用开发、Prompt Engineering、RAG、Tool Calling、Workflow Orchestration、Agent Evaluation 以及 AI Agent 落地工程实践。请为“AI Agent 岗位”生成高质量中文面试题。',
    '',
    '## 目标岗位',
    '面向以下候选人：',
    '- AI Agent 工程师',
    '- LLM Application Engineer',
    '- AI 产品研发工程师',
    '- RAG / Agent 平台工程师',
    '- 具备应用层大模型落地能力的全栈 / 后端 / AI 工程师',
    '',
    '## 工作方式',
    '- 由于题库规模较大，请**每次只生成一个模块**',
    '- 先输出 **Markdown**',
    '- 等我确认后，我会把输出导入题库',
    '- 不要一次性生成多个模块，避免内容过长和格式中断',
    '',
    '## 本次可选模块',
    ...modules.map((m) => `- ${m}`),
    '',
    '## 默认任务',
    `如果我没有额外指定，就先从 **${defaultModule}** 模块开始，生成 ${count} 道题。`,
    '',
    '## 难度分布',
    '- 初级：25%',
    '- 中级：50%',
    '- 高级：25%',
    '',
    '## 总体要求',
    '- 题目必须贴近真实面试，不要编造空泛概念题',
    '- 优先考察“理解 + 设计 + 实战 + 排障 + trade-off”',
    '- 不要只问定义，尽量问：',
    '  - 为什么这样设计',
    '  - 什么时候失效',
    '  - 怎么优化',
    '  - 如何定位问题',
    '  - 如何做工程化权衡',
    '- 答案必须完整、准确、结构化，适合面试复习',
    '- 如果有代码示例，优先使用 Python 或 TypeScript',
    '- 不要输出 JSON，只输出 Markdown',
    '',
    '## 各模块考察重点',
    '',
    '### 1. LLM基础',
    '- Transformer / token / context window / temperature / top_p / system prompt',
    '- 幻觉产生原因',
    '- 指令跟随与推理能力差异',
    '- 长上下文的局限',
    '- 模型选型与成本/延迟权衡',
    '',
    '### 2. Prompt工程',
    '- system / user / tool prompt 的职责边界',
    '- prompt 模板设计',
    '- few-shot / structured output / self-consistency',
    '- prompt 注入与越权',
    '- 提示词调优方法论',
    '',
    '### 3. Agent架构',
    '- 单 Agent vs 多 Agent',
    '- Planning / Memory / Reflection / Routing',
    '- ReAct、Plan-and-Execute、Supervisor 等模式',
    '- 状态管理、可恢复性、幂等性',
    '- Agent 失败场景与兜底策略',
    '',
    '### 4. RAG与知识库',
    '- chunk 切分策略',
    '- embedding 与 rerank',
    '- hybrid search',
    '- query rewrite / multi-query / retrieval routing',
    '- 召回率、准确率、上下文污染、知识过期',
    '',
    '### 5. 工具调用与工作流',
    '- function calling / tool calling 设计',
    '- 参数校验、权限控制、超时重试',
    '- workflow 与 agent 的边界',
    '- 外部 API、数据库、搜索引擎、代码执行沙箱的接入',
    '- 可观测性、日志、审计链路',
    '',
    '### 6. 评测与线上优化',
    '- 离线评测与在线评测',
    '- task success rate / latency / token cost / hallucination rate / citation accuracy',
    '- A/B 测试',
    '- failure case 分类',
    '- guardrail、安全、风控、回滚机制',
    '',
    '## 输出格式要求',
    '你必须严格按以下 Markdown 格式输出，每道题之间用三个短横线（---）分隔，不要输出任何额外说明：',
    '',
    '---',
    '## <题目内容，一句话>',
    '**模块**: <从上述 6 个模块中选择 1 个>',
    '**难度**: 初级 | 中级 | 高级',
    '**标签**: 标签1, 标签2, 标签3',
    '**来源**: 高频',
    '',
    '<答案正文，使用完整 Markdown，建议包含：',
    '1. 一句话核心结论',
    '2. 关键原理 / 设计思路',
    '3. 工程实践或示例',
    '4. 常见误区 / 追问点',
    '>',
    '',
    '---',
    '',
    `现在请仅生成一个模块的题目；如果没有额外指定模块，就从 **${defaultModule}** 开始生成 ${count} 道题。`,
  ].join('\n')
}

export const PRESETS: PromptPreset[] = [
  {
    id: 'full',
    icon: Database,
    title: '全量题库生成（推荐）',
    description: '分模块批量生成，覆盖所有方向',
    prompt: `你是一位资深面试官，精通前端技术体系。请为面试刷题系统生成完整题库。

## 任务

分 8 个模块，每个模块生成 60-75 道题，总计约 500-600 道题。

## 模块列表
${BUILTIN_MODULE_VALUES.map((m) => `- ${m}`).join('\n')}

## 难度分布（每个模块内）
- 初级（难度：初级）：占 30%，约 18-22 道
- 中级（难度：中级）：占 50%，约 30-38 道
- 高级（难度：高级）：占 20%，约 12-15 道

## 质量要求
1. **真实性**：所有题目必须是真实面试中出现过的考点
2. **深度**：答案完整、准确，覆盖核心知识点、边界情况和最佳实践
3. **代码**：中高级题目必须包含可运行的代码示例（Markdown 代码块）
4. **多样性**：避免同类题目重复，覆盖每个模块的不同子主题
5. **高频标注**：高频考点的来源填"高频"，大厂题填公司名

## 输出格式

**每道题用 \`---\` 分隔，严格按模板输出，不要有任何额外说明。**

---
## <题目内容>
**模块**: <模块名，从上方列表选>
**难度**: 初级 | 中级 | 高级
**标签**: 标签1, 标签2
**来源**: 高频  ← 可选

<完整答案，自由使用 Markdown：代码块、列表、小标题随意用>

---

由于数量较多，请分模块分批次生成，每次专注一个模块。现在从 **JS基础** 模块开始生成 65 道题：`,
  },
  {
    id: 'module',
    icon: ListOrdered,
    title: '单模块深度生成',
    description: '针对某一模块生成 60-80 道高质量题目',
    prompt: buildBasePrompt(
      'JS基础',
      70,
      '- 初级：20 道，覆盖基础概念\n- 中级：35 道，覆盖原理与应用\n- 高级：15 道，覆盖底层实现与优化',
      `覆盖以下子主题：
- 变量声明（var/let/const）、作用域、变量提升、TDZ
- 数据类型、类型检测、类型转换（隐式与显式）
- 原型与原型链、继承（原型继承、class 继承）
- this 绑定规则（默认、隐式、显式、new、箭头函数）
- 闭包（原理、应用场景、内存泄漏）
- 事件循环（宏任务、微任务、执行栈）
- Promise（状态、链式调用、错误处理）
- async/await（语法糖、错误处理、并发）
- ES6+（解构、扩展运算符、迭代器、生成器、Symbol、Proxy、Reflect）
- 模块化（CommonJS vs ESM）
- 内存管理（垃圾回收、内存泄漏场景）
- 正则表达式常见用法`,
    ),
  },
  {
    id: 'project',
    icon: BriefcaseBusiness,
    title: '项目专题生成',
    description: '根据你的项目技术栈，生成针对性的项目深挖题',
    prompt: `你是一位资深面试官。我将描述我参与的项目，请根据项目技术栈和架构，生成 30 道「项目深挖」类型的面试题。

## 我的项目描述

[在此粘贴你的项目介绍，例如：]
> 参与开发了一个大型电商平台，前端使用 React 18 + TypeScript + Vite，状态管理使用 Zustand。
> 核心功能：商品列表虚拟滚动、购物车实时同步、订单支付流程、后台管理系统。
> 遇到的挑战：首页白屏时间过长（后来通过 SSR 优化到 1.2s）、大量 API 并发的竞态条件问题。

## 生成要求

1. **紧扣项目**：题目必须与项目技术栈强相关
2. **深度追问**：模拟"为什么这样做""遇到什么问题""如何解决"的思路
3. **难度分布**：中级 10 道 / 高级 15 道 / 挑战 5 道
4. **答案要点**：提供面试时的回答要点和亮点

## 输出格式

**每道题用 \`---\` 分隔，严格按模板输出：**

---
## <题目内容>
**模块**: 项目深挖
**难度**: 中级 | 高级
**标签**: 标签1, 标签2
**来源**: 项目深挖

<完整答案>

---

请根据我上面提供的项目信息生成题目：`,
  },
  {
    id: 'company',
    icon: Building2,
    title: '大厂真题还原',
    description: '还原字节、阿里、腾讯等大厂的高频面试题',
    prompt: `你是一位曾在多家大型互联网公司参与面试的资深工程师。请还原真实面试题，生成 60 道高质量面试题。

## 覆盖公司
- 字节跳动（15道）：算法思维、JS 底层原理、大量手写题
- 阿里巴巴/蚂蚁（12道）：工程化、架构设计、稳定性
- 腾讯（12道）：基础扎实、TCP/IP 网络
- 美团（10道）：业务场景、性能优化
- 滴滴（11道）：移动端、跨端开发

## 要求
- 来源字段填写公司名，如"字节"、"阿里"、"腾讯"
- 难度以中高级为主（中级 40%，高级 60%）
- 均匀分布在：JS基础、React、性能优化、网络、CSS、TypeScript、手写题、项目深挖

## 输出格式

**每道题用 \`---\` 分隔，严格按模板输出：**

---
## <题目内容>
**模块**: <模块名>
**难度**: 中级 | 高级
**标签**: 标签1, 标签2
**来源**: 字节 | 阿里 | 腾讯 | 美团 | 滴滴

<完整答案>

---

开始生成：`,
  },
  {
    id: 'algorithm',
    icon: Code2,
    title: '手写题专项',
    description: '生成 50 道高质量手写代码题，含详细实现',
    prompt: buildBasePrompt(
      '手写题',
      50,
      '- 初级：10 道，基础 API 实现\n- 中级：25 道，经典工具函数\n- 高级：15 道，复杂数据结构与设计模式',
      `覆盖以下手写题类型：

**工具函数（15道）**
- 防抖（debounce）、节流（throttle）
- 深拷贝（deepClone，处理循环引用、特殊类型）
- 深比较（isEqual）
- 数组去重、扁平化（flat）
- 柯里化（curry）、函数组合（compose/pipe）
- 睡眠函数（sleep）、重试函数（retry）

**原生 API 实现（15道）**
- call、apply、bind
- new 操作符
- instanceof
- Object.create、Object.assign
- Promise（完整实现，含 all/race/allSettled/any）
- Array 方法（map、filter、reduce、flat、forEach）
- JSON.stringify / JSON.parse

**数据结构与算法（10道）**
- LRU 缓存
- 发布订阅（EventEmitter）
- 观察者模式
- 链表操作
- 二叉树遍历

**框架相关（10道）**
- 虚拟 DOM 和 Diff 算法（简版）
- 简版 React（支持函数组件 + useState）
- 简版 Vue 响应式（ref/reactive）
- 前端路由（hash/history 模式）
- 简版 Vuex/Redux

每道手写题的答案必须包含：
1. 完整可运行的代码实现
2. 关键逻辑注释
3. 测试用例
4. 边界情况处理说明`,
    ),
  },
  {
    id: 'ai-agent',
    icon: Bot,
    title: 'AI Agent 岗位题库生成',
    description: '覆盖 LLM、Prompt、RAG、工具调用等方向，适合分模块批量生成',
    prompt: buildAIAgentPrompt(AI_AGENT_MODULE_VALUES),
  },
]

// ─── Custom builder ─────────────────────────────────────────────────────────────

export type DifficultyMix = 'standard' | 'beginner' | 'advanced' | 'senior'

export const DIFFICULTY_MIXES: {
  value: DifficultyMix
  label: string
  ratio: [number, number, number]
}[] = [
  { value: 'standard', label: '标准', ratio: [0.3, 0.5, 0.2] },
  { value: 'beginner', label: '入门', ratio: [0.6, 0.35, 0.05] },
  { value: 'advanced', label: '进阶', ratio: [0.1, 0.4, 0.5] },
  { value: 'senior', label: '中高级', ratio: [0, 0.6, 0.4] },
]

/** Split `count` into 初级/中级/高级 counts that always add up to `count`. */
export function difficultyCounts(mix: DifficultyMix, count: number): [number, number, number] {
  const ratio = DIFFICULTY_MIXES.find((m) => m.value === mix)?.ratio ?? DIFFICULTY_MIXES[0].ratio
  const easy = Math.round(count * ratio[0])
  const hard = Math.round(count * ratio[2])
  return [easy, Math.max(0, count - easy - hard), hard]
}

export function buildCustomPrompt(input: {
  module: string
  count: number
  mix: DifficultyMix
  extra: string
}): string {
  const [easy, mid, hard] = difficultyCounts(input.mix, input.count)
  const detail = [`- 初级：${easy} 道`, `- 中级：${mid} 道`, `- 高级：${hard} 道`].join('\n')
  return buildBasePrompt(input.module.trim() || 'JS基础', input.count, detail, input.extra.trim())
}
