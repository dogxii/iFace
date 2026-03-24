// Built-in modules across all built-in categories (used for icon/color mapping & default filter UI)
export const BUILTIN_MODULES = [
  // 前端
  'JS基础',
  'React',
  '性能优化',
  '网络',
  'CSS',
  'TypeScript',
  '手写题',
  '项目深挖',
  // Golang
  'Go基础',
  '并发编程',
  '内存与GC',
  '工程化',
  'Web开发',
  // AI Agent
  'LLM基础',
  'Prompt工程',
  'Agent架构',
  'RAG与知识库',
  '工具调用与工作流',
  '评测与线上优化',
] as const

export type BuiltinModule = (typeof BUILTIN_MODULES)[number]

/** Maps each built-in module to its display category label */
export const BUILTIN_MODULE_CATEGORY: Record<string, string> = {
  // 前端
  JS基础: '前端',
  React: '前端',
  性能优化: '前端',
  网络: '前端',
  CSS: '前端',
  TypeScript: '前端',
  手写题: '前端',
  项目深挖: '前端',
  // Golang
  Go基础: 'Go',
  并发编程: 'Go',
  内存与GC: 'Go',
  工程化: 'Go',
  Web开发: 'Go',
  // AI Agent
  LLM基础: 'AI Agent',
  Prompt工程: 'AI Agent',
  Agent架构: 'AI Agent',
  RAG与知识库: 'AI Agent',
  工具调用与工作流: 'AI Agent',
  评测与线上优化: 'AI Agent',
}

// Module is now open — any string is valid, enabling custom topics like Golang, Java, etc.
export type Module = string

export type Difficulty = 1 | 2 | 3

export type StudyStatus = 'unlearned' | 'mastered' | 'review'

export interface Question {
  id: string
  module: Module
  difficulty: Difficulty
  question: string
  answer: string
  tags: string[]
  source?: string
}

export interface StudyRecord {
  questionId: string
  status: StudyStatus
  lastUpdated: number // timestamp
  reviewCount: number
}

export type StudyRecordMap = Record<string, StudyRecord>

export interface FilterState {
  modules: Module[]
  difficulties: Difficulty[]
  statuses: StudyStatus[]
  search: string
}

export interface PracticeSession {
  module: Module | null
  difficulty: Difficulty | null
  questionIds: string[]
  currentIndex: number
}

// Static built-in list (for sidebar defaults when no custom modules are imported)
export const MODULE_LIST: Module[] = [...BUILTIN_MODULES]

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: '初级',
  2: '中级',
  3: '高级',
}

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  1: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  2: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  3: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
}

// Inline style versions — safe for dynamic rendering (no Tailwind scan needed)
export const DIFFICULTY_STYLES: Record<
  Difficulty,
  { color: string; background: string; borderColor: string }
> = {
  1: { color: '#10b981', background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' },
  2: { color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' },
  3: { color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' },
}

export const STATUS_LABELS: Record<StudyStatus, string> = {
  unlearned: '未学习',
  mastered: '已掌握',
  review: '待复习',
}

export const STATUS_COLORS: Record<StudyStatus, string> = {
  unlearned: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  mastered: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  review: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
}

// Inline style versions — safe for dynamic rendering
export const STATUS_STYLES: Record<
  StudyStatus,
  { color: string; background: string; borderColor: string }
> = {
  unlearned: {
    color: '#a1a1aa',
    background: 'rgba(113,113,122,0.1)',
    borderColor: 'rgba(113,113,122,0.2)',
  },
  mastered: {
    color: '#10b981',
    background: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.2)',
  },
  review: {
    color: '#f59e0b',
    background: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.2)',
  },
}

export const MODULE_ICONS: Record<string, string> = {
  JS基础: '⚡',
  React: '⚛️',
  性能优化: '🚀',
  网络: '🌐',
  CSS: '🎨',
  TypeScript: '🔷',
  手写题: '✍️',
  项目深挖: '🔍',
  LLM基础: '🧠',
  Prompt工程: '🪄',
  Agent架构: '🤖',
  RAG与知识库: '📚',
  工具调用与工作流: '🛠️',
  评测与线上优化: '📈',
  // Common custom modules
  Golang: '🐹',
  Java: '☕',
  Python: '🐍',
  Rust: '🦀',
  'Node.js': '🟢',
  数据库: '🗄️',
  算法: '📐',
  系统设计: '🏗️',
  DevOps: '⚙️',
  Android: '🤖',
  iOS: '🍎',
}

// Fallback icon for any unknown module
export function getModuleIcon(module: string): string {
  return MODULE_ICONS[module] ?? '📚'
}

export const MODULE_COLORS: Record<string, string> = {
  JS基础: 'from-yellow-400 to-orange-500',
  React: 'from-cyan-400 to-blue-500',
  性能优化: 'from-green-400 to-emerald-500',
  网络: 'from-violet-400 to-purple-500',
  CSS: 'from-pink-400 to-rose-500',
  TypeScript: 'from-blue-400 to-indigo-500',
  手写题: 'from-amber-400 to-yellow-500',
  项目深挖: 'from-teal-400 to-cyan-500',
  LLM基础: 'from-fuchsia-400 to-violet-500',
  Prompt工程: 'from-pink-400 to-fuchsia-500',
  Agent架构: 'from-sky-400 to-indigo-500',
  RAG与知识库: 'from-emerald-400 to-teal-500',
  工具调用与工作流: 'from-amber-400 to-orange-500',
  评测与线上优化: 'from-rose-400 to-red-500',
  Golang: 'from-sky-400 to-cyan-500',
  Java: 'from-orange-400 to-red-500',
  Python: 'from-blue-400 to-yellow-500',
  Rust: 'from-orange-500 to-red-600',
  'Node.js': 'from-green-400 to-lime-500',
  数据库: 'from-indigo-400 to-blue-600',
  算法: 'from-purple-400 to-fuchsia-500',
  系统设计: 'from-slate-400 to-gray-600',
  DevOps: 'from-teal-400 to-emerald-500',
}

// Stable hash-based color palette for unknown modules
const _paletteColors = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#14b8a6',
  '#f97316',
  '#84cc16',
  '#06b6d4',
]

export function getModuleColor(module: string): string {
  let hash = 0
  for (let i = 0; i < module.length; i++) {
    hash = (hash * 31 + module.charCodeAt(i)) >>> 0
  }
  return _paletteColors[hash % _paletteColors.length]
}
