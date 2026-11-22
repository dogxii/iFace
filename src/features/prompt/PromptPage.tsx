import {
  Check,
  ClipboardCopy,
  Layers,
  type LucideIcon,
  MessagesSquare,
  PencilRuler,
  Repeat2,
  Sparkles,
  Tags,
  Upload,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDraft } from '@/hooks/useDraft'
import {
  Box,
  Breadcrumb,
  Button,
  cn,
  Field,
  Input,
  PageHeader,
  PageTitle,
  SegmentedControl,
  Select,
  Textarea,
  toast,
} from '@/ui'
import {
  buildCustomPrompt,
  DIFFICULTY_MIXES,
  type DifficultyMix,
  difficultyCounts,
  MODULE_SUGGESTIONS,
  PRESETS,
} from './promptPresets'

type Mode = 'preset' | 'custom'

const COUNT_OPTIONS = [20, 40, 60, 80, 100]

const STEPS = [
  { title: '复制 Prompt', body: '选择预设或自定义，复制右侧提示词' },
  { title: '交给 AI 生成', body: '粘贴到任意 AI 对话，得到 Markdown 题目' },
  { title: '粘贴导入', body: '在导入页粘贴 AI 的输出，自动识别格式' },
]

const TIPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Layers,
    title: '分批生成质量更高',
    body: '每次只让 AI 专注一个模块，50-80 道题一批，比一次生成全部更稳定。',
  },
  {
    icon: Repeat2,
    title: '多次生成再合并',
    body: '同一模块可以换个角度或换个模型再生成一批，用不同的来源名称导入即可。',
  },
  {
    icon: MessagesSquare,
    title: '输出被截断时说“继续”',
    body: '题目较多时 AI 可能中途停下，回复“继续”即可接着输出，最后一起粘贴导入。',
  },
  {
    icon: Tags,
    title: '标注来源方便筛选',
    body: '让 AI 给高频题标注“高频”，大厂题标注公司名，之后在题库里能快速筛出来。',
  },
  {
    icon: PencilRuler,
    title: '答案可以再打磨',
    body: '导入后在题目页可以直接编辑自定义答案，不必回头修改原始文件。',
  },
  {
    icon: Sparkles,
    title: '选择更强的模型',
    body: '长文本、严格遵循格式的任务，推荐使用各家最新的旗舰模型。',
  },
]

interface PromptPrefs {
  mode: Mode
  presetId: string
  module: string
  count: number
  mix: DifficultyMix
  extra: string
}

const DEFAULT_PROMPT_PREFS: PromptPrefs = {
  mode: 'preset',
  presetId: PRESETS[0].id,
  module: 'JS基础',
  count: 60,
  mix: 'standard',
  extra: '',
}

function parsePromptPrefs(value: unknown): PromptPrefs | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const d = DEFAULT_PROMPT_PREFS
  return {
    mode: v.mode === 'custom' ? 'custom' : 'preset',
    presetId: PRESETS.some((p) => p.id === v.presetId) ? (v.presetId as string) : d.presetId,
    module: typeof v.module === 'string' && v.module.trim() ? v.module : d.module,
    count: COUNT_OPTIONS.includes(v.count as number) ? (v.count as number) : d.count,
    mix: DIFFICULTY_MIXES.some((m) => m.value === v.mix) ? (v.mix as DifficultyMix) : d.mix,
    extra: typeof v.extra === 'string' ? v.extra : '',
  }
}

