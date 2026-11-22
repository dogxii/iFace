import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Dumbbell,
  Settings2,
  Sparkles,
  Star,
  Target,
} from 'lucide-react'
import { Dialog as D } from 'radix-ui'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { type CategoryMap, DEFAULT_CATEGORY_MAP, getCategoryMap } from '@/lib/db'
import { BUILTIN_CATEGORIES } from '@/lib/questionLoader'
import { useStudyState } from '@/store/useStudyStore'
import { useUIState } from '@/store/useUIStore'
import { Button, cn, StepProgress, Switch } from '@/ui'

const ONBOARDING_DONE_KEY = 'iface_onboarding_done_v1'

const STEPS = [
  { id: 'welcome', title: '欢迎来到 iFace！' },
  { id: 'banks', title: '题库设置' },
  { id: 'start', title: '准备好了' },
] as const

const FEATURES = [
  {
    icon: BookOpen,
    title: '海量题库',
    body: '从题库列表进入任意题目，先说出你的答案，再展开参考答案。',
  },
  {
    icon: Target,
    title: '专项练习',
    body: '练习页可以按模块、难度和学习状态组合，适合冲刺和查漏补缺。',
  },
  {
    icon: Sparkles,
    title: 'AI 助手',
    body: '在设置里的 AI 助手填入 API Key 后，题目详情页会出现分析和追问辅助。',
  },
]

function readDone(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_DONE_KEY) === '1'
  } catch {
    return true
  }
}

function markDone() {
  try {
    localStorage.setItem(ONBOARDING_DONE_KEY, '1')
  } catch {
    // Private mode: the guide simply shows again next time.
  }
}

/** First-visit guide: a short welcome, choosing visible question banks, and where to start. */
export function OnboardingDialog() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (pathname === '/api/auth' || readDone()) return
    const frame = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(frame)
  }, [pathname])

  const close = () => {
    markDone()
    setOpen(false)
  }

  const step = STEPS[stepIndex]
  const last = stepIndex === STEPS.length - 1

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
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(640px,calc(100dvh-24px))] sm:h-[552px] w-[min(600px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-elevated shadow-popover outline-none data-[state=open]:animate-scale-in"
        >
          <div className="px-6 pt-6">
            <StepProgress
              label="引导进度"
              steps={STEPS.map((_, i) =>
                i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'todo',
              )}
            />
            <div className="mt-5 flex items-baseline justify-between gap-3">
              <D.Title className="text-xl font-semibold tracking-tight text-fg">
                {step.title}
              </D.Title>
              <span className="text-xs text-fg-subtle tabular-nums">
                {stepIndex + 1} / {STEPS.length}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-4 pb-6">
            {step.id === 'welcome' ? <WelcomeStep /> : null}
            {step.id === 'banks' ? <BanksStep /> : null}
            {step.id === 'start' ? <StartStep onLeave={close} /> : null}
          </div>

          <div className="flex items-center gap-2 border-t border-line bg-subtle/60 px-6 py-3">
            <Button variant="ghost" size="sm" onClick={close}>
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
                <Button variant="primary" size="sm" onClick={close}>
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
        </D.Content>
      </D.Portal>
    </D.Root>
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
        <p>iFace 拥有超多题目，以及下面三大功能，至于更多...我想你主动去发现会更有意思 👀</p>
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
      <ul className="flex flex-col gap-2">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="flex gap-3 rounded-xl border border-line px-4 py-3">
            <feature.icon className="mt-0.5 size-4 shrink-0 text-accent" />
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
  const hidden = useStudyState((s) => s.hiddenCategories)
  const setHidden = useStudyState((s) => s.setHiddenCategories)
  const toggle = useStudyState((s) => s.toggleCategoryVisibility)
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({ ...DEFAULT_CATEGORY_MAP })

  useEffect(() => {
    getCategoryMap().then(setCategoryMap)
  }, [])

  const categories = useMemo(
    () =>
      Object.entries(categoryMap).sort(([, a], [, b]) =>
        a.builtin !== b.builtin ? (a.builtin ? -1 : 1) : (a.order ?? 99) - (b.order ?? 99),
      ),
    [categoryMap],
  )
  const visibleCount = categories.filter(([key]) => !hidden.has(key)).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-sm leading-relaxed text-fg-muted">
        <p>⚙️ 这里是题库设置，你可以关闭你不需要的题目分类，</p>
        <p>不要有任何顾虑！题目关闭之后仍然可以在设置页面重新打开 ✅</p>
        <p className="text-fg-subtle">（未来 iFace 仍会添加更多且高质量的题目！）</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <QuickChip active={visibleCount === categories.length} onClick={() => setHidden([])}>
          全部显示
        </QuickChip>
        {categories.slice(0, 4).map(([key, category]) => (
          <QuickChip
            key={key}
            active={visibleCount === 1 && !hidden.has(key)}
            onClick={() => setHidden(categories.filter(([k]) => k !== key).map(([k]) => k))}
          >
            只看{category.name}
          </QuickChip>
        ))}
      </div>

      <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
        {categories.map(([key, category]) => {
          const enabled = !hidden.has(key)
          const files = BUILTIN_CATEGORIES.find((c) => c.category === key)?.files.length ?? 0
          const id = `onboarding-bank-${key}`
          return (
            <li key={key} className="flex items-center gap-3 px-4 py-3">
              <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                <span
                  className={cn(
                    'block text-sm font-medium',
                    enabled ? 'text-fg' : 'text-fg-subtle',
                  )}
                >
                  {category.name}
                </span>
                <span className="block truncate text-xs text-fg-subtle">
                  {category.modules.length} 个模块
                  {files > 0 ? ` · ${files} 个文件` : ''} ·{' '}
                  {category.modules.slice(0, 4).join('、')}
                  {category.modules.length > 4 ? '…' : ''}
                </span>
              </label>
              <Switch id={id} checked={enabled} onCheckedChange={() => toggle(key)} />
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
      body: '调整每日目标、主题和 AI 助手',
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
        <p className="text-fg-subtle">ps: 本引导窗口只在首次进入页面时显示。</p>
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
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-fg text-canvas">
          <Star className="size-4.5" />
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
