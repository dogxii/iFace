import { Check, ChevronRight, CircleAlert, CircleCheck, Eye, EyeOff, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { buildChatCompletionsBody } from '@/lib/aiClient'
import {
  AI_PROVIDER_PRESETS,
  type AIConfig,
  type AIProviderId,
  buildChatCompletionsUrl,
  DEFAULT_AI_CONFIG,
  DEFAULT_SYSTEM_PROMPT,
  getAIProviderPreset,
  useAIStore,
} from '@/store/useAIStore'
import { Button, Callout, Field, Input, Select, SwitchRow, Textarea, toast } from '@/ui'
import { SettingsBody, SettingsRow, SettingsSection } from './parts'

type TestResult = { ok: boolean; message: string }

async function testConnection(config: AIConfig): Promise<TestResult> {
  try {
    const response = await fetch(buildChatCompletionsUrl(config.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify(
        buildChatCompletionsBody(
          { ...config, maxTokens: 10 },
          [{ role: 'user', content: 'Hi, reply with exactly: OK' }],
          false,
        ),
      ),
    })
    if (!response.ok) {
      const errText = await response.text()
      let message = `HTTP ${response.status}`
      try {
        message = JSON.parse(errText)?.error?.message ?? message
      } catch {}
      return { ok: false, message }
    }
    const data = await response.json()
    const reply: string = data?.choices?.[0]?.message?.content ?? '（无内容）'
    return { ok: true, message: `连接成功，模型回复：${reply.slice(0, 60)}` }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : '网络错误' }
  }
}

