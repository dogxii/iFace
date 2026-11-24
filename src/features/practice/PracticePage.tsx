import { Check, Clock, Download, EyeOff, Play, RotateCcw, Shuffle, Sparkles } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { HUE_CLASSES, ModuleMark } from '@/components/ModuleMark'
import { useDraft } from '@/hooks/useDraft'
import { useQuestions } from '@/hooks/useQuestions'
import { type CategoryMap, DEFAULT_CATEGORY_MAP, getCategoryMap } from '@/lib/db'
import type { ModuleHue } from '@/lib/moduleHue'
import { createPracticeSessionPath } from '@/lib/practiceSession'
import { filterVisibleQuestions, getHiddenModules } from '@/lib/questionVisibility'
import { dueRecords } from '@/store/studyLogic'
import { useStudyState } from '@/store/useStudyStore'
import { useUIState } from '@/store/useUIStore'
import { DIFFICULTY_LABELS, type Difficulty, type Question } from '@/types'
import {
  Box,
  Breadcrumb,
  Button,
  cn,
  EmptyState,
  PageHeader,
  PageTitle,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  StatusDot,
  SwitchRow,
} from '@/ui'
import {
  buildSession,
  DEFAULT_SESSION_OPTIONS,
  parseSessionOptions,
  type SessionOptions,
  type SizeOption,
  type StatusFilter,
  sessionPool,
} from './sessionBuilder'

interface ModuleInfo {
  module: string
  total: number
  mastered: number
}

function PresetCard({
  icon,
  hue,
  title,
  description,
  count,
  onStart,
}: {
  icon: ReactNode
  hue: ModuleHue
  title: string
  description: string
  count: number
  onStart: () => void
}) {
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={count === 0}
      className="group flex flex-col items-start rounded-xl border border-line bg-canvas p-3.5 text-left sm:p-4 transition-colors outline-none hover:border-line-strong hover:bg-subtle/60 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={cn(
          'flex size-8 items-center justify-center rounded-lg [&_svg]:size-4',
          HUE_CLASSES[hue].mark,
        )}
      >
        {icon}
      </span>
      <span className="mt-3 text-base font-medium text-fg">{title}</span>
      <span className="mt-0.5 text-xs text-fg-muted max-sm:hidden">{description}</span>
      <span className="mt-3 text-xs text-fg-subtle tabular-nums">
        {count > 0 ? (
          <>
            <span className="font-medium text-fg">{count}</span> 道 ·{' '}
            <span className="text-accent">开始 →</span>
          </>
        ) : (
          '暂无'
        )}
      </span>
    </button>
  )
}

function ModuleToggle({
  info,
  selected,
  onToggle,
}: {
  info: ModuleInfo
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-accent bg-accent-subtle text-fg'
          : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
      )}
    >
      <ModuleMark module={info.module} />
      <span className="min-w-0 flex-1 truncate">{info.module}</span>
      <span className="text-xs tabular-nums text-fg-subtle max-sm:hidden">
        {info.mastered}/{info.total}
      </span>
      <span
        className={cn(
          'flex size-4 items-center justify-center rounded border',
          selected ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong',
        )}
      >
        {selected ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
    </button>
  )
}

