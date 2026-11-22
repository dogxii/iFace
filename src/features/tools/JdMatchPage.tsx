import {
  CircleAlert,
  Copy,
  FileSearch,
  History,
  Plus,
  Settings2,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResumeInput, type ResumeValue } from '@/components/ResumeInput'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { useBufferedText } from '@/hooks/useBufferedText'
import { useDraft } from '@/hooks/useDraft'
import { requestChatCompletionStream } from '@/lib/aiClient'
import { deleteJdMatchReport, getAllJdMatchReports, putJdMatchReport } from '@/lib/db'
import { useAIStore } from '@/store/useAIStore'
import { useUIState } from '@/store/useUIStore'
import type { JdMatchReport } from '@/types'
import {
  Box,
  Breadcrumb,
  Button,
  Callout,
  cn,
  EmptyState,
  Field,
  Input,
  PageHeader,
  PageTitle,
  ProgressRing,
  Spinner,
  Tag,
  Textarea,
  toast,
} from '@/ui'
import {
  buildJdMatchMessages,
  DEFAULT_ROLE,
  extractGeneratedTitle,
  extractMatchScore,
  formatReportTime,
  stripGeneratedTitle,
} from './jdMatch'

const EMPTY_RESUME: ResumeValue = { text: '', fileName: null }

interface JdDraft {
  roleTitle: string
  jdText: string
  resume: ResumeValue
  /** Report shown when the page was left, restored from history on return. */
  reportId: string | null
}

const EMPTY_DRAFT: JdDraft = {
  roleTitle: DEFAULT_ROLE,
  jdText: '',
  resume: EMPTY_RESUME,
  reportId: null,
}

function parseJdDraft(value: unknown): JdDraft | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const resume = (v.resume ?? {}) as Record<string, unknown>
  return {
    roleTitle: typeof v.roleTitle === 'string' ? v.roleTitle : DEFAULT_ROLE,
    jdText: typeof v.jdText === 'string' ? v.jdText : '',
    resume: {
      text: typeof resume.text === 'string' ? resume.text : '',
      fileName: typeof resume.fileName === 'string' ? resume.fileName : null,
    },
    reportId: typeof v.reportId === 'string' ? v.reportId : null,
  }
}

function sortReports(reports: JdMatchReport[]) {
  return [...reports].sort((a, b) => b.updatedAt - a.updatedAt)
}

type ScoreTone = 'success' | 'warning' | 'danger'

function scoreTone(score: number): ScoreTone {
  if (score >= 75) return 'success'
  if (score >= 55) return 'warning'
  return 'danger'
}

const SCORE_TEXT: Record<ScoreTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

const SCORE_STROKE: Record<ScoreTone, string> = {
  success: 'stroke-success',
  warning: 'stroke-warning',
  danger: 'stroke-danger',
}

