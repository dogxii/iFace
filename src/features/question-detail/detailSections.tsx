import { ChevronDown, ChevronRight, Eye, NotebookPen, RotateCcw, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DIFFICULTY_TONE } from '@/components/DifficultyBars'
import { ModuleMark } from '@/components/ModuleMark'
import { DIFFICULTY_LABELS, type Question, type StudyStatus } from '@/types'
import { Kbd, Tag, Tooltip, Button as UIButton } from '@/ui'

export function DetailBreadcrumb({
  module,
  position,
  moduleOpen,
  onOpenModule,
}: {
  module: string
  /** e.g. "3 / 20" */
  position: string
  moduleOpen: boolean
  onOpenModule: () => void
}) {
  return (
    <nav aria-label="面包屑" className="flex min-w-0 items-center gap-1.5">
      <Link to="/questions" className="shrink-0 hover:text-fg">
        题库
      </Link>
      <ChevronRight className="size-3.5 shrink-0 text-line-strong" />
      <button
        type="button"
        onClick={onOpenModule}
        aria-label={`展开${module}题目列表`}
        aria-expanded={moduleOpen}
        title="展开本模块题目列表（L）"
        className="inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md px-1.5 hover:bg-muted hover:text-fg"
      >
        <ModuleMark module={module} size="sm" />
        <span className="truncate">{module}</span>
        <ChevronDown className="size-3.5 shrink-0" />
      </button>
      <ChevronRight className="size-3.5 shrink-0 text-line-strong" />
      <span className="shrink-0 font-medium tabular-nums text-fg">{position}</span>
    </nav>
  )
}

/** Tags, title, review count and the reveal button above the answer. */
export function QuestionIntro({
  question,
  status,
  reviewCount,
  starred,
  hasNote,
  answerVisible,
  onToggleStarred,
  onOpenNote,
  onReveal,
}: {
  question: Question
  status: StudyStatus
  reviewCount: number
  starred: boolean
  hasNote: boolean
  answerVisible: boolean
  onToggleStarred: () => void
  onOpenNote: () => void
  onReveal: () => void
}) {
  const noteLabel = hasNote ? '打开题目笔记' : '添加题目笔记'
  const starLabel = starred ? '取消重点题' : '标记为重点题'
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Tag className="pl-1">
          <ModuleMark module={question.module} size="sm" />
          {question.module}
        </Tag>
        <Tag dot={DIFFICULTY_TONE[question.difficulty]}>
          {DIFFICULTY_LABELS[question.difficulty]}
        </Tag>
        {status !== 'unlearned' && (
          <Tag variant={status === 'mastered' ? 'success' : 'warning'}>
            {status === 'mastered' ? '已掌握' : '待复习'}
          </Tag>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip content={starLabel}>
            <UIButton
              variant="ghost"
              size="icon"
              onClick={onToggleStarred}
              aria-pressed={starred}
              aria-label={starLabel}
            >
              <Star className={starred ? 'fill-amber-400 text-amber-500' : undefined} />
            </UIButton>
          </Tooltip>
          <Tooltip content={noteLabel} shortcut="N">
            <UIButton
              variant="ghost"
              size="icon"
              onClick={onOpenNote}
              aria-label={noteLabel}
              className="relative"
            >
              <NotebookPen className={hasNote ? 'text-accent' : undefined} />
              {hasNote ? (
                <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent" />
              ) : null}
            </UIButton>
          </Tooltip>
        </div>
      </div>

      <h1 className="text-2xl leading-[1.45] font-semibold tracking-tight text-fg sm:text-3xl sm:leading-[1.45]">
        {question.question}
      </h1>

      {(question.tags.length > 0 || reviewCount > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-subtle">
          {reviewCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <RotateCcw className="size-3.5" />
              复习 {reviewCount} 次
            </span>
          )}
          {question.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      )}

      {!answerVisible && (
        <button
          type="button"
          onClick={onReveal}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-5 text-sm font-medium text-fg-muted transition-colors hover:border-accent hover:bg-accent-subtle hover:text-accent"
        >
          <Eye className="size-4" />
          查看参考答案
          <Kbd className="max-sm:hidden">Space</Kbd>
        </button>
      )}
    </header>
  )
}
