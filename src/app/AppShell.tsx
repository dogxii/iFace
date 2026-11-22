import { Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Settings, Sun } from 'lucide-react'
import { lazy, type ReactNode, Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BrandMark } from '@/components/BrandMark'
import { CommandPalette } from '@/features/command-palette/CommandPalette'
import { PALETTE_SHORTCUT } from '@/features/command-palette/shortcut'
import { useGistAutoSync } from '@/features/settings/useGistSync'
import { isEditableTarget } from '@/lib/dom'
import { preloadPath } from '@/lib/routePreload'
import { useAuthState } from '@/store/useAuthStore'
import { useStudyState } from '@/store/useStudyStore'
import { useUIState } from '@/store/useUIStore'
import {
  Button,
  cn,
  Kbd,
  Progress,
  ProgressRing,
  ResizeHandle,
  Sheet,
  SheetContent,
  Sidebar,
  SidebarGroupLabel,
  SidebarItem,
  Tooltip,
} from '@/ui'
import { resolveSidebarDrag, SIDEBAR } from './layout'
import { isNavItemActive, type NavItem, PRIMARY_NAV, TOOL_NAV } from './navigation'

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <NavLink
      to="/"
      aria-label={collapsed ? 'iFace 概览' : undefined}
      onPointerEnter={() => preloadPath('/')}
      className={cn(
        'flex h-9 min-w-0 items-center gap-2 rounded-md text-md font-semibold tracking-tight text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring',
        collapsed ? 'justify-center px-0' : 'px-2',
      )}
    >
      <BrandMark className="size-5.5" />
      {collapsed ? null : 'iFace'}
    </NavLink>
  )
}

