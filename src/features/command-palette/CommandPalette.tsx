import {
  ArrowRight,
  CornerDownLeft,
  FileQuestion,
  type LucideIcon,
  Moon,
  Search,
  Settings,
  Sun,
} from 'lucide-react'
import { Dialog as D } from 'radix-ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isNavItemActive, PRIMARY_NAV, TOOL_NAV } from '@/app/navigation'
import { useQuestions } from '@/hooks/useQuestions'
import { type CategoryMap, DEFAULT_CATEGORY_MAP, getCategoryMap } from '@/lib/db'
import { filterVisibleQuestions, getHiddenModules } from '@/lib/questionVisibility'
import { useStudyState } from '@/store/useStudyStore'
import { type SettingsTab, useUIState } from '@/store/useUIStore'
import { cn, Kbd } from '@/ui'
import { filterCommands, type PaletteCommand, searchQuestions } from './paletteSearch'

interface PaletteItem extends PaletteCommand {
  group: '题目' | '跳转' | '操作'
  icon: LucideIcon
  hint?: string
  run: () => void
}

const SETTINGS_COMMANDS: { tab: SettingsTab; label: string; keywords: string[] }[] = [
  { tab: 'study', label: '设置：学习偏好', keywords: ['settings', '每日目标', '题库展示'] },
  { tab: 'ai', label: '设置：AI 助手', keywords: ['settings', 'api key', '模型'] },
  { tab: 'data', label: '设置：数据管理', keywords: ['settings', '导出', '备份', 'export'] },
  { tab: 'sync', label: '设置：云同步', keywords: ['settings', 'github', 'gist'] },
]

export function CommandPalette() {
  const open = useUIState((s) => s.paletteOpen)
  const setOpen = useUIState((s) => s.setPaletteOpen)

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-overlay/60 data-[state=open]:animate-fade-in" />
        <D.Content
          aria-describedby={undefined}
          className="fixed top-[12dvh] left-1/2 z-50 flex max-h-[min(560px,76dvh)] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-elevated shadow-popover outline-none data-[state=open]:animate-scale-in"
        >
          <D.Title className="sr-only">命令面板</D.Title>
          {open ? <PaletteBody onClose={() => setOpen(false)} /> : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const openSettings = useUIState((s) => s.openSettings)
  const theme = useStudyState((s) => s.theme)
  const toggleTheme = useStudyState((s) => s.toggleTheme)
  const hiddenCategories = useStudyState((s) => s.hiddenCategories)
  const { allQuestions } = useQuestions()
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({ ...DEFAULT_CATEGORY_MAP })
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getCategoryMap().then(setCategoryMap)
  }, [])

  const visibleQuestions = useMemo(
    () => filterVisibleQuestions(allQuestions, getHiddenModules(categoryMap, hiddenCategories)),
    [allQuestions, categoryMap, hiddenCategories],
  )

  const items = useMemo<PaletteItem[]>(() => {
    const go = (path: string) => () => {
      onClose()
      navigate(path)
    }
    const navCommands: PaletteItem[] = [...PRIMARY_NAV, ...TOOL_NAV].map((item) => ({
      id: `nav:${item.path}`,
      group: '跳转',
      label: item.label,
      keywords: [item.path],
      icon: item.icon,
      hint: isNavItemActive(item, window.location.pathname) ? '当前页' : undefined,
      run: go(item.path),
    }))
    const actions: PaletteItem[] = [
      {
        id: 'theme',
        group: '操作',
        label: theme === 'dark' ? '切换到浅色主题' : '切换到暗色主题',
        keywords: ['theme', 'dark', 'light', '主题'],
        icon: theme === 'dark' ? Sun : Moon,
        run: () => {
          toggleTheme()
          onClose()
        },
      },
      ...SETTINGS_COMMANDS.map<PaletteItem>((cmd) => ({
        id: `settings:${cmd.tab}`,
        group: '操作',
        label: cmd.label,
        keywords: cmd.keywords,
        icon: Settings,
        run: () => {
          onClose()
          openSettings(cmd.tab)
        },
      })),
    ]

    const questionItems: PaletteItem[] = searchQuestions(visibleQuestions, query, 8).map((q) => ({
      id: `q:${q.id}`,
      group: '题目',
      label: q.question,
      icon: FileQuestion,
      hint: q.module,
      run: go(`/questions/${q.id}`),
    }))

    if (!query.trim()) return [...navCommands, ...actions]
    return [
      ...questionItems,
      ...filterCommands(navCommands, query),
      ...filterCommands(actions, query),
    ]
  }, [navigate, onClose, openSettings, query, theme, toggleTheme, visibleQuestions])

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (items.length === 0 ? 0 : (i + 1) % items.length))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (items.length === 0 ? 0 : (i - 1 + items.length) % items.length))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      items[active]?.run()
    }
  }

  let lastGroup: string | null = null

  return (
    <>
      <div className="flex h-13 shrink-0 items-center gap-2.5 border-b border-line px-4">
        <Search className="size-4 shrink-0 text-fg-subtle" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={handleKeyDown}
          placeholder="搜索题目，或输入命令…"
          aria-label="搜索题目或命令"
          role="combobox"
          aria-expanded
          aria-controls="command-palette-list"
          aria-activedescendant={items[active] ? `palette-${items[active].id}` : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-md text-fg outline-none placeholder:text-fg-subtle max-sm:text-[16px]"
        />
        <Kbd className="max-sm:hidden">Esc</Kbd>
      </div>

      <div
        ref={listRef}
        id="command-palette-list"
        role="listbox"
        aria-label="结果"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
      >
        {items.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-fg-subtle">
            没有找到「{query.trim()}」相关的题目或命令
          </p>
        ) : (
          items.map((item, index) => {
            const header = item.group !== lastGroup ? item.group : null
            lastGroup = item.group
            const selected = index === active
            return (
              <div key={item.id}>
                {header ? (
                  <p className="px-2.5 pt-2.5 pb-1 text-2xs font-medium text-fg-subtle">{header}</p>
                ) : null}
                <div
                  id={`palette-${item.id}`}
                  role="option"
                  tabIndex={-1}
                  aria-selected={selected}
                  data-index={index}
                  onMouseMove={() => setActive(index)}
                  onClick={item.run}
                  className={cn(
                    'flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm',
                    selected ? 'bg-muted text-fg' : 'text-fg-muted',
                  )}
                >
                  <item.icon
                    className={cn('size-4 shrink-0', selected ? 'text-accent' : 'text-fg-subtle')}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint ? (
                    <span className="shrink-0 text-xs text-fg-subtle">{item.hint}</span>
                  ) : null}
                  {selected ? (
                    <CornerDownLeft className="size-3.5 shrink-0 text-fg-subtle" />
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="flex shrink-0 items-center gap-4 border-t border-line px-4 py-2 text-xs text-fg-subtle max-sm:hidden">
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          选择
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd>
          打开
        </span>
        <span className="ml-auto flex items-center gap-1">
          <ArrowRight className="size-3" />共 {visibleQuestions.length.toLocaleString()} 道题可搜索
        </span>
      </div>
    </>
  )
}
