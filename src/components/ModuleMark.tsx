import {
  Atom,
  Bot,
  Braces,
  Brain,
  ChartLine,
  Coffee,
  Cog,
  Cpu,
  Database,
  DatabaseZap,
  FileCode,
  FolderSearch,
  Gauge,
  Globe,
  Leaf,
  Library,
  type LucideIcon,
  MemoryStick,
  MessageSquareText,
  Network,
  Palette,
  PenLine,
  Server,
  Sparkles,
  Split,
  Terminal,
  Triangle,
  Workflow,
  Wrench,
} from 'lucide-react'
import { type ModuleHue, moduleHue } from '@/lib/moduleHue'
import { cn } from '@/ui'

const ICONS: Record<string, LucideIcon> = {
  JS基础: Braces,
  React: Atom,
  Vue: Triangle,
  CSS: Palette,
  TypeScript: FileCode,
  性能优化: Gauge,
  网络: Globe,
  手写题: PenLine,
  项目深挖: FolderSearch,
  Go基础: Terminal,
  并发编程: Split,
  工程化: Wrench,
  内存与GC: MemoryStick,
  Web开发: Server,
  Java基础: Coffee,
  Java并发: Split,
  JVM: Cpu,
  MySQL: Database,
  计算机网络: Network,
  Redis: DatabaseZap,
  Spring框架: Leaf,
  LLM基础: Brain,
  Prompt工程: MessageSquareText,
  Agent架构: Bot,
  RAG与知识库: Library,
  工具调用与工作流: Workflow,
  评测与线上优化: ChartLine,
  AI工程化: Cog,
  AI应用实践: Sparkles,
}

/** Full class strings so Tailwind can see them. */
export const HUE_CLASSES: Record<ModuleHue, { mark: string; fill: string; stroke: string }> = {
  blue: {
    mark: 'bg-hue-blue-subtle text-hue-blue',
    fill: 'bg-hue-blue',
    stroke: 'stroke-hue-blue',
  },
  violet: {
    mark: 'bg-hue-violet-subtle text-hue-violet',
    fill: 'bg-hue-violet',
    stroke: 'stroke-hue-violet',
  },
  pink: {
    mark: 'bg-hue-pink-subtle text-hue-pink',
    fill: 'bg-hue-pink',
    stroke: 'stroke-hue-pink',
  },
  rose: {
    mark: 'bg-hue-rose-subtle text-hue-rose',
    fill: 'bg-hue-rose',
    stroke: 'stroke-hue-rose',
  },
  orange: {
    mark: 'bg-hue-orange-subtle text-hue-orange',
    fill: 'bg-hue-orange',
    stroke: 'stroke-hue-orange',
  },
  amber: {
    mark: 'bg-hue-amber-subtle text-hue-amber',
    fill: 'bg-hue-amber',
    stroke: 'stroke-hue-amber',
  },
  green: {
    mark: 'bg-hue-green-subtle text-hue-green',
    fill: 'bg-hue-green',
    stroke: 'stroke-hue-green',
  },
  teal: {
    mark: 'bg-hue-teal-subtle text-hue-teal',
    fill: 'bg-hue-teal',
    stroke: 'stroke-hue-teal',
  },
  cyan: {
    mark: 'bg-hue-cyan-subtle text-hue-cyan',
    fill: 'bg-hue-cyan',
    stroke: 'stroke-hue-cyan',
  },
}

export function moduleHueClasses(module: string) {
  return HUE_CLASSES[moduleHue(module)]
}

const SIZES = {
  sm: 'size-4 rounded-[4px] text-[9px] [&_svg]:size-2.5',
  md: 'size-5 rounded-[5px] text-2xs [&_svg]:size-3',
  lg: 'size-8 rounded-lg text-sm [&_svg]:size-4',
} as const

/**
 * A module's identity: a tinted square with its icon (or first letter for custom modules).
 * Decorative — always render the module name next to it.
 */
export function ModuleMark({
  module,
  size = 'md',
  className,
}: {
  module: string
  size?: keyof typeof SIZES
  className?: string
}) {
  const Icon = ICONS[module]
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center font-semibold',
        SIZES[size],
        moduleHueClasses(module).mark,
        className,
      )}
    >
      {Icon ? (
        <Icon strokeWidth={2.25} className={cn(Icon === Triangle && 'rotate-180')} />
      ) : (
        Array.from(module)[0]?.toUpperCase()
      )}
    </span>
  )
}

/** A small dot in the module's hue, for dense rows. */
export function ModuleDot({ module, className }: { module: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-1.5 shrink-0 rounded-full',
        moduleHueClasses(module).fill,
        className,
      )}
    />
  )
}
