import { useCallback, useEffect, useRef, useState } from 'react'
import { SettingsDrawer } from '@/components/layout/SettingsDrawer'
import { Badge, Button, Spinner } from '@/components/ui'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { useBufferedText } from '@/hooks/useBufferedText'
import { type ChatCompletionMessage, requestChatCompletionStream } from '@/lib/aiClient'
import { deleteJdMatchReport, getAllJdMatchReports, putJdMatchReport } from '@/lib/db'
import { parseResumeFile } from '@/lib/resumeParser'
import { useAIStore } from '@/store/useAIStore'
import type { JdMatchReport } from '@/types'

const DEFAULT_ROLE = '前端工程师'
const REPORT_SECTION_TITLES = new Set([
  '总体判断',
  '匹配点',
  '风险点',
  '缺失关键词',
  '可能追问',
  '准备建议',
])

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return '未保存'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function extractGeneratedTitle(markdown: string, roleTitle: string): string {
  const titleLine = markdown.split('\n').find(isGeneratedTitleLine)
  const title = titleLine ? normalizeGeneratedTitle(titleLine) : ''
  if (title) return title.slice(0, 32)
  return `${roleTitle || DEFAULT_ROLE} · JD 诊断`
}

function stripGeneratedTitle(markdown: string): string {
  const lines = markdown.split('\n')
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0)
  if (firstContentIndex === -1 || !isGeneratedTitleLine(lines[firstContentIndex])) {
    return markdown.trim()
  }

  return [...lines.slice(0, firstContentIndex), ...lines.slice(firstContentIndex + 1)]
    .join('\n')
    .trim()
}

function isGeneratedTitleLine(line: string): boolean {
  const trimmed = line.trim()
  const cleaned = normalizeGeneratedTitle(trimmed)
  if (!cleaned) return false
  if (/^#{0,6}\s*\*{0,2}标题[:：]/.test(trimmed)) return true
  return /^#{1,6}\s+/.test(trimmed) && !REPORT_SECTION_TITLES.has(cleaned)
}

function normalizeGeneratedTitle(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\*+|\*+$/g, '')
    .replace(/^标题[:：]\s*/, '')
    .replace(/[*#`]/g, '')
    .trim()
}

function TextArea({
  value,
  onChange,
  placeholder,
  minHeight = 140,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  minHeight?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        minHeight,
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--surface)',
        color: 'var(--text)',
        padding: '10px 12px',
        fontSize: 13,
        lineHeight: 1.6,
        resize: 'vertical',
        outline: 'none',
        fontFamily: 'var(--font-sans)',
      }}
    />
  )
}

function buildJdMatchMessages(input: {
  roleTitle: string
  jdText: string
  resumeText: string
}): ChatCompletionMessage[] {
  return [
    {
      role: 'system',
      content: `你是 iFace 的中文技术招聘顾问，负责做简历与岗位 JD 的面试前匹配诊断。
要求：
- 只基于用户提供的 JD 和简历判断，不要编造候选人经历。
- 结论要具体，可直接用于准备面试。
- 语气克制、专业，不要写客套话。
- 风险点要指出面试中可能被质疑的原因。
- 追问要像真实面试官会问的问题。`,
    },
    {
      role: 'user',
      content: `请诊断下面候选人与目标岗位的匹配度。

目标岗位：${input.roleTitle || DEFAULT_ROLE}

请用 Markdown 输出，并严格包含这些部分：
标题：用 12 个字以内生成本次诊断标题

## 总体判断
给出 1 段结论，并给出 0-100 的匹配分。

## 匹配点
列出 4-6 条，说明 JD 需求与简历证据如何对应。

## 风险点
列出 3-5 条，说明哪些地方可能被面试官追问或质疑。

## 缺失关键词
列出简历里缺少或不够突出的 JD 关键词，并说明是否需要补充。

## 可能追问
列出 6-8 个真实面试追问，优先围绕项目真实性、技术深度、岗位关键要求。

## 准备建议
给出 3-5 条下一步准备动作。

<JD>
${input.jdText}
</JD>

<简历>
${input.resumeText}
</简历>`,
    },
  ]
}

