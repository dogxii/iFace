import { useCallback, useEffect, useRef, useState } from 'react'
import { Kbd } from '@/components/ui'
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
import { appendSpeechTranscript } from './answerInput'

// ─── Question Notes ──────────────────────────────────────────────────────────

export interface QuestionNotesProps {
  questionId: string
  refreshKey: number
  embedded?: boolean
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

export function NoteToolbarButton({
  label,
  title,
  onClick,
  disabled,
}: {
  label: string
  title: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        minWidth: 28,
        height: 26,
        padding: '0 7px',
        borderRadius: 7,
        border: '1px solid transparent',
        background: 'transparent',
        color: 'var(--text-3)',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: label === 'B' || label === 'H2' ? 'var(--font-sans)' : 'var(--font-mono)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color 0.15s, color 0.15s, background 0.15s',
      }}
      onMouseEnter={(event) => {
        if (disabled) return
        event.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.28)'
        event.currentTarget.style.color = 'var(--primary)'
        event.currentTarget.style.background = 'var(--primary-light)'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = 'transparent'
        event.currentTarget.style.color = 'var(--text-3)'
        event.currentTarget.style.background = 'transparent'
      }}
    >
      {label}
    </button>
  )
}

export function QuestionNotes({
  questionId,
  refreshKey,
  embedded = false,
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
  const [editorFocused, setEditorFocused] = useState(false)
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
    <div
      className={embedded ? 'animate-fade-in' : 'card animate-fade-in'}
      style={{
        padding: embedded ? 0 : 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        height: embedded ? '100%' : undefined,
        minHeight: embedded ? '100%' : undefined,
        minWidth: 0,
        overflow: embedded ? (mode === 'preview' ? 'hidden' : 'auto') : undefined,
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" />
              <path d="M8 7h6" />
              <path d="M8 11h8" />
            </svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>题目笔记</h2>
            <p
              style={{
                fontSize: 11,
                color: saveStatus === 'error' ? 'var(--danger)' : 'var(--text-3)',
                marginTop: 1,
              }}
            >
              {loading ? '加载中…' : statusText}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleModeChange(mode === 'edit' ? 'preview' : 'edit')}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            background: mode === 'edit' ? 'var(--primary)' : 'var(--surface-2)',
            color: mode === 'edit' ? 'white' : 'var(--text-2)',
            fontSize: 12,
            fontWeight: 500,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.55 : 1,
            flexShrink: 0,
          }}
          title={mode === 'edit' ? '完成编辑' : '编辑题目笔记'}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {mode === 'edit' ? (
              <polyline points="20 6 9 17 4 12" />
            ) : (
              <>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </>
            )}
          </svg>
          {mode === 'edit' ? '完成' : '编辑'}
        </button>
      </div>

      {mode === 'edit' ? (
        <>
          <div
            onFocusCapture={() => setEditorFocused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setEditorFocused(false)
              }
            }}
            style={{
              width: '100%',
              overflow: 'hidden',
              borderRadius: 10,
              border: `1px solid ${editorFocused ? 'var(--primary)' : 'var(--border-subtle)'}`,
              background: 'var(--surface-2)',
              boxShadow: editorFocused ? '0 0 0 3px var(--primary-light)' : 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          >
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              style={{ display: 'none' }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap',
                padding: '7px 8px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                {NOTE_FORMAT_ACTIONS.map((action) => (
                  <NoteToolbarButton
                    key={action.id}
                    label={action.label}
                    title={action.title}
                    disabled={loading}
                    onClick={() => handleApplyFormat(action.id)}
                  />
                ))}
                <NoteToolbarButton
                  label="img"
                  title="导入本地图片"
                  disabled={loading}
                  onClick={handlePickImage}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                {(speech.interimTranscript || speechError || imageImportError) && (
                  <span
                    title={speech.interimTranscript || speechError || imageImportError || undefined}
                    style={{
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 11,
                      color: speechError || imageImportError ? 'var(--danger)' : 'var(--primary)',
                    }}
                  >
                    {speech.interimTranscript
                      ? `正在识别：${speech.interimTranscript}`
                      : speechError || imageImportError}
                  </span>
                )}
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
              rows={6}
              style={{
                width: '100%',
                minHeight: embedded ? 'min(34dvh, 340px)' : 160,
                resize: 'vertical',
                padding: '12px 13px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text)',
                outline: 'none',
                fontSize: 16,
                lineHeight: 1.65,
                fontFamily: 'var(--font-sans)',
                flex: embedded ? '0 0 auto' : undefined,
                display: 'block',
              }}
            />
          </div>
          {content.trim() && (
            <div
              className="prose"
              style={{
                maxHeight: embedded ? 'min(24dvh, 260px)' : 220,
                overflowY: 'auto',
                padding: '8px 1px 2px',
                fontSize: 13,
                minWidth: 0,
              }}
            >
              <MarkdownRenderer content={content} resolveImageSrc={resolveNoteImageSrc} />
            </div>
          )}
        </>
      ) : content.trim() ? (
        <div
          className="prose"
          style={{
            flex: embedded ? '1 1 auto' : undefined,
            minHeight: embedded ? 0 : 160,
            overflowY: embedded ? 'auto' : undefined,
            padding: embedded ? '6px 8px 0 1px' : '6px 1px 0',
            fontSize: 13,
            minWidth: 0,
          }}
        >
          <MarkdownRenderer content={content} resolveImageSrc={resolveNoteImageSrc} />
        </div>
      ) : (
        <div
          style={{
            flex: embedded ? '1 1 auto' : undefined,
            minHeight: embedded ? 0 : 160,
            padding: '6px 1px 0',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-3)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            lineHeight: 1.65,
          }}
        >
          暂无笔记
        </div>
      )}

      {embedded && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            fontSize: 11,
            color: 'var(--text-3)',
            flexShrink: 0,
          }}
        >
          <span>{saveStatus === 'saving' ? '正在自动保存' : 'Markdown'}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {noteLength.toLocaleString()} 字
          </span>
        </div>
      )}
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
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => panelRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        aria-label="关闭题目笔记"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 169,
          background: 'rgba(0,0,0,0.28)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          animation: 'fade-in 0.16s var(--ease-out) both',
        }}
      />
      <aside
        ref={panelRef}
        className="note-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="题目笔记"
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 170,
          width: 'min(420px, 100vw)',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'drawer-slide-in 0.2s var(--ease-out) both',
          outline: 'none',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>题目笔记</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Kbd>N</Kbd>
                <Kbd>Esc</Kbd>
              </span>
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-3)',
                marginTop: 3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {question.question}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭题目笔记"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'hidden',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <QuestionNotes
            questionId={question.id}
            refreshKey={refreshKey}
            embedded
            autoFocus
            onContentStateChange={onContentStateChange}
          />
        </div>
      </aside>
    </>
  )
}
