/** Categorical colours for question modules, backed by the `hue-*` design tokens. */
export const MODULE_HUES = [
  'blue',
  'violet',
  'pink',
  'rose',
  'orange',
  'amber',
  'green',
  'teal',
  'cyan',
] as const

export type ModuleHue = (typeof MODULE_HUES)[number]

/** Built-in modules get hand-picked hues so neighbours in a category stay distinguishable. */
const BUILTIN_HUES: Record<string, ModuleHue> = {
  // Frontend
  JS基础: 'amber',
  React: 'cyan',
  Vue: 'green',
  CSS: 'pink',
  TypeScript: 'blue',
  性能优化: 'orange',
  网络: 'teal',
  手写题: 'violet',
  项目深挖: 'rose',
  // Golang
  Go基础: 'cyan',
  并发编程: 'violet',
  工程化: 'orange',
  内存与GC: 'green',
  Web开发: 'blue',
  // Java
  Java基础: 'orange',
  Java并发: 'violet',
  JVM: 'amber',
  MySQL: 'blue',
  计算机网络: 'teal',
  Redis: 'rose',
  Spring框架: 'green',
  // AI Agent
  LLM基础: 'violet',
  Prompt工程: 'pink',
  Agent架构: 'blue',
  RAG与知识库: 'teal',
  工具调用与工作流: 'orange',
  评测与线上优化: 'green',
  AI工程化: 'cyan',
  AI应用实践: 'amber',
}

/** Stable hue for any module name; custom modules are hashed onto the palette. */
export function moduleHue(module: string): ModuleHue {
  const builtin = BUILTIN_HUES[module]
  if (builtin) return builtin
  let hash = 0
  for (let i = 0; i < module.length; i++) hash = (hash * 31 + module.charCodeAt(i)) >>> 0
  return MODULE_HUES[hash % MODULE_HUES.length]
}
