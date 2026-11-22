import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteQuestionAnswerAnnotation,
  getQuestionAnswerAnnotations,
  putQuestionAnswerAnnotation,
} from '@/lib/db'
import type { AnswerAnnotationColor, Question, QuestionAnswerAnnotation } from '@/types'
import {
  type AnswerSelectionDraft,
  answerAnnotationRangesEqual,
  answerAnnotationRangesOverlap,
  applyAnswerAnnotationHighlights,
  createAnswerAnnotationId,
  getAnswerAnnotationHighlightColor,
  getAnswerSelectionDraft,
  getNonOverlappingAnswerAnnotations,
  hasAnswerAnnotationNote,
} from './annotations'

interface Options {
  id: string | undefined
  question: Question | null | undefined
  /** Hash of the answer text on screen; annotations are stored per answer version. */
  answerHash: string
  /** True while the rendered answer is on screen and can be selected. */
  active: boolean
  /** Any change clears the pending selection and comment draft. */
  resetKey: string
}

/** Highlights and margin comments on the reference answer. */
export function useAnswerAnnotations({ id, question, answerHash, active, resetKey }: Options) {
  const [annotations, setAnnotations] = useState<QuestionAnswerAnnotation[]>([])
  const [selection, setSelection] = useState<AnswerSelectionDraft | null>(null)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const selectionTimerRef = useRef<number | null>(null)
  const selectingRef = useRef(false)

  const forDisplayedAnswer = useMemo(
    () => annotations.filter((annotation) => annotation.answerHash === answerHash),
    [annotations, answerHash],
  )
  const visible = useMemo(
    () => getNonOverlappingAnswerAnnotations(forDisplayedAnswer),
    [forDisplayedAnswer],
  )

  const reload = useCallback(() => {
    getQuestionAnswerAnnotations(id ?? '')
      .then(setAnnotations)
      .catch(() => {})
  }, [id])

  const clearDraft = useCallback(() => {
    setSelection(null)
    setCommentOpen(false)
    setCommentDraft('')
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setAnnotations([])
      return
    }
    getQuestionAnswerAnnotations(id)
      .then((items) => {
        if (!cancelled) setAnnotations(items)
      })
      .catch(() => {
        if (!cancelled) setAnnotations([])
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey intentionally clears the draft UI.
  useEffect(() => {
    clearDraft()
    setActiveCommentId(null)
  }, [clearDraft, resetKey])

  useEffect(() => {
    if (!activeCommentId) return
    const stillVisible = visible.some(
      (annotation) => annotation.id === activeCommentId && hasAnswerAnnotationNote(annotation),
    )
    if (!stillVisible) setActiveCommentId(null)
  }, [activeCommentId, visible])

  // Paint highlights into the rendered Markdown, repainting whenever it re-renders.
  useEffect(() => {
    if (!active) return
    const root = contentRef.current
    if (!root) return

    let cleanupHighlights: (() => void) | null = null
    let frame: number | null = null
    const scheduleApply = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        cleanupHighlights?.()
        cleanupHighlights = applyAnswerAnnotationHighlights(root, visible)
      })
    }
    scheduleApply()

    const observer =
      typeof MutationObserver !== 'undefined' ? new MutationObserver(scheduleApply) : null
    observer?.observe(root, { childList: true, subtree: true, characterData: true })

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      observer?.disconnect()
      cleanupHighlights?.()
    }
  }, [active, visible])

  // Clicking outside the answer and the toolbar drops the pending selection.
  useEffect(() => {
    if (!selection) return
    const handler = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (toolbarRef.current?.contains(target)) return
      if (contentRef.current?.contains(target)) return
      clearDraft()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [clearDraft, selection])

  const refreshSelection = useCallback(() => {
    if (!active || commentOpen || saving) return
    const root = contentRef.current
    if (!root) return

    const draft = getAnswerSelectionDraft(root)
    clearDraft()
    if (!draft) return
    setSelection(draft)
    setActiveCommentId(null)
  }, [active, clearDraft, commentOpen, saving])

  const scheduleSelectionRefresh = useCallback(
    (delay = 180) => {
      if (selectionTimerRef.current !== null) window.clearTimeout(selectionTimerRef.current)
      selectionTimerRef.current = window.setTimeout(() => {
        selectionTimerRef.current = null
        if (!selectingRef.current) refreshSelection()
      }, delay)
    },
    [refreshSelection],
  )

  // Track text selection; wait until the pointer is released before showing the toolbar.
  useEffect(() => {
    if (!active) return

    const clearScheduledRefresh = () => {
      if (selectionTimerRef.current === null) return
      window.clearTimeout(selectionTimerRef.current)
      selectionTimerRef.current = null
    }
    const handleSelectStart = (event: MouseEvent | TouchEvent) => {
      const target = event.target
      if (target instanceof Node && toolbarRef.current?.contains(target)) return
      selectingRef.current = true
      clearScheduledRefresh()
    }
    const handleSelectEnd = () => {
      selectingRef.current = false
      scheduleSelectionRefresh(140)
    }
    const handleSelectionChange = () => scheduleSelectionRefresh(220)

    document.addEventListener('mousedown', handleSelectStart)
    document.addEventListener('touchstart', handleSelectStart)
    document.addEventListener('selectionchange', handleSelectionChange)
    document.addEventListener('mouseup', handleSelectEnd)
    document.addEventListener('touchend', handleSelectEnd)
    document.addEventListener('keyup', handleSelectEnd)
    return () => {
      clearScheduledRefresh()
      selectingRef.current = false
      document.removeEventListener('mousedown', handleSelectStart)
      document.removeEventListener('touchstart', handleSelectStart)
      document.removeEventListener('selectionchange', handleSelectionChange)
      document.removeEventListener('mouseup', handleSelectEnd)
      document.removeEventListener('touchend', handleSelectEnd)
      document.removeEventListener('keyup', handleSelectEnd)
    }
  }, [active, scheduleSelectionRefresh])

  const create = useCallback(
    async (kind: QuestionAnswerAnnotation['kind'], color: AnswerAnnotationColor, note = '') => {
      if (!question || !selection || saving) return

      setSaving(true)
      try {
        const now = Date.now()
        const overlapping = forDisplayedAnswer.filter((annotation) =>
          answerAnnotationRangesOverlap(annotation, selection),
        )
        const exact = overlapping.find((annotation) =>
          answerAnnotationRangesEqual(annotation, selection),
        )
        const replaced = overlapping.filter((annotation) => annotation.id !== exact?.id)
        const replacedIds = new Set(replaced.map((annotation) => annotation.id))
        const nextNote = kind === 'comment' ? note.trim() : (exact?.note.trim() ?? '')
        const nextHighlightColor =
          kind === 'highlight' ? color : exact ? getAnswerAnnotationHighlightColor(exact) : null
        const annotation = await putQuestionAnswerAnnotation({
          id: exact?.id ?? createAnswerAnnotationId(),
          questionId: question.id,
          answerHash,
          kind: nextNote ? 'comment' : 'highlight',
          color: nextHighlightColor ?? color,
          highlightColor: nextHighlightColor,
          start: selection.start,
          end: selection.end,
          selectedText: selection.text,
          note: nextNote,
          createdAt: exact?.createdAt ?? now,
          updatedAt: now,
        })
        if (replaced.length > 0) {
          await Promise.all(replaced.map((item) => deleteQuestionAnswerAnnotation(item.id))).catch(
            () => undefined,
          )
        }
        setAnnotations((current) => [
          annotation,
          ...current.filter((item) => item.id !== annotation.id && !replacedIds.has(item.id)),
        ])
        window.getSelection()?.removeAllRanges()
        setActiveCommentId(nextNote ? annotation.id : null)
        clearDraft()
      } finally {
        setSaving(false)
      }
    },
    [answerHash, clearDraft, forDisplayedAnswer, question, saving, selection],
  )

  const saveComment = useCallback(() => {
    if (!commentDraft.trim()) return
    create('comment', 'blue', commentDraft)
  }, [commentDraft, create])

  const clearHighlight = useCallback(async () => {
    if (!selection || saving) return

    const highlighted = forDisplayedAnswer.filter(
      (annotation) =>
        answerAnnotationRangesOverlap(annotation, selection) &&
        getAnswerAnnotationHighlightColor(annotation),
    )
    if (highlighted.length === 0) {
      setSelection(null)
      window.getSelection()?.removeAllRanges()
      return
    }

    setSaving(true)
    try {
      const now = Date.now()
      const deletedIds = new Set<string>()
      const updated: QuestionAnswerAnnotation[] = []

      // A highlight with a comment keeps the comment; a bare highlight is deleted.
      for (const annotation of highlighted) {
        if (hasAnswerAnnotationNote(annotation)) {
          updated.push(
            await putQuestionAnswerAnnotation({
              ...annotation,
              kind: 'comment',
              highlightColor: null,
              updatedAt: now,
            }),
          )
        } else {
          await deleteQuestionAnswerAnnotation(annotation.id)
          deletedIds.add(annotation.id)
        }
      }

      setAnnotations((current) =>
        current
          .filter((item) => !deletedIds.has(item.id))
          .map((item) => updated.find((saved) => saved.id === item.id) ?? item),
      )
      setActiveCommentId((current) => (current && deletedIds.has(current) ? null : current))
      clearDraft()
      window.getSelection()?.removeAllRanges()
    } catch {
      reload()
    } finally {
      setSaving(false)
    }
  }, [clearDraft, forDisplayedAnswer, reload, saving, selection])

  const cancel = useCallback(() => {
    clearDraft()
    window.getSelection()?.removeAllRanges()
  }, [clearDraft])

  const remove = useCallback(
    async (annotationId: string) => {
      setActiveCommentId((current) => (current === annotationId ? null : current))
      setAnnotations((current) => current.filter((item) => item.id !== annotationId))
      try {
        await deleteQuestionAnswerAnnotation(annotationId)
      } catch {
        reload()
      }
    },
    [reload],
  )

  /** Remove a comment; keep its highlight if it had one. */
  const deleteComment = useCallback(
    async (annotationId: string) => {
      const annotation = annotations.find((item) => item.id === annotationId)
      if (!annotation) return

      const highlightColor = getAnswerAnnotationHighlightColor(annotation)
      setActiveCommentId((current) => (current === annotationId ? null : current))
      if (!highlightColor) {
        remove(annotationId)
        return
      }

      const next: QuestionAnswerAnnotation = {
        ...annotation,
        kind: 'highlight',
        color: highlightColor,
        highlightColor,
        note: '',
        updatedAt: Date.now(),
      }
      setAnnotations((current) => current.map((item) => (item.id === annotationId ? next : item)))
      try {
        const saved = await putQuestionAnswerAnnotation(next)
        setAnnotations((current) =>
          current.map((item) => (item.id === annotationId ? saved : item)),
        )
      } catch {
        reload()
      }
    },
    [annotations, reload, remove],
  )

  return {
    contentRef,
    toolbarRef,
    visible,
    selection,
    setSelection,
    commentOpen,
    setCommentOpen,
    commentDraft,
    setCommentDraft,
    activeCommentId,
    setActiveCommentId,
    saving,
    create,
    saveComment,
    clearHighlight,
    cancel,
    deleteComment,
  }
}
