import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Command,
  Dumbbell,
  type LucideIcon,
  NotebookPen,
  Settings2,
  Star,
  Target,
} from 'lucide-react'
import { Dialog as D } from 'radix-ui'
import { type ReactNode, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ThemeSegmentedControl } from '@/app/themeOptions'
import { BrandMark } from '@/components/BrandMark'
import { HUE_CLASSES } from '@/components/ModuleMark'
import { PALETTE_SHORTCUT } from '@/features/command-palette/shortcut'
import type { ModuleHue } from '@/lib/moduleHue'
import { readBoolean, STORAGE_KEYS, writeBoolean } from '@/lib/storage'
import { useLibraryState } from '@/store/useLibraryStore'
import { useUIState } from '@/store/useUIStore'
import { Button, cn, Kbd, StepProgress, Switch } from '@/ui'

const STEPS = [
  { id: 'welcome', title: '欢迎来到 iFace！' },
  { id: 'banks', title: '题库设置' },
  { id: 'start', title: '准备好了' },
] as const

const FEATURES: { icon: LucideIcon; hue: ModuleHue; title: string; body: ReactNode }[] = [
  {
    icon: BookOpen,
    hue: 'blue',
    title: '题库',
    body: (
      <>
        先说出你的答案，再按 <Kbd>Space</Kbd> 展开参考答案
      </>
    ),
  },
  {
    icon: Target,
    hue: 'orange',
    title: '练习与复习',
    body: (
      <>
        <Kbd>1</Kbd> <Kbd>2</Kbd> <Kbd>3</Kbd> 标记掌握程度，自动安排下次复习
      </>
    ),
  },
  {
    icon: NotebookPen,
    hue: 'violet',
    title: '笔记与 AI',
    body: (
      <>
        <Kbd>N</Kbd> 写笔记，<Kbd>A</Kbd> 问 AI，在侧栏边看边记
      </>
    ),
  },
  {
    icon: Command,
    hue: 'green',
    title: '命令面板',
    body: (
      <>
        <Kbd>{PALETTE_SHORTCUT}</Kbd> 搜题、跳转页面、切换设置
      </>
    ),
  },
]

/**
 * Welcome guide: opens by itself on the first visit and again from Settings → About.
 * Choosing visible question banks and where to start; closing in any way marks it done.
 */
