import { Menu, Moon, Search, Settings, Sun } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CommandPalette } from '@/features/command-palette/CommandPalette'
import { PALETTE_SHORTCUT } from '@/features/command-palette/shortcut'
import { SettingsDialog } from '@/features/settings/SettingsDialog'
import { useGistAutoSync } from '@/features/settings/useGistSync'
import { preloadPath } from '@/lib/routePreload'
import { useAuthState } from '@/store/useAuthStore'
import { useStudyState } from '@/store/useStudyStore'
import { useUIState } from '@/store/useUIStore'
import {
  Button,
  cn,
  Kbd,
  Progress,
  Sheet,
  SheetContent,
  Sidebar,
  SidebarGroupLabel,
  SidebarItem,
  Tooltip,
} from '@/ui'
import { isNavItemActive, type NavItem, PRIMARY_NAV, TOOL_NAV } from './navigation'

function Brand() {
  return (
    <NavLink
      to="/"
      onPointerEnter={() => preloadPath('/')}
      className="flex h-9 items-center gap-2 rounded-md px-2 text-md font-semibold tracking-tight text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex size-5.5 items-center justify-center rounded-md bg-fg text-xs font-semibold text-canvas">
        i
      </span>
      iFace
    </NavLink>
  )
}

function NavItems({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
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
        onPointerEnter={() => preloadPath(item.path)}
        onFocus={() => preloadPath(item.path)}
        onClick={onNavigate}
      >
        {item.label}
      </SidebarItem>
    )
  })
}

function TodayGoal() {
  const todayCount = useStudyState((s) => s.streak.todayCount)
  const dailyGoal = useStudyState((s) => s.dailyGoal)
  return (
    <div className="px-2">
      <div className="flex justify-between text-xs text-fg-muted">
        <span>今日目标</span>
        <span className="font-medium tabular-nums text-fg">
          {Math.min(todayCount, dailyGoal)} / {dailyGoal}
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

function ThemeButton() {
  const theme = useStudyState((s) => s.theme)
  const toggleTheme = useStudyState((s) => s.toggleTheme)
  const label = theme === 'dark' ? '切换亮色' : '切换暗色'
  return (
    <Tooltip content={label}>
      <Button variant="ghost" size="icon-sm" aria-label={label} onClick={toggleTheme}>
        {theme === 'dark' ? <Sun /> : <Moon />}
      </Button>
    </Tooltip>
  )
}

function UserRow() {
  const user = useAuthState((s) => s.user)
  const openSettings = useUIState((s) => s.openSettings)
  return (
    <div className="flex items-center gap-1 pl-2">
      {user ? (
        <img src={user.avatar_url} alt="" className="size-5.5 rounded-full" />
      ) : (
        <span className="size-5.5 rounded-full bg-gradient-to-br from-accent-subtle to-accent" />
      )}
      <span className="ml-1.5 min-w-0 flex-1 truncate text-sm text-fg">
        {user ? (user.name ?? user.login) : '本地模式'}
      </span>
      <ThemeButton />
      <Tooltip content="设置">
        <Button variant="ghost" size="icon-sm" aria-label="设置" onClick={() => openSettings()}>
          <Settings />
        </Button>
      </Tooltip>
    </div>
  )
}

function SearchButton() {
  const setPaletteOpen = useUIState((s) => s.setPaletteOpen)
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

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <SearchButton />
      <nav aria-label="主导航" className="flex flex-col gap-px">
        <NavItems items={PRIMARY_NAV} onNavigate={onNavigate} />
        <SidebarGroupLabel>工具</SidebarGroupLabel>
        <NavItems items={TOOL_NAV} onNavigate={onNavigate} />
      </nav>
      <div className="mt-auto flex flex-col gap-3 border-t border-line pt-3">
        <TodayGoal />
        <UserRow />
      </div>
    </>
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

/**
 * Application frame: sidebar on desktop, top bar + slide-out menu on mobile.
 * Pages render inside `children`. `--navbar-h` is the height of the sticky mobile top bar
 * (0 on desktop) so page headers and legacy sticky elements can sit just below it.
 */
export function AppShell({ children }: { children: ReactNode }) {
  useGistAutoSync()
  usePaletteHotkey()
  const mobileNavOpen = useUIState((s) => s.mobileNavOpen)
  const setMobileNavOpen = useUIState((s) => s.setMobileNavOpen)

  return (
    <div className="min-h-dvh bg-canvas text-fg [--navbar-h:52px] lg:[--navbar-h:0px]">
      <Sidebar className="fixed inset-y-0 left-0 z-30 hidden lg:flex">
        <div className="mb-3">
          <Brand />
        </div>
        <SidebarContent />
      </Sidebar>

      <MobileTopBar />
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent title="iFace" width={280} className={cn('lg:hidden')}>
          <div className="flex h-full flex-col gap-px p-2.5">
            <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="min-w-0 lg:pl-58">{children}</div>

      <SettingsDialog />
      <CommandPalette />
    </div>
  )
}
