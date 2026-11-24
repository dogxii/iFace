import { ArrowRight, Check, CheckCheck, Lightbulb, Play, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DifficultyBars } from '@/components/DifficultyBars'
import { ModuleDot } from '@/components/ModuleMark'
import { relativeTime } from '@/features/question-list/listQuery'
import { useQuestions } from '@/hooks/useQuestions'
import { createPracticeSessionPath } from '@/lib/practiceSession'
import { useStudyState } from '@/store/useStudyStore'
import { DIFFICULTY_LABELS } from '@/types'
import {
  Box,
  Breadcrumb,
  Button,
  Callout,
  cn,
  EmptyState,
  PageHeader,
  PageTitle,
  Select,
  Skeleton,
  Stat,
  StatGroup,
  StatusDot,
  Tooltip,
  toast,
} from '@/ui'
import {
  buildWeakItems,
  countByModule,
  daysToClear,
  sortWeakItems,
  WEAK_SORT_OPTIONS,
  type WeakItem,
  type WeakSort,
  weakStats,
} from './weakPoints'

export default function WeakPointsPage() {
  const navigate = useNavigate()
  const { allQuestions, initializing } = useQuestions()
  const records = useStudyState((s) => s.records)
  const setStatus = useStudyState((s) => s.setStatus)
  const restoreRecords = useStudyState((s) => s.restoreRecords)
  const dailyGoal = useStudyState((s) => s.dailyGoal)
  const [module, setModule] = useState<string | null>(null)
  const [sort, setSort] = useState<WeakSort>('oldest')
  const [now] = useState(() => Date.now())

  const items = useMemo(
    () => buildWeakItems(allQuestions, records, now),
    [allQuestions, records, now],
  )
  const modules = useMemo(() => countByModule(items), [items])
  const stats = useMemo(() => weakStats(items), [items])
  const activeModule = module && modules.some((m) => m.module === module) ? module : null

  const displayItems = useMemo(
    () =>
      sortWeakItems(
        activeModule ? items.filter((i) => i.question.module === activeModule) : items,
        sort,
      ),
    [activeModule, items, sort],
  )
  const sessionIds = useMemo(() => displayItems.map((i) => i.question.id), [displayItems])

  const startSession = (firstId = sessionIds[0]) => {
    if (!firstId) return
    navigate(createPracticeSessionPath(firstId, sessionIds))
  }

  const markMastered = async (targets: WeakItem[]) => {
    if (targets.length === 0) return
    const previous = targets.map((t) => t.record)
    for (const { question } of targets) await setStatus(question.id, 'mastered')
    toast.success(targets.length === 1 ? '已标为掌握' : `已将 ${targets.length} 道题标为掌握`, {
      description: targets.length === 1 ? targets[0].question.question : undefined,
      action: { label: '撤销', onClick: () => restoreRecords(previous) },
    })
  }

  const header = (
    <PageHeader
      title={<Breadcrumb items={[{ label: '薄弱点' }]} />}
      actions={
        sessionIds.length > 0 ? (
          <Button variant="primary" size="sm" onClick={() => startSession()}>
            <Play />
            集中攻克
          </Button>
        ) : null
      }
    />
  )

  if (initializing) {
    return (
      <>
        {header}
        <div className="mx-auto max-w-[960px] px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-6 h-[84px] w-full rounded-xl" />
          <Box className="mt-6 divide-y divide-line">
            {Array.from({ length: 6 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
              <div key={i} className="flex items-center gap-3 px-4 py-4">
                <Skeleton className="size-6 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </Box>
        </div>
      </>
    )
  }

  return (
    <>
      {header}
      <div className="mx-auto max-w-[960px] px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <PageTitle
          title="薄弱点"
          description="标记为「待复习」的题目会在第二天到期，优先攻克最久没碰的。"
        />

        {items.length === 0 ? (
          <EmptyState
            className="mt-8 py-20"
            icon={<Target />}
            title="暂无待复习题目"
            description="刷题时把没把握的题标为「待复习」，它们会出现在这里。"
            action={
              <Button asChild variant="primary" size="sm">
                <Link to="/questions">
                  去刷题
                  <ArrowRight />
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <StatGroup className="mt-6 grid-cols-2 divide-y md:grid-cols-4 md:divide-y-0">
              <Stat
                label="待复习"
                indicator={<StatusDot tone="warning" />}
                value={stats.total}
                unit="道"
              />
              <Stat
                label="今天到期"
                indicator={<StatusDot tone={stats.due > 0 ? 'danger' : 'neutral'} />}
                value={stats.due}
                unit="道"
                hint={stats.due > 0 ? '建议今天过一遍' : '明天再来'}
              />
              <Stat label="平均复习" value={stats.avgReviewCount.toFixed(1)} unit="次" />
              <Stat
                label="最久未复习"
                value={stats.oldest ? relativeTime(stats.oldest, now) : '—'}
              />
            </StatGroup>

            {modules.length > 1 ? (
              <div
                role="toolbar"
                aria-label="按模块筛选"
                className="-mx-4 mt-6 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
              >
                <ModuleChip
                  label="全部"
                  count={items.length}
                  active={activeModule === null}
                  onClick={() => setModule(null)}
                />
                {modules.map((m) => (
                  <ModuleChip
                    key={m.module}
                    module={m.module}
                    label={m.module}
                    count={m.count}
                    active={activeModule === m.module}
                    onClick={() => setModule(activeModule === m.module ? null : m.module)}
                  />
                ))}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Select
                  value={sort}
                  onValueChange={(v) => setSort(v as WeakSort)}
                  options={WEAK_SORT_OPTIONS}
                  size="sm"
                  label="排序"
                  className="w-36"
                />
                <span className="text-sm text-fg-subtle tabular-nums">
                  {displayItems.length} 道题
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => markMastered(displayItems)}>
                <CheckCheck />
                {activeModule ? `本模块全部标为掌握` : '全部标为掌握'}
              </Button>
            </div>

            <Box className="mt-3 divide-y divide-line overflow-hidden">
              {displayItems.map((item, index) => (
                <WeakRow
                  key={item.question.id}
                  item={item}
                  rank={index + 1}
                  now={now}
                  onOpen={() => startSession(item.question.id)}
                  onMastered={() => markMastered([item])}
                />
              ))}
            </Box>

            {displayItems.length >= 10 ? (
              <Callout tone="accent" icon={<Lightbulb />} className="mt-6" title="分批攻克更有效">
                共 {displayItems.length} 道薄弱题，按每天 {dailyGoal} 道的目标，约{' '}
                {daysToClear(displayItems.length, dailyGoal)} 天可以全部过一遍。
              </Callout>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}

function ModuleChip({
  module,
  label,
  count,
  active,
  onClick,
}: {
  module?: string
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
        active
          ? 'border-accent bg-accent-subtle text-fg'
          : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
      )}
    >
      {module ? <ModuleDot module={module} /> : null}
      {label}
      <span className={cn('tabular-nums', active ? 'text-accent' : 'text-fg-subtle')}>{count}</span>
    </button>
  )
}

function WeakRow({
  item,
  rank,
  now,
  onOpen,
  onMastered,
}: {
  item: WeakItem
  rank: number
  now: number
  onOpen: () => void
  onMastered: () => void
}) {
  const { question, record, due } = item
  return (
    <div className="group relative flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-subtle/70">
      <span
        className={cn(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-2xs font-semibold tabular-nums',
          rank <= 3 ? 'bg-danger-subtle text-danger' : 'bg-muted text-fg-subtle',
        )}
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          to={`/questions/${question.id}`}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey) return
            event.preventDefault()
            onOpen()
          }}
          className="line-clamp-2 text-base font-medium text-fg after:absolute after:inset-0"
        >
          {question.question}
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
          <span className="inline-flex items-center gap-1.5 text-fg-muted">
            <ModuleDot module={question.module} />
            {question.module}
          </span>
          <span className="inline-flex items-center">
            <DifficultyBars value={question.difficulty} />
            {DIFFICULTY_LABELS[question.difficulty]}
          </span>
          <span>{relativeTime(record.lastUpdated, now)}标记</span>
          {record.reviewCount > 0 ? <span>复习 {record.reviewCount} 次</span> : null}
          {question.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="max-sm:hidden">
              #{tag}
            </span>
          ))}
        </div>
      </div>
      <div className="relative z-10 flex shrink-0 items-center gap-1.5 self-center">
        {due ? null : (
          <Tooltip content="标记不满一天，明天再复习效果更好">
            <span className="text-xs text-fg-subtle max-sm:hidden">明天到期</span>
          </Tooltip>
        )}
        <Tooltip content="标为已掌握">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`将「${question.question}」标为已掌握`}
            onClick={onMastered}
            className="text-fg-subtle hover:text-success md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          >
            <Check />
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}
