import { useCallback, useEffect, useState } from 'react'
import {
  deleteQuestionAnswerOverride,
  getQuestionAnswerOverride,
  putQuestionAnswerOverride,
} from '@/lib/db'
import type { Question, QuestionAnswerOverride } from '@/types'
import type { AnswerOverrideSaveStatus } from './answerPanel'

/** The user's own version of a reference answer: loading, editing, saving and restoring. */
export function useAnswerOverride(id: string | undefined, question: Question | null | undefined) {
  const [override, setOverride] = useState<QuestionAnswerOverride | null>(null)
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState('')
  const [saveStatus, setSaveStatus] = useState<AnswerOverrideSaveStatus>('idle')
  const [showOriginal, setShowOriginal] = useState(false)

  useEffect(() => {
    let cancelled = false
    setEditMode(false)
    setSaveStatus('idle')
    setShowOriginal(false)
    if (!id) {
      setOverride(null)
      setLoading(false)
      setDraft('')
      return
    }

    setLoading(true)
    getQuestionAnswerOverride(id)
      .then((saved) => {
        if (cancelled) return
        setOverride(saved?.content.trim() ? saved : null)
        setDraft(saved?.content ?? question?.answer ?? '')
      })
      .catch(() => {
        if (cancelled) return
        setOverride(null)
        setDraft(question?.answer ?? '')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, question?.answer])

  const flashSaved = useCallback(() => {
    setSaveStatus('saved')
    window.setTimeout(() => setSaveStatus('idle'), 1400)
  }, [])

  const startEdit = useCallback(() => {
    if (!question) return
    setDraft(override?.content ?? question.answer)
    setEditMode(true)
    setSaveStatus('idle')
    setShowOriginal(false)
  }, [override, question])

  const cancelEdit = useCallback(() => {
    setDraft(override?.content ?? question?.answer ?? '')
    setEditMode(false)
    setSaveStatus('idle')
  }, [override, question?.answer])

  const restoreDefault = useCallback(async () => {
    if (!question || saveStatus === 'saving') return
    if (override?.content.trim()) {
      const confirmed = window.confirm('确定恢复默认参考答案吗？当前自定义答案会被删除。')
      if (!confirmed) return
    }

    setSaveStatus('saving')
    try {
      await deleteQuestionAnswerOverride(question.id)
      setOverride(null)
      setDraft(question.answer)
      setShowOriginal(false)
      setEditMode(false)
      flashSaved()
    } catch {
      setSaveStatus('error')
    }
  }, [flashSaved, override?.content, saveStatus, question])

  const save = useCallback(async () => {
    if (!question || saveStatus === 'saving') return
    const nextContent = draft.trim()
    if (!nextContent) return

    setSaveStatus('saving')
    try {
      if (nextContent === question.answer.trim()) {
        await deleteQuestionAnswerOverride(question.id)
        setOverride(null)
        setDraft(question.answer)
      } else {
        const now = Date.now()
        const saved = await putQuestionAnswerOverride({
          questionId: question.id,
          content: draft,
          createdAt: override?.createdAt ?? now,
          updatedAt: now,
        })
        setOverride(saved)
        setDraft(saved?.content ?? draft)
      }
      setShowOriginal(false)
      setEditMode(false)
      flashSaved()
    } catch {
      setSaveStatus('error')
    }
  }, [draft, flashSaved, override?.createdAt, saveStatus, question])

  const hasCustom = Boolean(question && override?.content.trim())
  const effectiveText = question ? (hasCustom ? (override?.content ?? '') : question.answer) : ''
  const displayedText = question && hasCustom && showOriginal ? question.answer : effectiveText

  return {
    override,
    loading,
    editMode,
    setEditMode,
    draft,
    setDraft,
    saveStatus,
    showOriginal,
    setShowOriginal,
    hasCustom,
    /** The answer the user studies from: their override if present, else the reference. */
    effectiveText,
    /** The answer currently on screen (the reference while "show original" is on). */
    displayedText,
    canSave: draft.trim().length > 0 && saveStatus !== 'saving',
    startEdit,
    cancelEdit,
    restoreDefault,
    save,
  }
}
