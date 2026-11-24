import { Eraser, MessageSquarePlus, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { AnswerAnnotationColor, QuestionAnswerAnnotation } from '@/types'
import { Button, cn } from '@/ui'

// ─── Answer Annotations ──────────────────────────────────────────────────────

export type AnswerSelectionDraft = {
  start: number
  end: number
  text: string
  top: number
  left: number
  placement: 'top' | 'bottom'
  toolbar: 'floating' | 'bottom'
}

export const ANSWER_ANNOTATION_COLORS: AnswerAnnotationColor[] = ['yellow', 'green', 'blue', 'pink']

export const ANSWER_ANNOTATION_HIGHLIGHT_NAMES: Record<AnswerAnnotationColor, string> = {
  yellow: 'iface-answer-annotation-yellow',
  green: 'iface-answer-annotation-green',
  blue: 'iface-answer-annotation-blue',
  pink: 'iface-answer-annotation-pink',
}

export const ANSWER_COMMENT_DESKTOP_CLOSE_DELAY = 20
export const ANSWER_COMMENT_MOBILE_SCROLL_CLOSE_DISTANCE = 28

export function getAnswerAnnotationColor(color: AnswerAnnotationColor): {
  background: string
  dot: string
} {
  switch (color) {
    case 'green':
      return {
        background: 'rgba(16,185,129,0.14)',
        dot: '#10b981',
      }
    case 'blue':
      return {
        background: 'rgba(59,130,246,0.13)',
        dot: '#3b82f6',
      }
    case 'pink':
      return {
        background: 'rgba(236,72,153,0.13)',
        dot: '#ec4899',
      }
    default:
      return {
        background: 'rgba(245,158,11,0.16)',
        dot: '#f59e0b',
      }
  }
}

export function answerAnnotationRangesOverlap(
  left: Pick<QuestionAnswerAnnotation, 'start' | 'end'>,
  right: Pick<QuestionAnswerAnnotation, 'start' | 'end'>,
): boolean {
  return left.start < right.end && right.start < left.end
}

export function answerAnnotationRangesEqual(
  left: Pick<QuestionAnswerAnnotation, 'start' | 'end'>,
  right: Pick<QuestionAnswerAnnotation, 'start' | 'end'>,
): boolean {
  return left.start === right.start && left.end === right.end
}

export function getAnswerAnnotationHighlightColor(
  annotation: QuestionAnswerAnnotation,
): AnswerAnnotationColor | null {
  if ('highlightColor' in annotation) return annotation.highlightColor ?? null
  return annotation.kind === 'highlight' ? annotation.color : null
}

export function hasAnswerAnnotationNote(annotation: QuestionAnswerAnnotation): boolean {
  return annotation.note.trim().length > 0
}

export function getNonOverlappingAnswerAnnotations(
  annotations: QuestionAnswerAnnotation[],
): QuestionAnswerAnnotation[] {
  const picked: QuestionAnswerAnnotation[] = []
  const newestFirst = [...annotations].sort(
    (left, right) =>
      right.updatedAt - left.updatedAt ||
      right.createdAt - left.createdAt ||
      right.id.localeCompare(left.id),
  )

  for (const annotation of newestFirst) {
    if (picked.some((item) => answerAnnotationRangesOverlap(item, annotation))) continue
    picked.push(annotation)
  }

  return picked.sort((left, right) => left.start - right.start || left.createdAt - right.createdAt)
}

export function createAnswerAnnotationId(): string {
  const cryptoId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `answer-annotation-${Date.now()}-${cryptoId}`
}

export function hashAnswerText(text: string): string {
  let hash = 5381
  for (let index = 0; index < text.length; index++) {
    hash = (hash * 33) ^ text.charCodeAt(index)
  }
  return (hash >>> 0).toString(36)
}

export function getSelectionTextOffset(
  root: HTMLElement,
  node: Node,
  offset: number,
): number | null {
  const range = document.createRange()
  try {
    range.selectNodeContents(root)
    range.setEnd(node, offset)
    return range.toString().length
  } catch {
    return null
  } finally {
    range.detach()
  }
}

export function getRangeBoundaryOffset(
  root: HTMLElement,
  range: Range,
  boundary: 'start' | 'end',
): number | null {
  return getSelectionTextOffset(
    root,
    boundary === 'start' ? range.startContainer : range.endContainer,
    boundary === 'start' ? range.startOffset : range.endOffset,
  )
}

export function getRangeInsideRoot(root: HTMLElement, range: Range): Range | null {
  if (!range.intersectsNode(root)) return null

  const nextRange = range.cloneRange()

  try {
    if (!root.contains(nextRange.startContainer)) {
      nextRange.setStart(root, 0)
    }

    if (!root.contains(nextRange.endContainer)) {
      nextRange.setEnd(root, root.childNodes.length)
    }

    return nextRange
  } catch {
    nextRange.detach()
    return null
  }
}

export function getSelectionToolbarRect(range: Range): DOMRect | null {
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 1 && rect.height > 1,
  )
  if (rects.length > 0) return rects[0]

  const rect = range.getBoundingClientRect()
  return rect.width > 1 && rect.height > 1 ? rect : null
}

