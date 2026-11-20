import {
  BookOpenCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Eye,
  Flame,
  Lightbulb,
  NotebookPen,
  PenLine,
  RotateCcw,
  SearchX,
  Sparkles,
  Star,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import { reviewIntervalDays } from '@/store/studyLogic'
import { useAIStore } from '@/store/useAIStore'
import { clearSessionReview, useStudyStore } from '@/store/useStudyStore'
import { useUIState } from '@/store/useUIStore'
import {
  type AnswerAnnotationColor,
  DIFFICULTY_LABELS,
  type QuestionAnswerAnnotation,
  type QuestionAnswerOverride,
  type StudyStatus,
} from '@/types'
import {
  cn,
  EmptyState,
  Kbd,
  PageHeader,
  Spinner,
  Tag,
  Tooltip,
  Button as UIButton,
  Skeleton as UISkeleton,
} from '@/ui'
import './questionDetail.css'
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
  const settingsOpen = useUIState((state) => state.settingsOpen)
  const openSettings = useUIState((state) => state.openSettings)
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
  // The answer card has its own AI button; hide the FAB then so it never covers the status dock.
  const showMobileAiFab = aiFabVisible && !aiDrawerOpen && !answerVisible
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
      <div className="mx-auto flex w-full max-w-[760px] animate-fade-in flex-col gap-4 px-4 pt-10 sm:px-6">
        <div className="flex gap-2">
          <UISkeleton className="h-[22px] w-16" />
          <UISkeleton className="h-[22px] w-12" />
        </div>
        <UISkeleton className="h-8 w-4/5" />
        <UISkeleton className="h-8 w-3/5" />
        <UISkeleton className="mt-4 h-16 w-full rounded-2xl" />
        <UISkeleton className="h-36 w-full rounded-2xl" />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="mx-auto w-full max-w-[760px] px-4 pt-10 sm:px-6">
        <EmptyState
          icon={<SearchX />}
          title="找不到该题目"
          description={`题目 ID：${id}`}
          action={
            <UIButton asChild variant="primary" size="sm">
              <Link to="/questions">返回题库</Link>
            </UIButton>
          }
        />
      </div>
    )
  }

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
      <PageHeader
        title={
          <nav aria-label="面包屑" className="flex min-w-0 items-center gap-1.5">
            <Link to="/questions" className="shrink-0 hover:text-fg">
              题库
            </Link>
            <ChevronRight className="size-3.5 shrink-0 text-line-strong" />
            <button
              type="button"
              onClick={() => {
                setNoteDrawerOpen(false)
                setModuleDrawerOpen(true)
              }}
              aria-label={`展开${question.module}题目列表`}
              aria-expanded={moduleDrawerOpen}
              title="展开本模块题目列表（L）"
              className="inline-flex min-w-0 items-center gap-0.5 rounded-md px-1 hover:bg-muted hover:text-fg"
            >
              <span className="truncate">{question.module}</span>
              <ChevronDown className="size-3.5 shrink-0" />
            </button>
            <ChevronRight className="size-3.5 shrink-0 text-line-strong" />
            <span className="shrink-0 font-medium tabular-nums text-fg">
              {isInSession
                ? `${sessionCurrent} / ${sessionTotal}`
                : `${Math.max(1, currentModuleQuestions.findIndex((item) => item.id === question.id) + 1)} / ${currentModuleQuestions.length}`}
            </span>
          </nav>
        }
        actions={
          <>
            <Tooltip content="上一题" shortcut="←">
              <UIButton
                variant="secondary"
                size="icon"
                aria-label="上一题"
                disabled={!prevId}
                onClick={() => navigateTo(prevId)}
              >
                <ChevronLeft />
              </UIButton>
            </Tooltip>
            <Tooltip content="下一题" shortcut="→">
              <UIButton
                variant="secondary"
                size="icon"
                aria-label="下一题"
                disabled={!nextId}
                onClick={() => navigateTo(nextId)}
              >
                <ChevronRight />
              </UIButton>
            </Tooltip>
            <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
            <UIButton
              className="hidden sm:inline-flex"
              shortcut="A"
              onClick={() => setAiDrawerOpen(true)}
            >
              <Sparkles />问 AI
            </UIButton>
          </>
        }
      />
      <div
        className={cn(
          'question-detail-page mx-auto flex w-full max-w-[760px] flex-col gap-4 px-4 pt-6 pb-28 sm:px-6 lg:pt-10',
          showMobileQuestionNav && 'max-sm:pb-[calc(96px+env(safe-area-inset-bottom))]',
        )}
      >
        {isInSession ? (
          <SessionProgress
            current={sessionCurrent}
            total={sessionTotal}
            onExit={() => navigate('/practice')}
          />
        ) : null}

        {/* Question */}
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag>{question.module}</Tag>
            <Tag
              dot={
                question.difficulty === 1
                  ? 'success'
                  : question.difficulty === 2
                    ? 'warning'
                    : 'danger'
              }
            >
              {DIFFICULTY_LABELS[question.difficulty]}
            </Tag>
            {currentStatus !== 'unlearned' && (
              <Tag variant={currentStatus === 'mastered' ? 'success' : 'warning'}>
                {currentStatus === 'mastered' ? '已掌握' : '待复习'}
              </Tag>
            )}
            <div className="ml-auto flex items-center gap-0.5">
              <Tooltip content={starred ? '取消重点题' : '标记为重点题'}>
                <UIButton
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleStarred}
                  aria-pressed={starred}
                  aria-label={starred ? '取消重点题' : '标记为重点题'}
                >
                  <Star className={starred ? 'fill-amber-400 text-amber-500' : undefined} />
                </UIButton>
              </Tooltip>
              <Tooltip content={hasNote ? '打开题目笔记' : '添加题目笔记'} shortcut="N">
                <UIButton
                  variant="ghost"
                  size="icon"
                  onClick={() => setNoteDrawerOpen(true)}
                  aria-label={hasNote ? '打开题目笔记' : '添加题目笔记'}
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
              onClick={handleRevealAnswer}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-5 text-sm font-medium text-fg-muted transition-colors hover:border-accent hover:bg-accent-subtle hover:text-accent"
            >
              <Eye className="size-4" />
              查看参考答案
              <Kbd>Space</Kbd>
            </button>
          )}
        </header>

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
            className="flex animate-scale-in flex-col gap-5 rounded-2xl border border-line bg-canvas p-5 sm:p-6"
          >
            {/* Answer header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
              <div className="flex min-w-0 flex-auto flex-wrap items-center gap-2.5">
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
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <BookOpenCheck className="size-4 text-accent" />
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

              <div className="flex items-center gap-0.5">
                <AnswerAIButton
                  title={hasCustomAnswer ? '编辑自定义答案' : '编辑参考答案'}
                  active={answerEditMode}
                  onClick={handleStartAnswerEdit}
                >
                  <PenLine />
                </AnswerAIButton>
                <AnswerAIButton
                  title={isAiEnabled ? '讲解题目' : '讲解题目（请先配置 AI）'}
                  onClick={() => openAIWithPreset('question')}
                >
                  <CircleHelp />
                </AnswerAIButton>
                <AnswerAIButton
                  title={isAiEnabled ? '讲解知识点' : '讲解知识点（请先配置 AI）'}
                  onClick={() => openAIWithPreset('concept')}
                >
                  <Lightbulb />
                </AnswerAIButton>
                <AnswerAIButton
                  title={isAiEnabled ? '打开 AI 助手（A）' : 'AI 助手（请先配置，快捷键 A）'}
                  active={aiDrawerOpen}
                  onClick={() => setAiDrawerOpen(true)}
                >
                  <Sparkles />
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
              <UISkeleton className="h-24 w-full" />
            ) : (
              <section
                ref={answerContentRef}
                className="prose answer-annotation-content relative min-w-0"
                aria-label="答案内容"
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
              className={cn(
                'sticky bottom-3 z-20 -mx-2 flex flex-col gap-2 rounded-2xl border border-line-strong bg-elevated/95 p-2 shadow-popover backdrop-blur-md sm:flex-row sm:items-center',
                showMobileQuestionNav && 'max-sm:bottom-[calc(60px+env(safe-area-inset-bottom))]',
              )}
            >
              <p
                className={cn(
                  'flex shrink-0 items-center gap-1.5 px-2 text-xs text-fg-muted',
                  !marking && 'max-sm:hidden',
                )}
              >
                {marking ? <Spinner size="sm" /> : null}
                {marking ? '保存中…' : '你掌握了吗？'}
              </p>
              <div className="flex flex-1 gap-1.5 sm:gap-2">
                <StatusButton
                  onClick={() => handleSetStatus('review', '1')}
                  label="没掌握"
                  sublabel="明天再练"
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
                  sublabel="明天巩固"
                  variant="warning"
                  kbd="2"
                  active={justMarked === 'review' && lastPressedKey === '2'}
                  disabled={marking}
                />
                <StatusButton
                  onClick={() => handleSetStatus('mastered', '3')}
                  label="完全掌握"
                  sublabel={
                    <>
                      {reviewIntervalDays({ status: 'mastered', reviewCount }) ?? 7} 天后
                      <span className="max-sm:hidden">复习</span>
                    </>
                  }
                  variant="success"
                  kbd="3"
                  active={justMarked === 'mastered' || currentStatus === 'mastered'}
                  disabled={marking}
                />
              </div>
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

        {streak.currentStreak >= 2 && (
          <p className="flex w-fit items-center gap-1.5 rounded-full border border-line bg-subtle px-3 py-1 text-xs text-fg-muted">
            <Flame className="size-3.5 text-warning" />
            <span className="font-semibold tabular-nums text-fg">{streak.currentStreak}</span>
            连击
            {streak.bestStreak > streak.currentStreak && (
              <span className="text-fg-subtle">· 最高 {streak.bestStreak}</span>
            )}
            <span className="text-fg-subtle">· 今日 {streak.todayCount} 题</span>
          </p>
        )}

        {/* Keyboard shortcuts */}
        <div className="animate-fade-in stagger-3">
          <ShortcutHints answerVisible={answerVisible} answerPanelView={answerPanelView} />
        </div>

        {/* Navigation */}
        <nav
          aria-label="题目导航"
          className="flex items-center justify-between border-t border-line pt-4"
        >
          <UIButton
            variant="ghost"
            disabled={!prevId}
            onClick={() => {
              blurActiveControl()
              navigateTo(prevId)
            }}
          >
            <ChevronLeft />
            上一题
          </UIButton>
          <UIButton variant="ghost" asChild>
            <Link
              to={
                isInSession
                  ? '/practice'
                  : `/questions?module=${encodeURIComponent(question.module)}`
              }
            >
              返回列表
            </Link>
          </UIButton>
          <UIButton
            variant="ghost"
            disabled={!nextId}
            onClick={() => {
              blurActiveControl()
              navigateTo(nextId)
            }}
          >
            下一题
            <ChevronRight />
          </UIButton>
        </nav>
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
          openSettings('ai')
        }}
      />

      <NoteDrawer
        open={noteDrawerOpen}
        onClose={() => setNoteDrawerOpen(false)}
        question={question}
        refreshKey={noteRefreshKey}
        onContentStateChange={setHasNote}
      />

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

      {/* ── Mobile FAB: AI Assistant ── */}
      {showMobileAiFab && (
        <Tooltip content={isAiEnabled ? 'AI 助手' : 'AI 助手（请先配置）'} shortcut="A">
          <button
            type="button"
            onClick={() => setAiDrawerOpen(true)}
            aria-label="打开 AI 助手"
            className={cn(
              'fixed right-4 z-[36] grid size-12 place-items-center rounded-full border border-line bg-elevated text-accent shadow-raised transition-transform hover:scale-105 active:scale-95 lg:hidden',
              showMobileQuestionNav
                ? 'bottom-[calc(64px+env(safe-area-inset-bottom))]'
                : 'bottom-[calc(16px+env(safe-area-inset-bottom))]',
            )}
          >
            <Sparkles className="size-5" />
          </button>
        </Tooltip>
      )}
    </>
  )
}
