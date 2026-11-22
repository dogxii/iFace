import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Flame,
  Lightbulb,
  NotebookPen,
  PenLine,
  SearchX,
  Sparkles,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { useDelayedFlag } from '@/hooks/useDelayedFlag'
import { useQuestion, useQuestions } from '@/hooks/useQuestions'
import { getQuestionFlag, getQuestionNote, setQuestionStarred } from '@/lib/db'
import { type LearningCheckQuestion, loadLearningChecksForQuestion } from '@/lib/learningCheck'
import { createPracticeSessionPath, readPracticeSession } from '@/lib/practiceSession'
import { useAIStore } from '@/store/useAIStore'
import { clearSessionReview, useStudyStore } from '@/store/useStudyStore'
import { useUIState } from '@/store/useUIStore'
import type { StudyStatus } from '@/types'
import {
  cn,
  EmptyState,
  PageHeader,
  Tooltip,
  Button as UIButton,
  Skeleton as UISkeleton,
} from '@/ui'
import './questionDetail.css'
import { AnswerAnnotationToolbar, AnswerCommentMarkers, hashAnswerText } from './annotations'
import { blurActiveControl, MyAnswerInput, withLearningCheckSearch } from './answerInput'
import {
  AnswerAIButton,
  AnswerOverrideEditor,
  AnswerOverrideHeaderMeta,
  AnswerPanelTabs,
  type AnswerPanelView,
} from './answerPanel'
import { DetailBreadcrumb, QuestionIntro } from './detailSections'
import { LearningCheckPanel } from './learningCheck'
import { activeMasteryKey, type MasteryKey } from './mastery'
import { MasteryFooter, MasteryHeaderControl, MobileQuestionNav } from './masteryControls'
import { ModuleQuestionPanel } from './modulePanel'
import { SessionCompletionCard, SessionProgress, ShortcutHints, StreakCelebration } from './session'
import {
  adjacentInModule,
  parseInlineSessionIds,
  resolveAdjacent,
  type SessionSource,
  sessionIdentityOf,
  sessionIdsOf,
  sessionSearchOf,
  summarizeSession,
} from './sessionNav'
import { DetailSidePanel, useDetailLayout } from './sidePanel'
import { AnswerTocRail } from './tocRail'
import { useAnswerAnnotations } from './useAnswerAnnotations'
import { useAnswerOverride } from './useAnswerOverride'
import { useDetailHotkeys } from './useDetailHotkeys'

const AI_PRESET_PROMPTS = {
  question:
    '请围绕这道题做一次面试题讲解：先拆解题目在问什么，再指出考察点，最后给出适合口述的答题思路。',
  concept: '请讲解这道题背后的核心知识点：按知识框架、关键机制、常见误区和面试延展来组织。',
} as const