export function shouldUseBottomAnswerAnnotationToolbar(): boolean {
  return window.innerWidth <= 640 || window.matchMedia?.('(pointer: coarse)').matches === true
}

export function getAnswerSelectionDraft(root: HTMLElement): AnswerSelectionDraft | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

  const sourceRange = selection.getRangeAt(0)
  const range = getRangeInsideRoot(root, sourceRange)
  if (!range) return null

  const rawStart = getRangeBoundaryOffset(root, range, 'start')
  const rawEnd = getRangeBoundaryOffset(root, range, 'end')
  if (rawStart === null || rawEnd === null || rawStart === rawEnd) return null

  const content = root.textContent ?? ''
  let start = Math.min(rawStart, rawEnd)
  let end = Math.max(rawStart, rawEnd)

  while (start < end && /\s/.test(content[start] ?? '')) start++
  while (end > start && /\s/.test(content[end - 1] ?? '')) end--

  const text = content.slice(start, end)
  if (!text.trim()) return null

  const rect = getSelectionToolbarRect(range)
  if (!rect) {
    range.detach()
    return null
  }

  const toolbarHalfWidth = Math.min(170, Math.max(96, window.innerWidth / 2 - 16))
  const left = Math.min(
    window.innerWidth - toolbarHalfWidth,
    Math.max(toolbarHalfWidth, rect.left + rect.width / 2),
  )
  const placement: AnswerSelectionDraft['placement'] = rect.top >= 64 ? 'top' : 'bottom'
  const top = placement === 'top' ? rect.top : rect.bottom
  const toolbar: AnswerSelectionDraft['toolbar'] = shouldUseBottomAnswerAnnotationToolbar()
    ? 'bottom'
    : 'floating'

  range.detach()
  return { start, end, text, top, left, placement, toolbar }
}

export function createTextRange(root: HTMLElement, start: number, end: number): Range | null {
  const range = document.createRange()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let offset = 0
  let startSet = false
  let current = walker.nextNode()

  while (current) {
    const textLength = current.textContent?.length ?? 0
    const nextOffset = offset + textLength

    if (!startSet && start >= offset && start <= nextOffset) {
      range.setStart(current, Math.max(0, start - offset))
      startSet = true
    }

    if (startSet && end >= offset && end <= nextOffset) {
      range.setEnd(current, Math.max(0, end - offset))
      return range
    }

    offset = nextOffset
    current = walker.nextNode()
  }

  range.detach()
  return null
}

export type AnswerCommentTargetRect = {
  left: number
  right: number
  top: number
  bottom: number
}

export type AnswerCommentUnderlineRect = {
  left: number
  top: number
  width: number
}

export type AnswerCommentTarget = {
  annotation: QuestionAnswerAnnotation
  rects: AnswerCommentTargetRect[]
  underlineRects: AnswerCommentUnderlineRect[]
  popoverLeft: number
  popoverTop: number
  popoverPlacement: 'top' | 'bottom'
}

export function getAnswerCommentUnderlineRects(
  root: HTMLElement,
  annotation: QuestionAnswerAnnotation,
  rootRect: DOMRect,
): AnswerCommentUnderlineRect[] {
  const rects: AnswerCommentUnderlineRect[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let offset = 0
  let current = walker.nextNode()

  while (current) {
    const textLength = current.textContent?.length ?? 0
    const nextOffset = offset + textLength
    const start = Math.max(annotation.start, offset)
    const end = Math.min(annotation.end, nextOffset)

    if (start < end) {
      const range = document.createRange()
      try {
        range.setStart(current, start - offset)
        range.setEnd(current, end - offset)
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.width <= 1 || rect.height <= 1) continue
          rects.push({
            left: rect.left - rootRect.left + root.scrollLeft,
            top: rect.bottom - rootRect.top + root.scrollTop + 1,
            width: Math.max(0, rect.width),
          })
        }
      } finally {
        range.detach()
      }
    }

    offset = nextOffset
    if (offset >= annotation.end) break
    current = walker.nextNode()
  }

  return rects
}

