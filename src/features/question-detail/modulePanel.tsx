import { PanelLeft, PanelLeftClose, Search, X } from 'lucide-react'
import { type KeyboardEvent, type MouseEvent, useEffect, useMemo, useRef } from 'react'
import { clamp, MODULE_PANEL } from '@/app/layout'
import { ModuleMark } from '@/components/ModuleMark'
import { type ModuleStatusFilter, useUIState } from '@/store/useUIStore'
import { DIFFICULTY_LABELS, type Question, type StudyStatus } from '@/types'
import {
  Button,
  cn,
  Input,
  Kbd,
  ResizeHandle,
  SegmentedControl,
  Sheet,
  SheetContent,
  StatusDot,
  type StatusTone,
  Tooltip,
} from '@/ui'
import type { DetailLayout } from './sidePanel'

const MODULE_QUESTION_STATUS_FILTERS: ModuleStatusFilter[] = [
  'all',
  'unlearned',
  'review',
  'mastered',
]

const FILTER_LABEL: Record<ModuleStatusFilter, string> = {
  all: '全部',
  unlearned: '未学',
  review: '待复习',
  mastered: '已掌握',
}

const STATUS_TONE: Record<StudyStatus, StatusTone> = {
  mastered: 'success',
  review: 'warning',
  unlearned: 'neutral',
}

interface ListProps {
  question: Question
  questions: Question[]
  records: Record<string, { status: StudyStatus } | undefined>
  onNavigate: (questionId: string) => void
}

export interface ModuleQuestionPanelProps extends ListProps {
  layout: DetailLayout
  /** The sheet used when the list can't dock (narrow screens, or not pinned). */
  sheetOpen: boolean
  onSheetOpenChange: (open: boolean) => void
}

/**
 * Question list of the current module (or practice session). Docked to the left of the detail
 * page on wide screens so it can stay open while you work through questions; a left sheet
 * otherwise.
 */
export function ModuleQuestionPanel({
  layout,
  sheetOpen,
  onSheetOpenChange,
  ...list
}: ModuleQuestionPanelProps) {
  const setPinned = useUIState((s) => s.setModulePanelPinned)
  const setWidth = useUIState((s) => s.setModulePanelWidth)
  const pin = (pinned: boolean) => {
    setPinned(pinned)
    if (pinned) onSheetOpenChange(false)
  }
  const currentIndex = list.questions.findIndex((item) => item.id === list.question.id)
  const position =
    currentIndex >= 0 ? `第 ${currentIndex + 1} / ${list.questions.length} 题` : undefined

  if (layout.moduleDocked) {
    return (
      <aside
        aria-label="本模块题目"
        style={{ width: layout.moduleWidth }}
        className="fixed inset-y-0 left-[var(--sidebar-w)] z-20 flex flex-col border-r border-line bg-canvas"
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || event.defaultPrevented) return
          // Don't also close the side panel on the right.
          event.preventDefault()
          pin(false)
        }}
      >
        <header className="flex h-13 shrink-0 items-center gap-2.5 border-b border-line pr-2 pl-4">
          <ModuleMark moduleKey={list.question.moduleKey} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-fg">{list.question.module}</p>
            {position ? (
              <p className="truncate text-2xs text-fg-subtle tabular-nums">{position}</p>
            ) : null}
          </div>
          <Tooltip content="收起题目列表" shortcut="L" side="bottom">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="收起题目列表"
              onClick={() => pin(false)}
            >
              <PanelLeftClose />
            </Button>
          </Tooltip>
        </header>
        <ModuleQuestionList {...list} docked />
        <ResizeHandle
          edge="right"
          label="调整题目列表宽度"
          value={layout.moduleWidth}
          min={MODULE_PANEL.min}
          max={layout.moduleMaxWidth}
          onResize={(raw) =>
            setWidth(Math.round(clamp(raw, MODULE_PANEL.min, layout.moduleMaxWidth)))
          }
          onReset={() => setWidth(MODULE_PANEL.default)}
        />
      </aside>
    )
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={onSheetOpenChange}>
      {sheetOpen ? (
        <SheetContent
          side="left"
          width={400}
          title={list.question.module}
          description={position}
          headerAction={
            layout.moduleCanDock ? (
              <Tooltip content="固定在页面左侧" side="bottom">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="固定在页面左侧"
                  onClick={() => pin(true)}
                >
                  <PanelLeft />
                </Button>
              </Tooltip>
            ) : (
              <Kbd className="max-sm:hidden">L</Kbd>
            )
          }
          bodyClassName="flex flex-col overflow-hidden"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <ModuleQuestionList {...list} docked={false} />
        </SheetContent>
      ) : null}
    </Sheet>
  )
}

