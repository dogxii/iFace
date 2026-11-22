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
import { recoverNoteDraft, stashNoteDraft } from '@/lib/noteDraft'
import type { QuestionNote, QuestionNoteImage } from '@/types'
import { Button, cn, Spinner, Tooltip } from '@/ui'
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
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [imageImportError, setImageImportError] = useState<string | null>(null)

  const loadedContentRef = useRef('')
  const saveTimerRef = useRef<number | null>(null)
  const statusTimerRef = useRef<number | null>(null)
  /** Edit waiting for the autosave debounce; written immediately on question change / unmount. */
  const pendingRef = useRef<QuestionNote | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const onContentStateChangeRef = useRef(onContentStateChange)
  onContentStateChangeRef.current = onContentStateChange

  const focusEditor = useCallback((cursor?: 'end') => {
    window.setTimeout(() => {
      const editor = textareaRef.current
      if (!editor) return
      editor.focus()
      if (cursor === 'end') editor.setSelectionRange(editor.value.length, editor.value.length)
    }, 0)
  }, [])

  const handleNoteSpeechTranscript = useCallback(
    (transcript: string) => {
      setContent((prev) => appendSpeechTranscript(prev, transcript))
      setSpeechError(null)
      focusEditor('end')
    },
    [focusEditor],
  )

  const speech = useSpeechRecognition({
    lang: 'zh-CN',
    onFinalTranscript: handleNoteSpeechTranscript,
    onError: setSpeechError,
  })

  /** Write `note` and drop images it no longer references. */
  const persist = useCallback(async (note: QuestionNote) => {
    await putQuestionNote(note)
    await deleteUnusedQuestionNoteImages(note.questionId, extractNoteImageIds(note.content))
  }, [])

  /** Save a pending edit right away instead of waiting for the debounce. */
  const flushPending = useCallback(() => {
    const pending = pendingRef.current
    if (!pending) return
    pendingRef.current = null
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    void persist(pending).catch(() => {})
  }, [persist])

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey intentionally reloads the IndexedDB note after AI feedback is appended.
  useEffect(() => {
    let cancelled = false

    flushPending()
    speech.stop()
    setLoading(true)
    setSaveStatus('idle')
    setSpeechError(null)
    setImageImportError(null)

    recoverNoteDraft()
      .then(() => Promise.all([getQuestionNote(questionId), getQuestionNoteImages(questionId)]))
      .then(([note, images]: [QuestionNote | undefined, QuestionNoteImage[]]) => {
        if (cancelled) return
        const nextContent = note?.content ?? ''
        loadedContentRef.current = nextContent
        setContent(nextContent)
        setCreatedAt(note?.createdAt ?? null)
        setUpdatedAt(note?.updatedAt ?? null)
        setNoteImages(Object.fromEntries(images.map((image) => [image.id, image])))
        // Existing notes open for reading; an empty note opens ready to type.
        setMode(nextContent.trim() ? 'preview' : 'edit')
        onContentStateChangeRef.current?.(nextContent.trim().length > 0)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        loadedContentRef.current = ''
        setContent('')
        setCreatedAt(null)
        setUpdatedAt(null)
        setNoteImages({})
        setMode('edit')
        onContentStateChangeRef.current?.(false)
        setSaveStatus('error')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [questionId, refreshKey, flushPending, speech.stop])

  useEffect(() => {
    if (!autoFocus || loading || mode !== 'edit') return
    focusEditor('end')
  }, [autoFocus, focusEditor, loading, mode])

  useEffect(() => {
    // Reloads and tab closes don't unmount React, and an IndexedDB write started now may not
    // finish, so also stash the pending edit synchronously for recovery on the next load.
    const onPageHide = () => {
      if (pendingRef.current) stashNoteDraft(pendingRef.current)
      flushPending()
    }
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      flushPending()
      if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current)
    }
  }, [flushPending])

  useEffect(() => {
    if (loading) return
    if (content === loadedContentRef.current) return

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current)

    setSaveStatus('saving')
    const now = Date.now()
    const note: QuestionNote = {
      questionId,
      content,
      createdAt: createdAt ?? now,
      updatedAt: now,
    }
    pendingRef.current = note

    saveTimerRef.current = window.setTimeout(async () => {
      if (pendingRef.current !== note) return
      pendingRef.current = null
      try {
        await persist(note)
        loadedContentRef.current = note.content
        if (note.content.trim()) {
          const keepImageIds = extractNoteImageIds(note.content)
          setCreatedAt((prev) => prev ?? note.createdAt)
          setUpdatedAt(note.updatedAt)
          setNoteImages((prev) =>
            Object.fromEntries(keepImageIds.flatMap((id) => (prev[id] ? [[id, prev[id]]] : []))),
          )
        } else {
          setCreatedAt(null)
          setUpdatedAt(null)
          setNoteImages({})
        }
        onContentStateChangeRef.current?.(note.content.trim().length > 0)
        setSaveStatus('saved')
        statusTimerRef.current = window.setTimeout(() => setSaveStatus('idle'), 1600)
      } catch {
        setSaveStatus('error')
      }
    }, 650)
  }, [content, createdAt, loading, persist, questionId])

  const switchMode = useCallback(
    (nextMode: 'edit' | 'preview') => {
      setMode(nextMode)
      if (nextMode === 'edit') focusEditor('end')
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
      const mod = event.metaKey || event.ctrlKey
      if (mod && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        handleApplyFormat('bold')
      } else if (mod && event.key === 'Enter') {
        // ⌘↵ finishes editing and shows the rendered note.
        event.preventDefault()
        if (content.trim()) switchMode('preview')
      }
    },
    [content, handleApplyFormat, switchMode],
  )

  const resolveNoteImageSrc = useCallback(
    (src: string) => {
      if (!src.startsWith(NOTE_IMAGE_SRC_PREFIX)) return undefined
      const id = src.slice(NOTE_IMAGE_SRC_PREFIX.length)
      return noteImages[id]?.dataUrl
    },
    [noteImages],
  )

  const hasContent = content.trim().length > 0
  const statusText =
    saveStatus === 'saving'
      ? '保存中…'
      : saveStatus === 'saved'
        ? '已保存'
        : saveStatus === 'error'
          ? '保存失败'
          : updatedAt
            ? `编辑于 ${formatReviewNoteTime(updatedAt)}`
            : '自动保存'
  const notice = speech.interimTranscript
    ? `正在识别：${speech.interimTranscript}`
    : speechError || imageImportError

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line px-2">
        {mode === 'edit' ? (
          <div
            role="toolbar"
            aria-label="笔记格式"
            className="flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none]"
          >
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
              title="插入本地图片"
              disabled={loading}
              onClick={handlePickImage}
            />
          </div>
        ) : (
          <p className="min-w-0 flex-1 truncate px-1.5 text-xs text-fg-subtle">点击正文开始编辑</p>
        )}
        <Tooltip content={mode === 'edit' ? '预览 ⌘↵' : '编辑'}>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-fg-muted"
            disabled={loading || (mode === 'edit' && !hasContent)}
            onClick={() => switchMode(mode === 'edit' ? 'preview' : 'edit')}
          >
            {mode === 'edit' ? <Eye /> : <PenLine />}
            {mode === 'edit' ? '预览' : '编辑'}
          </Button>
        </Tooltip>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-fg-subtle">
          <Spinner />
        </div>
      ) : mode === 'edit' ? (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleNoteKeyDown}
          placeholder={'记录自己的理解、易错点、面试时怎么说…\n\n支持 Markdown，⌘B 加粗，⌘↵ 预览'}
          aria-label="题目笔记"
          className="block min-h-0 w-full flex-1 resize-none overflow-y-auto overscroll-contain bg-transparent px-4 py-3.5 text-sm leading-[1.75] text-fg outline-none placeholder:text-fg-subtle"
        />
      ) : (
        // biome-ignore lint/a11y/noStaticElementInteractions: click-to-edit shortcut on rendered text; the 编辑 button is the keyboard path
        <div
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a, button, input, summary')) return
            if (document.getSelection()?.toString()) return
            switchMode('edit')
          }}
          className="prose min-h-0 min-w-0 flex-1 cursor-text overflow-y-auto overscroll-contain px-4 py-3.5 text-sm"
        >
          <MarkdownRenderer content={content} resolveImageSrc={resolveNoteImageSrc} />
        </div>
      )}

      <div className="flex h-9 shrink-0 items-center gap-2 border-t border-line pr-1.5 pl-4 text-xs text-fg-subtle">
        <output
          className={cn(
            'inline-flex min-w-0 items-center gap-1.5',
            saveStatus === 'error' && 'text-danger',
          )}
        >
          {saveStatus === 'saved' ? <Check className="size-3.5 text-success" /> : null}
          {saveStatus === 'saving' ? <Spinner className="size-3" /> : null}
          <span className="truncate">{notice ?? statusText}</span>
        </output>
        <span className="ml-auto shrink-0 tabular-nums">
          {content.trim().length.toLocaleString()} 字
        </span>
        <SpeechInputButton
          supported={speech.supported}
          listening={speech.listening}
          disabled={loading}
          onToggle={() => {
            setMode('edit')
            speech.toggle()
          }}
        />
      </div>
    </div>
  )
}