export function getAnswerCommentTarget(
  root: HTMLElement,
  annotation: QuestionAnswerAnnotation,
): AnswerCommentTarget | null {
  const range = createTextRange(root, annotation.start, annotation.end)
  if (!range) return null

  try {
    const rootRect = root.getBoundingClientRect()
    const rects = Array.from(range.getClientRects()).filter(
      (rect) => rect.width > 1 && rect.height > 1,
    )
    const rect = rects.at(-1) ?? range.getBoundingClientRect()
    if (rect.width <= 1 || rect.height <= 1) return null
    if (
      rect.bottom < 0 ||
      rect.top > window.innerHeight ||
      rect.right < 0 ||
      rect.left > window.innerWidth
    ) {
      return null
    }

    const popoverHalfWidth = Math.min(132, Math.max(120, window.innerWidth / 2 - 16))
    const popoverLeft = Math.min(
      window.innerWidth - popoverHalfWidth - 12,
      Math.max(popoverHalfWidth + 12, rect.right),
    )
    const popoverPlacement: AnswerCommentTarget['popoverPlacement'] =
      rect.top >= 118 ? 'top' : 'bottom'

    return {
      annotation,
      rects: rects.map((item) => ({
        left: item.left,
        right: item.right,
        top: item.top,
        bottom: item.bottom,
      })),
      underlineRects: getAnswerCommentUnderlineRects(root, annotation, rootRect),
      popoverLeft,
      popoverTop: popoverPlacement === 'top' ? rect.top : rect.bottom,
      popoverPlacement,
    }
  } finally {
    range.detach()
  }
}

export function findAnswerCommentTargetAtPoint(
  targets: AnswerCommentTarget[],
  x: number,
  y: number,
): AnswerCommentTarget | null {
  for (const target of targets) {
    const matched = target.rects.some(
      (rect) =>
        x >= rect.left - 2 && x <= rect.right + 2 && y >= rect.top - 4 && y <= rect.bottom + 4,
    )
    if (matched) return target
  }
  return null
}

export function applyAnswerAnnotationHighlights(
  root: HTMLElement,
  annotations: QuestionAnswerAnnotation[],
): () => void {
  const cssGlobal =
    'CSS' in window ? (CSS as unknown as { highlights?: HighlightRegistryLike }) : null
  const HighlightConstructor = (
    window as Window & {
      Highlight?: new (...ranges: Range[]) => unknown
    }
  ).Highlight

  if (!cssGlobal?.highlights || !HighlightConstructor) return () => {}

  const registry = cssGlobal.highlights
  for (const name of Object.values(ANSWER_ANNOTATION_HIGHLIGHT_NAMES)) {
    registry.delete(name)
  }

  const grouped = new Map<AnswerAnnotationColor, Range[]>()
  for (const annotation of annotations) {
    const range = createTextRange(root, annotation.start, annotation.end)
    if (!range) continue

    const highlightColor = getAnswerAnnotationHighlightColor(annotation)
    if (highlightColor) {
      const ranges = grouped.get(highlightColor) ?? []
      ranges.push(range.cloneRange())
      grouped.set(highlightColor, ranges)
    }

    range.detach()
  }

  for (const [color, ranges] of grouped.entries()) {
    if (ranges.length === 0) continue
    registry.set(ANSWER_ANNOTATION_HIGHLIGHT_NAMES[color], new HighlightConstructor(...ranges))
  }

  return () => {
    for (const name of Object.values(ANSWER_ANNOTATION_HIGHLIGHT_NAMES)) {
      registry.delete(name)
    }
  }
}

export interface HighlightRegistryLike {
  set: (name: string, highlight: unknown) => void
  delete: (name: string) => void
}

