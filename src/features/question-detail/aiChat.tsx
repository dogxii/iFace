import {
  ArrowUp,
  Bot,
  Check,
  Copy,
  RotateCcw,
  Settings,
  Sparkles,
  Square,
  Trash2,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { useBufferedText } from '@/hooks/useBufferedText'
import {
  type AIMessage,
  buildQuestionSystemSuffix,
  getAIQuickActions,
  useAIStore,
} from '@/store/useAIStore'
import type { Question } from '@/types'
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  toast,
} from '@/ui'

// ─── Pieces ───────────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] align-middle" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block size-[5px] animate-[ai-dot-bounce_1.2s_ease-in-out_infinite] rounded-full bg-accent"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </span>
  )
}

function MessageAction({
  title,
  disabled = false,
  onClick,
  children,
}: {
  title: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip content={title}>
      <button
        type="button"
        aria-label={title}
        disabled={disabled}
        onClick={onClick}
        className="inline-flex size-6 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-muted hover:text-fg disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-3.5"
      >
        {children}
      </button>
    </Tooltip>
  )
}

interface MessageProps {
  message: AIMessage
  isStreaming?: boolean
  streamingText?: string
  copied?: boolean
  retryDisabled?: boolean
  onCopy?: () => void
  onRetry?: () => void
}

/**
 * Chat message. The user's turns are compact bubbles on the right; replies are plain,
 * full-width prose (easier to read long Markdown), with copy / retry underneath.
 */