export default function PracticePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { allQuestions, initializing } = useQuestions()
  const records = useStudyState((s) => s.records)
  const hiddenCategories = useStudyState((s) => s.hiddenCategories)
  const dailyGoal = useStudyState((s) => s.dailyGoal)
  const openSettings = useUIState((s) => s.openSettings)
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({ ...DEFAULT_CATEGORY_MAP })
  // Remember the last combination so coming back to practice starts where you left off.
  const [options, setOptions] = useDraft<SessionOptions>(
    'practice:options',
    DEFAULT_SESSION_OPTIONS,
    parseSessionOptions,
  )
  const [now] = useState(() => Date.now())

  // Old links (`/practice?ids=a,b`) jump straight into a session.
  useEffect(() => {
    const ids = (params.get('ids') ?? '').split(',').filter(Boolean)
    if (ids.length > 0) navigate(createPracticeSessionPath(ids[0], ids), { replace: true })
  }, [params, navigate])

  useEffect(() => {
    void getCategoryMap().then(setCategoryMap)
  }, [])

  const visibleQuestions = useMemo(
    () => filterVisibleQuestions(allQuestions, getHiddenModules(categoryMap, hiddenCategories)),
    [allQuestions, categoryMap, hiddenCategories],
  )

  const groups = useMemo(() => {
    const info = new Map<string, ModuleInfo>()
    for (const q of visibleQuestions) {
      const entry = info.get(q.module) ?? { module: q.module, total: 0, mastered: 0 }
      entry.total++
      if (records[q.id]?.status === 'mastered') entry.mastered++
      info.set(q.module, entry)
    }
    const used = new Set<string>()
    const result: { name: string; modules: ModuleInfo[] }[] = []
    const categories = Object.entries(categoryMap).sort(
      ([, a], [, b]) => (a.order ?? 99) - (b.order ?? 99),
    )
    for (const [key, category] of categories) {
      if (hiddenCategories.has(key)) continue
      const modules = category.modules.flatMap((m) => {
        const entry = info.get(m)
        if (!entry || used.has(m)) return []
        used.add(m)
        return [entry]
      })
      if (modules.length > 0) result.push({ name: category.name || key, modules })
    }
    const rest = [...info.values()].filter((m) => !used.has(m.module))
    if (rest.length > 0) result.push({ name: '其他', modules: rest })
    return result
  }, [visibleQuestions, records, categoryMap, hiddenCategories])

  // Drop remembered modules that no longer exist (deleted source, hidden category).
  useEffect(() => {
    if (groups.length === 0) return
    const available = new Set(groups.flatMap((g) => g.modules.map((m) => m.module)))
    setOptions((prev) =>
      prev.modules.every((m) => available.has(m))
        ? prev
        : { ...prev, modules: prev.modules.filter((m) => available.has(m)) },
    )
  }, [groups, setOptions])

  const pool = useMemo(
    () => sessionPool(visibleQuestions, records, options, now),
    [visibleQuestions, records, options, now],
  )
  const sessionIds = useMemo(
    () => buildSession(pool, records, { size: options.size, shuffle: false }),
    [pool, records, options.size],
  )
  const byId = useMemo(() => new Map(visibleQuestions.map((q) => [q.id, q])), [visibleQuestions])
  const visibleIds = useMemo(() => new Set(visibleQuestions.map((q) => q.id)), [visibleQuestions])

  const due = useMemo(
    () => dueRecords(records, now).filter((r) => visibleIds.has(r.questionId)),
    [records, now, visibleIds],
  )
  const unlearned = useMemo(
    () => visibleQuestions.filter((q) => !records[q.id]),
    [visibleQuestions, records],
  )

  const start = (ids: string[]) => {
    if (ids.length > 0) navigate(createPracticeSessionPath(ids[0], ids))
  }
  const startConfigured = () =>
    start(buildSession(pool, records, { size: options.size, shuffle: options.shuffle }))
  const startRandom = (list: Question[], count: number) =>
    start(buildSession(list, records, { size: count as SizeOption, shuffle: true }))

  const set = <K extends keyof SessionOptions>(key: K, value: SessionOptions[K]) =>
    setOptions((prev) => ({ ...prev, [key]: value }))
  const toggleModule = (module: string) =>
    set(
      'modules',
      options.modules.includes(module)
        ? options.modules.filter((m) => m !== module)
        : [...options.modules, module],
    )
  const toggleGroup = (modules: ModuleInfo[]) => {
    const names = modules.map((m) => m.module)
    const all = names.every((m) => options.modules.includes(m))
    set(
      'modules',
      all
        ? options.modules.filter((m) => !names.includes(m))
        : [...new Set([...options.modules, ...names])],
    )
  }

  const preview = sessionIds.slice(0, 5).flatMap((id) => byId.get(id) ?? [])

  return (
    <>
      <PageHeader title={<Breadcrumb items={[{ label: '练习' }]} />} />
      <div className="mx-auto max-w-[1160px] px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        {initializing ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        ) : allQuestions.length === 0 ? (
          <EmptyState
            icon={<Download />}
            title="题库为空"
            description="导入内置题库或自定义 JSON 文件后即可开始练习。"
            action={
              <Button variant="primary" asChild>
                <Link to="/import">前往导入</Link>
              </Button>
            }
          />
        ) : visibleQuestions.length === 0 ? (
          <EmptyState
            icon={<EyeOff />}
            title="所有题库都已隐藏"
            description="在设置的「偏好 → 题库展示」中重新开启需要练习的分类。"
            action={<Button onClick={() => openSettings('study')}>打开设置</Button>}
          />
        ) : (
          <>
            <PageTitle title="练习" description="选一个快速开始，或自由组合模块、难度和状态。" />

            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
              <PresetCard
                icon={<Clock />}
                hue="rose"
                title="到期复习"
                description="按复习间隔到期的题，越久越优先"
                count={due.length}
                onStart={() => start(due.slice(0, 30).map((r) => r.questionId))}
              />
              <PresetCard
                icon={<RotateCcw />}
                hue="amber"
                title="待复习"
                description="所有标记为没掌握 / 大概会的题"
                count={visibleQuestions.filter((q) => records[q.id]?.status === 'review').length}
                onStart={() =>
                  start(
                    buildSession(
                      sessionPool(
                        visibleQuestions,
                        records,
                        { modules: [], difficulty: 'all', status: 'review' },
                        now,
                      ),
                      records,
                      { size: 30, shuffle: false },
                    ),
                  )
                }
              />
              <PresetCard
                icon={<Sparkles />}
                hue="violet"
                title="学新题"
                description={`随机 ${dailyGoal} 道还没学过的题`}
                count={unlearned.length}
                onStart={() => startRandom(unlearned, dailyGoal)}
              />
              <PresetCard
                icon={<Shuffle />}
                hue="teal"
                title="随机抽查"
                description="从全部题目随机 10 道"
                count={visibleQuestions.length}
                onStart={() => startRandom(visibleQuestions, 10)}
              />
            </div>

            <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <SectionHeader
                  title="选择模块"
                  action={
                    options.modules.length > 0 ? (
                      <button
                        type="button"
                        className="hover:text-fg"
                        onClick={() => set('modules', [])}
                      >
                        清除选择（{options.modules.length}）
                      </button>
                    ) : (
                      '不选则包含全部模块'
                    )
                  }
                />
                <div className="space-y-6">
                  {groups.map((group) => {
                    const allSelected = group.modules.every((m) =>
                      options.modules.includes(m.module),
                    )
                    return (
                      <div key={group.name}>
                        <div className="mb-2 flex items-center justify-between text-xs text-fg-subtle">
                          <span>{group.name}</span>
                          <button
                            type="button"
                            className="hover:text-fg"
                            onClick={() => toggleGroup(group.modules)}
                          >
                            {allSelected ? '取消全选' : '全选'}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                          {group.modules.map((info) => (
                            <ModuleToggle
                              key={info.module}
                              info={info}
                              selected={options.modules.includes(info.module)}
                              onToggle={() => toggleModule(info.module)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <aside className="lg:sticky lg:top-20 lg:self-start">
                <Box padding="md" className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs text-fg-subtle">学习状态</p>
                    <SegmentedControl<StatusFilter>
                      label="学习状态"
                      size="sm"
                      className="flex w-full [&>*]:flex-1"
                      value={options.status}
                      onValueChange={(v) => set('status', v)}
                      options={[
                        { value: 'unmastered', label: '未掌握' },
                        { value: 'unlearned', label: '新题' },
                        { value: 'review', label: '待复习' },
                        { value: 'all', label: '全部' },
                      ]}
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-xs text-fg-subtle">难度</p>
                    <SegmentedControl<string>
                      label="难度"
                      size="sm"
                      className="flex w-full [&>*]:flex-1"
                      value={String(options.difficulty)}
                      onValueChange={(v) =>
                        set('difficulty', v === 'all' ? 'all' : (Number(v) as Difficulty))
                      }
                      options={[
                        { value: 'all', label: '全部' },
                        { value: '1', label: '初级' },
                        { value: '2', label: '中级' },
                        { value: '3', label: '高级' },
                      ]}
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-xs text-fg-subtle">题量</p>
                    <SegmentedControl<string>
                      label="题量"
                      size="sm"
                      className="flex w-full [&>*]:flex-1"
                      value={String(options.size)}
                      onValueChange={(v) =>
                        set('size', v === 'all' ? 'all' : (Number(v) as SizeOption))
                      }
                      options={[
                        { value: '10', label: '10' },
                        { value: '20', label: '20' },
                        { value: '30', label: '30' },
                        { value: 'all', label: '全部' },
                      ]}
                    />
                  </div>
                  <div className="border-y border-line">
                    <SwitchRow
                      id="practice-shuffle"
                      label="随机顺序"
                      description="关闭时待复习的题排在前面"
                      checked={options.shuffle}
                      onCheckedChange={(v) => set('shuffle', v)}
                    />
                  </div>

                  <div>
                    <p className="text-sm text-fg-muted">
                      符合条件{' '}
                      <span className="font-semibold text-fg tabular-nums">{pool.length}</span>{' '}
                      道，本次练习{' '}
                      <span className="font-semibold text-fg tabular-nums">
                        {sessionIds.length}
                      </span>{' '}
                      道
                    </p>
                    {preview.length > 0 ? (
                      <ul className="mt-3 space-y-1.5">
                        {preview.map((q) => (
                          <li key={q.id} className="flex items-center gap-2 text-xs text-fg-muted">
                            <StatusDot
                              tone={
                                records[q.id]?.status === 'review'
                                  ? 'warning'
                                  : records[q.id]?.status === 'mastered'
                                    ? 'success'
                                    : 'neutral'
                              }
                            />
                            <span className="min-w-0 flex-1 truncate">{q.question}</span>
                            <span className="shrink-0 text-fg-subtle">
                              {DIFFICULTY_LABELS[q.difficulty]}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full max-lg:hidden"
                    disabled={pool.length === 0}
                    onClick={startConfigured}
                  >
                    <Play />
                    开始练习
                  </Button>
                </Box>
              </aside>
            </div>

            {/* On stacked layouts the start button would sit below every module: keep it in reach. */}
            <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center gap-3 border-t border-line bg-canvas/90 px-4 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] backdrop-blur-md sm:-mx-8 sm:px-8 lg:hidden">
              <p className="min-w-0 flex-1 truncate text-xs text-fg-muted">
                {options.modules.length > 0 ? `${options.modules.length} 个模块 · ` : '全部模块 · '}
                本次 <span className="font-semibold text-fg tabular-nums">{sessionIds.length}</span>{' '}
                道
              </p>
              <Button variant="primary" disabled={pool.length === 0} onClick={startConfigured}>
                <Play />
                开始练习
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
