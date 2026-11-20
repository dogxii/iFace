import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { SettingsDrawer } from '@/components/layout/SettingsDrawer'
import { Button, Kbd, Skeleton, Spinner } from '@/components/ui'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { LearningCheckPanel } from '@/components/ui/LearningCheckPanel'
import { useQuestion, useQuestions } from '@/hooks/useQuestions'
import {
  deleteQuestionAnswerAnnotation,
  deleteQuestionAnswerOverride,
  getQuestionAnswerAnnotations,
  getQuestionAnswerOverride,
  getQuestionFlag,
  getQuestionNote,
  putQuestionAnswerAnnotation,
  putQuestionAnswerOverride,
  setQuestionStarred,
} from '@/lib/db'
import { type LearningCheckQuestion, loadLearningChecksForQuestion } from '@/lib/learningCheck'
import { createPracticeSessionPath, readPracticeSession } from '@/lib/practiceSession'
import { useAIStore } from '@/store/useAIStore'
import { clearSessionReview, useStudyStore } from '@/store/useStudyStore'
import {
  type AnswerAnnotationColor,
  DIFFICULTY_LABELS,
  DIFFICULTY_STYLES,
  type QuestionAnswerAnnotation,
  type QuestionAnswerOverride,
  type StudyStatus,
} from '@/types'
import { AIDrawer } from './aiDrawer'
import {
  AnswerAnnotationToolbar,
  AnswerCommentMarkers,
  type AnswerSelectionDraft,
  answerAnnotationRangesEqual,
  answerAnnotationRangesOverlap,
  applyAnswerAnnotationHighlights,
  createAnswerAnnotationId,
  getAnswerAnnotationHighlightColor,
  getAnswerSelectionDraft,
  getNonOverlappingAnswerAnnotations,
  hasAnswerAnnotationNote,
  hashAnswerText,
} from './annotations'
import {
  blurActiveControl,
  isEditableTarget,
  MyAnswerInput,
  withLearningCheckSearch,
} from './answerInput'
import {
  AnswerAIButton,
  AnswerOverrideEditor,
  AnswerOverrideHeaderMeta,
  type AnswerOverrideSaveStatus,
  AnswerPanelTabs,
  type AnswerPanelView,
  MobileQuestionNav,
} from './answerPanel'
import { ModuleQuestionDrawer } from './moduleDrawer'
import { NoteDrawer } from './notes'
import {
  SessionCompletionCard,
  SessionProgress,
  ShortcutHints,
  StatusButton,
  StreakCelebration,
} from './session'

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuestionDetail() {
  const { id } = useParams<{ id: string }>()
  const questionId = id ?? ''
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const { question, loading } = useQuestion(id)
  const { allQuestions } = useQuestions()
  const {
    records,
    getStatus,
    setStatus,
    getRecord,
    studyMode,
    answerNavigationMode,
    mobileQuestionNavEnabled,
    aiFabVisible,
    streak,
    incrementStreak,
  } = useStudyStore()
  const { config: aiConfig } = useAIStore()

  const [answerVisible, setAnswerVisible] = useState(false)
  const [marking, setMarking] = useState(false)
  const [justMarked, setJustMarked] = useState<StudyStatus | null>(null)
  const [lastPressedKey, setLastPressedKey] = useState<'1' | '2' | '3' | null>(null)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [aiInitialPrompt, setAiInitialPrompt] = useState<{
    id: string
    questionId: string
    text: string
  } | null>(null)
  const [answerPanelView, setAnswerPanelView] = useState<AnswerPanelView>('answer')
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false)
  const [moduleDrawerOpen, setModuleDrawerOpen] = useState(false)
  const [hasNote, setHasNote] = useState(false)
  const [answerOverride, setAnswerOverride] = useState<QuestionAnswerOverride | null>(null)
  const [answerOverrideLoading, setAnswerOverrideLoading] = useState(false)
  const [answerEditMode, setAnswerEditMode] = useState(false)
  const [answerDraft, setAnswerDraft] = useState('')
  const [answerSaveStatus, setAnswerSaveStatus] = useState<AnswerOverrideSaveStatus>('idle')
  const [showOriginalAnswer, setShowOriginalAnswer] = useState(false)
  const [answerAnnotations, setAnswerAnnotations] = useState<QuestionAnswerAnnotation[]>([])
  const [answerSelection, setAnswerSelection] = useState<AnswerSelectionDraft | null>(null)
  const [answerCommentOpen, setAnswerCommentOpen] = useState(false)
  const [answerCommentDraft, setAnswerCommentDraft] = useState('')
  const [activeAnswerCommentId, setActiveAnswerCommentId] = useState<string | null>(null)
  const [answerAnnotationSaving, setAnswerAnnotationSaving] = useState(false)
  const [starred, setStarred] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [celebrationStreak, setCelebrationStreak] = useState(0)
  const [sessionFinished, setSessionFinished] = useState(false)
  const [noteRefreshKey, setNoteRefreshKey] = useState(0)
  const [learningChecks, setLearningChecks] = useState<LearningCheckQuestion[]>([])
  const answerRef = useRef<HTMLDivElement>(null)
  const answerContentRef = useRef<HTMLDivElement>(null)
  const answerAnnotationToolbarRef = useRef<HTMLDivElement>(null)
  const answerSelectionTimerRef = useRef<number | null>(null)
  const answerSelectingRef = useRef(false)
  const markingRef = useRef(false)

  // Session context (from ?ids=... or a larger ?session=... stored in sessionStorage)
  const sessionKey = searchParams.get('session')
  const inlineSessionIds = useMemo(
    () => searchParams.get('ids')?.split(',').filter(Boolean) ?? [],
    [searchParams],
  )
  const [storedSessionIds, setStoredSessionIds] = useState<string[]>(() =>
    readPracticeSession(sessionKey),
  )
  const checkSearchParam = searchParams.get('check')

  const openAIWithPreset = useCallback(
    (preset: 'question' | 'concept') => {
      if (!question) return

      const text =
        preset === 'question'
          ? '请围绕这道题做一次面试题讲解：先拆解题目在问什么，再指出考察点，最后给出适合口述的答题思路。'
          : '请讲解这道题背后的核心知识点：按知识框架、关键机制、常见误区和面试延展来组织。'

      setAiInitialPrompt({
        id: `${preset}-${question.id}-${Date.now()}`,
        questionId: question.id,
        text,
      })
      setAiDrawerOpen(true)
    },
    [question],
  )

  const handleAIInitialPromptConsumed = useCallback((promptId: string) => {
    setAiInitialPrompt((current) => (current?.id === promptId ? null : current))
  }, [])

  useEffect(() => {
    setStoredSessionIds(readPracticeSession(sessionKey))
  }, [sessionKey])

  const sessionIds = inlineSessionIds.length > 0 ? inlineSessionIds : storedSessionIds
  const isInSession = sessionIds.length > 0
  const sessionIndex = isInSession ? sessionIds.indexOf(id ?? '') : -1
  const sessionSearch = sessionKey
    ? `?session=${sessionKey}`
    : sessionIds.length > 0
      ? `?ids=${sessionIds.join(',')}`
      : ''
  const questionNavigationSearch =
    answerNavigationMode === 'check' ? withLearningCheckSearch(sessionSearch) : sessionSearch
  const moduleQuestionNavigationSearch =
    answerNavigationMode === 'check' ? withLearningCheckSearch('') : ''
  const sessionIdentity = sessionKey
    ? `session:${sessionKey}`
    : inlineSessionIds.length > 0
      ? `ids:${inlineSessionIds.join(',')}`
      : 'browse'
  const hasLearningCheck = learningChecks.length > 0

  // Adjacent IDs from the full question list (for non-session browsing)
  // Sorted same as default list order (insertion order = file order by id)
  const { prevIdByList, nextIdByList } = useMemo(() => {
    if (!id || allQuestions.length === 0) return { prevIdByList: null, nextIdByList: null }
    // Filter to same module so ← → stays within module context
    const sameModule = question
      ? allQuestions.filter((q) => q.module === question.module)
      : allQuestions
    const idx = sameModule.findIndex((q) => q.id === id)
    if (idx === -1) return { prevIdByList: null, nextIdByList: null }
    return {
      prevIdByList: idx > 0 ? sameModule[idx - 1].id : null,
      nextIdByList: idx < sameModule.length - 1 ? sameModule[idx + 1].id : null,
    }
  }, [id, allQuestions, question])

  const prevId = isInSession
    ? sessionIndex > 0
      ? sessionIds[sessionIndex - 1]
      : null
    : (searchParams.get('prev') ?? prevIdByList)
  const nextId = isInSession
    ? sessionIndex >= 0 && sessionIndex < sessionIds.length - 1
      ? sessionIds[sessionIndex + 1]
      : null
    : (searchParams.get('next') ?? nextIdByList)
  const sessionCurrent = sessionIndex + 1
  const sessionTotal = sessionIds.length

  const sessionStats = useMemo(() => {
    const counts = { mastered: 0, review: 0, unlearned: 0 }
    const retryIds: string[] = []

    for (const qid of sessionIds) {
      const status = records[qid]?.status ?? 'unlearned'
      counts[status]++
      if (status !== 'mastered') retryIds.push(qid)
    }

    return {
      ...counts,
      total: sessionIds.length,
      retryIds,
    }
  }, [records, sessionIds])

  const hasCustomAnswer = Boolean(question && answerOverride?.content.trim())
  const effectiveAnswerText = question
    ? hasCustomAnswer
      ? (answerOverride?.content ?? '')
      : question.answer
    : ''
  const displayedAnswerText =
    question && hasCustomAnswer && showOriginalAnswer ? question.answer : effectiveAnswerText
  const displayedAnswerHash = hashAnswerText(displayedAnswerText)
  const answerAnnotationsForDisplayedAnswer = useMemo(
    () => answerAnnotations.filter((annotation) => annotation.answerHash === displayedAnswerHash),
    [answerAnnotations, displayedAnswerHash],
  )
  const visibleAnswerAnnotations = useMemo(
    () => getNonOverlappingAnswerAnnotations(answerAnnotationsForDisplayedAnswer),
    [answerAnnotationsForDisplayedAnswer],
  )

  const shouldAutoRevealAnswer = studyMode === 'memory-only' || answerNavigationMode === 'check'

  // Reset when the question or practice session changes. A retry session can
  // legitimately restart from the same question id with a new session key.
  // biome-ignore lint/correctness/useExhaustiveDependencies: sessionIdentity intentionally resets state when the same question restarts in a new practice session.
  useEffect(() => {
    markingRef.current = false
    setMarking(false)
    setAnswerVisible(shouldAutoRevealAnswer || checkSearchParam === '1')
    setJustMarked(null)
    setLastPressedKey(null)
    setAiInitialPrompt(null)
    setAnswerPanelView('answer')
    setSessionFinished(false)
    setNoteDrawerOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
    // Clear per-question session review guard so the new question starts fresh
    return () => {
      if (id) clearSessionReview(id)
    }
  }, [checkSearchParam, id, sessionIdentity, shouldAutoRevealAnswer])

  useEffect(() => {
    let cancelled = false
    setLearningChecks([])

    if (!question) return

    loadLearningChecksForQuestion(question)
      .then((checks) => {
        if (!cancelled) setLearningChecks(checks)
      })
      .catch(() => {
        if (!cancelled) setLearningChecks([])
      })

    return () => {
      cancelled = true
    }
  }, [question])

  useEffect(() => {
    if (!questionId) return

    const forcedCheckView =
      hasLearningCheck && (answerNavigationMode === 'check' || checkSearchParam === '1')
    setAnswerPanelView(forcedCheckView ? 'check' : 'answer')
  }, [answerNavigationMode, checkSearchParam, hasLearningCheck, questionId])

  useEffect(() => {
    if (!hasLearningCheck && answerPanelView === 'check') {
      setAnswerPanelView('answer')
    }
  }, [answerPanelView, hasLearningCheck])

  useEffect(() => {
    if (searchParams.get('note') !== '1') return
    setNoteDrawerOpen(true)

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('note')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setHasNote(false)
      return
    }

    getQuestionNote(id)
      .then((note) => {
        if (!cancelled) setHasNote(Boolean(note?.content.trim()))
      })
      .catch(() => {
        if (!cancelled) setHasNote(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setAnswerOverride(null)
      setAnswerOverrideLoading(false)
      setAnswerEditMode(false)
      setAnswerDraft('')
      setAnswerSaveStatus('idle')
      setShowOriginalAnswer(false)
      return
    }

    setAnswerOverrideLoading(true)
    setAnswerEditMode(false)
    setAnswerSaveStatus('idle')
    setShowOriginalAnswer(false)

    getQuestionAnswerOverride(id)
      .then((override) => {
        if (cancelled) return
        setAnswerOverride(override?.content.trim() ? override : null)
        setAnswerDraft(override?.content ?? question?.answer ?? '')
      })
      .catch(() => {
        if (cancelled) return
        setAnswerOverride(null)
        setAnswerDraft(question?.answer ?? '')
      })
      .finally(() => {
        if (!cancelled) setAnswerOverrideLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, question?.answer])

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setAnswerAnnotations([])
      return
    }

    getQuestionAnswerAnnotations(id)
      .then((annotations) => {
        if (!cancelled) setAnswerAnnotations(annotations)
      })
      .catch(() => {
        if (!cancelled) setAnswerAnnotations([])
      })

    return () => {
      cancelled = true
    }
  }, [id])

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset draft UI when answer view or answer identity changes.
  useEffect(() => {
    setAnswerSelection(null)
    setAnswerCommentOpen(false)
    setAnswerCommentDraft('')
    setActiveAnswerCommentId(null)
  }, [answerEditMode, answerPanelView, answerVisible, displayedAnswerHash])

  useEffect(() => {
    if (!activeAnswerCommentId) return
    const commentStillVisible = visibleAnswerAnnotations.some(
      (annotation) =>
        annotation.id === activeAnswerCommentId && hasAnswerAnnotationNote(annotation),
    )
    if (!commentStillVisible) setActiveAnswerCommentId(null)
  }, [activeAnswerCommentId, visibleAnswerAnnotations])

  useEffect(() => {
    if (!answerVisible || answerPanelView !== 'answer' || answerEditMode || answerOverrideLoading) {
      return
    }
    const root = answerContentRef.current
    if (!root) return

    let cleanupHighlights: (() => void) | null = null
    let frame: number | null = null

    const applyHighlights = () => {
      cleanupHighlights?.()
      cleanupHighlights = applyAnswerAnnotationHighlights(root, visibleAnswerAnnotations)
    }

    const scheduleApply = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        applyHighlights()
      })
    }

    scheduleApply()

    const observer =
      typeof MutationObserver !== 'undefined' ? new MutationObserver(scheduleApply) : null
    observer?.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      observer?.disconnect()
      cleanupHighlights?.()
    }
  }, [
    answerEditMode,
    answerOverrideLoading,
    answerPanelView,
    answerVisible,
    visibleAnswerAnnotations,
  ])

  useEffect(() => {
    if (!answerSelection) return

    const handler = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (answerAnnotationToolbarRef.current?.contains(target)) return
      if (answerContentRef.current?.contains(target)) return
      setAnswerSelection(null)
      setAnswerCommentOpen(false)
      setAnswerCommentDraft('')
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [answerSelection])

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setStarred(false)
      return
    }

    getQuestionFlag(id)
      .then((flag) => {
        if (!cancelled) setStarred(Boolean(flag?.starred))
      })
      .catch(() => {
        if (!cancelled) setStarred(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const currentStatus = id ? getStatus(id) : 'unlearned'
  const record = id ? getRecord(id) : undefined
  const reviewCount = record?.reviewCount ?? 0

  const handleSetStatus = useCallback(
    async (status: StudyStatus, key?: '1' | '2' | '3') => {
      if (!id || markingRef.current) return
      markingRef.current = true
      setMarking(true)
      setJustMarked(status)
      if (key) setLastPressedKey(key)

      try {
        await setStatus(id, status)

        // Increment streak and trigger celebration if milestone hit
        incrementStreak()
        const newStreak = streak.currentStreak + 1
        const milestones = [3, 5, 10, 20, 50]
        if (milestones.includes(newStreak)) {
          setCelebrationStreak(newStreak)
        }

        if (isInSession && nextId) {
          setTimeout(() => {
            navigate(`/questions/${nextId}${questionNavigationSearch}`)
          }, 600)
        } else if (isInSession) {
          setSessionFinished(true)
        }
      } finally {
        markingRef.current = false
        setMarking(false)
      }
    },
    [
      id,
      setStatus,
      isInSession,
      nextId,
      navigate,
      questionNavigationSearch,
      incrementStreak,
      streak.currentStreak,
    ],
  )

  const handleRevealAnswer = useCallback(() => {
    setAnswerVisible(true)
    setJustMarked(null)
    setLastPressedKey(null)
    if (hasLearningCheck && answerNavigationMode === 'check') {
      setAnswerPanelView('check')
    }
  }, [answerNavigationMode, hasLearningCheck])

  const navigateTo = useCallback(
    (targetId: string | null | undefined) => {
      if (!targetId) return
      navigate(`/questions/${targetId}${questionNavigationSearch}`)
    },
    [navigate, questionNavigationSearch],
  )

  const handleModuleQuestionNavigate = useCallback(
    (targetId: string) => {
      setModuleDrawerOpen(false)
      if (targetId === id) return
      navigate(`/questions/${targetId}${moduleQuestionNavigationSearch}`)
    },
    [id, moduleQuestionNavigationSearch, navigate],
  )

  const handleRetrySession = useCallback(() => {
    if (sessionStats.retryIds.length === 0) return
    for (const retryId of sessionStats.retryIds) {
      clearSessionReview(retryId)
    }
    markingRef.current = false
    setMarking(false)
    setAnswerVisible(shouldAutoRevealAnswer)
    setJustMarked(null)
    setLastPressedKey(null)
    setAiInitialPrompt(null)
    setSessionFinished(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
    navigate(createPracticeSessionPath(sessionStats.retryIds[0], sessionStats.retryIds))
  }, [navigate, sessionStats.retryIds, shouldAutoRevealAnswer])

  const handleNoteSaved = useCallback(() => {
    setHasNote(true)
    setNoteRefreshKey((value) => value + 1)
  }, [])

  const handleToggleStarred = useCallback(async () => {
    if (!id) return
    const next = !starred
    setStarred(next)
    try {
      await setQuestionStarred(id, next)
    } catch {
      setStarred(!next)
    }
  }, [id, starred])

  const refreshAnswerSelection = useCallback(() => {
    if (!answerVisible || answerPanelView !== 'answer' || answerEditMode || answerOverrideLoading) {
      return
    }
    if (answerCommentOpen || answerAnnotationSaving) return
    const root = answerContentRef.current
    if (!root) return

    const draft = getAnswerSelectionDraft(root)
    if (!draft) {
      setAnswerSelection(null)
      setAnswerCommentOpen(false)
      setAnswerCommentDraft('')
      return
    }

    setAnswerSelection(draft)
    setActiveAnswerCommentId(null)
    setAnswerCommentOpen(false)
    setAnswerCommentDraft('')
  }, [
    answerAnnotationSaving,
    answerCommentOpen,
    answerEditMode,
    answerOverrideLoading,
    answerPanelView,
    answerVisible,
  ])

  const scheduleAnswerSelectionRefresh = useCallback(
    (delay = 180) => {
      if (answerSelectionTimerRef.current !== null) {
        window.clearTimeout(answerSelectionTimerRef.current)
      }

      answerSelectionTimerRef.current = window.setTimeout(() => {
        answerSelectionTimerRef.current = null
        if (!answerSelectingRef.current) refreshAnswerSelection()
      }, delay)
    },
    [refreshAnswerSelection],
  )

  const handleCreateAnswerAnnotation = useCallback(
    async (kind: QuestionAnswerAnnotation['kind'], color: AnswerAnnotationColor, note = '') => {
      if (!question || !answerSelection || answerAnnotationSaving) return

      setAnswerAnnotationSaving(true)
      try {
        const now = Date.now()
        const overlappingAnnotations = answerAnnotationsForDisplayedAnswer.filter((annotation) =>
          answerAnnotationRangesOverlap(annotation, answerSelection),
        )
        const exactAnnotation = overlappingAnnotations.find((annotation) =>
          answerAnnotationRangesEqual(annotation, answerSelection),
        )
        const replacedAnnotations = overlappingAnnotations.filter(
          (annotation) => annotation.id !== exactAnnotation?.id,
        )
        const replacedIds = new Set(replacedAnnotations.map((annotation) => annotation.id))
        const nextNote = kind === 'comment' ? note.trim() : (exactAnnotation?.note.trim() ?? '')
        const nextHighlightColor =
          kind === 'highlight'
            ? color
            : exactAnnotation
              ? getAnswerAnnotationHighlightColor(exactAnnotation)
              : null
        const annotation = await putQuestionAnswerAnnotation({
          id: exactAnnotation?.id ?? createAnswerAnnotationId(),
          questionId: question.id,
          answerHash: displayedAnswerHash,
          kind: nextNote ? 'comment' : 'highlight',
          color: nextHighlightColor ?? color,
          highlightColor: nextHighlightColor,
          start: answerSelection.start,
          end: answerSelection.end,
          selectedText: answerSelection.text,
          note: nextNote,
          createdAt: exactAnnotation?.createdAt ?? now,
          updatedAt: now,
        })
        if (replacedAnnotations.length > 0) {
          await Promise.all(
            replacedAnnotations.map((item) => deleteQuestionAnswerAnnotation(item.id)),
          ).catch(() => undefined)
        }
        setAnswerAnnotations((current) => [
          annotation,
          ...current.filter((item) => item.id !== annotation.id && !replacedIds.has(item.id)),
        ])
        window.getSelection()?.removeAllRanges()
        setActiveAnswerCommentId(nextNote ? annotation.id : null)
        setAnswerSelection(null)
        setAnswerCommentOpen(false)
        setAnswerCommentDraft('')
      } finally {
        setAnswerAnnotationSaving(false)
      }
    },
    [
      answerAnnotationSaving,
      answerAnnotationsForDisplayedAnswer,
      answerSelection,
      displayedAnswerHash,
      question,
    ],
  )

  const handleSaveAnswerComment = useCallback(() => {
    if (!answerCommentDraft.trim()) return
    handleCreateAnswerAnnotation('comment', 'blue', answerCommentDraft)
  }, [answerCommentDraft, handleCreateAnswerAnnotation])

  const handleClearAnswerHighlight = useCallback(async () => {
    if (!answerSelection || answerAnnotationSaving) return

    const highlightedAnnotations = answerAnnotationsForDisplayedAnswer.filter(
      (annotation) =>
        answerAnnotationRangesOverlap(annotation, answerSelection) &&
        getAnswerAnnotationHighlightColor(annotation),
    )
    if (highlightedAnnotations.length === 0) {
      setAnswerSelection(null)
      window.getSelection()?.removeAllRanges()
      return
    }

    setAnswerAnnotationSaving(true)
    try {
      const now = Date.now()
      const deletedIds = new Set<string>()
      const updatedAnnotations: QuestionAnswerAnnotation[] = []

      for (const annotation of highlightedAnnotations) {
        if (hasAnswerAnnotationNote(annotation)) {
          const saved = await putQuestionAnswerAnnotation({
            ...annotation,
            kind: 'comment',
            highlightColor: null,
            updatedAt: now,
          })
          updatedAnnotations.push(saved)
        } else {
          await deleteQuestionAnswerAnnotation(annotation.id)
          deletedIds.add(annotation.id)
        }
      }

      setAnswerAnnotations((current) =>
        current
          .filter((item) => !deletedIds.has(item.id))
          .map((item) => updatedAnnotations.find((updated) => updated.id === item.id) ?? item),
      )
      setActiveAnswerCommentId((current) => (current && deletedIds.has(current) ? null : current))
      setAnswerSelection(null)
      setAnswerCommentOpen(false)
      setAnswerCommentDraft('')
      window.getSelection()?.removeAllRanges()
    } catch {
      getQuestionAnswerAnnotations(id ?? '')
        .then(setAnswerAnnotations)
        .catch(() => {})
    } finally {
      setAnswerAnnotationSaving(false)
    }
  }, [answerAnnotationSaving, answerAnnotationsForDisplayedAnswer, answerSelection, id])

  const handleCancelAnswerAnnotation = useCallback(() => {
    setAnswerSelection(null)
    setAnswerCommentOpen(false)
    setAnswerCommentDraft('')
    window.getSelection()?.removeAllRanges()
  }, [])

  const handleDeleteAnswerAnnotation = useCallback(
    async (annotationId: string) => {
      setActiveAnswerCommentId((current) => (current === annotationId ? null : current))
      setAnswerAnnotations((current) => current.filter((item) => item.id !== annotationId))
      try {
        await deleteQuestionAnswerAnnotation(annotationId)
      } catch {
        getQuestionAnswerAnnotations(id ?? '')
          .then(setAnswerAnnotations)
          .catch(() => {})
      }
    },
    [id],
  )

  const handleDeleteAnswerComment = useCallback(
    async (annotationId: string) => {
      const annotation = answerAnnotations.find((item) => item.id === annotationId)
      if (!annotation) return

      const highlightColor = getAnswerAnnotationHighlightColor(annotation)
      setActiveAnswerCommentId((current) => (current === annotationId ? null : current))

      if (!highlightColor) {
        handleDeleteAnswerAnnotation(annotationId)
        return
      }

      const nextAnnotation: QuestionAnswerAnnotation = {
        ...annotation,
        kind: 'highlight',
        color: highlightColor,
        highlightColor,
        note: '',
        updatedAt: Date.now(),
      }

      setAnswerAnnotations((current) =>
        current.map((item) => (item.id === annotationId ? nextAnnotation : item)),
      )
      try {
        const saved = await putQuestionAnswerAnnotation(nextAnnotation)
        setAnswerAnnotations((current) =>
          current.map((item) => (item.id === annotationId ? saved : item)),
        )
      } catch {
        getQuestionAnswerAnnotations(id ?? '')
          .then(setAnswerAnnotations)
          .catch(() => {})
      }
    },
    [answerAnnotations, handleDeleteAnswerAnnotation, id],
  )

  useEffect(() => {
    if (!answerVisible || answerPanelView !== 'answer' || answerEditMode || answerOverrideLoading) {
      return
    }

    const clearScheduledRefresh = () => {
      if (answerSelectionTimerRef.current === null) return
      window.clearTimeout(answerSelectionTimerRef.current)
      answerSelectionTimerRef.current = null
    }

    const handleSelectStart = (event: MouseEvent | TouchEvent) => {
      const target = event.target
      if (target instanceof Node && answerAnnotationToolbarRef.current?.contains(target)) return
      answerSelectingRef.current = true
      clearScheduledRefresh()
    }

    const handleSelectEnd = () => {
      answerSelectingRef.current = false
      scheduleAnswerSelectionRefresh(140)
    }

    const handleSelectionChange = () => {
      scheduleAnswerSelectionRefresh(220)
    }

    document.addEventListener('mousedown', handleSelectStart)
    document.addEventListener('touchstart', handleSelectStart)
    document.addEventListener('selectionchange', handleSelectionChange)
    document.addEventListener('mouseup', handleSelectEnd)
    document.addEventListener('touchend', handleSelectEnd)
    document.addEventListener('keyup', handleSelectEnd)
    return () => {
      clearScheduledRefresh()
      answerSelectingRef.current = false
      document.removeEventListener('mousedown', handleSelectStart)
      document.removeEventListener('touchstart', handleSelectStart)
      document.removeEventListener('selectionchange', handleSelectionChange)
      document.removeEventListener('mouseup', handleSelectEnd)
      document.removeEventListener('touchend', handleSelectEnd)
      document.removeEventListener('keyup', handleSelectEnd)
    }
  }, [
    answerEditMode,
    answerOverrideLoading,
    answerPanelView,
    answerVisible,
    scheduleAnswerSelectionRefresh,
  ])

  const showSessionSummary =
    isInSession && !nextId && answerVisible && (sessionFinished || currentStatus !== 'unlearned')
  const showMobileQuestionNav = mobileQuestionNavEnabled
  const showMobileAiFab = aiFabVisible && !aiDrawerOpen
  const currentModuleQuestions = useMemo(() => {
    if (!question) return []
    return allQuestions.filter((item) => item.module === question.module)
  }, [allQuestions, question])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (isEditableTarget(e.target)) return
      if (settingsOpen || aiDrawerOpen || moduleDrawerOpen) return
      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setNoteDrawerOpen((open) => !open)
        return
      }
      if (!noteDrawerOpen && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setAiDrawerOpen(true)
        return
      }
      if (!noteDrawerOpen && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        setModuleDrawerOpen(true)
        return
      }
      if (noteDrawerOpen) return
      if (markingRef.current) return

      if (answerPanelView === 'check') {
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          blurActiveControl()
          navigateTo(nextId)
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          blurActiveControl()
          navigateTo(prevId)
        }
        return
      }

      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (!answerVisible) handleRevealAnswer()
          break
        case '1':
          if (answerVisible) handleSetStatus('review', '1')
          break
        case '2':
          if (answerVisible) handleSetStatus('review', '2')
          break
        case '3':
          if (answerVisible) handleSetStatus('mastered', '3')
          break
        case 'ArrowRight':
          e.preventDefault()
          blurActiveControl()
          navigateTo(nextId)
          break
        case 'ArrowLeft':
          e.preventDefault()
          blurActiveControl()
          navigateTo(prevId)
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    answerVisible,
    handleRevealAnswer,
    handleSetStatus,
    navigateTo,
    nextId,
    prevId,
    aiDrawerOpen,
    answerPanelView,
    moduleDrawerOpen,
    noteDrawerOpen,
    settingsOpen,
  ])

  const handleStartAnswerEdit = useCallback(() => {
    if (!question) return
    setAnswerPanelView('answer')
    setAnswerDraft(answerOverride?.content ?? question.answer)
    setAnswerEditMode(true)
    setAnswerSaveStatus('idle')
    setShowOriginalAnswer(false)
  }, [answerOverride, question])

  const handleCancelAnswerEdit = useCallback(() => {
    setAnswerDraft(answerOverride?.content ?? question?.answer ?? '')
    setAnswerEditMode(false)
    setAnswerSaveStatus('idle')
  }, [answerOverride, question?.answer])

  const handleRestoreDefaultAnswer = useCallback(async () => {
    if (!question || answerSaveStatus === 'saving') return
    if (answerOverride?.content.trim()) {
      const confirmed = window.confirm('确定恢复默认参考答案吗？当前自定义答案会被删除。')
      if (!confirmed) return
    }

    setAnswerSaveStatus('saving')
    try {
      await deleteQuestionAnswerOverride(question.id)
      setAnswerOverride(null)
      setAnswerDraft(question.answer)
      setShowOriginalAnswer(false)
      setAnswerEditMode(false)
      setAnswerSaveStatus('saved')
      window.setTimeout(() => setAnswerSaveStatus('idle'), 1400)
    } catch {
      setAnswerSaveStatus('error')
    }
  }, [answerOverride?.content, answerSaveStatus, question])

  const handleSaveAnswerOverride = useCallback(async () => {
    if (!question || answerSaveStatus === 'saving') return
    const nextContent = answerDraft.trim()
    if (!nextContent) return

    setAnswerSaveStatus('saving')
    try {
      if (nextContent === question.answer.trim()) {
        await deleteQuestionAnswerOverride(question.id)
        setAnswerOverride(null)
        setAnswerDraft(question.answer)
      } else {
        const now = Date.now()
        const saved = await putQuestionAnswerOverride({
          questionId: question.id,
          content: answerDraft,
          createdAt: answerOverride?.createdAt ?? now,
          updatedAt: now,
        })
        setAnswerOverride(saved)
        setAnswerDraft(saved?.content ?? answerDraft)
      }
      setShowOriginalAnswer(false)
      setAnswerEditMode(false)
      setAnswerSaveStatus('saved')
      window.setTimeout(() => setAnswerSaveStatus('idle'), 1400)
    } catch {
      setAnswerSaveStatus('error')
    }
  }, [answerDraft, answerOverride?.createdAt, answerSaveStatus, question])

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className="page-container animate-fade-in"
        style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <Skeleton width={180} height={13} />
        <div
          className="card"
          style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <Skeleton width={60} height={22} rounded="md" />
            <Skeleton width={48} height={22} rounded="md" />
          </div>
          <Skeleton width="80%" height={20} />
          <Skeleton width="60%" height={20} />
          <Skeleton width="70%" height={20} />
        </div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="page-container" style={{ maxWidth: 760 }}>
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>找不到该题目</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>题目 ID: {id}</p>
          <Link to="/questions">
            <Button variant="primary" size="sm">
              返回题库
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const diffStyle = DIFFICULTY_STYLES[question.difficulty]
  const isAiEnabled = aiConfig.enabled && aiConfig.apiKey.trim().length > 0
  const answerHeading = hasCustomAnswer
    ? showOriginalAnswer
      ? '参考答案'
      : '自定义答案'
    : '参考答案'
  const showAnswerContent = answerPanelView === 'answer'
  const answerContextQuestion = {
    ...question,
    answer: displayedAnswerText,
  }
  const canSaveAnswerOverride = answerDraft.trim().length > 0 && answerSaveStatus !== 'saving'

  // Derived from studyMode
  const showAnswerInputAbove = studyMode === 'answer-first'
  const showAnswerInputInside = studyMode === 'answer-alongside'
  const hideAnswerInput = studyMode === 'memory-only'

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Main content — always max-width 760, never changes ── */}
      <div
        className={`page-container question-detail-page${showMobileQuestionNav ? ' has-mobile-question-nav' : ''}`}
        style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {/* Breadcrumb / Session progress */}
        <div className="animate-fade-in">
          {isInSession ? (
            <SessionProgress
              current={sessionCurrent}
              total={sessionTotal}
              onExit={() => navigate('/practice')}
            />
          ) : (
            <nav
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--text-3)',
              }}
            >
              <Link
                to="/questions"
                style={{
                  color: 'var(--text-3)',
                  textDecoration: 'none',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--primary)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
                }}
              >
                题库
              </Link>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.4 }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <button
                type="button"
                onClick={() => {
                  setNoteDrawerOpen(false)
                  setModuleDrawerOpen(true)
                }}
                aria-label={`展开${question.module}题目列表`}
                aria-expanded={moduleDrawerOpen}
                title={`展开本模块题目列表${currentModuleQuestions.length > 0 ? `（${currentModuleQuestions.length} 题）` : ''}（L）`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  maxWidth: 160,
                  height: 20,
                  padding: '0 3px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-3)',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--primary)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
                }}
              >
                <span
                  style={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {question.module}
                </span>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.4 }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span
                style={{
                  color: 'var(--text-2)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 200,
                }}
              >
                {question.question.slice(0, 30)}…
              </span>
            </nav>
          )}
        </div>

        {/* Question Card */}
        <div
          className="card animate-fade-in stagger-1"
          style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-2)',
                padding: '3px 10px',
                borderRadius: 6,
                background: 'var(--surface-3)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {question.module}
            </span>

            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: '3px 10px',
                borderRadius: 6,
                border: '1px solid',
                color: diffStyle.color,
                background: diffStyle.background,
                borderColor: diffStyle.borderColor,
              }}
            >
              {DIFFICULTY_LABELS[question.difficulty]}
            </span>

            {currentStatus !== 'unlearned' && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '2px 8px',
                  borderRadius: 5,
                  background:
                    currentStatus === 'mastered' ? 'var(--success-light)' : 'var(--warning-light)',
                  color: currentStatus === 'mastered' ? 'var(--success)' : 'var(--warning)',
                  border: `1px solid ${currentStatus === 'mastered' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                }}
              >
                {currentStatus === 'mastered' ? '已掌握' : '待复习'}
              </span>
            )}

            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={handleToggleStarred}
                aria-pressed={starred}
                aria-label={starred ? '取消重点题' : '标记为重点题'}
                title={starred ? '取消重点题' : '标记为重点题'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  padding: 0,
                  borderRadius: 8,
                  border: '1px solid',
                  borderColor: starred ? 'rgba(245,158,11,0.28)' : 'transparent',
                  background: starred ? 'rgba(245,158,11,0.08)' : 'transparent',
                  color: starred ? '#b45309' : 'var(--text-3)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: starred ? 1 : 0.7,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.32)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.1)'
                  ;(e.currentTarget as HTMLElement).style.color = '#b45309'
                  ;(e.currentTarget as HTMLElement).style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.borderColor = starred
                    ? 'rgba(245,158,11,0.28)'
                    : 'transparent'
                  ;(e.currentTarget as HTMLElement).style.background = starred
                    ? 'rgba(245,158,11,0.08)'
                    : 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = starred
                    ? '#b45309'
                    : 'var(--text-3)'
                  ;(e.currentTarget as HTMLElement).style.opacity = starred ? '1' : '0.7'
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill={starred ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setNoteDrawerOpen(true)}
                aria-label={hasNote ? '打开题目笔记' : '添加题目笔记'}
                title={`${hasNote ? '打开题目笔记' : '添加题目笔记'}（N）`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  padding: 0,
                  borderRadius: 8,
                  border: '1px solid',
                  borderColor: hasNote ? 'rgba(var(--primary-rgb),0.22)' : 'transparent',
                  background: hasNote ? 'rgba(var(--primary-rgb),0.07)' : 'transparent',
                  color: hasNote ? 'var(--primary)' : 'var(--text-3)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: hasNote ? 1 : 0.7,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.borderColor =
                    'rgba(var(--primary-rgb),0.28)'
                  ;(e.currentTarget as HTMLElement).style.background =
                    'rgba(var(--primary-rgb),0.08)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--primary)'
                  ;(e.currentTarget as HTMLElement).style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.borderColor = hasNote
                    ? 'rgba(var(--primary-rgb),0.22)'
                    : 'transparent'
                  ;(e.currentTarget as HTMLElement).style.background = hasNote
                    ? 'rgba(var(--primary-rgb),0.07)'
                    : 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = hasNote
                    ? 'var(--primary)'
                    : 'var(--text-3)'
                  ;(e.currentTarget as HTMLElement).style.opacity = hasNote ? '1' : '0.7'
                }}
              >
                <span style={{ position: 'relative', display: 'inline-flex' }}>
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
                  {hasNote && (
                    <span
                      style={{
                        position: 'absolute',
                        right: -3,
                        top: -3,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        border: '1px solid var(--surface)',
                      }}
                    />
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Question text */}
          <h1
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--text)',
              lineHeight: 1.65,
              letterSpacing: '-0.005em',
            }}
          >
            {question.question}
          </h1>

          {/* Tags */}
          {(question.tags.length > 0 || reviewCount > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {question.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 5,
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-3)',
                  }}
                >
                  #{tag}
                </span>
              ))}
              {reviewCount > 0 && (
                <span
                  title={`已复习 ${reviewCount} 次`}
                  style={{
                    fontSize: 11,
                    padding: '2px 3px',
                    color: 'var(--text-3)',
                    opacity: 0.72,
                    whiteSpace: 'nowrap',
                  }}
                >
                  复习 {reviewCount} 次
                </span>
              )}
            </div>
          )}

          {/* Reveal button */}
          {!answerVisible && (
            <button
              type="button"
              onClick={handleRevealAnswer}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                border: '2px dashed var(--border)',
                background: 'transparent',
                color: 'var(--text-2)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.18s',
                marginTop: 4,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(var(--primary-rgb),0.5)'
                el.style.color = 'var(--primary)'
                el.style.background = 'var(--primary-light)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'var(--border)'
                el.style.color = 'var(--text-2)'
                el.style.background = 'transparent'
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              查看参考答案
              <Kbd>Space</Kbd>
            </button>
          )}
        </div>

        {/* ── My Answer Input — shown ABOVE answer card in "answer-first" mode ── */}
        {showAnswerInputAbove && !hideAnswerInput && (
          <div className="animate-fade-in stagger-1">
            <MyAnswerInput
              key={`answer-above-${id ?? ''}`}
              questionId={id ?? ''}
              questionText={question.question}
              answerText={effectiveAnswerText}
              onOpenAIPanel={() => setAiDrawerOpen(true)}
              onOpenNote={() => setNoteDrawerOpen(true)}
              isAiEnabled={isAiEnabled}
              onNoteSaved={handleNoteSaved}
              autoFocus={answerNavigationMode !== 'check'}
            />
          </div>
        )}

        {/* Answer Card */}
        {answerVisible && (
          <div
            ref={answerRef}
            className="card animate-scale-in"
            style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {/* Answer header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                paddingBottom: 14,
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  minWidth: 0,
                  flex: '1 1 auto',
                }}
              >
                <div
                  style={{
                    width: 3,
                    height: 18,
                    borderRadius: 99,
                    background: 'var(--primary)',
                    flexShrink: 0,
                  }}
                />
                {hasLearningCheck ? (
                  <AnswerPanelTabs
                    activeView={answerPanelView}
                    answerLabel={answerHeading}
                    onChange={(view) => {
                      if (view === 'check') {
                        setAnswerEditMode(false)
                        setAnswerSelection(null)
                      }
                      setAnswerPanelView(view)
                    }}
                  />
                ) : (
                  <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {answerHeading}
                  </h2>
                )}
                {hasCustomAnswer && !answerEditMode && (
                  <AnswerOverrideHeaderMeta
                    updatedAt={answerOverride?.updatedAt ?? null}
                    showingOriginal={showOriginalAnswer}
                    onToggleOriginal={() => {
                      setAnswerPanelView('answer')
                      setShowOriginalAnswer((value) => !value)
                    }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <AnswerAIButton
                  title={hasCustomAnswer ? '编辑自定义答案' : '编辑参考答案'}
                  active={answerEditMode}
                  onClick={handleStartAnswerEdit}
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
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </AnswerAIButton>
                <AnswerAIButton
                  title={isAiEnabled ? '打开 AI 助手（A）' : 'AI 助手（请先配置，快捷键 A）'}
                  active={aiDrawerOpen}
                  onClick={() => setAiDrawerOpen(true)}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                    <circle cx="7.5" cy="14.5" r="1.5" />
                    <circle cx="16.5" cy="14.5" r="1.5" />
                  </svg>
                </AnswerAIButton>
                <AnswerAIButton
                  title={isAiEnabled ? '讲解题目' : '讲解题目（请先配置 AI）'}
                  onClick={() => openAIWithPreset('question')}
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
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.1 9a3 3 0 1 1 4.9 2.3c-.9.6-1.4 1.2-1.4 2.4" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </AnswerAIButton>
                <AnswerAIButton
                  title={isAiEnabled ? '讲解知识点' : '讲解知识点（请先配置 AI）'}
                  onClick={() => openAIWithPreset('concept')}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 4v2" />
                    <path d="M12 18v2" />
                    <path d="M4 12h2" />
                    <path d="M18 12h2" />
                    <path d="m6.3 6.3 1.4 1.4" />
                    <path d="m16.3 16.3 1.4 1.4" />
                    <path d="m17.7 6.3-1.4 1.4" />
                    <path d="m7.7 16.3-1.4 1.4" />
                  </svg>
                </AnswerAIButton>
              </div>
            </div>

            {/* Answer body */}
            {answerPanelView === 'check' ? (
              <LearningCheckPanel key={`learning-check-${question.id}`} checks={learningChecks} />
            ) : answerEditMode ? (
              <AnswerOverrideEditor
                draft={answerDraft}
                saveStatus={answerSaveStatus}
                canSave={canSaveAnswerOverride}
                onDraftChange={setAnswerDraft}
                onSave={handleSaveAnswerOverride}
                onCancel={handleCancelAnswerEdit}
                onRestoreDefault={handleRestoreDefaultAnswer}
              />
            ) : answerOverrideLoading ? (
              <Skeleton width="100%" height={96} />
            ) : (
              <section
                ref={answerContentRef}
                className="prose answer-annotation-content"
                aria-label="答案内容"
                style={{ minWidth: 0, position: 'relative' }}
              >
                <MarkdownRenderer content={displayedAnswerText} />
              </section>
            )}

            {showAnswerContent && answerSelection && !answerEditMode && !answerOverrideLoading && (
              <AnswerAnnotationToolbar
                toolbarRef={answerAnnotationToolbarRef}
                selection={answerSelection}
                commentOpen={answerCommentOpen}
                commentDraft={answerCommentDraft}
                saving={answerAnnotationSaving}
                onHighlight={(color) => handleCreateAnswerAnnotation('highlight', color)}
                onClearHighlight={handleClearAnswerHighlight}
                onOpenComment={() => setAnswerCommentOpen(true)}
                onCommentDraftChange={setAnswerCommentDraft}
                onSaveComment={handleSaveAnswerComment}
                onCancel={handleCancelAnswerAnnotation}
              />
            )}

            {showAnswerContent && !answerEditMode && !answerOverrideLoading && (
              <AnswerCommentMarkers
                rootRef={answerContentRef}
                annotations={visibleAnswerAnnotations}
                activeId={activeAnswerCommentId}
                onActiveChange={setActiveAnswerCommentId}
                onDelete={handleDeleteAnswerComment}
              />
            )}

            {/* Status actions */}
            <div
              style={{
                paddingTop: 16,
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>你掌握了吗？</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <StatusButton
                  onClick={() => handleSetStatus('review', '1')}
                  label="没掌握"
                  sublabel="加入待复习"
                  variant="danger"
                  kbd="1"
                  active={
                    (justMarked === 'review' && lastPressedKey === '1') ||
                    (currentStatus === 'review' &&
                      lastPressedKey !== '2' &&
                      justMarked !== 'review')
                  }
                  disabled={marking}
                />
                <StatusButton
                  onClick={() => handleSetStatus('review', '2')}
                  label="大概会"
                  sublabel="还需巩固"
                  variant="warning"
                  kbd="2"
                  active={justMarked === 'review' && lastPressedKey === '2'}
                  disabled={marking}
                />
                <StatusButton
                  onClick={() => handleSetStatus('mastered', '3')}
                  label="完全掌握"
                  sublabel="不再推荐"
                  variant="success"
                  kbd="3"
                  active={justMarked === 'mastered' || currentStatus === 'mastered'}
                  disabled={marking}
                />
              </div>

              {marking && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: 'var(--text-3)',
                  }}
                >
                  <Spinner size="sm" />
                  <span>保存中…</span>
                </div>
              )}
            </div>

            {/* ── My Answer Input — "answer-alongside" mode: compact inside answer card ── */}
            {showAnswerContent && showAnswerInputInside && !hideAnswerInput && (
              <MyAnswerInput
                key={`answer-inside-${id ?? ''}`}
                questionId={id ?? ''}
                questionText={question.question}
                answerText={effectiveAnswerText}
                onOpenAIPanel={() => setAiDrawerOpen(true)}
                onOpenNote={() => setNoteDrawerOpen(true)}
                isAiEnabled={isAiEnabled}
                onNoteSaved={handleNoteSaved}
                compact
              />
            )}
          </div>
        )}

        {showSessionSummary && (
          <SessionCompletionCard
            mastered={sessionStats.mastered}
            review={sessionStats.review}
            unlearned={sessionStats.unlearned}
            total={sessionStats.total}
            retryCount={sessionStats.retryIds.length}
            onRetry={handleRetrySession}
            onBackToPractice={() => navigate('/practice')}
            onDashboard={() => navigate('/')}
          />
        )}

        {/* ── Streak counter pill (always visible when streak > 0) ── */}
        {streak.currentStreak >= 2 && (
          <div
            className="animate-fade-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 99,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              width: 'fit-content',
              fontSize: 12,
              color: 'var(--text-2)',
            }}
          >
            <span style={{ fontSize: 16 }}>🔥</span>
            <span
              style={{ fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}
            >
              {streak.currentStreak}
            </span>
            <span>连击</span>
            {streak.bestStreak > streak.currentStreak && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 2 }}>
                最高 {streak.bestStreak}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 2 }}>
              · 今日 {streak.todayCount} 题
            </span>
          </div>
        )}

        {/* Keyboard shortcuts */}
        <div className="animate-fade-in stagger-3">
          <ShortcutHints answerVisible={answerVisible} answerPanelView={answerPanelView} />
        </div>

        {/* Navigation */}
        <div
          className="animate-fade-in stagger-4"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 8,
          }}
        >
          <button
            type="button"
            onClick={() => {
              blurActiveControl()
              navigateTo(prevId)
            }}
            disabled={!prevId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--text-2)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
              opacity: !prevId ? 0.3 : 1,
              pointerEvents: !prevId ? 'none' : 'auto',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'none'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            上一题
          </button>

          <Link
            to="/questions"
            style={{
              fontSize: 12,
              color: 'var(--text-3)',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.color = 'var(--primary)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
            }}
          >
            返回列表
          </Link>

          <button
            type="button"
            onClick={() => {
              blurActiveControl()
              navigateTo(nextId)
            }}
            disabled={!nextId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--text-2)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
              opacity: !nextId ? 0.3 : 1,
              pointerEvents: !nextId ? 'none' : 'auto',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'none'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
            }}
          >
            下一题
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>

      <ModuleQuestionDrawer
        open={moduleDrawerOpen}
        onClose={() => setModuleDrawerOpen(false)}
        question={question}
        questions={currentModuleQuestions}
        records={records}
        onNavigate={handleModuleQuestionNavigate}
      />

      {/* ── AI Drawer — fixed overlay, never shifts main content ── */}
      <AIDrawer
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        question={answerContextQuestion}
        answerVisible={answerVisible}
        initialPrompt={aiInitialPrompt}
        onInitialPromptConsumed={handleAIInitialPromptConsumed}
        onOpenSettings={() => {
          setAiDrawerOpen(false)
          setSettingsOpen(true)
        }}
      />

      <NoteDrawer
        open={noteDrawerOpen}
        onClose={() => setNoteDrawerOpen(false)}
        question={question}
        refreshKey={noteRefreshKey}
        onContentStateChange={setHasNote}
      />

      {/* Settings Drawer */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* ── Streak Celebration overlay ── */}
      {celebrationStreak > 0 && (
        <StreakCelebration streak={celebrationStreak} onDone={() => setCelebrationStreak(0)} />
      )}

      {showMobileQuestionNav && (
        <MobileQuestionNav
          prevDisabled={!prevId}
          nextDisabled={!nextId}
          onPrev={() => {
            blurActiveControl()
            navigateTo(prevId)
          }}
          onNext={() => {
            blurActiveControl()
            navigateTo(nextId)
          }}
        />
      )}

      <style>{`
				@keyframes ai-dot-bounce {
					0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
					30% { transform: translateY(-4px); opacity: 1; }
				}
				@keyframes streak-pop {
					0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
					15%  { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
					25%  { transform: translate(-50%, -50%) scale(0.95); }
					35%  { transform: translate(-50%, -50%) scale(1.05); }
					50%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
					80%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
					100% { opacity: 0; transform: translate(-50%, -60%) scale(0.9); }
				}
				@media (max-width: 1023px) {
					.ai-fab { display: flex !important; }
				}
				.mobile-question-nav {
					display: none;
				}
				@media (min-width: 1024px) {
					.ai-drawer-backdrop { display: none !important; }
				}
				::highlight(iface-answer-annotation-yellow) {
					background: rgba(245, 158, 11, 0.32);
				}
				::highlight(iface-answer-annotation-green) {
					background: rgba(16, 185, 129, 0.24);
				}
				::highlight(iface-answer-annotation-blue) {
					background: rgba(59, 130, 246, 0.22);
				}
				::highlight(iface-answer-annotation-pink) {
					background: rgba(236, 72, 153, 0.22);
				}
				@media (max-width: 520px) {
					.note-drawer-panel {
						top: auto !important;
						left: 0 !important;
						right: 0 !important;
						width: 100% !important;
						height: min(82dvh, 640px) !important;
						border-left: none !important;
						border-top: 1px solid var(--border-subtle) !important;
						border-radius: 18px 18px 0 0 !important;
						animation: slide-up 0.2s var(--ease-out) both !important;
					}
					.module-question-drawer-panel {
						top: auto !important;
						left: 0 !important;
						right: 0 !important;
						width: 100% !important;
						height: min(86dvh, 720px) !important;
						border-left: none !important;
						border-top: 1px solid var(--border-subtle) !important;
						border-radius: 18px 18px 0 0 !important;
						animation: slide-up 0.2s var(--ease-out) both !important;
					}
					.session-completion-stats {
						grid-template-columns: 1fr !important;
					}
					.session-completion-actions {
						flex-direction: column !important;
					}
					.session-completion-actions > button {
						width: 100% !important;
					}
				}
				@media (max-width: 640px) {
					.question-detail-page.has-mobile-question-nav {
						padding-bottom: calc(66px + env(safe-area-inset-bottom)) !important;
					}
					.mobile-question-nav {
						position: fixed;
						left: 0;
						right: 0;
						bottom: 0;
						z-index: 135;
						display: grid;
						grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
						gap: 10px;
						align-items: center;
						padding: 6px 10px calc(6px + env(safe-area-inset-bottom));
						background: color-mix(in srgb, var(--surface) 94%, transparent);
						border-top: 1px solid var(--border-subtle);
						box-shadow: 0 -6px 18px rgba(15, 23, 42, 0.07);
						backdrop-filter: blur(16px);
					}
					.ai-fab.ai-fab-with-mobile-nav {
						bottom: calc(60px + env(safe-area-inset-bottom)) !important;
						right: 16px !important;
						width: 48px !important;
						height: 48px !important;
					}
					.ai-fab:not(.ai-fab-with-mobile-nav) {
						bottom: 16px !important;
						right: 16px !important;
						width: 48px !important;
						height: 48px !important;
					}
				}
			`}</style>
      {/* ── Mobile FAB: AI Assistant ── */}
      {showMobileAiFab && (
        <button
          type="button"
          onClick={() => setAiDrawerOpen(true)}
          className={`ai-fab${showMobileQuestionNav ? ' ai-fab-with-mobile-nav' : ''}`}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 20,
            zIndex: 140,
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: 'none',
            background: 'var(--surface-3)',
            color: 'var(--text-3)',
            boxShadow: 'var(--shadow-md)',
            cursor: 'pointer',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.18s var(--ease-spring), box-shadow 0.18s',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          }}
          title={isAiEnabled ? '打开 AI 助手（A）' : 'AI 助手（请先配置，快捷键 A）'}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
            <circle cx="7.5" cy="14.5" r="1.5" />
            <circle cx="16.5" cy="14.5" r="1.5" />
          </svg>
        </button>
      )}
    </>
  )
}
