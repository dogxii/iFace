import { buildChatCompletionsBody, requestChatCompletionStream } from '../src/lib/aiClient.ts'
import {
  createChatCompletionStreamState,
  flushChatCompletionStream,
  parseChatCompletionStreamChunk,
} from '../src/lib/aiStream.ts'
import { buildReviewNoteMarkdown } from '../src/lib/feedbackNote.ts'
import {
  AI_PROVIDER_PRESETS,
  buildAnswerFeedbackContext,
  buildAnswerFeedbackSystemSuffix,
  buildChatCompletionsUrl,
  buildQuestionSystemSuffix,
  DEFAULT_SYSTEM_PROMPT,
  getAIQuickActions,
} from '../src/store/useAIStore.ts'

interface Failure {
  name: string
  message: string
}

const failures: Failure[] = []

function assert(name: string, condition: boolean, message: string): void {
  if (!condition) failures.push({ name, message })
}

async function assertRejects(
  name: string,
  fn: () => Promise<unknown>,
  expected: string,
): Promise<void> {
  try {
    await fn()
    failures.push({ name, message: '预期抛出错误，但实际通过了' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes(expected)) {
      failures.push({ name, message: `错误信息不匹配：${message}` })
    }
  }
}

function parseChunks(chunks: string[]): { text: string; done: boolean } {
  const state = createChatCompletionStreamState()
  let text = ''
  for (const chunk of chunks) {
    parseChatCompletionStreamChunk(state, chunk, (delta) => {
      text += delta
    })
  }
  const done = flushChatCompletionStream(state, (delta) => {
    text += delta
  })
  return { text, done }
}

function streamResponse(chunks: string[], init: ResponseInit = { status: 200 }): Response {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk))
        }
        controller.close()
      },
    }),
    init,
  )
}

const providerIds = AI_PROVIDER_PRESETS.map((provider) => provider.id)
assert(
  'provider presets include required providers',
  ['openai', 'deepseek', 'dashscope', 'zhipu', 'custom'].every((id) => providerIds.includes(id)),
  `服务商预设缺失：${providerIds.join(', ')}`,
)

const deepseek = AI_PROVIDER_PRESETS.find((provider) => provider.id === 'deepseek')
assert('deepseek preset exists', Boolean(deepseek), '缺少 DeepSeek 预设')
assert(
  'deepseek uses v4 models',
  Boolean(deepseek?.models.some((model) => model.value === 'deepseek-v4-flash')) &&
    Boolean(deepseek?.models.some((model) => model.value === 'deepseek-v4-pro')),
  'DeepSeek 预设应包含 V4 Flash / V4 Pro',
)
assert(
  'deepseek legacy names removed from presets',
  !AI_PROVIDER_PRESETS.some((provider) =>
    provider.models.some((model) => ['deepseek-chat', 'deepseek-reasoner'].includes(model.value)),
  ),
  'DeepSeek 预设不应继续暴露 deepseek-chat / deepseek-reasoner',
)

assert(
  'chat completions url trims trailing slash',
  buildChatCompletionsUrl('https://api.deepseek.com/') ===
    'https://api.deepseek.com/chat/completions',
  'Chat Completions URL 拼接错误',
)

const openAIRequestBody = buildChatCompletionsBody(
  {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5.4-mini',
    temperature: 0.3,
    maxTokens: 10,
    provider: 'openai',
  },
  [{ role: 'user', content: 'hello' }],
  false,
)
assert(
  'openai chat body uses max_completion_tokens',
  openAIRequestBody.max_completion_tokens === 10 && !('max_tokens' in openAIRequestBody),
  `OpenAI 请求体 token 参数错误：${JSON.stringify(openAIRequestBody)}`,
)

assert(
  'default system prompt is interview coach',
  DEFAULT_SYSTEM_PROMPT.includes('技术面试教练') &&
    DEFAULT_SYSTEM_PROMPT.includes('必答点') &&
    DEFAULT_SYSTEM_PROMPT.includes('常见误区'),
  '默认 System Prompt 缺少面试教练关键约束',
)

const questionSuffix = buildQuestionSystemSuffix(
  'var、let、const 的区别是什么？',
  'JS基础',
  2,
  'let / const 有块级作用域，const 声明后不能重新赋值。',
)
assert(
  'question context includes topic metadata',
  questionSuffix.includes('当前题目上下文') &&
    questionSuffix.includes('JS基础') &&
    questionSuffix.includes('中级') &&
    questionSuffix.includes('参考答案'),
  '题目上下文没有完整注入模块、难度和参考答案',
)

const feedbackSuffix = buildAnswerFeedbackSystemSuffix()
assert(
  'feedback prompt has scoring format',
  feedbackSuffix.includes('批改用户自测作答') &&
    feedbackSuffix.includes('覆盖度') &&
    feedbackSuffix.includes('面试版回答') &&
    feedbackSuffix.includes('350 字以内'),
  '作答反馈 Prompt 缺少批改目标或输出格式',
)

const feedbackContext = buildAnswerFeedbackContext({
  questionText: '解释事件循环。',
  referenceAnswer: '宏任务、微任务和渲染时机。',
  userAnswer: '先执行同步代码，再执行 Promise 回调。',
})
assert(
  'feedback context preserves user answer',
  feedbackContext.length === 1 &&
    feedbackContext[0]?.role === 'user' &&
    feedbackContext[0].content.includes('用户作答') &&
    feedbackContext[0].content.includes('Promise 回调'),
  '作答反馈上下文没有保留用户作答',
)