export function AnswerAnnotationToolbar({
  toolbarRef,
  selection,
  commentOpen,
  commentDraft,
  saving,
  onHighlight,
  onClearHighlight,
  onOpenComment,
  onCommentDraftChange,
  onSaveComment,
  onCancel,
}: {
  toolbarRef: React.RefObject<HTMLDivElement | null>
  selection: AnswerSelectionDraft
  commentOpen: boolean
  commentDraft: string
  saving: boolean
  onHighlight: (color: AnswerAnnotationColor) => void
  onClearHighlight: () => void
  onOpenComment: () => void
  onCommentDraftChange: (value: string) => void
  onSaveComment: () => void
  onCancel: () => void
}) {
  const commentInputRef = useRef<HTMLInputElement>(null)
  const isBottomToolbar = selection.toolbar === 'bottom'

  useEffect(() => {
    if (!commentOpen) return
    const frame = window.requestAnimationFrame(() => commentInputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [commentOpen])

  if (typeof document === 'undefined') return null

  const btn = cn(
    'inline-flex items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-60',
    isBottomToolbar ? 'size-8' : 'size-6',
  )

  return createPortal(
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="批注工具"
      className={cn(
        'fixed z-[46] flex flex-col gap-1 border border-line bg-elevated/95 shadow-popover backdrop-blur-md',
        isBottomToolbar
          ? 'inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] rounded-2xl p-1.5'
          : 'max-w-[min(360px,calc(100vw-24px))] rounded-xl p-1',
      )}
      style={
        isBottomToolbar
          ? undefined
          : {
              top: selection.top,
              left: selection.left,
              transform:
                selection.placement === 'top'
                  ? 'translate(-50%, calc(-100% - 8px))'
                  : 'translate(-50%, 8px)',
            }
      }
    >
      <div
        className={cn('flex items-center', isBottomToolbar ? 'justify-center gap-1.5' : 'gap-0.5')}
      >
        {ANSWER_ANNOTATION_COLORS.map((color) => {
          const colorStyle = getAnswerAnnotationColor(color)
          return (
            <button
              type="button"
              key={color}
              title="高亮"
              aria-label="高亮"
              disabled={saving}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onHighlight(color)}
              className={btn}
            >
              <span
                className="size-[11px] rounded-full"
                style={{
                  background: colorStyle.dot,
                  boxShadow: `0 0 0 3px ${colorStyle.background}`,
                }}
              />
            </button>
          )
        })}
        <button
          type="button"
          title="取消高亮"
          aria-label="取消高亮"
          disabled={saving}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClearHighlight}
          className={cn(btn, 'text-fg-subtle')}
        >
          <Eraser className={isBottomToolbar ? 'size-4' : 'size-3.5'} />
        </button>
        <span className="mx-1 h-4 w-px bg-line" />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onOpenComment}
          disabled={saving}
          className={cn(
            btn,
            'w-auto gap-1 px-2 text-xs font-medium',
            commentOpen ? 'bg-accent-subtle text-accent' : 'text-fg-muted',
          )}
        >
          <MessageSquarePlus className="size-3.5" />
          批注
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onCancel}
          title="关闭"
          aria-label="关闭"
          className={cn(btn, 'text-fg-subtle')}
        >
          <X className={isBottomToolbar ? 'size-4' : 'size-3.5'} />
        </button>
      </div>

      {commentOpen ? (
        <div className={cn('flex items-center gap-1.5', !isBottomToolbar && 'min-w-60')}>
          <input
            ref={commentInputRef}
            value={commentDraft}
            onChange={(event) => onCommentDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSaveComment()
              if (event.key === 'Escape') onCancel()
            }}
            placeholder="写批注…"
            aria-label="批注内容"
            className={cn(
              'min-w-0 flex-1 rounded-md border border-line-strong bg-canvas px-2.5 text-fg outline-none placeholder:text-fg-subtle focus:border-accent',
              isBottomToolbar ? 'h-9 text-[16px]' : 'h-7 text-xs',
            )}
          />
          <Button
            size="sm"
            variant="primary"
            className="h-7"
            onClick={onSaveComment}
            disabled={saving || !commentDraft.trim()}
          >
            保存
          </Button>
        </div>
      ) : null}
    </div>,
    document.body,
  )
}

