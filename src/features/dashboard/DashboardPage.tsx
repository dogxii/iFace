import {
  ArrowRight,
  BookOpen,
  Clock,
  Download,
  EyeOff,
  FileText,
  Play,
  Search,
  Shuffle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { dataSource } from '@/data/source'
import { PALETTE_SHORTCUT } from '@/features/command-palette/shortcut'
import { useQuestions } from '@/hooks/useQuestions'
import { type CategoryMap, DEFAULT_CATEGORY_MAP, getCategoryMap } from '@/lib/db'
import { createPracticeSessionPath } from '@/lib/practiceSession'
import { filterVisibleQuestions, getHiddenModules } from '@/lib/questionVisibility'
import { preloadPath } from '@/lib/routePreload'
import { useAuthState } from '@/store/useAuthStore'
import { useStudyState } from '@/store/useStudyStore'
import { useUIState } from '@/store/useUIStore'
import { DIFFICULTY_LABELS, type Question, type QuestionNote, type StudyStatus } from '@/types'
import {
  Box,
  Breadcrumb,
  Button,
  cn,
  EmptyState,
  Kbd,
  PageHeader,
  PageTitle,
  Progress,
  SectionHeader,
  Skeleton,
  Stat,
  StatGroup,
  StatusDot,
  type StatusTone,
  StepProgress,
  Tag,
} from '@/ui'
import {
  type ActivityDay,
  activityCalendar,
  estimateMinutes,
  greeting,
  lastStudiedQuestion,
  type ModuleProgress,
  moduleProgress,
  progressCounts,
} from './dashboardData'

const STATUS_TONE: Record<StudyStatus, StatusTone> = {
  mastered: 'success',
  review: 'warning',
  unlearned: 'neutral',
}
const STATUS_TEXT: Record<StudyStatus, string> = {
  mastered: '已掌握',
  review: '待复习',
  unlearned: '新题',
}

function useCategoryMap(): CategoryMap {
  const [map, setMap] = useState<CategoryMap>({ ...DEFAULT_CATEGORY_MAP })
  useEffect(() => {
    void getCategoryMap().then(setMap)
  }, [])
  return map
}

function useNotes(): QuestionNote[] {
  const [notes, setNotes] = useState<QuestionNote[]>([])
  useEffect(() => {
    let cancelled = false
    const load = () =>
      dataSource()
        .notes.list()
        .then((list) => !cancelled && setNotes(list))
        .catch(() => {})
    void load()
    window.addEventListener('focus', load)
    return () => {
      cancelled = true
      window.removeEventListener('focus', load)
    }
  }, [])
  return notes
}

function SearchButton() {
  const setPaletteOpen = useUIState((s) => s.setPaletteOpen)
  return (
    <button
      type="button"
      onClick={() => setPaletteOpen(true)}
      className="hidden h-8 w-64 items-center gap-2 rounded-lg border border-line bg-canvas px-2.5 text-sm text-fg-subtle transition-colors hover:border-line-strong sm:flex"
    >
      <Search className="size-4" />
      搜索题目、标签
      <Kbd className="ml-auto">{PALETTE_SHORTCUT}</Kbd>
    </button>
  )
}

function ContinueCard({
  question,
  status,
  dailyPath,
  todayCount,
  dailyGoal,
  masteredThisWeek,
}: {
  question: Question | undefined
  status: StudyStatus
  dailyPath: string
  todayCount: number
  dailyGoal: number
  masteredThisWeek: number
}) {
  const steps = Array.from({ length: dailyGoal }, (_, i) =>
    i < todayCount
      ? ('done' as const)
      : i === todayCount
        ? ('current' as const)
        : ('todo' as const),
  )
  const remaining = Math.max(0, dailyGoal - todayCount)

  return (
    <Box className="mt-8 grid overflow-hidden md:grid-cols-[1fr_300px]">
      <div className="p-6">
        {question ? (
          <>
            <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
              <Clock className="size-3.5" />
              {status === 'unlearned' ? '推荐从这里开始' : '继续上次'}
            </p>
            <h3 className="mt-2.5 text-lg leading-relaxed font-semibold tracking-tight text-fg">
              {question.question}
            </h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Tag>{question.module}</Tag>
              <Tag>{DIFFICULTY_LABELS[question.difficulty]}</Tag>
              {status !== 'unlearned' ? (
                <Tag dot={STATUS_TONE[status]}>{STATUS_TEXT[status]}</Tag>
              ) : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="primary" asChild>
                <Link to={`/questions/${question.id}`}>
                  继续
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild>
                <Link to={`/questions?module=${encodeURIComponent(question.module)}`}>
                  练习 {question.module} 模块
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <EmptyState
            className="border-0 py-6"
            title="还没有学习记录"
            description="从今日推荐开始第一道题吧。"
            action={
              <Button variant="primary" asChild>
                <Link to={dailyPath}>开始练习</Link>
              </Button>
            }
          />
        )}
      </div>
      <div className="flex flex-col border-t border-line p-6 md:border-t-0 md:border-l">
        <p className="text-xs text-fg-subtle">今日目标</p>
        <p className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums">
          {Math.min(todayCount, dailyGoal)}
          <span className="ml-1 text-md font-normal tracking-normal text-fg-subtle">
            / {dailyGoal}
          </span>
        </p>
        <StepProgress steps={steps} className="mt-3" label="今日目标进度" />
        <p className="mt-3 text-sm text-fg-muted">
          {remaining === 0
            ? '今日目标已完成，继续保持。'
            : `还差 ${remaining} 道，约 ${estimateMinutes(remaining)} 分钟。`}
        </p>
        {masteredThisWeek > 0 ? (
          <p className="mt-auto pt-4 text-xs text-success">本周新掌握 {masteredThisWeek} 道</p>
        ) : null}
      </div>
    </Box>
  )
}

const HEAT_BG = [
  'bg-[var(--ds-heat-0)]',
  'bg-[var(--ds-heat-1)]',
  'bg-[var(--ds-heat-2)]',
  'bg-[var(--ds-heat-3)]',
  'bg-[var(--ds-heat-4)]',
]

function ActivityHeatmap({ days }: { days: ActivityDay[] }) {
  const activeDays = days.filter((d) => d.count > 0).length
  const total = days.reduce((sum, d) => sum + d.count, 0)
  return (
    <Box padding="sm">
      <div className="grid grid-flow-col grid-rows-7 gap-[3px] [grid-auto-columns:minmax(0,1fr)]">
        {days.map((day) => (
          <span
            key={day.date}
            title={`${day.date} · ${day.count} 次`}
            className={cn('aspect-square rounded-[2px]', HEAT_BG[day.level])}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-fg-subtle">
        <span className="tabular-nums">
          {activeDays} 天 · {total} 次标记或笔记
        </span>
        <span className="flex items-center gap-1">
          少
          {HEAT_BG.map((bg) => (
            <span key={bg} className={cn('size-2.5 rounded-[2px]', bg)} />
          ))}
          多
        </span>
      </div>
    </Box>
  )
}

function ModuleList({ modules }: { modules: ModuleProgress[] }) {
  return (
    <div className="flex flex-col">
      {modules.map((m) => (
        <Link
          key={m.module}
          to={`/questions?module=${encodeURIComponent(m.module)}`}
          className="-mx-2 grid grid-cols-[96px_1fr_52px] items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-subtle"
        >
          <span className="truncate text-fg">{m.module}</span>
          <Progress
            size="xs"
            max={m.total}
            label={`${m.module} 进度`}
            segments={[
              { value: m.mastered, tone: 'fg' },
              { value: m.review, tone: 'warning' },
            ]}
          />
          <span className="text-right text-xs tabular-nums text-fg-subtle">
            {m.mastered}/{m.total}
          </span>
        </Link>
      ))}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { allQuestions, loading, initializing, getDailyIds } = useQuestions()
  const records = useStudyState((s) => s.records)
  const hiddenCategories = useStudyState((s) => s.hiddenCategories)
  const dailyGoal = useStudyState((s) => s.dailyGoal)
  const todayCount = useStudyState((s) => s.streak.todayCount)
  const user = useAuthState((s) => s.user)
  const openSettings = useUIState((s) => s.openSettings)
  const categoryMap = useCategoryMap()
  const notes = useNotes()
  const navigate = useNavigate()
  const [now] = useState(() => Date.now())

  const visibleQuestions = useMemo(
    () => filterVisibleQuestions(allQuestions, getHiddenModules(categoryMap, hiddenCategories)),
    [allQuestions, categoryMap, hiddenCategories],
  )
  const visibleIds = useMemo(() => visibleQuestions.map((q) => q.id), [visibleQuestions])
  const questionById = useMemo(
    () => new Map(visibleQuestions.map((q) => [q.id, q])),
    [visibleQuestions],
  )

  const [dailyIds, setDailyIds] = useState<string[]>([])
  useEffect(() => {
    if (visibleIds.length === 0) {
      setDailyIds([])
      return
    }
    let cancelled = false
    const recordMap = Object.fromEntries(
      Object.values(records).map((r) => [
        r.questionId,
        { status: r.status, lastUpdated: r.lastUpdated },
      ]),
    )
    void getDailyIds(recordMap, dailyGoal, visibleIds).then((ids) => !cancelled && setDailyIds(ids))
    return () => {
      cancelled = true
    }
  }, [visibleIds, records, dailyGoal, getDailyIds])

  const counts = useMemo(
    () => progressCounts(visibleQuestions, records, now),
    [visibleQuestions, records, now],
  )
  const modules = useMemo(
    () => moduleProgress(visibleQuestions, records, categoryMap, hiddenCategories),
    [visibleQuestions, records, categoryMap, hiddenCategories],
  )
  const activity = useMemo(() => activityCalendar(records, notes, now), [records, notes, now])
  const recentNotes = useMemo(
    () =>
      notes
        .filter((note) => note.content.trim() && questionById.has(note.questionId))
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 3),
    [notes, questionById],
  )
  const dailyQuestions = dailyIds.flatMap((id) => questionById.get(id) ?? [])
  const lastStudied = lastStudiedQuestion(visibleQuestions, records) ?? dailyQuestions[0]
  const dailyPath =
    dailyIds.length > 0 ? createPracticeSessionPath(dailyIds[0], dailyIds) : '/practice'
  const randomQuestion = () => {
    const unmastered = visibleQuestions.filter((q) => records[q.id]?.status !== 'mastered')
    const pool = unmastered.length > 0 ? unmastered : visibleQuestions
    const pick = pool[Math.floor(Math.random() * pool.length)]
    if (pick) navigate(`/questions/${pick.id}`)
  }

  const name = user?.name ?? user?.login
  const title = `${greeting(new Date(now).getHours())}${name ? `，${name}` : ''}`
  const description =
    counts.review > 0
      ? `有 ${counts.review} 道题待复习，今日推荐 ${dailyQuestions.length} 道，约 ${estimateMinutes(dailyQuestions.length)} 分钟。`
      : `共 ${counts.total} 道题，已掌握 ${counts.mastered} 道。今天从推荐的 ${dailyQuestions.length} 道题开始吧。`

  const hasNoQuestions = !loading && !initializing && allQuestions.length === 0
  const allHidden = allQuestions.length > 0 && visibleQuestions.length === 0

  return (
    <>
      <PageHeader title={<Breadcrumb items={[{ label: '概览' }]} />} actions={<SearchButton />} />
      <div className="mx-auto max-w-[1160px] px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        {initializing ? (
          <DashboardSkeleton />
        ) : hasNoQuestions ? (
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
        ) : allHidden ? (
          <EmptyState
            icon={<EyeOff />}
            title="所有题库都已隐藏"
            description="在设置的「学习偏好 → 题库展示」中重新开启需要练习的分类。"
            action={<Button onClick={() => openSettings('study')}>打开设置</Button>}
          />
        ) : (
          <>
            <PageTitle
              title={title}
              description={description}
              actions={
                <>
                  <Button size="lg" onClick={randomQuestion}>
                    <Shuffle />
                    随机一题
                  </Button>
                  <Button size="lg" variant="primary" asChild>
                    <Link to={dailyPath} onPointerEnter={() => preloadPath(dailyPath)}>
                      <Play />
                      开始今日练习
                    </Link>
                  </Button>
                </>
              }
            />

            <ContinueCard
              question={lastStudied}
              status={lastStudied ? (records[lastStudied.id]?.status ?? 'unlearned') : 'unlearned'}
              dailyPath={dailyPath}
              todayCount={todayCount}
              dailyGoal={dailyGoal}
              masteredThisWeek={counts.masteredThisWeek}
            />

            <StatGroup className="mt-4 grid-cols-2 divide-y md:grid-cols-4 md:divide-y-0">
              <Stat
                label="已掌握"
                indicator={<StatusDot tone="success" />}
                value={counts.mastered}
                unit={`/ ${counts.total}`}
                hint={
                  counts.total > 0
                    ? `${Math.round((counts.mastered / counts.total) * 100)}%`
                    : undefined
                }
              />
              <Stat
                label="待复习"
                indicator={<StatusDot tone="warning" />}
                value={counts.review}
                hint={counts.review > 0 ? '优先复习这些题' : '暂无堆积'}
              />
              <Stat
                label="笔记"
                indicator={<StatusDot />}
                value={notes.filter((n) => n.content.trim()).length}
              />
              <Stat
                label="预计完成"
                indicator={<StatusDot tone="accent" />}
                value={Math.ceil((counts.total - counts.mastered) / Math.max(1, dailyGoal))}
                unit="天"
                hint={`每天 ${dailyGoal} 题`}
              />
            </StatGroup>

            <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
              <div className="min-w-0">
                <SectionHeader
                  title="今日推荐"
                  action={<span>优先待复习，其次未学的高频题</span>}
                />
                <Box className="divide-y divide-line overflow-hidden">
                  {dailyQuestions.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-fg-subtle">
                      今天没有推荐的题目了。
                    </div>
                  ) : (
                    dailyQuestions.map((question) => {
                      const status = records[question.id]?.status ?? 'unlearned'
                      return (
                        <Link
                          key={question.id}
                          to={createPracticeSessionPath(question.id, dailyIds)}
                          className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-subtle/70 sm:grid-cols-[auto_1fr_120px_56px]"
                        >
                          <StatusDot tone={STATUS_TONE[status]} />
                          <span className="truncate text-fg">{question.question}</span>
                          <span className="hidden truncate text-xs text-fg-subtle sm:block">
                            {question.module} · {DIFFICULTY_LABELS[question.difficulty]}
                          </span>
                          <span className="text-right text-xs text-fg-muted">
                            {STATUS_TEXT[status]}
                          </span>
                        </Link>
                      )
                    })
                  )}
                </Box>

                {recentNotes.length > 0 ? (
                  <div className="mt-10">
                    <SectionHeader title="最近笔记" />
                    <div className="grid gap-3 sm:grid-cols-3">
                      {recentNotes.map((note) => {
                        const question = questionById.get(note.questionId)
                        return (
                          <Link key={note.questionId} to={`/questions/${note.questionId}`}>
                            <Box padding="sm" interactive className="h-full">
                              <p className="line-clamp-2 text-sm font-medium text-fg">
                                {question?.question}
                              </p>
                              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-fg-muted">
                                {note.content.replace(/[#>*`_-]/g, '').slice(0, 120)}
                              </p>
                            </Box>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="min-w-0">
                <SectionHeader title="活跃度" action="近 6 个月" />
                <ActivityHeatmap days={activity} />
                <SectionHeader
                  className="mt-8"
                  title="模块"
                  action={
                    <Link to="/questions" className="inline-flex items-center gap-1 hover:text-fg">
                      <BookOpen className="size-3.5" />
                      全部 {modules.length} 个
                    </Link>
                  }
                />
                <ModuleList modules={modules.slice(0, 8)} />
                {notes.length === 0 ? (
                  <p className="mt-6 flex items-center gap-1.5 text-xs text-fg-subtle">
                    <FileText className="size-3.5" />
                    在题目页按 <Kbd>N</Kbd> 记笔记，会出现在这里。
                  </p>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
