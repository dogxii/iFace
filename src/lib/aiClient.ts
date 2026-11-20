import {
  createChatCompletionStreamState,
  flushChatCompletionStream,
  parseChatCompletionStreamChunk,
} from './aiStream'

export interface ChatCompletionConfig {
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
  provider?: string
}

export interface ChatCompletionMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface RequestChatCompletionStreamOptions {
  config: ChatCompletionConfig
  messages: ChatCompletionMessage[]
  signal?: AbortSignal
  fetchFn?: typeof fetch
  onDelta: (delta: string) => void
}

export function buildChatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/chat/completions`
}

export function buildChatCompletionsBody(
  config: Pick<
    ChatCompletionConfig,
    'baseUrl' | 'model' | 'temperature' | 'maxTokens' | 'provider'
  >,
  messages: ChatCompletionMessage[],
  stream: boolean,
): Record<string, unknown> {
  const tokenLimitParameter =
    config.provider === 'openai' || isOpenAIBaseUrl(config.baseUrl)
      ? 'max_completion_tokens'
      : 'max_tokens'

  return {
    model: config.model,
    messages,
    temperature: config.temperature,
    [tokenLimitParameter]: config.maxTokens,
    stream,
  }
}

function isOpenAIBaseUrl(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).hostname === 'api.openai.com'
  } catch {
    return false
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  const fallback = `API 请求失败 (${response.status})`
  const errText = await response.text()
  try {
    const errJson = JSON.parse(errText)
    return errJson?.error?.message ?? fallback
  } catch {
    return fallback
  }
}

export async function requestChatCompletionStream({
  config,
  messages,
  signal,
  fetchFn = fetch,
  onDelta,
}: RequestChatCompletionStreamOptions): Promise<string> {
  const response = await fetchFn(buildChatCompletionsUrl(config.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    signal,
    body: JSON.stringify(buildChatCompletionsBody(config, messages, true)),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')

  const decoder = new TextDecoder()
  const streamState = createChatCompletionStreamState()
  let fullText = ''

  const appendDelta = (delta: string) => {
    fullText += delta
    onDelta(delta)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    if (parseChatCompletionStreamChunk(streamState, chunk, appendDelta)) {
      break
    }
  }

  const trailingChunk = decoder.decode()
  if (trailingChunk) {
    parseChatCompletionStreamChunk(streamState, trailingChunk, appendDelta)
  }
  flushChatCompletionStream(streamState, appendDelta)

  return fullText
}
