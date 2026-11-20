import {
  ArrowUpDown,
  Download,
  FileText,
  LayoutGrid,
  Play,
  Search,
  SearchX,
  Star,
  X,
} from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { dataSource } from '@/data/source'
import { useQuestions } from '@/hooks/useQuestions'
import { type CategoryMap, DEFAULT_CATEGORY_MAP, getCategoryMap } from '@/lib/db'
import { createPracticeSessionPath } from '@/lib/practiceSession'
import { filterVisibleQuestions, getHiddenModules } from '@/lib/questionVisibility'
import { useStudyState } from '@/store/useStudyStore'
import {
  DIFFICULTY_LABELS,
  type Difficulty,
  type Question,
  type QuestionNote,
  type StudyStatus,
} from '@/types'
import {
  Box,
  Breadcrumb,
  Button,
  cn,
  EmptyState,
  Input,
  Kbd,
  PageHeader,
  PageTitle,
  ProgressRing,
  Select,
  Skeleton,
  StatusDot,
  type StatusTone,
  Tooltip,
} from '@/ui'
import {
  buildListParams,
  hasActiveFilters,
  type ListQuery,
  parseListQuery,
  relativeTime,
  runListQuery,
  SORT_OPTIONS,
  type SortValue,
} from './listQuery'

const PAGE_SIZE = 30
const STATUS_TONE: Record<StudyStatus, StatusTone> = {
  mastered: 'success',
  review: 'warning',
  unlearned: 'neutral',
}
const STATUS_LABEL: Record<StudyStatus, string> = {
  mastered: '已掌握',
  review: '待复习',
  unlearned: '未学习',
}

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null
  return Boolean(
    el?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName ?? ''),
  )
}

function useQuestionMeta() {
  const [notes, setNotes] = useState<Map<string, QuestionNote>>(new Map())
  const [starred, setStarred] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [noteList, starredIds] = await Promise.all([
        dataSource()
          .notes.list()
          .catch(() => []),
        dataSource()
          .flags.starredIds()
          .catch(() => []),
      ])
      if (cancelled) return
      setNotes(new Map(noteList.filter((n) => n.content.trim()).map((n) => [n.questionId, n])))
      setStarred(new Set(starredIds))
    }
    void load()
    window.addEventListener('focus', load)
    return () => {
      cancelled = true
      window.removeEventListener('focus', load)
    }
  }, [])

  const toggleStar = useCallback((questionId: string) => {
    setStarred((prev) => {
      const next = new Set(prev)
      const value = !next.has(questionId)
      if (value) next.add(questionId)
      else next.delete(questionId)
      void dataSource().flags.setStarred(questionId, value)
      return next
    })
  }, [])

  return { notes, starred, toggleStar }
}

function DifficultyBars({ value }: { value: Difficulty }) {
  return (
    <span className="mr-1.5 inline-flex h-3 items-end gap-0.5" aria-hidden>
      {[5, 8, 12].map((h, i) => (
        <span
          key={h}
          style={{ height: h }}
          className={cn('w-[3px] rounded-[1px]', i < value ? 'bg-fg' : 'bg-line-strong')}
        />
      ))}
    </span>
  )
}

function Highlight({ text, keyword }: { text: string; keyword: string }) {
  const k = keyword.trim()
  if (!k) return text
  const index = text.toLowerCase().indexOf(k.toLowerCase())
  if (index === -1) return text
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-[3px] bg-accent-subtle px-0.5 text-inherit">
        {text.slice(index, index + k.length)}
      </mark>
      {text.slice(index + k.length)}
    </>
  )
}

interface ModuleEntry {
  module: string
  total: number
  mastered: number
}