/** On stacked (mobile) layouts the report sits below the form, so bring it into view. */
function revealOnStackedLayout(el: HTMLElement | null) {
  if (!el || window.matchMedia('(min-width: 1024px)').matches) return
  requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

export default function JdMatchPage() {
  const navigate = useNavigate()
  const { config } = useAIStore()
  const openSettings = useUIState((s) => s.openSettings)
  const aiReady = config.enabled && config.apiKey.trim().length > 0

  const reportRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [draft, setDraft] = useDraft('jd-match', EMPTY_DRAFT, parseJdDraft)
  const { roleTitle, jdText, resume, reportId: activeReportId } = draft
  const setRoleTitle = (roleTitle: string) => setDraft((d) => ({ ...d, roleTitle }))
  const setJdText = (jdText: string) => setDraft((d) => ({ ...d, jdText }))
  const setResume = (resume: ResumeValue) => setDraft((d) => ({ ...d, resume }))
  const setActiveReportId = (reportId: string | null) => setDraft((d) => ({ ...d, reportId }))
  const resumeText = resume.text
  const [report, setReport] = useState('')
  const [savedReports, setSavedReports] = useState<JdMatchReport[]>([])
  const { text: streamingText, appendText, resetText } = useBufferedText()
  const [error, setError] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  const displayReport = streamingText || report
  const activeReport = savedReports.find((item) => item.id === activeReportId) ?? null
  const score = useMemo(() => (report ? extractMatchScore(report) : null), [report])

  // Load history once, and bring back the report that was open when the page was left.
  const restoreReportId = useRef(activeReportId)
  useEffect(() => {
    getAllJdMatchReports().then((loaded) => {
      setSavedReports(sortReports(loaded))
      const restored = loaded.find((item) => item.id === restoreReportId.current)
      if (restored) setReport(restored.markdown)
    })
  }, [])

  useEffect(() => () => abortRef.current?.abort(), [])

  const handleAnalyze = async () => {
    if (!aiReady) return setError('请先在设置中启用 AI 并配置 API Key')
    if (!jdText.trim()) return setError('请粘贴岗位 JD')
    if (!resumeText.trim()) return setError('请上传或粘贴简历文本')

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const role = roleTitle.trim() || DEFAULT_ROLE
    setAnalyzing(true)
    setError(null)
    setReport('')
    setActiveReportId(null)
    resetText('')
    revealOnStackedLayout(reportRef.current)

    try {
      const result = await requestChatCompletionStream({
        config: {
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model,
          temperature: Math.min(0.7, Math.max(0.2, config.temperature)),
          maxTokens: 2400,
          provider: config.provider,
        },
        messages: buildJdMatchMessages({
          roleTitle: role,
          jdText: jdText.trim(),
          resumeText: resumeText.trim(),
        }),
        signal: controller.signal,
        onDelta: appendText,
      })
      const markdown = stripGeneratedTitle(result)
      const now = Date.now()
      const next: JdMatchReport = {
        id: crypto.randomUUID(),
        title: extractGeneratedTitle(result, role),
        roleTitle: role,
        jdText: jdText.trim(),
        resumeText: resumeText.trim(),
        resumeFileName: resume.fileName ?? undefined,
        markdown,
        model: config.model,
        createdAt: now,
        updatedAt: now,
      }
      await putJdMatchReport(next)
      setSavedReports((prev) => sortReports([next, ...prev]))
      setActiveReportId(next.id)
      setReport(markdown)
      resetText('')
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : '生成诊断失败')
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setAnalyzing(false)
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setAnalyzing(false)
  }

  const handleSelectReport = (item: JdMatchReport) => {
    setDraft({
      roleTitle: item.roleTitle,
      jdText: item.jdText,
      resume: { text: item.resumeText, fileName: item.resumeFileName ?? null },
      reportId: item.id,
    })
    setReport(item.markdown)
    resetText('')
    setError(null)
    revealOnStackedLayout(reportRef.current)
  }

  const handleDeleteReport = async (item: JdMatchReport) => {
    await deleteJdMatchReport(item.id)
    setSavedReports((prev) => prev.filter((r) => r.id !== item.id))
    if (activeReportId === item.id) {
      setActiveReportId(null)
      setReport('')
    }
    toast('已删除诊断记录', {
      description: item.title,
      action: {
        label: '撤销',
        onClick: async () => {
          await putJdMatchReport(item)
          setSavedReports((prev) => sortReports([item, ...prev]))
        },
      },
    })
  }

  const handleNewDiagnosis = () => {
    handleStop()
    const previous = { draft, report }
    // Material that isn't tied to a saved report would be lost: offer to bring it back.
    const unsaved = !draft.reportId && (draft.jdText.trim() || draft.resume.text.trim())
    setDraft(EMPTY_DRAFT)
    setReport('')
    resetText('')
    setError(null)
    if (unsaved) {
      toast('已清空诊断材料', {
        action: {
          label: '撤销',
          onClick: () => {
            setDraft(previous.draft)
            setReport(previous.report)
          },
        },
      })
    }
  }

  const handleCopy = async () => {
    if (!displayReport) return
    await navigator.clipboard.writeText(displayReport)
    toast.success('已复制 Markdown')
  }

  return (
    <>
      <PageHeader
        title={
          <Breadcrumb
            items={[
              { label: 'AI 工具箱', onClick: () => navigate('/tools') },
              { label: '简历 JD 诊断' },
            ]}
          />
        }
        actions={
          <Button variant="secondary" size="sm" onClick={handleNewDiagnosis}>
            <Plus />
            新诊断
          </Button>
        }
      />
      <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <PageTitle
          title="简历 JD 诊断"
          description="对照目标岗位，找出简历里的匹配点、风险点和面试官可能的追问。"
        />

        {!aiReady ? (
          <Callout tone="warning" icon={<Settings2 />} className="mt-6" title="还没有配置 AI">
            在设置中填入 API Key 并启用 AI 后才能生成诊断。
            <Button
              variant="link"
              size="sm"
              className="ml-1 h-auto p-0"
              onClick={() => openSettings('ai')}
            >
              去设置
            </Button>
          </Callout>
        ) : null}

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            <Box className="flex flex-col">
              <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                <h2 className="text-sm font-semibold text-fg">诊断材料</h2>
                {aiReady ? (
                  <Tag variant="soft" className="max-w-40 truncate font-mono text-2xs">
                    {config.model}
                  </Tag>
                ) : (
                  <Tag variant="warning">AI 未配置</Tag>
                )}
              </div>

              <div className="flex flex-col gap-4 p-4">
                <Field label="目标岗位" htmlFor="jd-role">
                  <Input
                    id="jd-role"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="例如：前端工程师"
                    className="text-sm"
                  />
                </Field>

                <Field
                  label="岗位 JD"
                  htmlFor="jd-text"
                  hint={jdText ? `${jdText.trim().length} 字` : '岗位职责、任职要求、技术栈关键词'}
                >
                  <Textarea
                    id="jd-text"
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="粘贴岗位 JD…"
                    rows={7}
                    className="text-sm"
                  />
                </Field>

                <ResumeInput
                  id="jd-resume"
                  value={resume}
                  onChange={setResume}
                  onError={setError}
                />
              </div>

              <div className="flex gap-2 border-t border-line p-4">
                {analyzing ? (
                  <Button variant="secondary" className="flex-1" onClick={handleStop}>
                    <Square />
                    停止生成
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleAnalyze}
                    disabled={!aiReady || !jdText.trim() || !resumeText.trim()}
                  >
                    <Sparkles />
                    生成诊断
                  </Button>
                )}
              </div>
            </Box>

            <Box>
              <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <History className="size-4 text-fg-subtle" />
                  历史记录
                </h2>
                <span className="text-xs text-fg-subtle tabular-nums">{savedReports.length}</span>
              </div>
              {savedReports.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-fg-subtle">暂无诊断记录</p>
              ) : (
                <ul className="flex max-h-[360px] flex-col gap-0.5 overflow-y-auto overscroll-contain p-1.5">
                  {savedReports.map((item) => {
                    const active = item.id === activeReportId
                    const itemScore = extractMatchScore(item.markdown)
                    return (
                      <li
                        key={item.id}
                        className={cn(
                          'group flex items-center gap-1 rounded-lg transition-colors',
                          active ? 'bg-accent-subtle' : 'hover:bg-subtle',
                        )}
                      >
                        <button
                          type="button"
                          disabled={analyzing}
                          aria-current={active || undefined}
                          onClick={() => handleSelectReport(item)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-2.5 text-left disabled:opacity-60"
                        >
                          <span
                            className={cn(
                              'flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-canvas text-xs font-semibold tabular-nums',
                              itemScore === null
                                ? 'text-fg-subtle'
                                : SCORE_TEXT[scoreTone(itemScore)],
                            )}
                          >
                            {itemScore ?? '—'}
                          </span>
                          <span className="min-w-0">
                            <span
                              className={cn(
                                'block truncate text-sm',
                                active ? 'font-medium text-fg' : 'text-fg',
                              )}
                            >
                              {item.title}
                            </span>
                            <span className="block truncate text-xs text-fg-subtle">
                              {item.roleTitle} · {formatReportTime(item.updatedAt)}
                            </span>
                          </span>
                        </button>
                        <Button
                          variant="danger-ghost"
                          size="icon-sm"
                          aria-label={`删除 ${item.title}`}
                          disabled={analyzing}
                          onClick={() => handleDeleteReport(item)}
                          className="mr-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
                        >
                          <Trash2 />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Box>
          </div>

          <Box ref={reportRef} className="min-h-[320px] scroll-mt-28 lg:min-h-[560px]">
            <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
              <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-fg">
                <span className="truncate">{activeReport?.title ?? '诊断结果'}</span>
                {analyzing ? <Spinner size="sm" className="text-accent" /> : null}
              </h2>
              {displayReport && !analyzing ? (
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy />
                  复制
                </Button>
              ) : null}
            </div>

            {score !== null && !analyzing ? (
              <div className="flex items-center gap-4 border-b border-line px-5 py-4">
                <div className="relative">
                  <ProgressRing
                    value={score}
                    max={100}
                    size={52}
                    stroke={5}
                    indicatorClassName={SCORE_STROKE[scoreTone(score)]}
                  />
                  <span
                    className={cn(
                      'absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums',
                      SCORE_TEXT[scoreTone(score)],
                    )}
                  >
                    {score}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">匹配分 {score} / 100</p>
                  <p className="truncate text-xs text-fg-subtle">
                    {activeReport
                      ? `${activeReport.roleTitle} · ${formatReportTime(activeReport.updatedAt)}${activeReport.model ? ` · ${activeReport.model}` : ''}`
                      : roleTitle}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="px-5 py-5">
              {error ? (
                <Callout tone="danger" icon={<CircleAlert />} className="mb-4">
                  {error}
                </Callout>
              ) : null}
              {displayReport ? (
                <MarkdownRenderer content={displayReport} className="prose text-sm" />
              ) : analyzing ? (
                <p
                  className="flex items-center gap-2 py-16 text-sm text-fg-muted"
                  aria-live="polite"
                >
                  <Spinner size="sm" />
                  正在分析简历与 JD…
                </p>
              ) : (
                <EmptyState
                  className="border-0 py-20"
                  icon={<FileSearch />}
                  title="等待诊断"
                  description="填入 JD 和简历后生成匹配报告，结果会自动保存到历史记录。"
                />
              )}
            </div>
          </Box>
        </div>
      </div>
    </>
  )
}
