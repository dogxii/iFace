import {
  Bold,
  Check,
  Code,
  Eye,
  Heading2,
  ImagePlus,
  Link2,
  List,
  ListTodo,
  type LucideIcon,
  NotebookPen,
  PenLine,
  Quote,
  Table,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { SpeechInputButton } from '@/components/ui/SpeechInputButton'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import {
  deleteUnusedQuestionNoteImages,
  getQuestionNote,
  getQuestionNoteImages,
  putQuestionNote,
  putQuestionNoteImage,
} from '@/lib/db'
import { formatReviewNoteTime } from '@/lib/feedbackNote'
import type { Question, QuestionNote, QuestionNoteImage } from '@/types'
import {
  Button,
  cn,
  EmptyState,
  Kbd,
  SegmentedControl,
  Sheet,
  SheetContent,
  Spinner,
  Tooltip,
} from '@/ui'
import { appendSpeechTranscript } from './answerInput'

// ─── Question Notes ──────────────────────────────────────────────────────────

export interface QuestionNotesProps {
  questionId: string
  refreshKey: number
  autoFocus?: boolean
  onContentStateChange?: (hasContent: boolean) => void
}

export type NoteSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export const NOTE_IMAGE_SRC_PREFIX = 'iface-note-image:'
export const MAX_NOTE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

export const NOTE_FORMAT_ACTIONS = [
  { id: 'bold', label: 'B', title: '加粗' },
  { id: 'heading', label: 'H2', title: '二级标题' },
  { id: 'bullet', label: '- ', title: '无序列表' },
  { id: 'todo', label: '[ ]', title: '待办项' },
  { id: 'quote', label: '>', title: '引用' },
  { id: 'code', label: '</>', title: '代码块' },
  { id: 'link', label: 'link', title: '链接' },
  { id: 'table', label: 'table', title: '表格' },
] as const

export type NoteFormatActionId = (typeof NOTE_FORMAT_ACTIONS)[number]['id']

export function createLocalNoteImageId() {
  const cryptoId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `note-image-${Date.now()}-${cryptoId}`
}

export function sanitizeImageAlt(name: string) {
  const baseName = name.replace(/\.[^.]+$/, '').trim()
  return (baseName || '本地图片').replace(/[[\]\n\r]/g, ' ')
}

export function extractNoteImageIds(content: string): string[] {
  const ids = new Set<string>()
  const regex = /!\[[^\]]*]\(iface-note-image:([^)]+)\)/g
  let match = regex.exec(content)
  while (match) {
    if (match[1]) ids.add(match[1])
    match = regex.exec(content)
  }
  return Array.from(ids)
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('invalid image data'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('failed to read image'))
    reader.readAsDataURL(file)
  })
}

export function buildNoteInsertion(
  content: string,
  insertText: string,
  start: number,
  end: number,
): { nextContent: string; nextCursor: number } {
  const before = content.slice(0, start)
  const after = content.slice(end)
  const prefix = before.trim().length > 0 && !before.endsWith('\n\n') ? '\n\n' : ''
  const suffix = after.trim().length > 0 && !after.startsWith('\n\n') ? '\n\n' : ''
  const insertion = `${prefix}${insertText}${suffix}`

  return {
    nextContent: `${before}${insertion}${after}`,
    nextCursor: before.length + insertion.length,
  }
}

export function getSelectedLineRange(content: string, start: number, end: number) {
  const lineStart = content.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  const nextNewline = content.indexOf('\n', end)
  const lineEnd = nextNewline === -1 ? content.length : nextNewline
  return { lineStart, lineEnd }
}

export function prefixSelectedLines(
  content: string,
  start: number,
  end: number,
  prefix: string,
): { nextContent: string; nextCursor: number } {
  const { lineStart, lineEnd } = getSelectedLineRange(content, start, end)
  const block = content.slice(lineStart, lineEnd)
  const nextBlock = block
    .split('\n')
    .map((line) =>
      line.trim()
        ? `${prefix}${line.replace(/^(- \[ \] |- |\* |\d+\. |> )/, '')}`
        : prefix.trimEnd(),
    )
    .join('\n')

  return {
    nextContent: `${content.slice(0, lineStart)}${nextBlock}${content.slice(lineEnd)}`,
    nextCursor: lineStart + nextBlock.length,
  }
}