function ModuleQuestionList({
  question,
  questions,
  records,
  onNavigate,
  docked,
}: ListProps & { docked: boolean }) {
  const listRef = useRef<HTMLDivElement>(null)
  const query = useUIState((s) => s.moduleListQuery)
  const setQuery = useUIState((s) => s.setModuleListQuery)
  const statusFilter = useUIState((s) => s.moduleListStatus)
  const setStatusFilter = useUIState((s) => s.setModuleListStatus)
  const normalizedQuery = query.trim().toLowerCase()

  const statusCounts = useMemo(() => {
    const counts: Record<StudyStatus, number> = { unlearned: 0, review: 0, mastered: 0 }
    for (const item of questions) counts[records[item.id]?.status ?? 'unlearned'] += 1
    return counts
  }, [records, questions])

  const filteredQuestions = useMemo(
    () =>
      questions.filter((item) => {
        const status = records[item.id]?.status ?? 'unlearned'
        if (statusFilter !== 'all' && status !== statusFilter) return false
        if (!normalizedQuery) return true
        return (
          item.question.toLowerCase().includes(normalizedQuery) ||
          item.id.toLowerCase().includes(normalizedQuery) ||
          item.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
          item.source?.toLowerCase().includes(normalizedQuery)
        )
      }),
    [normalizedQuery, records, questions, statusFilter],
  )

  // Bring the current question into view when the list (re)mounts.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[aria-current="true"]')
      ?.scrollIntoView({ block: 'center' })
    if (!docked) listRef.current?.focus({ preventScroll: true })
  }, [docked])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-module-item]') ?? [],
    )
    if (items.length === 0) return
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    let next = -1
    if (event.key === 'ArrowDown') next = index < 0 ? 0 : Math.min(index + 1, items.length - 1)
    else if (event.key === 'ArrowUp') next = index < 0 ? 0 : Math.max(index - 1, 0)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else if (event.key === ' ' || event.key === 'Enter') {
      // Let the focused item handle it; keep page shortcuts (Space = reveal) out of the way.
      event.stopPropagation()
      return
    }
    if (next < 0) return
    event.preventDefault()
    event.stopPropagation()
    items[next].focus()
  }

  const handleItemClick = (event: MouseEvent<HTMLButtonElement>, id: string) => {
    // A mouse click shouldn't leave focus on the list, or page shortcuts would stop working.
    if (event.detail > 0) event.currentTarget.blur()
    onNavigate(id)
  }

  return (
    <>
      <div className="flex shrink-0 flex-col gap-2.5 border-b border-line px-3 py-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              listRef.current?.querySelector<HTMLElement>('button[data-module-item]')?.focus()
            }
          }}
          placeholder="搜索题目、标签或来源"
          aria-label="搜索本模块题目"
          leading={<Search />}
          trailing={
            query ? (
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6"
                aria-label="清空搜索"
                onClick={() => setQuery('')}
              >
                <X />
              </Button>
            ) : null
          }
        />
        <SegmentedControl
          size="sm"
          label="按状态筛选"
          className="w-full [&>*]:flex-1 [&>*]:px-1"
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={MODULE_QUESTION_STATUS_FILTERS.map((value) => ({
            value,
            label: (
              <span className="inline-flex items-center gap-1">
                {FILTER_LABEL[value]}
                <span className="text-fg-subtle tabular-nums">
                  {value === 'all' ? questions.length : statusCounts[value]}
                </span>
              </span>
            ),
          }))}
        />
      </div>

      {/* biome-ignore lint/a11y/noStaticElementInteractions: arrow-key roving across the item buttons */}
      <div
        ref={listRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-1.5 outline-none"
      >
        {filteredQuestions.length === 0 ? (
          <p className="m-2 rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-fg-subtle">
            没有匹配的题目
          </p>
        ) : (
          filteredQuestions.map((item) => {
            const itemStatus = records[item.id]?.status ?? 'unlearned'
            const active = item.id === question.id
            const itemIndex = questions.indexOf(item)
            return (
              <button
                key={item.id}
                type="button"
                data-module-item
                aria-current={active ? 'true' : undefined}
                onClick={(event) => handleItemClick(event, item.id)}
                className={cn(
                  'group grid w-full grid-cols-[24px_minmax(0,1fr)] gap-2.5 rounded-lg px-2 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'bg-accent-subtle' : 'hover:bg-subtle',
                )}
              >
                <span
                  className={cn(
                    'mt-px grid h-5 place-items-center rounded text-2xs font-semibold tabular-nums',
                    active ? 'bg-accent text-accent-fg' : 'text-fg-subtle',
                  )}
                >
                  {itemIndex + 1}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span
                    className={cn(
                      'line-clamp-2 text-sm leading-snug',
                      active ? 'font-medium text-fg' : 'text-fg',
                    )}
                  >
                    {item.question}
                  </span>
                  <span className="flex min-w-0 items-center gap-2.5 text-xs text-fg-subtle">
                    <span className="inline-flex shrink-0 items-center gap-1.5">
                      <StatusDot tone={STATUS_TONE[itemStatus]} />
                      {FILTER_LABEL[itemStatus]}
                    </span>
                    <span className="shrink-0">{DIFFICULTY_LABELS[item.difficulty]}</span>
                    {item.tags.length > 0 ? (
                      <span className="truncate">
                        {item.tags
                          .slice(0, 2)
                          .map((tag) => `#${tag}`)
                          .join('  ')}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            )
          })
        )}
      </div>
    </>
  )
}