function Message({
  message,
  isStreaming,
  streamingText,
  copied = false,
  retryDisabled = false,
  onCopy,
  onRetry,
}: MessageProps) {
  const isUser = message.role === 'user'
  const content = isStreaming && streamingText !== undefined ? streamingText : message.content
  const canShowActions = Boolean(content.trim()) && !isStreaming

  if (isUser) {
    return (
      <div className="group flex flex-col items-end gap-1">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-muted px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap text-fg">
          {content}
        </div>
        {canShowActions && onCopy ? (
          <div className="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <MessageAction title={copied ? '已复制' : '复制'} onClick={onCopy}>
              {copied ? <Check /> : <Copy />}
            </MessageAction>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="group flex flex-col gap-1">
      <div className="min-w-0 text-sm leading-[1.75] break-words text-fg">
        {content ? (
          <div className="ai-chat-markdown">
            <MarkdownRenderer content={content} />
            {isStreaming && <TypingDots />}
          </div>
        ) : (
          <TypingDots />
        )}
      </div>
      {canShowActions ? (
        <div className="-ml-1 flex items-center gap-0.5">
          {onCopy && (
            <MessageAction title={copied ? '已复制' : '复制'} onClick={onCopy}>
              {copied ? <Check /> : <Copy />}
            </MessageAction>
          )}
          {onRetry && (
            <MessageAction title="重新回答" disabled={retryDisabled} onClick={onRetry}>
              <RotateCcw />
            </MessageAction>
          )}
        </div>
      ) : null}
    </div>
  )
}

function EmptyChat({
  hasAnswer,
  onQuickAction,
}: {
  hasAnswer: boolean
  onQuickAction: (prompt: string) => void
}) {
  const quickStarters = getAIQuickActions(hasAnswer).filter((action) =>
    ['analyze', 'structure', 'explain', 'practice'].includes(action.id),
  )

  return (
    <div className="flex flex-1 flex-col justify-end gap-4 px-4 pt-8 pb-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Sparkles className="size-4 text-accent" />
          围绕这道题问 AI
        </p>
        <p className="mt-1 text-xs leading-relaxed text-fg-subtle">
          分析考点、梳理答题结构、预测追问。题目{hasAnswer ? '和参考答案' : ''}会自动作为上下文。
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {quickStarters.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onQuickAction(item.prompt)}
            className="group flex items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-left text-sm text-fg-muted transition-colors hover:border-line-strong hover:bg-subtle hover:text-fg"
          >
            <span aria-hidden className="text-base leading-none">
              {item.icon}
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <ArrowUp className="size-3.5 rotate-45 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  )
}

function NotConfigured({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3.5 p-6 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-fg-subtle [&_svg]:size-5">
        <Bot />
      </div>
      <div>
        <p className="mb-1 text-sm font-semibold text-fg">AI 助手未配置</p>
        <p className="max-w-[240px] text-xs leading-normal text-fg-subtle">
          在设置里填好 API Key 并启用 AI，就能围绕题目提问。Key 只保存在本机浏览器。
        </p>
      </div>
      <Button size="sm" variant="secondary" onClick={onOpenSettings}>
        <Settings />
        前往设置
      </Button>
    </div>
  )
}

function QuickActionMenu({
  hasAnswer,
  onAction,
  disabled,
}: {
  hasAnswer: boolean
  onAction: (prompt: string) => void
  disabled: boolean
}) {
  const { getQuickActions } = useAIStore()
  const actions = getQuickActions(hasAnswer)
  return (
    <DropdownMenu>
      <Tooltip content="快捷指令">
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="text-fg-muted"
            aria-label="快捷指令"
          >
            <Zap />
            指令
          </Button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent side="top" align="start" className="w-56">
        {actions.map((action) => (
          <DropdownMenuItem key={action.id} onSelect={() => onAction(action.prompt)}>
            <span aria-hidden className="w-4 text-center">
              {action.icon}
            </span>
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export interface AIChatPanelProps {
  question: Question
  answerVisible: boolean
  onOpenSettings: () => void
}

/** Per-question AI chat, rendered inside the detail page's AI drawer (which owns the header). */
export function AIChatPanel({ question, answerVisible, onOpenSettings }: AIChatPanelProps) {
  const {
    config,
    streaming,
    streamingQuestionId,
    getMessages,
    clearSession,
    replaceSessionMessages,
    sendMessage,
    abortStream,
  } = useAIStore()

  const questionId = question.id
  const messages = getMessages(questionId)
  const isStreaming = streaming && streamingQuestionId === questionId

  const [input, setInput] = useState('')
  const {
    text: streamingText,
    appendText: appendStreamingText,
    resetText: resetStreamingText,
  } = useBufferedText()
  const [error, setError] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // Set when the user scrolls up during a reply, so auto-scroll stops fighting them.
  const userScrolledUp = useRef(false)
  const isStreamingRef = useRef(isStreaming)
  isStreamingRef.current = isStreaming

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 40) {
      userScrolledUp.current = false
    } else if (isStreamingRef.current) {
      userScrolledUp.current = true
    }
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: message count and streaming text intentionally drive chat autoscroll.
  useEffect(() => {
    if (userScrolledUp.current) return
    const frame = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: isStreaming ? 'auto' : 'smooth',
        block: 'end',
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isStreaming, messages.length, streamingText])

  useEffect(() => {
    if (!isStreaming) {
      userScrolledUp.current = false
      resetStreamingText()
    }
  }, [isStreaming, resetStreamingText])

  const isReady = config.enabled && config.apiKey.trim().length > 0

  const buildContextMessages = useCallback(
    (sourceMessages: AIMessage[] = messages): { messages: AIMessage[]; systemSuffix: string } => ({
      messages: [...sourceMessages],
      systemSuffix: buildQuestionSystemSuffix(
        question.question,
        question.module,
        question.difficulty,
        answerVisible ? question.answer : undefined,
      ),
    }),
    [question, answerVisible, messages],
  )

  const streamReply = useCallback(
    async (text: string, previousMessages?: AIMessage[]) => {
      setError(null)
      resetStreamingText()
      const { messages: ctxMessages, systemSuffix } = buildContextMessages(previousMessages)
      await sendMessage(
        questionId,
        text,
        ctxMessages,
        systemSuffix,
        (chunk) => appendStreamingText(chunk),
        () => resetStreamingText(),
        (err) => {
          setError(err)
          resetStreamingText()
        },
      )
    },
    [questionId, buildContextMessages, sendMessage, resetStreamingText, appendStreamingText],
  )

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim()
      if (!msg || isStreaming) return
      setInput('')
      if (inputRef.current) inputRef.current.style.height = ''
      await streamReply(msg)
    },
    [input, isStreaming, streamReply],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault()
        void handleSend()
      }
    },
    [handleSend],
  )

  const handleClear = useCallback(() => {
    if (isStreaming) abortStream()
    const cleared = messages
    clearSession(questionId)
    setError(null)
    resetStreamingText()
    setTimeout(() => inputRef.current?.focus(), 60)
    if (cleared.length > 0) {
      toast('已清空对话', {
        action: { label: '撤销', onClick: () => replaceSessionMessages(questionId, cleared) },
      })
    }
  }, [
    abortStream,
    clearSession,
    isStreaming,
    messages,
    questionId,
    replaceSessionMessages,
    resetStreamingText,
  ])

  const handleCopyMessage = useCallback(async (messageId: string, text: string) => {
    setCopiedMessageId(messageId)
    try {
      await copyTextToClipboard(text)
      window.setTimeout(() => {
        setCopiedMessageId((current) => (current === messageId ? null : current))
      }, 1400)
    } catch {
      setError('复制失败，请手动选择文本复制')
    }
  }, [])

  const handleRetryMessage = useCallback(
    async (messageIndex: number) => {
      if (isStreaming) return
      const target = messages[messageIndex]
      if (!target || target.role !== 'assistant') return

      let userIndex = -1
      for (let i = messageIndex - 1; i >= 0; i -= 1) {
        if (messages[i]?.role === 'user') {
          userIndex = i
          break
        }
      }
      if (userIndex < 0) return

      const previousMessages = messages.slice(0, userIndex)
      replaceSessionMessages(questionId, previousMessages)
      setInput('')
      await streamReply(messages[userIndex].content, previousMessages)
    },
    [isStreaming, messages, questionId, replaceSessionMessages, streamReply],
  )

  const handleQuickAction = useCallback((prompt: string) => void handleSend(prompt), [handleSend])

  if (!isReady) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <NotConfigured onOpenSettings={onOpenSettings} />
      </div>
    )
  }

  const canSend = input.trim().length > 0
  const hasMessages = messages.length > 0

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
      >
        {!hasMessages && !isStreaming ? (
          <EmptyChat hasAnswer={answerVisible} onQuickAction={handleQuickAction} />
        ) : (
          <div className="flex flex-col gap-5 px-4 py-4">
            {messages.map((msg, idx) => {
              const isLastAssistant = idx === messages.length - 1 && msg.role === 'assistant'
              const messageKey = `${idx}-${msg.role}-${msg.content}`
              return (
                <Message
                  key={messageKey}
                  message={msg}
                  isStreaming={isStreaming && isLastAssistant && streamingText !== ''}
                  streamingText={isStreaming && isLastAssistant ? streamingText : undefined}
                  copied={copiedMessageId === messageKey}
                  retryDisabled={isStreaming}
                  onCopy={() => handleCopyMessage(messageKey, msg.content)}
                  onRetry={
                    msg.role === 'assistant' ? () => void handleRetryMessage(idx) : undefined
                  }
                />
              )
            })}

            {/* The reply before the store has appended the assistant message. */}
            {isStreaming && messages[messages.length - 1]?.role === 'user' && (
              <Message
                message={{ role: 'assistant', content: streamingText }}
                isStreaming
                streamingText={streamingText}
              />
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-subtle px-3 py-2.5 text-xs leading-normal text-danger"
              >
                <p className="min-w-0 flex-1">
                  <span className="font-semibold">出错了：</span>
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="shrink-0 underline-offset-2 hover:underline"
                >
                  关闭
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 px-3 pt-1 pb-3">
        <div className="rounded-xl border border-line-strong bg-canvas transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-3 focus-within:ring-ring/40">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
            }}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'AI 正在回复…' : '问点什么… Enter 发送，Shift+Enter 换行'}
            aria-label="向 AI 提问"
            disabled={isStreaming}
            rows={2}
            className="block max-h-40 min-h-12 w-full resize-none overflow-y-auto bg-transparent px-3.5 pt-3 pb-1 text-sm leading-normal text-fg outline-none placeholder:text-fg-subtle"
          />
          <div className="flex items-center gap-1 px-1.5 pb-1.5">
            <QuickActionMenu
              hasAnswer={answerVisible}
              onAction={handleQuickAction}
              disabled={isStreaming}
            />
            {hasMessages ? (
              <Tooltip content="清空对话">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="清空当前题目 AI 会话"
                  className="text-fg-subtle hover:bg-danger-subtle hover:text-danger"
                  onClick={handleClear}
                >
                  <Trash2 />
                </Button>
              </Tooltip>
            ) : null}
            <span className="ml-auto max-w-[45%] truncate px-1 font-mono text-2xs text-fg-subtle">
              {config.model}
            </span>
            <button
              type="button"
              onClick={isStreaming ? abortStream : () => void handleSend()}
              disabled={!isStreaming && !canSend}
              aria-label={isStreaming ? '停止生成' : '发送'}
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors [&_svg]:size-4',
                isStreaming
                  ? 'bg-fg text-canvas'
                  : canSend
                    ? 'bg-accent text-accent-fg hover:bg-accent-hover'
                    : 'bg-muted text-fg-subtle',
              )}
            >
              {isStreaming ? <Square className="size-3! fill-current" /> : <ArrowUp />}
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-center text-2xs text-fg-subtle">AI 回答仅供参考</p>
      </div>
    </div>
  )
}