export function wrapSelection(
  content: string,
  start: number,
  end: number,
  before: string,
  after: string,
  fallback: string,
): { nextContent: string; nextCursor: number } {
  const selected = content.slice(start, end)
  const value = selected || fallback
  const insertion = `${before}${value}${after}`

  return {
    nextContent: `${content.slice(0, start)}${insertion}${content.slice(end)}`,
    nextCursor: selected ? start + insertion.length : start + before.length + value.length,
  }
}

export function applyNoteFormat(
  content: string,
  actionId: NoteFormatActionId,
  start: number,
  end: number,
): { nextContent: string; nextCursor: number } {
  switch (actionId) {
    case 'bold':
      return wrapSelection(content, start, end, '**', '**', '重点')
    case 'heading':
      return prefixSelectedLines(content, start, end, '## ')
    case 'bullet':
      return prefixSelectedLines(content, start, end, '- ')
    case 'todo':
      return prefixSelectedLines(content, start, end, '- [ ] ')
    case 'quote':
      return prefixSelectedLines(content, start, end, '> ')
    case 'code': {
      const selected = content.slice(start, end).trim()
      return buildNoteInsertion(content, `\`\`\`ts\n${selected || '代码'}\n\`\`\``, start, end)
    }
    case 'link':
      return wrapSelection(content, start, end, '[', '](https://)', '链接文字')
    case 'table':
      return buildNoteInsertion(content, '| 项目 | 说明 |\n| --- | --- |\n|  |  |', start, end)
  }
}

const NOTE_ACTION_ICONS: Record<NoteFormatActionId, LucideIcon> = {
  bold: Bold,
  heading: Heading2,
  bullet: List,
  todo: ListTodo,
  quote: Quote,
  code: Code,
  link: Link2,
  table: Table,
}

export function NoteToolbarButton({
  icon: Icon,
  title,
  onClick,
  disabled,
}: {
  icon: LucideIcon
  title: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Tooltip content={title}>
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-7 text-fg-subtle"
        onClick={onClick}
        disabled={disabled}
        aria-label={title}
      >
        <Icon />
      </Button>
    </Tooltip>
  )
}