export function OnboardingDialog() {
  const { pathname } = useLocation()
  const open = useUIState((s) => s.onboardingOpen)
  const setOpen = useUIState((s) => s.setOnboardingOpen)

  useEffect(() => {
    if (pathname === '/api/auth' || readBoolean(STORAGE_KEYS.onboardingDone, false)) return
    const frame = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(frame)
  }, [pathname, setOpen])

  const close = () => {
    writeBoolean(STORAGE_KEYS.onboardingDone, true)
    setOpen(false)
  }

  return (
    <D.Root open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-overlay/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <D.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            // Keep focus on the dialog itself so no button opens with a focus ring.
            event.preventDefault()
            ;(event.currentTarget as HTMLElement).focus()
          }}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(640px,calc(100dvh-24px))] w-[min(600px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-elevated shadow-popover outline-none data-[state=open]:animate-scale-in sm:h-[560px]"
        >
          <OnboardingSteps onClose={close} />
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

/** Mounted with the dialog content, so reopening the guide starts from the first step. */
function OnboardingSteps({ onClose }: { onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]
  const last = stepIndex === STEPS.length - 1

  return (
    <>
      <div className="px-6 pt-6">
        <StepProgress
          label="引导进度"
          steps={STEPS.map((_, i) =>
            i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'todo',
          )}
        />
        <div className="mt-5 flex items-center gap-2.5">
          <BrandMark className="size-7" />
          <D.Title className="text-xl font-semibold tracking-tight text-fg">{step.title}</D.Title>
          <span className="ml-auto text-xs text-fg-subtle tabular-nums">
            {stepIndex + 1} / {STEPS.length}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-4 pb-6">
        {step.id === 'welcome' ? <WelcomeStep /> : null}
        {step.id === 'banks' ? <BanksStep /> : null}
        {step.id === 'start' ? <StartStep onLeave={onClose} /> : null}
      </div>

      <div className="flex items-center gap-2 border-t border-line bg-subtle/60 px-6 py-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          跳过引导
        </Button>
        <div className="ml-auto flex gap-2">
          {stepIndex > 0 ? (
            <Button variant="secondary" size="sm" onClick={() => setStepIndex((i) => i - 1)}>
              <ArrowLeft />
              上一步
            </Button>
          ) : null}
          {last ? (
            <Button variant="primary" size="sm" onClick={onClose}>
              <Check />
              完成引导
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => setStepIndex((i) => i + 1)}>
              下一步
              <ArrowRight />
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

function WelcomeStep() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-fg-muted">
        <p>
          人你好，我是项目作者{' '}
          <a
            href="https://dogxi.me"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent hover:underline"
          >
            Dogxi
          </a>{' '}
          👋
        </p>
        <p>很高兴你来到这里 🎉，这是一个永远开源免费的八股面试题网站！</p>
        <p>iFace 拥有超多题目，以及下面这些功能，至于更多...我想你主动去发现会更有意思 👀</p>
        <p>
          项目地址：
          <a
            href="https://github.com/dogxii/iface"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            github.com/dogxii/iface
          </a>
          ，有问题欢迎来提 issue
        </p>
        <p>
          作者主页：
          <a
            href="https://dogxi.me"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            dogxi.me
          </a>
          ，最后感谢大家的喜欢 ❤️！
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="flex gap-3 rounded-xl border border-line p-3">
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-lg',
                HUE_CLASSES[feature.hue].mark,
              )}
            >
              <feature.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">{feature.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-fg-subtle">{feature.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BanksStep() {
  const banks = useLibraryState((s) => s.banks)
  const setBankEnabled = useLibraryState((s) => s.setBankEnabled)
  const setEnabledBanks = useLibraryState((s) => s.setEnabledBanks)
  const enabledCount = banks.filter((bank) => bank.enabled).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-sm leading-relaxed text-fg-muted">
        <p>⚙️ 这里是题库设置，你可以停用暂时不需要的题库，</p>
        <p>不要有任何顾虑！停用之后仍然可以在设置页面重新启用 ✅</p>
        <p className="text-fg-subtle">（之后还可以导入自己的题目，或安装社区分享的题库）</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <QuickChip
          active={enabledCount === banks.length}
          onClick={() => void setEnabledBanks(banks.map((bank) => bank.id))}
        >
          全部启用
        </QuickChip>
        {banks.slice(0, 4).map((bank) => (
          <QuickChip
            key={bank.id}
            active={enabledCount === 1 && bank.enabled}
            onClick={() => void setEnabledBanks([bank.id])}
          >
            只看{bank.name}
          </QuickChip>
        ))}
      </div>

      <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
        {banks.map((bank) => {
          const id = `onboarding-bank-${bank.id}`
          return (
            <li key={bank.id} className="flex items-center gap-3 px-4 py-3">
              <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                <span
                  className={cn(
                    'block text-sm font-medium',
                    bank.enabled ? 'text-fg' : 'text-fg-subtle',
                  )}
                >
                  {bank.name}
                </span>
                <span className="block truncate text-xs text-fg-subtle">
                  {bank.questionCount} 题 · {bank.modules.length} 个模块 ·{' '}
                  {bank.modules
                    .slice(0, 4)
                    .map((mod) => mod.name)
                    .join('、')}
                  {bank.modules.length > 4 ? '…' : ''}
                </span>
              </label>
              <Switch
                id={id}
                checked={bank.enabled}
                onCheckedChange={(enabled) => void setBankEnabled(bank.id, enabled)}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function QuickChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-colors',
        active
          ? 'border-accent bg-accent-subtle text-fg'
          : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}

function StartStep({ onLeave }: { onLeave: () => void }) {
  const navigate = useNavigate()
  const openSettings = useUIState((s) => s.openSettings)
  const actions = [
    {
      icon: Settings2,
      title: '打开设置',
      body: '每日目标、答题方式和 AI 助手',
      run: () => {
        onLeave()
        openSettings('study')
      },
    },
    {
      icon: Dumbbell,
      title: '开始练习',
      body: '按模块和难度组一组题',
      run: () => {
        onLeave()
        navigate('/practice')
      },
    },
  ]
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-sm leading-relaxed text-fg-muted">
        <p>如果你不知道从哪里开始，推荐先打开设置，看看有什么可以调整</p>
        <p>然后，享受刷题！</p>
        <p>人再见，祝你生活愉快，面试顺利 🎉</p>
        <p className="text-fg-subtle">
          ps: 本引导只在首次进入时自动弹出，之后可以在「设置 → 关于」里重新查看。
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3 max-sm:flex-col max-sm:items-start max-sm:gap-2">
        <span className="min-w-0">
          <span className="block text-sm font-medium text-fg">外观</span>
          <span className="block text-xs text-fg-subtle">之后也可以在「设置 → 偏好」里修改</span>
        </span>
        <ThemeSegmentedControl />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.title}
            type="button"
            onClick={action.run}
            className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-left transition-colors hover:border-line-strong hover:bg-subtle"
          >
            <action.icon className="size-4 shrink-0 text-fg-muted" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-fg">{action.title}</span>
              <span className="block text-xs text-fg-subtle">{action.body}</span>
            </span>
          </button>
        ))}
      </div>
      <a
        href="https://github.com/dogxii/iface"
        target="_blank"
        rel="noreferrer"
        className="group flex items-center gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:border-line-strong hover:bg-subtle"
      >
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-lg',
            HUE_CLASSES.amber.mark,
          )}
        >
          <Star className="size-4.5 fill-current" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-fg">本网站强烈推荐配合面经食用 🍜</span>
          <span className="block text-xs text-fg-subtle">
            如果真的喜欢，可以点个免费的 Star 支持作者喵！
          </span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
      </a>
    </div>
  )
}