const STREAK_MILESTONES = [3, 5, 10, 20, 50]

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
  const settingsOpen = useUIState((state) => state.settingsOpen)
  const openSettings = useUIState((state) => state.openSettings)
  const sidePanel = useUIState((state) => state.sidePanel)
  const setSidePanel = useUIState((state) => state.setSidePanel)
  const toggleSidePanel = useUIState((state) => state.toggleSidePanel)
  const panelLayout = useDetailLayout()
  const setModulePanelPinned = useUIState((state) => state.setModulePanelPinned)

  const [answerVisible, setAnswerVisible] = useState(false)
  const [marking, setMarking] = useState(false)
  const [justMarked, setJustMarked] = useState<StudyStatus | null>(null)
  const [lastPressedKey, setLastPressedKey] = useState<MasteryKey | null>(null)
  const [aiInitialPrompt, setAiInitialPrompt] = useState<{
    id: string
    questionId: string
    text: string
  } | null>(null)
  const [answerPanelView, setAnswerPanelView] = useState<AnswerPanelView>('answer')
  const [moduleSheetOpen, setModuleSheetOpen] = useState(false)
  const [hasNote, setHasNote] = useState(false)
  const [starred, setStarred] = useState(false)
  const [celebrationStreak, setCelebrationStreak] = useState(0)
  const [sessionFinished, setSessionFinished] = useState(false)
  const [noteRefreshKey, setNoteRefreshKey] = useState(0)
  const [learningChecks, setLearningChecks] = useState<LearningCheckQuestion[]>([])
  const markingRef = useRef(false)

  // ── Session & navigation ─────────────────────────────────────────────────
  // A session comes from ?ids=... or a larger ?session=... stored in sessionStorage.
  const sessionKey = searchParams.get('session')
  const inlineSessionIds = useMemo(
    () => parseInlineSessionIds(searchParams.get('ids')),
    [searchParams],
  )
  const [storedSessionIds, setStoredSessionIds] = useState<string[]>(() =>
    readPracticeSession(sessionKey),
  )
  useEffect(() => {
    setStoredSessionIds(readPracticeSession(sessionKey))
  }, [sessionKey])

  const sessionSource: SessionSource = {
    sessionKey,
    inlineIds: inlineSessionIds,
    storedIds: storedSessionIds,
  }
  const sessionIds = sessionIdsOf(sessionSource)
  const isInSession = sessionIds.length > 0
  const sessionSearch = sessionSearchOf(sessionSource)
  const sessionIdentity = sessionIdentityOf(sessionSource)
  const checkSearchParam = searchParams.get('check')
  const questionNavigationSearch =
    answerNavigationMode === 'check' ? withLearningCheckSearch(sessionSearch) : sessionSearch
  const moduleQuestionNavigationSearch =
    answerNavigationMode === 'check' ? withLearningCheckSearch('') : ''

  const moduleAdjacent = useMemo(
    () =>
      id ? adjacentInModule(allQuestions, id, question?.module) : adjacentInModule([], '', ''),
    [id, allQuestions, question?.module],
  )
  const { prevId, nextId } = resolveAdjacent(
    sessionIds,
    questionId,
    { prev: searchParams.get('prev'), next: searchParams.get('next') },
    moduleAdjacent,
  )
  const sessionCurrent = sessionIds.indexOf(questionId) + 1
  const sessionStats = useMemo(() => summarizeSession(sessionIds, records), [records, sessionIds])
  const currentModuleQuestions = useMemo(
    () => (question ? allQuestions.filter((item) => item.module === question.module) : []),
    [allQuestions, question],
  )

  // ── Answer ───────────────────────────────────────────────────────────────
  const answer = useAnswerOverride(id, question)
  const answerSkeletonVisible = useDelayedFlag(answer.loading)
  const hasLearningCheck = learningChecks.length > 0
  const displayedAnswerHash = hashAnswerText(answer.displayedText)
  const annotations = useAnswerAnnotations({
    id,
    question,
    answerHash: displayedAnswerHash,
    active: answerVisible && answerPanelView === 'answer' && !answer.editMode && !answer.loading,
    resetKey: `${answer.editMode}|${answerPanelView}|${answerVisible}|${displayedAnswerHash}`,
  })

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
    if (!hasLearningCheck && answerPanelView === 'check') setAnswerPanelView('answer')
  }, [answerPanelView, hasLearningCheck])

  // ?note=1 opens the note drawer once (links from the dashboard and search).
  useEffect(() => {
    if (searchParams.get('note') !== '1') return
    setSidePanel('notes')
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('note')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams, setSidePanel])

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setHasNote(false)
      setStarred(false)
      return
    }
    getQuestionNote(id)
      .then((note) => {
        if (!cancelled) setHasNote(Boolean(note?.content.trim()))
      })
      .catch(() => {
        if (!cancelled) setHasNote(false)
      })
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
  const reviewCount = (id ? getRecord(id) : undefined)?.reviewCount ?? 0

  // ── Actions ──────────────────────────────────────────────────────────────
  const openAIWithPreset = useCallback(
    (preset: keyof typeof AI_PRESET_PROMPTS) => {
      if (!question) return
      setAiInitialPrompt({
        id: `${preset}-${question.id}-${Date.now()}`,
        questionId: question.id,
        text: AI_PRESET_PROMPTS[preset],
      })
      setSidePanel('ai')
    },
    [question, setSidePanel],
  )

  const handleAIInitialPromptConsumed = useCallback((promptId: string) => {
    setAiInitialPrompt((current) => (current?.id === promptId ? null : current))
  }, [])

  const handleSetStatus = useCallback(
    async (status: StudyStatus, key?: MasteryKey) => {
      if (!id || markingRef.current) return
      markingRef.current = true
      setMarking(true)
      setJustMarked(status)
      if (key) setLastPressedKey(key)

      try {
        await setStatus(id, status)
        incrementStreak()
        const newStreak = streak.currentStreak + 1
        if (STREAK_MILESTONES.includes(newStreak)) setCelebrationStreak(newStreak)

        if (isInSession && nextId) {
          setTimeout(() => navigate(`/questions/${nextId}${questionNavigationSearch}`), 600)
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
    if (hasLearningCheck && answerNavigationMode === 'check') setAnswerPanelView('check')
  }, [answerNavigationMode, hasLearningCheck])

  const navigateTo = useCallback(
    (targetId: string | null | undefined) => {
      if (!targetId) return
      navigate(`/questions/${targetId}${questionNavigationSearch}`)
    },
    [navigate, questionNavigationSearch],
  )
  const goPrev = () => {
    blurActiveControl()
    navigateTo(prevId)
  }
  const goNext = () => {
    blurActiveControl()
    navigateTo(nextId)
  }

  const handleModuleQuestionNavigate = useCallback(
    (targetId: string) => {
      setModuleSheetOpen(false)
      if (targetId === id) return
      navigate(`/questions/${targetId}${moduleQuestionNavigationSearch}`)
    },
    [id, moduleQuestionNavigationSearch, navigate],
  )

  const handleRetrySession = useCallback(() => {
    if (sessionStats.retryIds.length === 0) return
    for (const retryId of sessionStats.retryIds) clearSessionReview(retryId)
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

  const handleStartAnswerEdit = () => {
    setAnswerPanelView('answer')
    answer.startEdit()
  }

  // On wide screens the module list docks beside the page; elsewhere it is a sheet.
  const toggleModule = () => {
    if (panelLayout.moduleDocked) setModulePanelPinned(false)
    else if (panelLayout.moduleCanDock) setModulePanelPinned(true)
    else setModuleSheetOpen((open) => !open)
  }

  useDetailHotkeys({
    // The docked panel is non-modal: page shortcuts keep working unless the mobile sheet is up.
    overlayOpen: settingsOpen || moduleSheetOpen || (sidePanel !== null && !panelLayout.desktop),
    busy: () => markingRef.current,
    answerVisible,
    checkView: answerPanelView === 'check',
    toggleNote: () => toggleSidePanel('notes'),
    toggleAI: () => toggleSidePanel('ai'),
    toggleModule,
    revealAnswer: handleRevealAnswer,
    setStatus: handleSetStatus,
    goPrev: () => navigateTo(prevId),
    goNext: () => navigateTo(nextId),
  })

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-4 pt-10 sm:px-6">
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

  // ── Render ───────────────────────────────────────────────────────────────

  const isAiEnabled = aiConfig.enabled && aiConfig.apiKey.trim().length > 0
  const answerHeading = answer.hasCustom && !answer.showOriginal ? '自定义答案' : '参考答案'
  const showAnswerContent = answerPanelView === 'answer'
  const answerInteractive = showAnswerContent && !answer.editMode && !answer.loading
  const showAnswerInputAbove = studyMode === 'answer-first'
  const showAnswerInputInside = studyMode === 'answer-alongside'
  const showSessionSummary =
    isInSession && !nextId && answerVisible && (sessionFinished || currentStatus !== 'unlearned')
  const showMobileQuestionNav = mobileQuestionNavEnabled
  const mastery = {
    activeKey: activeMasteryKey(currentStatus, justMarked, lastPressedKey),
    reviewCount,
    marking,
    onMark: handleSetStatus,
  }
  // The answer card has its own AI button; hide the FAB then so it never covers the answer or rating.
  const showMobileAiFab = aiFabVisible && sidePanel === null && !answerVisible
  const modulePosition = isInSession
    ? `${sessionCurrent} / ${sessionIds.length}`
    : `${Math.max(1, currentModuleQuestions.findIndex((item) => item.id === question.id) + 1)} / ${currentModuleQuestions.length}`

  const answerInputProps = {
    questionId,
    questionText: question.question,
    answerText: answer.effectiveText,
    onOpenAIPanel: () => setSidePanel('ai'),
    onOpenNote: () => setSidePanel('notes'),
    isAiEnabled,
    onNoteSaved: handleNoteSaved,
  }

  return (
    <div
      style={
        {
          '--panel-w': `${panelLayout.width}px`,
          '--module-w': `${panelLayout.moduleWidth}px`,
        } as React.CSSProperties
      }
      className={cn(
        'min-w-0',
        panelLayout.docked && 'pr-[var(--panel-w)]',
        panelLayout.moduleDocked && 'pl-[var(--module-w)]',
      )}
    >
      <PageHeader
        title={
          <DetailBreadcrumb
            module={question.module}
            position={modulePosition}
            moduleOpen={panelLayout.moduleDocked || moduleSheetOpen}
            onOpenModule={toggleModule}
          />
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
            {answerVisible ? (
              <>
                <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
                <div className="max-sm:hidden">
                  <MasteryHeaderControl {...mastery} />
                </div>
              </>
            ) : null}
            <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
            <Tooltip content={sidePanel === 'notes' ? '关闭笔记' : '笔记'} shortcut="N">
              <UIButton
                variant={sidePanel === 'notes' ? 'secondary' : 'ghost'}
                size="icon"
                aria-label="笔记"
                aria-pressed={sidePanel === 'notes'}
                className="hidden sm:inline-flex"
                onClick={() => toggleSidePanel('notes')}
              >
                <NotebookPen />
              </UIButton>
            </Tooltip>
            <UIButton
              className="hidden sm:inline-flex"
              variant={sidePanel === 'ai' ? 'secondary' : 'ghost'}
              aria-pressed={sidePanel === 'ai'}
              shortcut="A"
              onClick={() => toggleSidePanel('ai')}
            >
              <Sparkles />问 AI
            </UIButton>
          </>
        }
      />
      <div className="@container/detail">
        <div
          className={cn(
            'question-detail-page mx-auto flex w-full max-w-[760px] flex-col gap-4 px-4 pt-6 pb-16 sm:px-6 lg:pt-10',
            showMobileQuestionNav && 'max-sm:pb-[calc(80px+env(safe-area-inset-bottom))]',
          )}
        >
          {isInSession ? (
            <SessionProgress
              current={sessionCurrent}
              total={sessionIds.length}
              onExit={() => navigate('/practice')}
            />
          ) : null}

          <QuestionIntro
            question={question}
            status={currentStatus}
            reviewCount={reviewCount}
            starred={starred}
            hasNote={hasNote}
            answerVisible={answerVisible}
            onToggleStarred={handleToggleStarred}
            onOpenNote={() => setSidePanel('notes')}
            onReveal={handleRevealAnswer}
          />

          {/* "answer-first": write your own answer above the reference */}
          {showAnswerInputAbove && (
            <MyAnswerInput
              key={`answer-above-${questionId}`}
              {...answerInputProps}
              autoFocus={answerNavigationMode !== 'check'}
            />
          )}

          {answerVisible && (
            <div className="relative flex flex-col gap-5 rounded-2xl border border-line bg-canvas p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
                <div className="flex min-w-0 flex-auto flex-wrap items-center gap-2.5">
                  {hasLearningCheck ? (
                    <AnswerPanelTabs
                      activeView={answerPanelView}
                      answerLabel={answerHeading}
                      onChange={(view) => {
                        if (view === 'check') {
                          answer.setEditMode(false)
                          annotations.setSelection(null)
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
                  {answer.hasCustom && !answer.editMode && (
                    <AnswerOverrideHeaderMeta
                      updatedAt={answer.override?.updatedAt ?? null}
                      showingOriginal={answer.showOriginal}
                      onToggleOriginal={() => {
                        setAnswerPanelView('answer')
                        answer.setShowOriginal((value) => !value)
                      }}
                    />
                  )}
                </div>

                <div className="flex items-center gap-0.5">
                  <AnswerAIButton
                    title={answer.hasCustom ? '编辑自定义答案' : '编辑参考答案'}
                    active={answer.editMode}
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
                    active={sidePanel === 'ai'}
                    onClick={() => setSidePanel('ai')}
                  >
                    <Sparkles />
                  </AnswerAIButton>
                </div>
              </div>

              {answerPanelView === 'check' ? (
                <LearningCheckPanel key={`learning-check-${question.id}`} checks={learningChecks} />
              ) : answer.editMode ? (
                <AnswerOverrideEditor
                  draft={answer.draft}
                  saveStatus={answer.saveStatus}
                  canSave={answer.canSave}
                  onDraftChange={answer.setDraft}
                  onSave={answer.save}
                  onCancel={answer.cancelEdit}
                  onRestoreDefault={answer.restoreDefault}
                />
              ) : answer.loading ? (
                // A custom answer usually loads within a frame; only show a skeleton if it's slow.
                <UISkeleton className={cn('h-24 w-full', !answerSkeletonVisible && 'invisible')} />
              ) : (
                <section
                  ref={annotations.contentRef}
                  className="prose answer-annotation-content relative min-w-0"
                  aria-label="答案内容"
                >
                  <MarkdownRenderer content={answer.displayedText} />
                </section>
              )}

              {answerInteractive && annotations.selection && (
                <AnswerAnnotationToolbar
                  toolbarRef={annotations.toolbarRef}
                  selection={annotations.selection}
                  commentOpen={annotations.commentOpen}
                  commentDraft={annotations.commentDraft}
                  saving={annotations.saving}
                  onHighlight={(color) => annotations.create('highlight', color)}
                  onClearHighlight={annotations.clearHighlight}
                  onOpenComment={() => annotations.setCommentOpen(true)}
                  onCommentDraftChange={annotations.setCommentDraft}
                  onSaveComment={annotations.saveComment}
                  onCancel={annotations.cancel}
                />
              )}

              {answerInteractive && (
                <AnswerTocRail key={displayedAnswerHash} rootRef={annotations.contentRef} />
              )}

              {answerInteractive && (
                <AnswerCommentMarkers
                  rootRef={annotations.contentRef}
                  annotations={annotations.visible}
                  activeId={annotations.activeCommentId}
                  onActiveChange={annotations.setActiveCommentId}
                  onDelete={annotations.deleteComment}
                />
              )}

              <MasteryFooter
                {...mastery}
                status={currentStatus}
                justMarked={justMarked !== null}
                advancing={isInSession && Boolean(nextId)}
                // The mobile bottom bar already carries the rating.
                className={cn(showMobileQuestionNav && 'max-sm:hidden')}
              />

              {/* "answer-alongside": compact answer box inside the card */}
              {showAnswerContent && showAnswerInputInside && (
                <MyAnswerInput key={`answer-inside-${questionId}`} {...answerInputProps} compact />
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

          <ShortcutHints answerVisible={answerVisible} />

          <nav
            aria-label="题目导航"
            className="flex items-center justify-between border-t border-line pt-4"
          >
            <UIButton variant="ghost" disabled={!prevId} onClick={goPrev}>
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
            <UIButton variant="ghost" disabled={!nextId} onClick={goNext}>
              下一题
              <ChevronRight />
            </UIButton>
          </nav>
        </div>
      </div>

      <ModuleQuestionPanel
        layout={panelLayout}
        sheetOpen={moduleSheetOpen && !panelLayout.moduleDocked}
        onSheetOpenChange={setModuleSheetOpen}
        question={question}
        questions={currentModuleQuestions}
        records={records}
        onNavigate={handleModuleQuestionNavigate}
      />

      <DetailSidePanel
        layout={panelLayout}
        question={{ ...question, answer: answer.displayedText }}
        answerVisible={answerVisible}
        noteRefreshKey={noteRefreshKey}
        onNoteContentChange={setHasNote}
        aiInitialPrompt={aiInitialPrompt}
        onAIInitialPromptConsumed={handleAIInitialPromptConsumed}
        onOpenAISettings={() => openSettings('ai')}
      />

      {celebrationStreak > 0 && (
        <StreakCelebration streak={celebrationStreak} onDone={() => setCelebrationStreak(0)} />
      )}

      {showMobileQuestionNav && (
        <MobileQuestionNav
          {...mastery}
          prevDisabled={!prevId}
          nextDisabled={!nextId}
          answerVisible={answerVisible}
          onPrev={goPrev}
          onNext={goNext}
          onReveal={handleRevealAnswer}
        />
      )}

      {showMobileAiFab && (
        <Tooltip content={isAiEnabled ? 'AI 助手' : 'AI 助手（请先配置）'} shortcut="A">
          <button
            type="button"
            onClick={() => setSidePanel('ai')}
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
    </div>
  )
}