export function AnswerCommentMarkers({
  rootRef,
  annotations,
  activeId,
  onActiveChange,
  onDelete,
}: {
  rootRef: React.RefObject<HTMLDivElement | null>
  annotations: QuestionAnswerAnnotation[]
  activeId: string | null
  onActiveChange: (id: string | null) => void
  onDelete: (id: string) => void
}) {
  const layerRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const [targets, setTargets] = useState<AnswerCommentTarget[]>([])

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current === null) return
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }, [])

  const scheduleClose = useCallback(
    (delay = ANSWER_COMMENT_DESKTOP_CLOSE_DELAY) => {
      cancelClose()
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null
        onActiveChange(null)
      }, delay)
    },
    [cancelClose, onActiveChange],
  )

  const updateMarkers = useCallback(() => {
    const root = rootRef.current
    if (!root) {
      setTargets([])
      return
    }

    setTargets(
      annotations
        .filter(hasAnswerAnnotationNote)
        .map((annotation) => getAnswerCommentTarget(root, annotation))
        .filter((target): target is AnswerCommentTarget => Boolean(target)),
    )
  }, [annotations, rootRef])

  useLayoutEffect(() => {
    updateMarkers()

    let frame: number | null = null
    const scheduleUpdate = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        updateMarkers()
      })
    }

    const root = rootRef.current
    const observer =
      root && typeof MutationObserver !== 'undefined' ? new MutationObserver(scheduleUpdate) : null
    observer?.observe(root as HTMLElement, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('scroll', scheduleUpdate, true)
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('scroll', scheduleUpdate, true)
    }
  }, [rootRef, updateMarkers])

  useEffect(() => {
    if (targets.length === 0) return

    const handleMouseMove = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Node && layerRef.current?.contains(target)) {
        cancelClose()
        return
      }
      if (window.matchMedia?.('(pointer: coarse)').matches === true) return

      const matchedTarget = findAnswerCommentTargetAtPoint(targets, event.clientX, event.clientY)
      if (matchedTarget) {
        cancelClose()
        onActiveChange(matchedTarget.annotation.id)
      } else if (activeId) {
        scheduleClose()
      }
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Node && layerRef.current?.contains(target)) return

      const matchedTarget = findAnswerCommentTargetAtPoint(targets, event.clientX, event.clientY)
      if (matchedTarget) {
        event.preventDefault()
        cancelClose()
        onActiveChange(
          activeId === matchedTarget.annotation.id ? null : matchedTarget.annotation.id,
        )
        return
      }

      if (activeId) onActiveChange(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick)
    return () => {
      cancelClose()
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick)
    }
  }, [activeId, cancelClose, onActiveChange, scheduleClose, targets])

  useEffect(() => {
    if (!activeId || !shouldUseBottomAnswerAnnotationToolbar()) return

    const startY = window.scrollY
    const handleScroll = () => {
      if (Math.abs(window.scrollY - startY) < ANSWER_COMMENT_MOBILE_SCROLL_CLOSE_DISTANCE) return
      onActiveChange(null)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [activeId, onActiveChange])

  const activeTarget = targets.find((target) => target.annotation.id === activeId)
  const root = rootRef.current
  if (typeof document === 'undefined' || !root || targets.length === 0) return null

  return (
    <>
      {createPortal(
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1]">
          {targets.flatMap((target) =>
            target.underlineRects.map((rect, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: rects are derived from transient layout boxes.
                key={`${target.annotation.id}-${index}`}
                aria-hidden="true"
                className="pointer-events-none absolute h-0 border-b-[1.5px] border-dotted border-accent"
                style={{ left: rect.left, top: rect.top, width: rect.width }}
              />
            )),
          )}
        </span>,
        root,
      )}

      {activeTarget &&
        createPortal(
          <div
            ref={layerRef}
            onMouseEnter={cancelClose}
            onMouseLeave={() => scheduleClose()}
            className="fixed z-[46] w-[min(264px,calc(100vw-24px))] rounded-xl border border-line bg-elevated p-2.5 shadow-popover"
            style={{
              left: activeTarget.popoverLeft,
              top: activeTarget.popoverTop,
              transform:
                activeTarget.popoverPlacement === 'top'
                  ? 'translate(-50%, calc(-100% - 10px))'
                  : 'translate(-50%, 10px)',
            }}
            role="dialog"
            aria-label="答案批注"
          >
            <p className="text-xs leading-relaxed break-words text-fg">
              {activeTarget.annotation.note}
            </p>
            <div className="mt-2 flex justify-end gap-1">
              <Button
                variant="danger-ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onDelete(activeTarget.annotation.id)}
              >
                删除批注
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-6 px-2 text-xs"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onActiveChange(null)}
              >
                收起
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
