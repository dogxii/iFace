import { ArrowUpRight, Compass } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'
import { useUIState } from '@/store/useUIStore'
import { Button, Kbd } from '@/ui'
import { ABOUT_LINKS, SHORTCUT_GROUPS } from './about'
import { SettingsBody, SettingsSection } from './parts'

export function AboutSettings() {
  const setOnboardingOpen = useUIState((s) => s.setOnboardingOpen)

  return (
    <SettingsBody>
      <section className="flex items-center gap-4 border-b border-line pt-1 pb-6">
        <BrandMark className="size-14" />
        <div className="min-w-0">
          <p className="flex items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight text-fg">iFace</span>
            <span className="text-xs text-fg-subtle tabular-nums">v{__APP_VERSION__}</span>
          </p>
          <p className="mt-0.5 text-sm text-fg-muted">八股面试题库 · 智能刷题工具</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {ABOUT_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-fg-muted hover:text-fg"
              >
                {link.label}
                <ArrowUpRight className="size-3" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <SettingsSection
        title="新手引导"
        description="重新看一遍功能介绍，并重新挑选要练习的题库。"
        action={
          <Button variant="secondary" size="sm" onClick={() => setOnboardingOpen(true)}>
            <Compass />
            重新查看
          </Button>
        }
      />

      <SettingsSection
        title="快捷键"
        description="输入框聚焦时，单键快捷键不会触发。"
        className="max-sm:hidden"
      >
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 text-2xs font-semibold tracking-wider text-fg-subtle uppercase">
                {group.title}
              </p>
              <ul>
                {group.items.map((item) => (
                  <li
                    key={`${group.title}-${item.label}`}
                    className="flex items-center justify-between gap-4 py-1.5 text-sm text-fg-muted"
                  >
                    <span>{item.label}</span>
                    <span className="flex shrink-0 gap-1">
                      {item.keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="数据与隐私">
        <p className="text-sm leading-relaxed text-fg-muted">
          学习进度、笔记和 AI 配置都只保存在这台设备的浏览器里，不经过任何 iFace
          服务器。需要换设备时，可以在「数据管理」导出备份，或在「云同步」用自己的 GitHub 私人 Gist
          同步。AI 请求由浏览器直接发往你配置的服务商。
        </p>
      </SettingsSection>

      <p className="pt-2 text-xs text-fg-subtle">MIT License · © 2026 Dogxi</p>
    </SettingsBody>
  )
}