export default function PromptPage() {
  // Remember the last choices (and any extra requirements typed) across visits.
  const [prefs, setPrefs] = useDraft('prompt', DEFAULT_PROMPT_PREFS, parsePromptPrefs)
  const { mode, presetId, module, count, mix, extra } = prefs
  const update =
    <K extends keyof PromptPrefs>(key: K) =>
    (value: PromptPrefs[K]) =>
      setPrefs((prev) => ({ ...prev, [key]: value }))
  const setMode = update('mode')
  const setPresetId = update('presetId')
  const setModule = update('module')
  const setCount = update('count')
  const setMix = update('mix')
  const setExtra = update('extra')
  const [copied, setCopied] = useState(false)

  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0]
  const customPrompt = useMemo(
    () => buildCustomPrompt({ module, count, mix, extra }),
    [module, count, mix, extra],
  )
  const prompt = mode === 'preset' ? preset.prompt : customPrompt
  const [easy, mid, hard] = difficultyCounts(mix, count)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      toast.success('已复制 Prompt', { description: '粘贴给 AI，拿到结果后去导入页粘贴即可。' })
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败，请手动选择文本复制')
    }
  }

  return (
    <>
      <PageHeader
        title={<Breadcrumb items={[{ label: '出题' }]} />}
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link to="/import">
              <Upload />
              去导入
            </Link>
          </Button>
        }
      />
      <div className="mx-auto max-w-[1160px] px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <PageTitle
          title="AI 出题"
          description="用现成的 Prompt 让任意 AI 批量生成面试题，再导入到 iFace 练习。"
        />

        <ol className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-line px-2 py-2.5 text-center sm:flex-row sm:items-start sm:gap-3 sm:px-4 sm:py-3 sm:text-left"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-fg text-2xs font-semibold text-canvas tabular-nums">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-fg sm:text-sm">{step.title}</p>
                <p className="text-xs text-fg-subtle max-sm:hidden">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <SegmentedControl
              value={mode}
              onValueChange={setMode}
              label="Prompt 来源"
              className="self-start"
              options={[
                { value: 'preset', label: '预设' },
                { value: 'custom', label: '自定义' },
              ]}
            />

            {mode === 'preset' ? (
              <div className="flex flex-col gap-2">
                {PRESETS.map((p) => {
                  const active = p.id === presetId
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPresetId(p.id)}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                        active
                          ? 'border-accent bg-accent-subtle'
                          : 'border-line hover:border-line-strong hover:bg-subtle',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border',
                          active
                            ? 'border-transparent bg-accent text-accent-fg'
                            : 'border-line bg-canvas text-fg-muted',
                        )}
                      >
                        <p.icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-fg">{p.title}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-fg-subtle">
                          {p.description}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <Box padding="md" className="flex flex-col gap-4">
                <Field label="模块" htmlFor="prompt-module" hint="可选建议，也可以填任意方向">
                  <Input
                    id="prompt-module"
                    list="prompt-module-options"
                    value={module}
                    onChange={(e) => setModule(e.target.value)}
                    placeholder="例如：Rust、系统设计"
                    className="text-sm"
                  />
                  <datalist id="prompt-module-options">
                    {MODULE_SUGGESTIONS.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-fg">题量</span>
                    <Select
                      value={String(count)}
                      onValueChange={(v) => setCount(Number(v))}
                      label="题量"
                      options={COUNT_OPTIONS.map((n) => ({ value: String(n), label: `${n} 道` }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-fg">难度</span>
                    <Select
                      value={mix}
                      onValueChange={(v) => setMix(v as DifficultyMix)}
                      label="难度分布"
                      options={DIFFICULTY_MIXES.map((m) => ({ value: m.value, label: m.label }))}
                    />
                  </div>
                </div>
                <DifficultyBar easy={easy} mid={mid} hard={hard} />
                <Field label="覆盖范围" htmlFor="prompt-extra" hint="列出希望覆盖的子主题，可留空">
                  <Textarea
                    id="prompt-extra"
                    value={extra}
                    onChange={(e) => setExtra(e.target.value)}
                    placeholder={'例如：\n- 所有权与借用\n- 生命周期\n- async 运行时'}
                    rows={5}
                    className="text-sm"
                  />
                </Field>
              </Box>
            )}
          </div>

          <Box className="flex min-w-0 flex-col overflow-hidden lg:sticky lg:top-20">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-fg">
                  {mode === 'preset' ? preset.title : `${module.trim() || 'JS基础'} · ${count} 道`}
                </h2>
                <p className="text-xs text-fg-subtle tabular-nums">
                  {prompt.length.toLocaleString()} 字符
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={copy}>
                {copied ? <Check /> : <ClipboardCopy />}
                {copied ? '已复制' : '复制 Prompt'}
              </Button>
            </div>
            <pre className="max-h-[min(640px,70dvh)] overflow-auto bg-subtle/50 px-4 py-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap text-fg-muted">
              {prompt}
            </pre>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
              <p className="text-xs text-fg-subtle">AI 生成后，把完整输出粘贴到导入页即可。</p>
              <Button asChild variant="ghost" size="sm">
                <Link to="/import">
                  <Upload />
                  去导入
                </Link>
              </Button>
            </div>
          </Box>
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-line bg-canvas/90 px-4 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
          <Button variant="primary" className="w-full" onClick={copy}>
            {copied ? <Check /> : <ClipboardCopy />}
            {copied
              ? '已复制'
              : `复制「${mode === 'preset' ? preset.title : `${module.trim() || 'JS基础'}`}」Prompt`}
          </Button>
        </div>

        <section className="mt-10">
          <h2 className="text-base font-semibold text-fg">小技巧</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TIPS.map((tip) => (
              <div key={tip.title} className="flex gap-3 rounded-xl border border-line px-4 py-3">
                <tip.icon className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">{tip.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-fg-subtle">{tip.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

function DifficultyBar({ easy, mid, hard }: { easy: number; mid: number; hard: number }) {
  const total = Math.max(1, easy + mid + hard)
  const parts = [
    { label: '初级', value: easy, className: 'bg-success' },
    { label: '中级', value: mid, className: 'bg-warning' },
    { label: '高级', value: hard, className: 'bg-danger' },
  ]
  return (
    <div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
        {parts.map((p) => (
          <span
            key={p.label}
            className={p.className}
            style={{ width: `${(p.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex gap-3 text-xs text-fg-subtle tabular-nums">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1">
            <span className={cn('size-1.5 rounded-full', p.className)} />
            {p.label} {p.value}
          </span>
        ))}
      </div>
    </div>
  )
}