const reviewNote = buildReviewNoteMarkdown({
  questionText: ' 解释事件循环。 ',
  userAnswer: '',
  feedback: '  需要补齐微任务和宏任务的执行顺序。  ',
  timestamp: 1777968000000,
})
assert(
  'feedback note markdown has stable sections',
  reviewNote.startsWith('## AI 复盘 · ') &&
    reviewNote.includes('### 题目\n解释事件循环。') &&
    reviewNote.includes('### 我的作答\n（未填写）') &&
    reviewNote.includes('### AI 点评\n需要补齐微任务和宏任务的执行顺序。') &&
    !reviewNote.includes('undefined'),
  `复盘笔记 Markdown 格式错误：${reviewNote}`,
)

const actionsWithoutAnswer = getAIQuickActions(false).map((action) => action.id)
const actionsWithAnswer = getAIQuickActions(true).map((action) => action.id)
assert(
  'quick action ids are unique',
  new Set(actionsWithAnswer).size === actionsWithAnswer.length,
  '快捷动作 ID 存在重复',
)
assert(
  'improve action requires reference answer',
  !actionsWithoutAnswer.includes('improve') && actionsWithAnswer.includes('improve'),
  '优化答案动作应只在有参考答案时出现',
)

const normalStream = parseChunks([
  'data: {"choices":[{"delta":{"content":"你"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"好"}}]}\n\n',
  'data: [DONE]\n\n',
])
assert(
  'stream parser reads normal sse',
  normalStream.text === '你好' && normalStream.done,
  `普通 SSE 解析失败：${JSON.stringify(normalStream)}`,
)

const splitLine = 'data: {"choices":[{"delta":{"content":"世界"}}]}\n\n'
const splitStream = parseChunks([splitLine.slice(0, 18), splitLine.slice(18), 'data: [DONE]\n\n'])
assert(
  'stream parser keeps partial lines',
  splitStream.text === '世界' && splitStream.done,
  `跨 chunk SSE 行解析失败：${JSON.stringify(splitStream)}`,
)

const multiLineStream = parseChunks([
  'event: message\n',
  'data: {"choices":[{"delta":{"content":"A"}}]}\r\n',
  'data: {"choices":[{"delta":{"content":"I"}}]}\r\n\r\n',
  'data: [DONE]\r\n',
])
assert(
  'stream parser handles crlf and ignores non-data lines',
  multiLineStream.text === 'AI' && multiLineStream.done,
  `CRLF / 非 data 行解析失败：${JSON.stringify(multiLineStream)}`,
)

const compactDataStream = parseChunks([
  'data:{"choices":[{"delta":{"content":"紧凑"}}]}\n',
  'data:[DONE]\n',
])
assert(
  'stream parser handles compact data lines',
  compactDataStream.text === '紧凑' && compactDataStream.done,
  `无空格 data 行解析失败：${JSON.stringify(compactDataStream)}`,
)

let capturedRequest: { input: RequestInfo | URL; init?: RequestInit } | null = null
let streamedText = ''
const clientText = await requestChatCompletionStream({
  config: {
    apiKey: 'sk-test',
    baseUrl: 'https://example.com/v1/',
    model: 'mock-model',
    temperature: 0.3,
    maxTokens: 321,
  },
  messages: [
    { role: 'system', content: 'system prompt' },
    { role: 'user', content: 'hello' },
  ],
  fetchFn: async (input, init) => {
    capturedRequest = { input, init }
    const splitLine = 'data: {"choices":[{"delta":{"content":"端到端"}}]}\n\n'
    return streamResponse([splitLine.slice(0, 13), splitLine.slice(13), 'data: [DONE]\n\n'])
  },
  onDelta: (delta) => {
    streamedText += delta
  },
})

const requestBody =
  capturedRequest?.init?.body && typeof capturedRequest.init.body === 'string'
    ? JSON.parse(capturedRequest.init.body)
    : null
const requestHeaders = capturedRequest?.init?.headers as Record<string, string> | undefined
assert(
  'ai client posts to chat completions endpoint',
  String(capturedRequest?.input) === 'https://example.com/v1/chat/completions',
  `AI 请求 URL 错误：${String(capturedRequest?.input)}`,
)
assert(
  'ai client sends authorization header',
  requestHeaders?.Authorization === 'Bearer sk-test',
  `Authorization header 错误：${requestHeaders?.Authorization ?? '<missing>'}`,
)
assert(
  'ai client sends stream body',
  requestBody?.model === 'mock-model' &&
    requestBody?.stream === true &&
    requestBody?.max_tokens === 321 &&
    requestBody?.messages?.length === 2,
  `AI 请求体错误：${JSON.stringify(requestBody)}`,
)
assert(
  'ai client returns streamed text',
  clientText === '端到端' && streamedText === '端到端',
  `AI client 流式文本错误：${JSON.stringify({ clientText, streamedText })}`,
)

await assertRejects(
  'ai client extracts api error message',
  () =>
    requestChatCompletionStream({
      config: {
        apiKey: 'bad-key',
        baseUrl: 'https://example.com/v1',
        model: 'mock-model',
        temperature: 0.7,
        maxTokens: 100,
      },
      messages: [{ role: 'user', content: 'hello' }],
      fetchFn: async () =>
        new Response(JSON.stringify({ error: { message: 'invalid api key' } }), { status: 401 }),
      onDelta: () => {},
    }),
  'invalid api key',
)

if (failures.length > 0) {
  console.error(`AI 配置与 Prompt 检查失败：${failures.length} 个问题`)
  for (const failure of failures) {
    console.error(`- ${failure.name}: ${failure.message}`)
  }
  process.exit(1)
}

console.log('AI 配置与 Prompt 检查通过：模型预设、Prompt、反馈上下文、复盘笔记和流式解析正常')