function NavItems({
  items,
  collapsed = false,
  onNavigate,
}: {
  items: NavItem[]
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const { pathname } = useLocation()
  const reviewCount = useStudyState((s) => s.statusCounts.review)
  return items.map((item) => {
    const Icon = item.icon
    return (
      <SidebarItem
        key={item.path}
        as={NavLink}
        to={item.path}
        icon={<Icon />}
        active={isNavItemActive(item, pathname)}
        count={item.showReviewCount && reviewCount > 0 ? reviewCount : undefined}
        collapsed={collapsed}
        onPointerEnter={() => preloadPath(item.path)}
        onFocus={() => preloadPath(item.path)}
        onClick={onNavigate}
      >
        {item.label}
      </SidebarItem>
    )
  })
}

function TodayGoal({ collapsed = false }: { collapsed?: boolean }) {
  const todayCount = useStudyState((s) => s.streak.todayCount)
  const dailyGoal = useStudyState((s) => s.dailyGoal)
  const done = Math.min(todayCount, dailyGoal)
  if (collapsed) {
    return (
      <Tooltip content={`今日目标 ${done} / ${dailyGoal}`} side="right">
        <span
          role="img"
          aria-label={`今日目标 ${done} / ${dailyGoal}`}
          className="mx-auto grid size-8 place-items-center"
        >
          <ProgressRing value={todayCount} max={dailyGoal} size={18} stroke={3} />
        </span>
      </Tooltip>
    )
  }
  return (
    <div className="px-2">
      <div className="flex justify-between text-xs text-fg-muted">
        <span>今日目标</span>
        <span className="font-medium tabular-nums text-fg">
          {done} / {dailyGoal}
        </span>
      </div>
      <Progress
        value={todayCount}
        max={dailyGoal}
        size="xs"
        className="mt-2"
        label="今日目标进度"
      />
    </div>
  )
}

function ThemeButton({ side }: { side?: 'top' | 'right' }) {
  const theme = useStudyState((s) => s.theme)
  const toggleTheme = useStudyState((s) => s.toggleTheme)
  const label = theme === 'dark' ? '切换亮色' : '切换暗色'
  return (
    <Tooltip content={label} side={side}>
      <Button variant="ghost" size="icon-sm" aria-label={label} onClick={toggleTheme}>
        {theme === 'dark' ? <Sun /> : <Moon />}
      </Button>
    </Tooltip>
  )
}

function SidebarToggle({ collapsed }: { collapsed: boolean }) {
  const toggleSidebar = useUIState((s) => s.toggleSidebar)
  const label = collapsed ? '展开侧栏' : '收起侧栏'
  return (
    <Tooltip content={label} shortcut="[" side={collapsed ? 'right' : 'bottom'}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        aria-expanded={!collapsed}
        onClick={toggleSidebar}
      >
        {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
      </Button>
    </Tooltip>
  )
}

function UserAvatar() {
  const user = useAuthState((s) => s.user)
  return user ? (
    <img src={user.avatar_url} alt="" className="size-5.5 shrink-0 rounded-full" />
  ) : (
    <span className="size-5.5 shrink-0 rounded-full bg-gradient-to-br from-accent-subtle to-accent" />
  )
}

function UserRow({ collapsed = false }: { collapsed?: boolean }) {
  const user = useAuthState((s) => s.user)
  const openSettings = useUIState((s) => s.openSettings)
  const name = user ? (user.name ?? user.login) : '本地模式'
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <ThemeButton side="right" />
        <Tooltip content="设置" side="right">
          <Button variant="ghost" size="icon-sm" aria-label="设置" onClick={() => openSettings()}>
            <Settings />
          </Button>
        </Tooltip>
        <SidebarToggle collapsed />
        <Tooltip content={name} side="right">
          <span role="img" aria-label={name} className="grid size-8 place-items-center">
            <UserAvatar />
          </span>
        </Tooltip>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 pl-2">
      <UserAvatar />
      <span className="ml-1.5 min-w-0 flex-1 truncate text-sm text-fg">{name}</span>
      <ThemeButton />
      <Tooltip content="设置">
        <Button variant="ghost" size="icon-sm" aria-label="设置" onClick={() => openSettings()}>
          <Settings />
        </Button>
      </Tooltip>
    </div>
  )
}

function SearchButton({ collapsed = false }: { collapsed?: boolean }) {
  const setPaletteOpen = useUIState((s) => s.setPaletteOpen)
  if (collapsed) {
    return (
      <Tooltip content="搜索" shortcut={PALETTE_SHORTCUT} side="right">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="搜索"
          className="mx-auto mb-2 size-8"
          onClick={() => setPaletteOpen(true)}
        >
          <Search />
        </Button>
      </Tooltip>
    )
  }
  return (
    <button
      type="button"
      onClick={() => setPaletteOpen(true)}
      className="mb-2 flex h-8 w-full items-center gap-2 rounded-md border border-line bg-canvas px-2.5 text-sm text-fg-subtle transition-colors outline-none hover:border-line-strong hover:text-fg-muted focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Search className="size-4" />
      搜索…
      <Kbd className="ml-auto">{PALETTE_SHORTCUT}</Kbd>
    </button>
  )
}

function SidebarContent({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <>
      <SearchButton collapsed={collapsed} />
      <nav
        aria-label="主导航"
        className="-mx-1 flex min-h-0 flex-col gap-px overflow-y-auto overscroll-contain px-1"
      >
        <NavItems items={PRIMARY_NAV} collapsed={collapsed} onNavigate={onNavigate} />
        <SidebarGroupLabel collapsed={collapsed}>工具</SidebarGroupLabel>
        <NavItems items={TOOL_NAV} collapsed={collapsed} onNavigate={onNavigate} />
      </nav>
      <div className="mt-auto flex flex-col gap-3 border-t border-line pt-3">
        <TodayGoal collapsed={collapsed} />
        <UserRow collapsed={collapsed} />
      </div>
    </>
  )
}

/** Desktop sidebar: drag the right edge to resize, drag it far left (or press `[`) to collapse. */
function DesktopSidebar({ width, collapsed }: { width: number; collapsed: boolean }) {
  const setSidebarWidth = useUIState((s) => s.setSidebarWidth)
  const setSidebarCollapsed = useUIState((s) => s.setSidebarCollapsed)
  // Width before the current drag, restored when the drag ends in a collapse.
  const widthBeforeDrag = useRef(width)

  return (
    <Sidebar
      aria-label="侧栏"
      style={{ width }}
      className={cn(
        'resize-animated fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-150 ease-out lg:flex',
        collapsed ? 'px-2' : 'px-2.5',
      )}
    >
      <div className={cn('mb-3 flex items-center gap-1', collapsed && 'justify-center')}>
        <div className="min-w-0 flex-1">
          <Brand collapsed={collapsed} />
        </div>
        {collapsed ? null : <SidebarToggle collapsed={false} />}
      </div>
      <SidebarContent collapsed={collapsed} />
      <ResizeHandle
        edge="right"
        label="调整侧栏宽度"
        value={width}
        min={SIDEBAR.rail}
        max={SIDEBAR.max}
        onResizeStart={(start) => {
          if (!collapsed) widthBeforeDrag.current = start
        }}
        onResize={(raw) => {
          const next = resolveSidebarDrag(raw)
          setSidebarCollapsed(next.collapsed)
          setSidebarWidth(next.collapsed ? widthBeforeDrag.current : next.width)
        }}
        onReset={() => {
          setSidebarCollapsed(false)
          setSidebarWidth(SIDEBAR.default)
        }}
      />
    </Sidebar>
  )
}

function MobileTopBar() {
  const setMobileNavOpen = useUIState((s) => s.setMobileNavOpen)
  const openSettings = useUIState((s) => s.openSettings)
  return (
    <header className="sticky top-0 z-40 flex h-13 items-center gap-1 border-b border-line bg-canvas/85 px-3 backdrop-blur-md lg:hidden">
      <Brand />
      <div className="ml-auto flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="搜索"
          onClick={() => useUIState.getState().setPaletteOpen(true)}
        >
          <Search />
        </Button>
        <ThemeButton />
        <Button variant="ghost" size="icon-sm" aria-label="设置" onClick={() => openSettings()}>
          <Settings />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="菜单"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu />
        </Button>
      </div>
    </header>
  )
}

/** ⌘K / Ctrl+K toggles the command palette from anywhere, including text fields. */
function usePaletteHotkey() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return
      if (event.altKey || event.shiftKey) return
      event.preventDefault()
      const { paletteOpen, setPaletteOpen } = useUIState.getState()
      setPaletteOpen(!paletteOpen)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}

