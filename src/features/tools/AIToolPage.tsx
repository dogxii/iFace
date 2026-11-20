import { CircleAlert, Copy, FileText, Settings2, Sparkles, Square } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { useBufferedText } from '@/hooks/useBufferedText'
import { requestChatCompletionStream } from '@/lib/aiClient'
import { useAIStore } from '@/store/useAIStore'
import { useUIState } from '@/store/useUIStore'
import {
  Box,
  Breadcrumb,
  Button,
  Callout,
  EmptyState,
  Field,
  Input,
  PageHeader,
  PageTitle,
  Spinner,
  Tag,
  Textarea,
  toast,
} from '@/ui'
import { buildMessages, createInitialValues, TOOL_MAP } from './toolConfigs'

export default function AIToolPage() {
  const { toolId } = useParams()
  const navigate = useNavigate()
  const tool = toolId ? TOOL_MAP.get(toolId) : undefined
  const { config } = useAIStore()
  const openSettings = useUIState((s) => s.openSettings)
  const aiReady = config.enabled && config.apiKey.trim().length > 0
  const [values, setValues] = useState<Record<string, string>>(() =>
    tool ? createInitialValues(tool) : {},
  )
  const [result, setResult] = useState('')
  const { text: streamingText, appendText, resetText } = useBufferedText()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!tool) return
    setValues(createInitialValues(tool))
    setResult('')
    resetText('')
    setError(null)
  }, [resetText, tool])

  useEffect(() => () => abortRef.current?.abort(), [])

  const displayResult = streamingText || result

  const missingRequired = useMemo(
    () => tool?.fields.find((f) => f.required && !values[f.id]?.trim()) ?? null,
    [tool, values],
  )

  const handleGenerate = useCallback(async () => {
    if (!tool) return
    if (!aiReady) return setError('请先在设置中启用 AI 并配置 API Key')
    if (missingRequired) return setError(`请填写「${missingRequired.label}」`)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setGenerating(true)
    setError(null)
    setResult('')
    resetText('')

    try {
      const markdown = await requestChatCompletionStream({
        config: {
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model,
          temperature: Math.min(0.75, Math.max(0.25, config.temperature)),
          maxTokens: Math.max(1800, Math.min(config.maxTokens, 3200)),
          provider: config.provider,
        },
        messages: buildMessages(tool, values),
        signal: controller.signal,
        onDelta: appendText,
      })
      setResult(markdown)
      resetText('')
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setGenerating(false)
    }
  }, [aiReady, appendText, config, missingRequired, resetText, tool, values])

  const handleStop = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setGenerating(false)
  }

  const handleCopy = async () => {
    if (!displayResult) return
    await navigator.clipboard.writeText(displayResult)
    toast.success('已复制 Markdown')
  }

  const crumbs = [
    { label: 'AI 工具箱', onClick: () => navigate('/tools') },
    { label: tool?.title ?? '未知工具' },
  ]

  if (!tool) {
    return (
      <>
        <PageHeader title={<Breadcrumb items={crumbs} />} />
        <div className="mx-auto max-w-[720px] px-4 py-16">
          <EmptyState
            icon={<CircleAlert />}
            title="工具不存在"
            description="返回工具箱选择一个可用工具。"
            action={
              <Button asChild variant="primary" size="sm">
                <Link to="/tools">返回工具箱</Link>
              </Button>
            }
          />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title={<Breadcrumb items={crumbs} />} />
      <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <PageTitle title={tool.title} description={tool.description} />

        {!aiReady ? (
          <Callout tone="warning" icon={<Settings2 />} className="mt-6" title="还没有配置 AI">
            在设置中填入 API Key 并启用 AI 后才能生成。
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
          <Box className="flex flex-col lg:sticky lg:top-[calc(var(--navbar-h,0px)+68px)]">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-fg">输入材料</h2>
              {aiReady ? (
                <Tag variant="soft" className="max-w-40 truncate font-mono text-2xs">
                  {config.model}
                </Tag>
              ) : (
                <Tag variant="warning">AI 未配置</Tag>
              )}
            </div>
            <div className="flex flex-col gap-4 p-4">
              {tool.fields.map((field) => {
                const id = `ai-tool-${field.id}`
                const label = (
                  <>
                    {field.label}
                    {field.required ? <span className="ml-0.5 text-danger">*</span> : null}
                  </>
                )
                return (
                  <Field key={field.id} label={label} htmlFor={id}>
                    {field.type === 'textarea' ? (
                      <Textarea
                        id={id}
                        value={values[field.id] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                        placeholder={field.placeholder}
                        rows={field.rows ?? 5}
                        className="text-sm"
                      />
                    ) : (
                      <Input
                        id={id}
                        value={values[field.id] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="text-sm"
                      />
                    )}
                  </Field>
                )
              })}
            </div>
            <div className="flex gap-2 border-t border-line p-4">
              {generating ? (
                <Button variant="secondary" className="flex-1" onClick={handleStop}>
                  <Square />
                  停止生成
                </Button>
              ) : (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleGenerate}
                  disabled={!aiReady}
                >
                  <Sparkles />
                  {tool.actionLabel}
                </Button>
              )}
            </div>
          </Box>

          <Box className="min-h-[280px] lg:min-h-[480px]">
            <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                生成结果
                {generating ? <Spinner size="sm" className="text-accent" /> : null}
              </h2>
              {displayResult && !generating ? (
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy />
                  复制
                </Button>
              ) : null}
            </div>
            <div className="px-5 py-5">
              {error ? (
                <Callout tone="danger" icon={<CircleAlert />} className="mb-4">
                  {error}
                </Callout>
              ) : null}
              {displayResult ? (
                <div className="prose min-w-0 text-sm">
                  <MarkdownRenderer content={displayResult} />
                </div>
              ) : generating ? (
                <p
                  className="flex items-center gap-2 py-16 text-sm text-fg-muted"
                  aria-live="polite"
                >
                  <Spinner size="sm" />
                  {tool.loadingText}
                </p>
              ) : (
                <EmptyState
                  className="border-0 py-20"
                  icon={<FileText />}
                  title={tool.emptyTitle}
                  description={tool.emptyDescription}
                />
              )}
            </div>
          </Box>
        </div>
      </div>
    </>
  )
}