export function AISettings() {
  const { config, sessions, updateConfig, resetConfig, clearAllSessions } = useAIStore()
  const [local, setLocal] = useState<AIConfig>({ ...config })
  const [customModel, setCustomModel] = useState('')
  const [customBaseUrl, setCustomBaseUrl] = useState('')
  const [dirty, setDirty] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  // Follow store changes (e.g. another tab) while there are no unsaved edits.
  useEffect(() => {
    if (!dirty) setLocal({ ...config })
  }, [config, dirty])

  const patch = useCallback((partial: Partial<AIConfig>) => {
    setLocal((prev) => ({ ...prev, ...partial }))
    setDirty(true)
  }, [])

  const providerId: AIProviderId = AI_PROVIDER_PRESETS.some((p) => p.id === local.provider)
    ? local.provider
    : 'custom'
  const provider = getAIProviderPreset(providerId)
  const isCustomProvider = providerId === 'custom'
  const modelPreset = provider.models.find((m) => m.value === local.model)
  const selectedModel = modelPreset ? local.model : 'custom'

  useEffect(() => {
    if (selectedModel === 'custom' && local.model !== 'custom') setCustomModel(local.model)
    if (isCustomProvider && local.baseUrl !== 'custom') setCustomBaseUrl(local.baseUrl)
  }, [isCustomProvider, local.baseUrl, local.model, selectedModel])

  const resolveConfig = useCallback((): AIConfig => {
    const known = provider.models.some((m) => m.value === local.model)
    return {
      ...local,
      provider: providerId,
      model: known ? local.model : customModel.trim(),
      baseUrl: isCustomProvider ? customBaseUrl.trim() : local.baseUrl.trim(),
    }
  }, [customBaseUrl, customModel, isCustomProvider, local, provider.models, providerId])

  const handleSave = () => {
    const next = resolveConfig()
    if (!next.model) return toast.error('请填写模型名称')
    if (!next.baseUrl) return toast.error('请填写 Base URL')
    updateConfig(next)
    setDirty(false)
    toast.success('AI 设置已保存')
  }

  const handleReset = () => {
    setLocal({ ...DEFAULT_AI_CONFIG })
    setCustomModel('')
    setCustomBaseUrl('')
    resetConfig()
    setDirty(false)
    setTestResult(null)
    toast('已恢复默认设置')
  }

  const handleTest = async () => {
    const next = resolveConfig()
    if (!next.apiKey.trim()) return setTestResult({ ok: false, message: '请先填写 API Key' })
    if (!next.baseUrl) return setTestResult({ ok: false, message: '请先填写 Base URL' })
    if (!next.model) return setTestResult({ ok: false, message: '请先填写模型名称' })
    setTesting(true)
    setTestResult(null)
    setTestResult(await testConnection(next))
    setTesting(false)
  }

  const handleProviderChange = (value: string) => {
    const nextId = value as AIProviderId
    setTestResult(null)
    if (nextId === 'custom') {
      const nextBaseUrl = customBaseUrl || local.baseUrl
      const nextModel = customModel || local.model
      setCustomBaseUrl(nextBaseUrl)
      setCustomModel(nextModel === 'custom' ? '' : nextModel)
      patch({ provider: nextId, baseUrl: nextBaseUrl, model: nextModel || 'custom' })
      return
    }
    const preset = getAIProviderPreset(nextId)
    patch({ provider: nextId, baseUrl: preset.baseUrl, model: preset.defaultModel })
  }

  const systemPrompt = local.systemPrompt ?? DEFAULT_SYSTEM_PROMPT
  const sessionCount = Object.keys(sessions).length

  return (
    <SettingsBody
      footer={
        <div className="flex flex-col gap-2.5">
          {testResult ? (
            <Callout
              tone={testResult.ok ? 'success' : 'danger'}
              icon={testResult.ok ? <CircleCheck /> : <CircleAlert />}
              className="py-2 text-xs"
            >
              {testResult.message}
            </Callout>
          ) : null}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              恢复默认
            </Button>
            <span className="ml-auto text-xs text-fg-subtle max-sm:hidden">
              {dirty ? '有未保存的修改' : null}
            </span>
            <Button variant="secondary" size="sm" onClick={handleTest} loading={testing}>
              测试连接
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={!dirty}>
              {dirty ? null : <Check />}
              {dirty ? '保存设置' : '已保存'}
            </Button>
          </div>
        </div>
      }
    >
      <SettingsSection title="连接">
        <SwitchRow
          id="ai-enabled"
          label="启用 AI 助手"
          description="在题目页、模拟面试和工具箱中使用 AI 分析与点评"
          checked={local.enabled}
          onCheckedChange={(enabled) => patch({ enabled })}
        />
        <div className="mt-2 grid gap-4">
          <Field label="服务商" hint={provider.note}>
            <Select
              label="服务商"
              className="w-full"
              value={providerId}
              onValueChange={handleProviderChange}
              options={AI_PROVIDER_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
            />
          </Field>

          <Field
            label="API Key"
            hint="密钥仅保存在本机浏览器，不会上传到任何服务器"
            htmlFor="ai-key"
          >
            <Input
              id="ai-key"
              type={showKey ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              value={local.apiKey}
              onChange={(e) => patch({ apiKey: e.target.value })}
              placeholder={provider.apiKeyPlaceholder}
              className="font-mono"
              trailing={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-6"
                  aria-label={showKey ? '隐藏密钥' : '显示密钥'}
                  onClick={() => setShowKey((v) => !v)}
                >
                  {showKey ? <EyeOff /> : <Eye />}
                </Button>
              }
            />
          </Field>

          <Field label="模型" hint={modelPreset?.description}>
            <Select
              label="模型"
              className="w-full"
              value={selectedModel}
              onValueChange={(value) => {
                setTestResult(null)
                patch({ model: value === 'custom' ? customModel || 'custom' : value })
              }}
              options={[
                ...provider.models.map((m) => ({
                  value: m.value,
                  label: `${m.label}${m.recommended ? '（推荐）' : ''}`,
                })),
                { value: 'custom', label: '自定义模型' },
              ]}
            />
            {selectedModel === 'custom' ? (
              <Input
                aria-label="自定义模型名称"
                value={customModel}
                onChange={(e) => {
                  setCustomModel(e.target.value)
                  patch({ model: e.target.value })
                }}
                placeholder={
                  isCustomProvider
                    ? '模型名称，如 llama-3.3-70b'
                    : `自定义 ${provider.shortLabel} 模型 ID`
                }
              />
            ) : null}
          </Field>

          <Field
            label="API Base URL"
            htmlFor="ai-base-url"
            hint={
              isCustomProvider
                ? '必须是 OpenAI Chat Completions 兼容接口地址'
                : '由服务商自动填写；如需代理网关，请选择「自定义兼容接口」'
            }
          >
            <Input
              id="ai-base-url"
              value={isCustomProvider ? customBaseUrl : local.baseUrl}
              readOnly={!isCustomProvider}
              onChange={(e) => {
                setCustomBaseUrl(e.target.value)
                patch({ baseUrl: e.target.value })
              }}
              placeholder="https://your-api.com/v1"
              className="font-mono text-sm read-only:bg-subtle read-only:text-fg-muted"
            />
          </Field>
        </div>

        <details className="group mt-4">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-fg-muted select-none hover:text-fg [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
            高级参数
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label={`Temperature：${local.temperature}`} hint="越高越有创意，越低越保守">
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={local.temperature}
                onChange={(e) => patch({ temperature: Number.parseFloat(e.target.value) })}
                aria-label="Temperature"
                className="mt-2 w-full accent-accent"
              />
            </Field>
            <Field label="最大 Token 数" hint="单次回复的最大长度" htmlFor="ai-max-tokens">
              <Input
                id="ai-max-tokens"
                type="number"
                min={100}
                max={8000}
                step={100}
                value={local.maxTokens}
                onChange={(e) => patch({ maxTokens: Number.parseInt(e.target.value, 10) || 2000 })}
              />
            </Field>
          </div>
        </details>
      </SettingsSection>

      <SettingsSection
        title="System Prompt"
        description="控制 AI 的回答风格、格式和行为，保存后生效。"
        action={
          systemPrompt !== DEFAULT_SYSTEM_PROMPT ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => patch({ systemPrompt: DEFAULT_SYSTEM_PROMPT })}
            >
              恢复默认
            </Button>
          ) : null
        }
      >
        <Textarea
          aria-label="System Prompt"
          value={systemPrompt}
          onChange={(e) => patch({ systemPrompt: e.target.value })}
          placeholder="输入自定义 System Prompt…"
          rows={8}
          className="font-mono text-xs leading-relaxed"
        />
        <p className="mt-1.5 text-right text-xs text-fg-subtle tabular-nums">
          {systemPrompt.length.toLocaleString()} 字
        </p>
      </SettingsSection>

      <SettingsSection title="对话记录">
        <SettingsRow
          label="清除所有 AI 对话"
          description={`本地保存了 ${sessionCount} 个题目的对话，清除后不可恢复`}
        >
          <Button
            variant="danger-ghost"
            size="sm"
            disabled={sessionCount === 0}
            onClick={() => {
              if (!window.confirm('确定清除所有 AI 对话记录吗？')) return
              clearAllSessions()
              toast('对话记录已清除')
            }}
          >
            <Trash2 />
            清除
          </Button>
        </SettingsRow>
      </SettingsSection>
    </SettingsBody>
  )
}