/** `[` toggles the desktop sidebar, like Linear. Ignored while typing. */
function useSidebarHotkey() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== '[' || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.repeat || isEditableTarget(event.target)) return
      event.preventDefault()
      useUIState.getState().toggleSidebar()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}

const loadSettingsDialog = () => import('@/features/settings/SettingsDialog')
const SettingsDialog = lazy(() => loadSettingsDialog().then((m) => ({ default: m.SettingsDialog })))

/** Settings live in their own chunk: mounted on first open and preloaded once the app is idle. */
function LazySettingsDialog() {
  const open = useUIState((s) => s.settingsOpen)
  const [mounted, setMounted] = useState(open)
  if (open && !mounted) setMounted(true)

  useEffect(() => {
    const timer = window.setTimeout(loadSettingsDialog, 3000)
    return () => window.clearTimeout(timer)
  }, [])

  if (!mounted) return null
  return (
    <Suspense fallback={null}>
      <SettingsDialog />
    </Suspense>
  )
}

/**
 * Application frame: sidebar on desktop, top bar + slide-out menu on mobile.
 * Pages render inside `children`. `--navbar-h` is the height of the sticky mobile top bar
 * (0 on desktop) so page headers and legacy sticky elements can sit just below it.
 */
export function AppShell({ children }: { children: ReactNode }) {
  useGistAutoSync()
  usePaletteHotkey()
  useSidebarHotkey()
  const mobileNavOpen = useUIState((s) => s.mobileNavOpen)
  const setMobileNavOpen = useUIState((s) => s.setMobileNavOpen)
  const sidebarWidth = useUIState((s) => s.sidebarWidth)
  const sidebarCollapsed = useUIState((s) => s.sidebarCollapsed)
  const shownSidebarWidth = sidebarCollapsed ? SIDEBAR.rail : sidebarWidth

  return (
    <div
      style={{ '--sidebar-w': `${shownSidebarWidth}px` } as React.CSSProperties}
      className="min-h-dvh bg-canvas text-fg [--navbar-h:52px] lg:[--navbar-h:0px]"
    >
      <DesktopSidebar width={shownSidebarWidth} collapsed={sidebarCollapsed} />

      <MobileTopBar />
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent title="iFace" width={280} className={cn('lg:hidden')}>
          <div className="flex h-full flex-col gap-px p-2.5">
            <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="resize-animated min-w-0 transition-[padding] duration-150 ease-out lg:pl-[var(--sidebar-w)]">
        {children}
      </div>

      <LazySettingsDialog />
      <CommandPalette />
    </div>
  )
}
