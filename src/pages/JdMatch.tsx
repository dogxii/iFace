import { useCallback, useRef, useState } from 'react'
import { SettingsDrawer } from '@/components/layout/SettingsDrawer'
import { Button, Spinner } from '@/components/ui'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { type ChatCompletionMessage, requestChatCompletionStream } from '@/lib/aiClient'
import { parseResumeFile } from '@/lib/resumeParser'
import { useAIStore } from '@/store/useAIStore'

const DEFAULT_ROLE = '前端工程师'

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
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [parsingResume, setParsingResume] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  const aiReady = config.enabled && config.apiKey.trim().length > 0
  const displayReport = streamingText || report

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
        onDelta: (delta) => setStreamingText((prev) => prev + delta),
      })
      setReport(result)
      setStreamingText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成诊断失败')
    } finally {
      setAnalyzing(false)
    }
  }, [aiReady, config, jdText, resumeText, roleTitle])

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
          <section className="jd-panel">
            <div className="jd-panel-header">
              <h2>诊断材料</h2>
              <span>{aiReady ? config.model : 'AI 未配置'}</span>
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