export function QuestionNotes({
  questionId,
  refreshKey,
  autoFocus = false,
  onContentStateChange,
}: QuestionNotesProps) {
  const [content, setContent] = useState('')
  const [createdAt, setCreatedAt] = useState<number | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [noteImages, setNoteImages] = useState<Record<string, QuestionNoteImage>>({})
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<NoteSaveStatus>('idle')
  const [mode, setMode] = useState<'edit' | 'preview'>('preview')
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [imageImportError, setImageImportError] = useState<string | null>(null)

  const loadedContentRef = useRef('')
  const saveTimerRef = useRef<number | null>(null)
  const statusTimerRef = useRef<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const focusEditor = useCallback(() => {
    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }, [])

  const handleNoteSpeechTranscript = useCallback((transcript: string) => {
    setContent((prev) => appendSpeechTranscript(prev, transcript))
    setSpeechError(null)
    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }, [])

  const speech = useSpeechRecognition({
    lang: 'zh-CN',
    onFinalTranscript: handleNoteSpeechTranscript,
    onError: setSpeechError,
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey intentionally reloads the IndexedDB note after AI feedback is appended.
  useEffect(() => {
    let cancelled = false

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    speech.stop()
    setLoading(true)
    setSaveStatus('idle')
    setSpeechError(null)
    setImageImportError(null)

    Promise.all([getQuestionNote(questionId), getQuestionNoteImages(questionId)])
      .then(([note, images]: [QuestionNote | undefined, QuestionNoteImage[]]) => {
        if (cancelled) return
        const nextContent = note?.content ?? ''
        loadedContentRef.current = nextContent
        setContent(nextContent)
        setCreatedAt(note?.createdAt ?? null)
        setUpdatedAt(note?.updatedAt ?? null)
        setNoteImages(Object.fromEntries(images.map((image) => [image.id, image])))
        onContentStateChange?.(nextContent.trim().length > 0)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        loadedContentRef.current = ''
        setContent('')
        setCreatedAt(null)
        setUpdatedAt(null)
        setNoteImages({})
        onContentStateChange?.(false)
        setSaveStatus('error')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [questionId, refreshKey, onContentStateChange, speech.stop])

  useEffect(() => {
    if (!autoFocus || loading || mode !== 'edit') return
    focusEditor()
  }, [autoFocus, focusEditor, loading, mode])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
      if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (loading) return
    if (content === loadedContentRef.current) return

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current)

    setSaveStatus('saving')
    const nextContent = content

    saveTimerRef.current = window.setTimeout(async () => {
      const now = Date.now()
      try {
        await putQuestionNote({
          questionId,
          content: nextContent,
          createdAt: createdAt ?? now,
          updatedAt: now,
        })
        const keepImageIds = extractNoteImageIds(nextContent)
        await deleteUnusedQuestionNoteImages(questionId, keepImageIds)

        loadedContentRef.current = nextContent
        if (nextContent.trim()) {
          setCreatedAt((prev) => prev ?? now)
          setUpdatedAt(now)
          setNoteImages((prev) =>
            Object.fromEntries(keepImageIds.flatMap((id) => (prev[id] ? [[id, prev[id]]] : []))),
          )
        } else {
          setCreatedAt(null)
          setUpdatedAt(null)
          setNoteImages({})
        }
        onContentStateChange?.(nextContent.trim().length > 0)
        setSaveStatus('saved')
        statusTimerRef.current = window.setTimeout(() => setSaveStatus('idle'), 1600)
      } catch {
        setSaveStatus('error')
      }
    }, 650)

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [content, createdAt, loading, onContentStateChange, questionId])

  const handleModeChange = useCallback(
    (nextMode: 'edit' | 'preview') => {
      setMode(nextMode)
      if (nextMode === 'edit') focusEditor()
    },
    [focusEditor],
  )

  const handleApplyFormat = useCallback(
    (actionId: NoteFormatActionId) => {
      const editor = textareaRef.current
      const start = editor?.selectionStart ?? content.length
      const end = editor?.selectionEnd ?? content.length
      const { nextContent, nextCursor } = applyNoteFormat(content, actionId, start, end)

      setMode('edit')
      setContent(nextContent)
      window.setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.setSelectionRange(nextCursor, nextCursor)
      }, 0)
    },
    [content],
  )

  const handlePickImage = useCallback(() => {
    setMode('edit')
    setImageImportError(null)
    imageInputRef.current?.click()
  }, [])

  const handleImageFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return

      if (!file.type.startsWith('image/')) {
        setImageImportError('请选择图片文件')
        return
      }
      if (file.size > MAX_NOTE_IMAGE_SIZE_BYTES) {
        setImageImportError('图片不能超过 5MB')
        return
      }

      try {
        setImageImportError(null)
        const dataUrl = await readFileAsDataUrl(file)
        const now = Date.now()
        const image: QuestionNoteImage = {
          id: createLocalNoteImageId(),
          questionId,
          name: file.name || 'local-image',
          mimeType: file.type || 'image/*',
          size: file.size,
          dataUrl,
          createdAt: now,
          updatedAt: now,
        }
        const saved = await putQuestionNoteImage(image)
        const editor = textareaRef.current
        const start = editor?.selectionStart ?? content.length
        const end = editor?.selectionEnd ?? content.length
        const markdown = `![${sanitizeImageAlt(file.name)}](${NOTE_IMAGE_SRC_PREFIX}${saved.id})`
        const { nextContent, nextCursor } = buildNoteInsertion(content, markdown, start, end)

        setNoteImages((prev) => ({ ...prev, [saved.id]: saved }))
        setMode('edit')
        setContent(nextContent)
        window.setTimeout(() => {
          textareaRef.current?.focus()
          textareaRef.current?.setSelectionRange(nextCursor, nextCursor)
        }, 0)
      } catch {
        setImageImportError('图片导入失败')
      }
    },
    [content, questionId],
  )

  const handleNoteKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        handleApplyFormat('bold')
      }
    },
    [handleApplyFormat],
  )

  const resolveNoteImageSrc = useCallback(
    (src: string) => {
      if (!src.startsWith(NOTE_IMAGE_SRC_PREFIX)) return undefined
      const id = src.slice(NOTE_IMAGE_SRC_PREFIX.length)
      return noteImages[id]?.dataUrl
    },
    [noteImages],
  )

  const noteLength = content.trim().length

  const statusText =
    saveStatus === 'saving'
      ? '保存中…'
      : saveStatus === 'saved'
        ? '已保存'
        : saveStatus === 'error'
          ? '保存失败'
          : updatedAt
            ? `最后编辑 ${formatReviewNoteTime(updatedAt)}`
            : '自动保存'

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3 pb-2">
        <SegmentedControl
          size="sm"
          label="笔记模式"
          value={mode}
          onValueChange={handleModeChange}
          options={[
            { value: 'preview', label: '预览', icon: <Eye /> },
            { value: 'edit', label: '编辑', icon: <PenLine /> },
          ]}
        />
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-xs',
            saveStatus === 'error' ? 'text-danger' : 'text-fg-subtle',
          )}
        >
          {saveStatus === 'saved' ? <Check className="size-3.5 text-success" /> : null}
          {saveStatus === 'saving' ? <Spinner className="size-3" /> : null}
          {loading ? '加载中…' : statusText}
        </span>
      </div>

      {mode === 'edit' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-3">
          <div className="overflow-hidden rounded-xl border border-line-strong bg-canvas transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-3 focus-within:ring-ring/40">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />
            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-line px-1.5 py-1">
              <div className="flex flex-wrap items-center">
                {NOTE_FORMAT_ACTIONS.map((action) => (
                  <NoteToolbarButton
                    key={action.id}
                    icon={NOTE_ACTION_ICONS[action.id]}
                    title={action.id === 'bold' ? `${action.title} ⌘B` : action.title}
                    disabled={loading}
                    onClick={() => handleApplyFormat(action.id)}
                  />
                ))}
                <NoteToolbarButton
                  icon={ImagePlus}
                  title="导入本地图片"
                  disabled={loading}
                  onClick={handlePickImage}
                />
              </div>
              <div className="flex min-w-0 items-center gap-1.5">
                {speech.interimTranscript || speechError || imageImportError ? (
                  <span
                    title={speech.interimTranscript || speechError || imageImportError || undefined}
                    className={cn(
                      'max-w-[180px] truncate text-xs',
                      speechError || imageImportError ? 'text-danger' : 'text-accent',
                    )}
                  >
                    {speech.interimTranscript
                      ? `正在识别：${speech.interimTranscript}`
                      : speechError || imageImportError}
                  </span>
                ) : null}
                <SpeechInputButton
                  supported={speech.supported}
                  listening={speech.listening}
                  disabled={loading}
                  onToggle={speech.toggle}
                />
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleNoteKeyDown}
              disabled={loading}
              placeholder="记录自己的理解、易错点、面试表达、下次要追问的问题…"
              aria-label="题目笔记"
              rows={6}
              className="block min-h-[min(34dvh,340px)] w-full resize-y bg-transparent px-3.5 py-3 text-base leading-relaxed text-fg outline-none placeholder:text-fg-subtle max-sm:text-[16px]"
            />
          </div>
          {content.trim() ? (
            <div className="min-w-0">
              <p className="mb-1.5 text-2xs font-medium tracking-wide text-fg-subtle uppercase">
                预览
              </p>
              <div className="prose min-w-0 text-sm">
                <MarkdownRenderer content={content} resolveImageSrc={resolveNoteImageSrc} />
              </div>
            </div>
          ) : null}
        </div>
      ) : content.trim() ? (
        <div className="prose min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-3 text-sm">
          <MarkdownRenderer content={content} resolveImageSrc={resolveNoteImageSrc} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 px-4 pb-3">
          <EmptyState
            className="w-full border-0 pb-24"
            icon={<NotebookPen />}
            title="还没有笔记"
            description="记录自己的理解、易错点和面试表达，复习时一眼就能看到。"
            action={
              <Button size="sm" variant="secondary" onClick={() => handleModeChange('edit')}>
                <PenLine />
                开始记录
              </Button>
            }
          />
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between gap-2.5 border-t border-line px-4 py-2 text-xs text-fg-subtle">
        <span>支持 Markdown</span>
        <span className="tabular-nums">{noteLength.toLocaleString()} 字</span>
      </div>
    </div>
  )
}

export interface NoteDrawerProps {
  open: boolean
  onClose: () => void
  question: Question
  refreshKey: number
  onContentStateChange: (hasContent: boolean) => void
}

export function NoteDrawer({
  open,
  onClose,
  question,
  refreshKey,
  onContentStateChange,
}: NoteDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      {open ? (
        <SheetContent
          title="题目笔记"
          description={question.question}
          headerAction={<Kbd className="max-sm:hidden">N</Kbd>}
          bodyClassName="flex flex-col overflow-hidden"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <QuestionNotes
            questionId={question.id}
            refreshKey={refreshKey}
            autoFocus
            onContentStateChange={onContentStateChange}
          />
        </SheetContent>
      ) : null}
    </Sheet>
  )
}
