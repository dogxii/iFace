import {
  Cloud,
  Database,
  Info,
  type LucideIcon,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
import { Dialog as D } from 'radix-ui'
import { type SettingsTab, useUIState } from '@/store/useUIStore'
import { Button, cn } from '@/ui'
import { AboutSettings } from './AboutSettings'
import { AISettings } from './AISettings'
import { DataSettings } from './DataSettings'
import { StudySettings } from './StudySettings'
import { SyncSettings } from './SyncSettings'

const TABS: { id: SettingsTab; label: string; description: string; icon: LucideIcon }[] = [
  {
    id: 'study',
    label: '偏好',
    description: '外观、每日目标、答题方式和题库展示',
    icon: SlidersHorizontal,
  },
  {
    id: 'ai',
    label: 'AI 助手',
    description: '服务商、模型和提示词，密钥只保存在本地',
    icon: Sparkles,
  },
  {
    id: 'data',
    label: '数据管理',
    description: '导出备份、导入恢复和清理本地数据',
    icon: Database,
  },
  {
    id: 'sync',
    label: '云同步',
    description: '用 GitHub 私人 Gist 在多设备间同步进度',
    icon: Cloud,
  },
  {
    id: 'about',
    label: '关于',
    description: '版本、链接、快捷键和新手引导',
    icon: Info,
  },
]

export function SettingsDialog() {
  const open = useUIState((s) => s.settingsOpen)
  const tab = useUIState((s) => s.settingsTab)
  const setTab = useUIState((s) => s.setSettingsTab)
  const closeSettings = useUIState((s) => s.closeSettings)
  const current = TABS.find((t) => t.id === tab) ?? TABS[0]

  return (
    <D.Root open={open} onOpenChange={(next) => !next && closeSettings()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <D.Content
          aria-describedby={undefined}
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden bg-elevated shadow-popover outline-none sm:grid sm:grid-cols-[200px_minmax(0,1fr)]',
            'inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[min(680px,88dvh)] sm:w-[min(880px,calc(100vw-48px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-line',
            'data-[state=closed]:animate-fade-out data-[state=open]:animate-scale-in',
          )}
        >
          {/* Navigation: sidebar on desktop, scrollable tabs on mobile */}
          <nav
            aria-label="设置分类"
            className="flex shrink-0 flex-col border-b border-line bg-subtle/60 sm:border-r sm:border-b-0"
          >
            <div className="flex h-13 items-center justify-between px-4 sm:h-auto sm:px-4 sm:pt-5 sm:pb-3">
              <D.Title className="flex items-baseline gap-2 text-base font-semibold text-fg">
                设置
                <span className="text-xs font-normal text-fg-subtle tabular-nums sm:hidden">
                  v{__APP_VERSION__}
                </span>
              </D.Title>
              <D.Close asChild>
                <Button variant="ghost" size="icon-sm" aria-label="关闭设置" className="sm:hidden">
                  <X />
                </Button>
              </D.Close>
            </div>
            <div className="flex gap-1 overflow-x-auto px-2 pb-2 sm:flex-col sm:gap-0.5 sm:overflow-visible">
              {TABS.map((item) => {
                const active = item.id === tab
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setTab(item.id)}
                    className={cn(
                      'flex h-8 shrink-0 items-center gap-2 rounded-md px-2.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'bg-canvas font-medium text-fg shadow-raised sm:bg-muted sm:shadow-none'
                        : 'text-fg-muted hover:bg-muted hover:text-fg',
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setTab('about')}
              className="mt-auto hidden px-4 pt-3 pb-4 text-left text-xs text-fg-subtle tabular-nums hover:text-fg-muted sm:block"
            >
              iFace v{__APP_VERSION__}
            </button>
          </nav>

          <div className="flex min-h-0 flex-1 flex-col">
            <header className="hidden shrink-0 items-start justify-between gap-4 border-b border-line px-6 pt-5 pb-4 sm:flex">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-fg">{current.label}</h2>
                <p className="mt-0.5 text-sm text-fg-muted">{current.description}</p>
              </div>
              <D.Close asChild>
                <Button variant="ghost" size="icon-sm" aria-label="关闭设置" className="-mr-2">
                  <X />
                </Button>
              </D.Close>
            </header>
            {tab === 'study' ? <StudySettings /> : null}
            {tab === 'ai' ? <AISettings /> : null}
            {tab === 'data' ? <DataSettings /> : null}
            {tab === 'sync' ? <SyncSettings /> : null}
            {tab === 'about' ? <AboutSettings /> : null}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
