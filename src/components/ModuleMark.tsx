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
  Shield,
  Smartphone,
  Sparkles,
  Split,
  Terminal,
  Triangle,
  Workflow,
  Wrench,
} from 'lucide-react'
import type { BankModuleIcon } from '@/data/bank/schema'
import { type ModuleHue, moduleHue } from '@/lib/moduleHue'
import { type LibraryModule, useLibraryState } from '@/store/useLibraryStore'
import { cn } from '@/ui'

/** Lucide components for the icon names a bank may request (`BANK_MODULE_ICONS`). */
const ICONS: Record<BankModuleIcon, LucideIcon> = {
  atom: Atom,
  bot: Bot,
  braces: Braces,
  brain: Brain,
  'chart-line': ChartLine,
  coffee: Coffee,
  cog: Cog,
  cpu: Cpu,
  database: Database,
  'database-zap': DatabaseZap,
  'file-code': FileCode,
  'folder-search': FolderSearch,
  gauge: Gauge,
  globe: Globe,
  leaf: Leaf,
  library: Library,
  'memory-stick': MemoryStick,
  'message-square-text': MessageSquareText,
  network: Network,
  palette: Palette,
  'pen-line': PenLine,
  server: Server,
  shield: Shield,
  smartphone: Smartphone,
  sparkles: Sparkles,
  split: Split,
  terminal: Terminal,
  triangle: Triangle,
  workflow: Workflow,
  wrench: Wrench,
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

interface ModuleLook {
  name: string
  hue: ModuleHue
  Icon?: LucideIcon
}

function lookFor(mod: LibraryModule | undefined, moduleKey: string): ModuleLook {
  const name = mod?.name ?? moduleKey.slice(moduleKey.indexOf('/') + 1)
  return {
    name,
    hue: moduleHue(name, mod?.color),
    Icon: mod?.icon ? ICONS[mod.icon] : undefined,
  }
}

/** Icon and hue of an installed module, by module key. */
export function useModuleLook(moduleKey: string): ModuleLook {
  const mod = useLibraryState((state) => state.modules.get(moduleKey))
  return lookFor(mod, moduleKey)
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
  moduleKey,
  size = 'md',
  className,
}: {
  moduleKey: string
  size?: keyof typeof SIZES
  className?: string
}) {
  const { name, hue, Icon } = useModuleLook(moduleKey)
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center font-semibold',
        SIZES[size],
        HUE_CLASSES[hue].mark,
        className,
      )}
    >
      {Icon ? (
        <Icon strokeWidth={2.25} className={cn(Icon === Triangle && 'rotate-180')} />
      ) : (
        Array.from(name)[0]?.toUpperCase()
      )}
    </span>
  )
}

/** A small dot in the module's hue, for dense rows. */
export function ModuleDot({ moduleKey, className }: { moduleKey: string; className?: string }) {
  const { hue } = useModuleLook(moduleKey)
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-1.5 shrink-0 rounded-full',
        HUE_CLASSES[hue].fill,
        className,
      )}
    />
  )
}