function CategoryPanel({
  groups,
  query,
  counts,
  onSelect,
}: {
  groups: { name: string; modules: ModuleEntry[] }[]
  query: ListQuery
  counts: { all: number; starred: number; notes: number }
  onSelect: (patch: Partial<ListQuery>) => void
}) {
  const single = query.modules.length === 1 ? query.modules[0] : null
  const allActive = query.modules.length === 0 && !query.starredOnly && !query.notesOnly
  const item = (
    key: string,
    active: boolean,
    icon: ReactNode,
    label: ReactNode,
    count: number,
    onClick: () => void,
  ) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      aria-current={active || undefined}
      className={cn(
        'flex h-[30px] w-full items-center gap-2.5 rounded-md px-2 text-left text-sm text-fg-muted transition-colors hover:bg-muted/70 hover:text-fg',
        active && 'bg-muted font-medium text-fg',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-xs tabular-nums text-fg-subtle">{count}</span>
    </button>
  )

  return (
    <nav aria-label="题库分类" className="flex flex-col gap-px">
      {item(
        'all',
        allActive,
        <LayoutGrid className="size-4 text-fg-subtle" />,
        '全部题目',
        counts.all,
        () => onSelect({ modules: [], starredOnly: false, notesOnly: false }),
      )}
      {item(
        'starred',
        query.starredOnly,
        <Star className="size-4 text-amber-500" />,
        '重点题',
        counts.starred,
        () => onSelect({ starredOnly: !query.starredOnly }),
      )}
      {item(
        'notes',
        query.notesOnly,
        <FileText className="size-4 text-fg-subtle" />,
        '有笔记',
        counts.notes,
        () => onSelect({ notesOnly: !query.notesOnly }),
      )}
      {groups.map((group) => {
        const total = group.modules.reduce((sum, m) => sum + m.total, 0)
        const mastered = group.modules.reduce((sum, m) => sum + m.mastered, 0)
        return (
          <div key={group.name} className="mt-3">
            <div className="flex justify-between px-2 pb-1 text-xs text-fg-subtle">
              <span>{group.name}</span>
              <span className="tabular-nums">
                {mastered} / {total}
              </span>
            </div>
            {group.modules.map((m) =>
              item(
                m.module,
                single === m.module,
                <ProgressRing value={m.mastered} max={m.total} size={14} stroke={2.5} />,
                m.module,
                m.total,
                () => onSelect({ modules: single === m.module ? [] : [m.module] }),
              ),
            )}
          </div>
        )
      })}
    </nav>
  )
}

function QuestionRow({
  question,
  status,
  lastUpdated,
  noteHit,
  hasNote,
  starred,
  keyword,
  now,
  onToggleStar,
}: {
  question: Question
  status: StudyStatus
  lastUpdated?: number
  noteHit?: string
  hasNote: boolean
  starred: boolean
  keyword: string
  now: number
  onToggleStar: () => void
}) {
  return (
    <div className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-subtle/70 md:grid-cols-[auto_1fr_104px_76px_84px_auto]">
      <StatusDot tone={STATUS_TONE[status]} label={STATUS_LABEL[status]} />
      <div className="min-w-0">
        <Link
          to={`/questions/${question.id}${noteHit ? '?note=1' : ''}`}
          className="block truncate text-base font-medium text-fg after:absolute after:inset-0"
        >
          <Highlight text={question.question} keyword={keyword} />
        </Link>
        {noteHit ? (
          <p className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-md bg-accent-subtle px-2 py-0.5 text-xs text-fg-muted">
            <FileText className="size-3 shrink-0 text-accent" />
            <span className="truncate">
              笔记命中：
              <Highlight text={noteHit} keyword={keyword} />
            </span>
          </p>
        ) : question.tags.length > 0 ? (
          <p className="mt-0.5 truncate text-xs text-fg-subtle">
            {question.tags
              .slice(0, 4)
              .map((tag) => `#${tag}`)
              .join('  ')}
          </p>
        ) : null}
      </div>
      <span className="hidden truncate text-sm text-fg-muted md:block">{question.module}</span>
      <span className="hidden items-center text-xs text-fg-subtle md:flex">
        <DifficultyBars value={question.difficulty} />
        {DIFFICULTY_LABELS[question.difficulty]}
      </span>
      <span className="hidden text-xs text-fg-subtle md:block">
        {lastUpdated ? relativeTime(lastUpdated, now) : '—'}
      </span>
      <div className="relative z-10 flex items-center gap-0.5">
        <Tooltip content={starred ? '取消重点' : '标为重点'}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={starred ? '取消重点' : '标为重点'}
            aria-pressed={starred}
            onClick={onToggleStar}
            className={cn(
              !starred &&
                'opacity-60 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100',
            )}
          >
            <Star className={cn(starred && 'fill-amber-400 text-amber-500')} />
          </Button>
        </Tooltip>
        <FileText
          aria-label={hasNote ? '有笔记' : undefined}
          aria-hidden={!hasNote}
          className={cn('size-4', hasNote ? 'text-fg-muted' : 'invisible')}
        />
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <Box className="divide-y divide-line">
      {Array.from({ length: 8 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
        <div key={i} className="flex items-center gap-3 px-4 py-4">
          <Skeleton className="size-1.5 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-20 md:block" />
        </div>
      ))}
    </Box>
  )
}

export default function QuestionListPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => parseListQuery(params), [params])
  const { allQuestions, initializing } = useQuestions()
  const records = useStudyState((s) => s.records)
  const hiddenCategories = useStudyState((s) => s.hiddenCategories)
  const { notes, starred, toggleStar } = useQuestionMeta()
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({ ...DEFAULT_CATEGORY_MAP })
  const [page, setPage] = useState(1)
  const [now] = useState(() => Date.now())
  const [searchText, setSearchText] = useState(query.search)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void getCategoryMap().then(setCategoryMap)
  }, [])

  const update = useCallback(
    (patch: Partial<ListQuery>) => {
      setPage(1)
      setParams(buildListParams({ ...parseListQuery(params), ...patch }), { replace: true })
    },
    [params, setParams],
  )

  // Debounce typing into the URL; keep the box in sync when the URL changes elsewhere.
  useEffect(() => {
    if (searchText === query.search) return
    const t = setTimeout(() => update({ search: searchText }), 250)
    return () => clearTimeout(t)
  }, [searchText, query.search, update])
  useEffect(
    () =>
      setSearchText((current) => (current.trim() === query.search.trim() ? current : query.search)),
    [query.search],
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping()) return
      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        update({ notesOnly: !query.notesOnly })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [update, query.notesOnly])

  const visibleQuestions = useMemo(
    () => filterVisibleQuestions(allQuestions, getHiddenModules(categoryMap, hiddenCategories)),
    [allQuestions, categoryMap, hiddenCategories],
  )

  const groups = useMemo(() => {
    const byModule = new Map<string, ModuleEntry>()
    for (const q of visibleQuestions) {
      const entry = byModule.get(q.module) ?? { module: q.module, total: 0, mastered: 0 }
      entry.total++
      if (records[q.id]?.status === 'mastered') entry.mastered++
      byModule.set(q.module, entry)
    }
    const used = new Set<string>()
    const result: { name: string; modules: ModuleEntry[] }[] = []
    const categories = Object.entries(categoryMap).sort(
      ([, a], [, b]) => (a.order ?? 99) - (b.order ?? 99),
    )
    for (const [name, category] of categories) {
      if (hiddenCategories.has(name)) continue
      const modules = category.modules.flatMap((m) => {
        const entry = byModule.get(m)
        if (!entry || used.has(m)) return []
        used.add(m)
        return [entry]
      })
      if (modules.length > 0) result.push({ name: category.name || name, modules })
    }
    const rest = [...byModule.values()].filter((m) => !used.has(m.module))
    if (rest.length > 0) result.push({ name: '其他', modules: rest })
    return result
  }, [visibleQuestions, records, categoryMap, hiddenCategories])

  const result = useMemo(
    () => runListQuery(visibleQuestions, query, { records, notes, starred }),
    [visibleQuestions, query, records, notes, starred],
  )
  const shown = result.questions.slice(0, page * PAGE_SIZE)

  const scope = useMemo(() => {
    const inScope = visibleQuestions.filter(
      (q) => query.modules.length === 0 || query.modules.includes(q.module),
    )
    let mastered = 0
    let review = 0
    for (const q of inScope) {
      const s = records[q.id]?.status
      if (s === 'mastered') mastered++
      else if (s === 'review') review++
    }
    return { total: inScope.length, mastered, review }
  }, [visibleQuestions, query.modules, records])

  const title =
    query.modules.length === 1
      ? query.modules[0]
      : query.modules.length > 1
        ? `${query.modules.length} 个模块`
        : query.starredOnly
          ? '重点题'
          : query.notesOnly
            ? '有笔记的题'
            : '全部题目'

  const practice = () => {
    const ids = result.questions.map((q) => q.id)
    if (ids.length > 0) navigate(createPracticeSessionPath(ids[0], ids))
  }

  const chips: { key: string; label: string; clear: Partial<ListQuery> }[] = [
    ...(query.modules.length > 1
      ? [{ key: 'm', label: `模块：${query.modules.join('、')}`, clear: { modules: [] } }]
      : []),
    ...(query.statuses.length > 0
      ? [
          {
            key: 's',
            label: `状态：${query.statuses.map((s) => STATUS_LABEL[s]).join('、')}`,
            clear: { statuses: [] },
          },
        ]
      : []),
    ...(query.difficulties.length > 0
      ? [
          {
            key: 'd',
            label: `难度：${query.difficulties.map((d) => DIFFICULTY_LABELS[d]).join('、')}`,
            clear: { difficulties: [] },
          },
        ]
      : []),
    ...(query.search.trim()
      ? [{ key: 'q', label: `搜索：${query.search.trim()}`, clear: { search: '' } }]
      : []),
  ]

  const statusValue =
    query.statuses.length === 1
      ? query.statuses[0]
      : query.statuses.length === 2 && !query.statuses.includes('mastered')
        ? 'unmastered'
        : 'all'
  const difficultyValue = query.difficulties.length === 1 ? String(query.difficulties[0]) : 'all'

  return (
    <>
      <PageHeader
        title={
          <Breadcrumb
            items={[
              {
                label: '题库',
                onClick: query.modules.length > 0 ? () => update({ modules: [] }) : undefined,
              },
              ...(query.modules.length === 1 ? [{ label: query.modules[0] }] : []),
            ]}
          />
        }
        actions={
          <Button variant="ghost" asChild>
            <Link to="/import">
              <Download />
              导入
            </Link>
          </Button>
        }
      />
      <div className="grid lg:grid-cols-[228px_1fr]">
        <aside className="sticky top-13 hidden h-[calc(100dvh-52px)] overflow-y-auto border-r border-line px-3 py-5 lg:block">
          <CategoryPanel
            groups={groups}
            query={query}
            counts={{
              all: visibleQuestions.length,
              starred: visibleQuestions.filter((q) => starred.has(q.id)).length,
              notes: visibleQuestions.filter((q) => notes.has(q.id)).length,
            }}
            onSelect={update}
          />
        </aside>

        <main className="min-w-0 px-4 py-7 sm:px-8 lg:px-9">
          <PageTitle
            title={title}
            description={`${scope.total} 道题 · 已掌握 ${scope.mastered} · 待复习 ${scope.review} · 未学 ${scope.total - scope.mastered - scope.review}`}
            actions={
              <Button
                variant="primary"
                size="lg"
                onClick={practice}
                disabled={result.questions.length === 0}
              >
                <Play />
                练习这 {result.questions.length} 道
              </Button>
            }
          />

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Input
              ref={searchRef}
              className="w-full sm:w-80"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearchText('')}
              placeholder="搜索题目、标签、模块或笔记"
              aria-label="搜索题目"
              leading={<Search />}
              trailing={<Kbd>/</Kbd>}
            />
            <div className="lg:hidden">
              <Select
                label="模块"
                prefix="模块"
                value={query.modules.length === 1 ? query.modules[0] : 'all'}
                onValueChange={(v) => update({ modules: v === 'all' ? [] : [v] })}
                options={[
                  { value: 'all', label: '全部' },
                  ...groups.flatMap((g) =>
                    g.modules.map((m) => ({ value: m.module, label: m.module })),
                  ),
                ]}
              />
            </div>
            <Select
              label="学习状态"
              prefix="状态"
              value={statusValue}
              onValueChange={(v) =>
                update({
                  statuses:
                    v === 'all'
                      ? []
                      : v === 'unmastered'
                        ? ['unlearned', 'review']
                        : [v as StudyStatus],
                })
              }
              options={[
                { value: 'all', label: '全部' },
                { value: 'unmastered', label: '未掌握' },
                { value: 'unlearned', label: '未学习' },
                { value: 'review', label: '待复习' },
                { value: 'mastered', label: '已掌握' },
              ]}
            />
            <Select
              label="难度"
              prefix="难度"
              value={difficultyValue}
              onValueChange={(v) =>
                update({ difficulties: v === 'all' ? [] : [Number(v) as Difficulty] })
              }
              options={[
                { value: 'all', label: '全部' },
                { value: '1', label: '初级' },
                { value: '2', label: '中级' },
                { value: '3', label: '高级' },
              ]}
            />
            <div className="sm:ml-auto">
              <Select
                label="排序"
                prefix={<ArrowUpDown className="size-3.5" />}
                value={query.sort}
                onValueChange={(v) => update({ sort: v as SortValue })}
                options={SORT_OPTIONS}
              />
            </div>
          </div>

          {chips.length > 0 || hasActiveFilters(query) ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-fg-subtle">
              <span className="mr-1 tabular-nums">{result.questions.length} 个结果</span>
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => {
                    if (chip.key === 'q') setSearchText('')
                    update(chip.clear)
                  }}
                  className="inline-flex h-6 items-center gap-1 rounded-full bg-muted pr-1.5 pl-2.5 text-fg hover:bg-line"
                >
                  {chip.label}
                  <X className="size-3 text-fg-subtle" />
                </button>
              ))}
              <button
                type="button"
                className="ml-1 hover:text-fg"
                onClick={() => {
                  setSearchText('')
                  update({
                    modules: [],
                    statuses: [],
                    difficulties: [],
                    starredOnly: false,
                    notesOnly: false,
                    search: '',
                  })
                }}
              >
                清除全部
              </button>
            </div>
          ) : null}

          <div className="mt-4">
            {initializing ? (
              <ListSkeleton />
            ) : result.questions.length === 0 ? (
              <EmptyState
                icon={<SearchX />}
                title={
                  query.starredOnly
                    ? '还没有重点题'
                    : query.notesOnly
                      ? '还没有题目笔记'
                      : '没有匹配的题目'
                }
                description={
                  query.starredOnly
                    ? '在题目页点星标，就能在这里集中复习。'
                    : query.notesOnly
                      ? '在题目页按 N 打开笔记，记录理解或保存 AI 复盘。'
                      : '换个关键词，或清除部分筛选条件。'
                }
                action={
                  hasActiveFilters(query) ? (
                    <Button
                      onClick={() => {
                        setSearchText('')
                        update({
                          modules: [],
                          statuses: [],
                          difficulties: [],
                          starredOnly: false,
                          notesOnly: false,
                          search: '',
                        })
                      }}
                    >
                      清除筛选
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <Box className="overflow-hidden">
                <div className="hidden grid-cols-[auto_1fr_104px_76px_84px_auto] gap-3 border-b border-line bg-subtle px-4 py-2 text-xs text-fg-subtle md:grid">
                  <span className="w-1.5" />
                  <span>题目</span>
                  <span>模块</span>
                  <span>难度</span>
                  <span>上次复习</span>
                  <span className="w-[52px]" />
                </div>
                <div className="divide-y divide-line">
                  {shown.map((question) => (
                    <QuestionRow
                      key={question.id}
                      question={question}
                      status={records[question.id]?.status ?? 'unlearned'}
                      lastUpdated={records[question.id]?.lastUpdated}
                      noteHit={result.noteHits.get(question.id)}
                      hasNote={notes.has(question.id)}
                      starred={starred.has(question.id)}
                      keyword={query.search}
                      now={now}
                      onToggleStar={() => toggleStar(question.id)}
                    />
                  ))}
                </div>
              </Box>
            )}
          </div>

          {result.questions.length > 0 ? (
            <div className="mt-4 flex items-center justify-between text-xs text-fg-subtle">
              <span className="tabular-nums">
                显示 {shown.length} / {result.questions.length}
              </span>
              {shown.length < result.questions.length ? (
                <Button onClick={() => setPage((p) => p + 1)}>加载更多</Button>
              ) : null}
            </div>
          ) : null}
        </main>
      </div>
    </>
  )
}