export default function JdMatch() {
  const { config } = useAIStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [roleTitle, setRoleTitle] = useState(DEFAULT_ROLE)
  const [jdText, setJdText] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [resumeFileName, setResumeFileName] = useState<string | null>(null)
  const [resumeMessage, setResumeMessage] = useState<string | null>(null)
  const [report, setReport] = useState('')
  const [savedReports, setSavedReports] = useState<JdMatchReport[]>([])
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const {
    text: streamingText,
    appendText: appendStreamingText,
    resetText: setStreamingText,
  } = useBufferedText()
  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [parsingResume, setParsingResume] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  const aiReady = config.enabled && config.apiKey.trim().length > 0
  const displayReport = streamingText || report

  const loadReports = useCallback(async () => {
    const loaded = await getAllJdMatchReports()
    setSavedReports(loaded)
  }, [])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const handleResumeFile = useCallback(async (file: File) => {
    setParsingResume(true)
    setResumeMessage(null)
    setError(null)

    try {
      const parsed = await parseResumeFile(file)
      setResumeText(parsed.text)
      setResumeFileName(parsed.fileName)
      setResumeMessage(parsed.warning ?? `已解析 ${parsed.fileName}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '简历解析失败')
    } finally {
      setParsingResume(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!aiReady) {
      setError('请先在设置中启用 AI 并配置 API Key')
      return
    }
    if (!jdText.trim()) {
      setError('请粘贴岗位 JD')
      return
    }
    if (!resumeText.trim()) {
      setError('请上传或粘贴简历文本')
      return
    }

    setAnalyzing(true)
    setError(null)
    setReport('')
    setStreamingText('')

    try {
      const result = await requestChatCompletionStream({
        config: {
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model,
          temperature: Math.min(0.7, Math.max(0.2, config.temperature)),
          maxTokens: 2400,
        },
        messages: buildJdMatchMessages({
          roleTitle: roleTitle.trim() || DEFAULT_ROLE,
          jdText: jdText.trim(),
          resumeText: resumeText.trim(),
        }),
        onDelta: appendStreamingText,
      })
      const markdown = stripGeneratedTitle(result)
      const now = Date.now()
      const nextReport: JdMatchReport = {
        id: crypto.randomUUID(),
        title: extractGeneratedTitle(result, roleTitle.trim() || DEFAULT_ROLE),
        roleTitle: roleTitle.trim() || DEFAULT_ROLE,
        jdText: jdText.trim(),
        resumeText: resumeText.trim(),
        resumeFileName: resumeFileName ?? undefined,
        markdown,
        model: config.model,
        createdAt: now,
        updatedAt: now,
      }

      await putJdMatchReport(nextReport)
      setSavedReports((prev) => [nextReport, ...prev].sort((a, b) => b.updatedAt - a.updatedAt))
      setActiveReportId(nextReport.id)
      setReport(markdown)
      setStreamingText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成诊断失败')
    } finally {
      setAnalyzing(false)
    }
  }, [
    aiReady,
    appendStreamingText,
    config,
    jdText,
    resumeFileName,
    resumeText,
    roleTitle,
    setStreamingText,
  ])

  const handleSelectReport = useCallback(
    (item: JdMatchReport) => {
      setRoleTitle(item.roleTitle)
      setJdText(item.jdText)
      setResumeText(item.resumeText)
      setResumeFileName(item.resumeFileName ?? null)
      setResumeMessage(null)
      setReport(item.markdown)
      setStreamingText('')
      setError(null)
      setActiveReportId(item.id)
    },
    [setStreamingText],
  )

  const handleDeleteReport = useCallback(
    async (id: string) => {
      await deleteJdMatchReport(id)
      setSavedReports((prev) => prev.filter((item) => item.id !== id))
      if (activeReportId === id) {
        setActiveReportId(null)
        setReport('')
      }
    },
    [activeReportId],
  )

  const handleNewDiagnosis = useCallback(() => {
    setRoleTitle(DEFAULT_ROLE)
    setJdText('')
    setResumeText('')
    setResumeFileName(null)
    setResumeMessage(null)
    setReport('')
    setStreamingText('')
    setError(null)
    setActiveReportId(null)
  }, [setStreamingText])

  const handleCopyReport = useCallback(async () => {
    if (!displayReport) return
    await navigator.clipboard.writeText(displayReport)
  }, [displayReport])

  return (
    <>
      <div className="page-container jd-match-page">
        <div className="animate-fade-in" style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.015em',
              marginBottom: 4,
            }}
          >
            简历 JD 诊断
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
            对照目标岗位，找出简历里的匹配点、风险点和可能追问
          </p>
        </div>

        {error && <div className="jd-alert">{error}</div>}

        <div className="jd-layout">
          <aside className="jd-sidebar">
            <section className="jd-panel">
              <div className="jd-panel-header">
                <h2>诊断材料</h2>
                <Badge variant={aiReady ? 'success' : 'warning'}>
                  {aiReady ? config.model : 'AI 未配置'}
                </Badge>
              </div>

              <div className="jd-form">
                <label>
                  <span>目标岗位</span>
                  <input
                    value={roleTitle}
                    onChange={(event) => setRoleTitle(event.target.value)}
                    placeholder="例如：前端工程师"
                  />
                </label>

                <div className="jd-field">
                  <span>岗位 JD</span>
                  <TextArea
                    value={jdText}
                    onChange={setJdText}
                    placeholder="粘贴岗位职责、任职要求、技术栈关键词..."
                  />
                </div>

                <div>
                  <div className="jd-file-row">
                    <span>简历</span>
                    <small>{resumeFileName ?? '支持 PDF、DOCX、TXT、MD'}</small>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md,text/plain,text/markdown,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) handleResumeFile(file)
                    }}
                  />
                  <div className="jd-actions-row">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      loading={parsingResume}
                      onClick={() => fileRef.current?.click()}
                    >
                      上传解析
                    </Button>
                    {resumeText && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setResumeText('')
                          setResumeFileName(null)
                          setResumeMessage(null)
                        }}
                      >
                        清空
                      </Button>
                    )}
                  </div>
                  {resumeMessage && <p className="jd-resume-message">{resumeMessage}</p>}
                  <TextArea
                    value={resumeText}
                    onChange={setResumeText}
                    placeholder="也可以直接粘贴简历文本..."
                  />
                </div>

                <div className="jd-submit-row">
                  <Button type="button" variant="ghost" onClick={handleNewDiagnosis}>
                    新诊断
                  </Button>
                  {!aiReady && (
                    <Button type="button" variant="secondary" onClick={() => setSettingsOpen(true)}>
                      配置 AI
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    loading={analyzing}
                    disabled={!jdText.trim() || !resumeText.trim()}
                    onClick={handleAnalyze}
                  >
                    生成诊断
                  </Button>
                </div>
              </div>
            </section>

            <section className="jd-panel">
              <div className="jd-panel-header">
                <h2>历史记录</h2>
                <span>{savedReports.length}</span>
              </div>

              <div className="jd-history-list">
                {savedReports.length === 0 ? (
                  <p className="jd-history-empty">暂无诊断记录</p>
                ) : (
                  savedReports.map((item) => (
                    <div
                      key={item.id}
                      className="jd-history-item"
                      data-active={activeReportId === item.id}
                    >
                      <button
                        type="button"
                        disabled={analyzing}
                        onClick={() => handleSelectReport(item)}
                      >
                        <strong>{item.title}</strong>
                        <span>
                          {item.roleTitle} · {formatDateTime(item.updatedAt)}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`删除 ${item.title}`}
                        disabled={analyzing}
                        onClick={() => handleDeleteReport(item.id)}
                      >
                        删除
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>

          <section className="jd-panel jd-report-panel">
            <div className="jd-panel-header">
              <h2>诊断结果</h2>
              {displayReport && (
                <Button type="button" variant="ghost" size="sm" onClick={handleCopyReport}>
                  复制
                </Button>
              )}
            </div>

            {analyzing && !streamingText && (
              <output className="jd-busy" aria-live="polite">
                <Spinner size="sm" />
                <span>正在分析简历与 JD...</span>
              </output>
            )}

            {displayReport ? (
              <MarkdownRenderer content={displayReport} className="jd-markdown" />
            ) : (
              <div className="jd-empty">
                <h2>等待诊断</h2>
                <p>填入 JD 和简历后生成匹配报告。</p>
              </div>
            )}
          </section>
        </div>
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <style>{`
        .jd-match-page {
          max-width: 1100px;
        }

        .jd-layout {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }

        .jd-sidebar {
          display: grid;
          gap: 14px;
          min-width: 0;
        }

        .jd-panel {
          min-width: 0;
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          background: var(--surface);
          box-shadow: var(--shadow-sm);
          padding: 16px;
        }

        .jd-report-panel {
          min-height: 620px;
        }

        .jd-panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .jd-panel-header h2 {
          font-size: 15px;
          line-height: 1.3;
          font-weight: 700;
          color: var(--text);
        }

        .jd-panel-header span {
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          color: var(--text-3);
        }

        .jd-form {
          display: grid;
          gap: 14px;
        }

        .jd-form label,
        .jd-field {
          display: grid;
          gap: 7px;
        }

        .jd-form label > span,
        .jd-field > span,
        .jd-file-row > span {
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
        }

        .jd-form input {
          height: 38px;
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--text);
          padding: 0 12px;
          font-size: 13px;
          outline: none;
        }

        .jd-file-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }

        .jd-file-row small {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          color: var(--text-3);
        }

        .jd-actions-row,
        .jd-submit-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .jd-actions-row {
          margin-bottom: 8px;
        }

        .jd-submit-row {
          justify-content: flex-end;
          border-top: 1px solid var(--border-subtle);
          padding-top: 14px;
        }

        .jd-resume-message {
          margin-bottom: 8px;
          font-size: 11px;
          color: var(--text-3);
        }

        .jd-alert {
          border: 1px solid rgba(239,68,68,0.22);
          background: var(--danger-light);
          color: var(--danger);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .jd-busy {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(var(--primary-rgb), 0.18);
          border-radius: 8px;
          background: var(--primary-light);
          color: var(--primary);
          padding: 9px 11px;
          margin-bottom: 14px;
          font-size: 12px;
          font-weight: 600;
        }

        .jd-empty {
          min-height: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-align: center;
          color: var(--text-3);
        }

        .jd-empty h2 {
          font-size: 18px;
          color: var(--text);
        }

        .jd-empty p {
          font-size: 13px;
        }

        .jd-markdown {
          font-size: 14px;
          color: var(--text);
          overflow-wrap: anywhere;
        }

        .jd-history-list {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .jd-history-empty {
          font-size: 12px;
          color: var(--text-3);
        }

        .jd-history-item {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          min-width: 0;
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          background: var(--surface-2);
          padding: 9px;
        }

        .jd-history-item[data-active='true'] {
          border-color: rgba(var(--primary-rgb), 0.32);
          background: var(--primary-light);
        }

        .jd-history-item button {
          border: none;
          background: transparent;
          cursor: pointer;
        }

        .jd-history-item button:first-child {
          min-width: 0;
          text-align: left;
          color: var(--text);
        }

        .jd-history-item button:last-child {
          color: var(--text-3);
          font-size: 11px;
          padding: 4px;
        }

        .jd-history-item strong,
        .jd-history-item span {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .jd-history-item strong {
          font-size: 12px;
          color: var(--text);
        }

        .jd-history-item span {
          margin-top: 3px;
          font-size: 11px;
          color: var(--text-3);
        }

        @media (max-width: 920px) {
          .jd-layout {
            grid-template-columns: 1fr;
          }

          .jd-report-panel {
            min-height: 420px;
          }
        }
      `}</style>
    </>
  )
}
