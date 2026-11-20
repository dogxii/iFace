import { Search, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { DIFFICULTY_LABELS, type Question, type StudyStatus } from '@/types'
import {
  Button,
  cn,
  Input,
  Kbd,
  SegmentedControl,
  Sheet,
  SheetContent,
  StatusDot,
  type StatusTone,
} from '@/ui'

export type ModuleQuestionStatusFilter = 'all' | StudyStatus

export const MODULE_QUESTION_STATUS_FILTERS: ModuleQuestionStatusFilter[] = [
  'all',
  'unlearned',
  'review',
  'mastered',
]

const FILTER_LABEL: Record<ModuleQuestionStatusFilter, string> = {
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

export interface ModuleQuestionDrawerProps {
  open: boolean
  onClose: () => void
  question: Question
  questions: Question[]
  records: Record<string, { status: StudyStatus } | undefined>
  onNavigate: (questionId: string) => void
}

export function ModuleQuestionDrawer({ open, onClose, ...rest }: ModuleQuestionDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      {open ? <ModuleQuestionSheet onClose={onClose} {...rest} /> : null}
    </Sheet>
  )
}

function ModuleQuestionSheet({
  onClose,
  question,
  questions,
  records,
  onNavigate,
}: Omit<ModuleQuestionDrawerProps, 'open'>) {
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ModuleQuestionStatusFilter>('all')

  const currentIndex = questions.findIndex((item) => item.id === question.id)
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

  return (
    <SheetContent
      width={480}
      title="本模块题库"
      description={
        <>
          {question.module}
          {currentIndex >= 0 ? ` · 第 ${currentIndex + 1} / ${questions.length} 题` : ''}
        </>
      }
      headerAction={<Kbd className="max-sm:hidden">L</Kbd>}
      onOpenAutoFocus={(event) => {
        event.preventDefault()
        listRef.current
          ?.querySelector<HTMLElement>('[aria-current="true"]')
          ?.scrollIntoView({ block: 'center' })
        listRef.current?.focus({ preventScroll: true })
      }}
    >
      <div className="sticky top-0 z-10 flex flex-col gap-2.5 border-b border-line bg-elevated px-4 py-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索本模块题目、标签或来源"
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
          className="w-full [&>*]:flex-1"
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

      <div ref={listRef} tabIndex={-1} className="flex flex-col p-2 outline-none">
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
                type="button"
                key={item.id}
                aria-current={active ? 'true' : undefined}
                onClick={() => (active ? onClose() : onNavigate(item.id))}
                className={cn(
                  'group grid w-full grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors',
                  active ? 'bg-accent-subtle' : 'hover:bg-subtle',
                )}
              >
                <span
                  className={cn(
                    'mt-px grid size-7 place-items-center rounded-md text-xs font-semibold tabular-nums',
                    active ? 'bg-accent text-accent-fg' : 'bg-muted text-fg-subtle',
                  )}
                >
                  {itemIndex + 1}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span
                    className={cn(
                      'line-clamp-2 text-sm leading-snug',
                      active ? 'font-semibold text-fg' : 'font-medium text-fg',
                    )}
                  >
                    {item.question}
                  </span>
                  <span className="flex min-w-0 items-center gap-2.5 text-xs text-fg-subtle">
                    <span className="inline-flex shrink-0 items-center gap-1.5">
                      <StatusDot tone={STATUS_TONE[itemStatus]} />
                      {FILTER_LABEL[itemStatus]}
                    </span>
                    <span>{DIFFICULTY_LABELS[item.difficulty]}</span>
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
    </SheetContent>
  )
}
