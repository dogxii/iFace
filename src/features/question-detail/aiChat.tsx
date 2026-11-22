import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  RotateCcw,
  Send,
  Settings,
  Square,
  Trash2,
  User,
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
import { Button, cn } from '@/ui'

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
    <button
      type="button"
      aria-label={title}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-[22px] w-6 items-center justify-center rounded-md border border-transparent text-fg-subtle transition-colors hover:border-line hover:bg-muted hover:text-fg disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-3"
    >
      {children}
    </button>
  )
}

interface MessageBubbleProps {
  message: AIMessage
  isStreaming?: boolean
  streamingText?: string
  copied?: boolean
  retryDisabled?: boolean
  onCopy?: () => void
  onRetry?: () => void
}

function MessageBubble({
  message,
  isStreaming,
  streamingText,
  copied = false,
  retryDisabled = false,
  onCopy,
  onRetry,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const content = isStreaming && streamingText !== undefined ? streamingText : message.content
  const canShowActions = Boolean(content.trim()) && !isStreaming

  return (
    <div
      className={cn(
        'flex animate-fade-in items-start gap-2',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex size-[26px] shrink-0 items-center justify-center [&_svg]:size-3.5',
          isUser
            ? 'rounded-full bg-accent text-accent-fg'
            : 'rounded-lg border border-line bg-muted text-accent',
        )}
      >
        {isUser ? <User /> : <Bot />}
      </div>

      <div
        className={cn('flex max-w-[85%] min-w-0 flex-col', isUser ? 'items-end' : 'items-start')}
      >
        <div
          className={cn(
            'w-fit max-w-full text-[13px] leading-[1.65] break-words',
            isUser
              ? 'rounded-[14px_4px_14px_14px] bg-accent px-3 py-2 text-accent-fg'
              : 'rounded-[4px_14px_14px_14px] border border-line bg-subtle px-3.5 py-2.5 text-fg',
          )}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{content}</span>
          ) : content ? (
            <div className="ai-chat-markdown">
              <MarkdownRenderer content={content} />
              {isStreaming && <TypingDots />}
            </div>
          ) : (
            <TypingDots />
          )}
        </div>

        {canShowActions && (
          <div className="mt-1 flex items-center gap-0.5 px-0.5">
            {onCopy && (
              <MessageAction title={copied ? '已复制' : '复制消息'} onClick={onCopy}>
                {copied ? <Check /> : <Copy />}
              </MessageAction>
            )}
            {!isUser && onRetry && (
              <MessageAction title="重试回答" disabled={retryDisabled} onClick={onRetry}>
                <RotateCcw />
              </MessageAction>
            )}
          </div>
        )}
      </div>
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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-6">
      <div className="flex size-12 items-center justify-center rounded-[14px] bg-accent-subtle text-accent [&_svg]:size-5">
        <Bot />
      </div>
      <div className="text-center">
        <p className="mb-1 text-[13px] font-semibold text-fg">AI 面试助手</p>
        <p className="text-xs leading-normal text-fg-subtle">
          帮你深度分析题目、优化答案、预测追问
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-2">
        {quickStarters.map((item) => (
          <button
            type="button"
            key={item.label}
            onClick={() => onQuickAction(item.prompt)}
            className="flex flex-col items-start gap-1 rounded-[10px] border border-line bg-subtle px-3 py-2.5 text-left transition-colors hover:border-accent/30 hover:bg-accent-subtle"
          >
            <span className="text-base">{item.icon}</span>
            <span className="text-xs font-medium text-fg">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function NotConfigured({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3.5 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-[14px] bg-muted text-fg-subtle [&_svg]:size-5">
        <Bot />
      </div>
      <div>
        <p className="mb-1 text-[13px] font-semibold text-fg">AI 助手未配置</p>
        <p className="max-w-[220px] text-xs leading-normal text-fg-subtle">
          请在设置中配置 API Key 并启用 AI 功能
        </p>
      </div>
      <Button size="sm" variant="secondary" onClick={onOpenSettings}>
        <Settings />
        前往设置
      </Button>
    </div>
  )
}

function QuickActionBar({
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
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? actions : actions.slice(0, 3)

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2">
      {visible.map((action) => (
        <button
          type="button"
          key={action.id}
          onClick={() => onAction(action.prompt)}
          disabled={disabled}
          className="flex items-center gap-1 rounded-md border border-line bg-subtle px-2 py-0.5 text-2xs font-medium whitespace-nowrap text-fg-muted transition-colors enabled:hover:border-accent/30 enabled:hover:bg-accent-subtle enabled:hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{action.icon}</span>
          {action.label}
        </button>
      ))}

      {actions.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-2xs text-fg-subtle transition-colors hover:text-fg [&_svg]:size-3"
        >
          {expanded ? <ChevronUp /> : <ChevronDown />}
          {expanded ? '收起' : `+${actions.length - 3}`}
        </button>
      )}
    </div>
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
  initialPrompt?: { id: string; questionId: string; text: string } | null
  onInitialPromptConsumed?: (id: string) => void
}

/** Per-question AI chat, rendered inside the detail page's AI drawer (which owns the header). */
export function AIChatPanel({
  question,
  answerVisible,
  onOpenSettings,
  initialPrompt = null,
  onInitialPromptConsumed,
}: AIChatPanelProps) {
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
  const lastInitialPromptIdRef = useRef<string | null>(null)
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
    clearSession(questionId)
    setError(null)
    resetStreamingText()
    setTimeout(() => inputRef.current?.focus(), 60)
  }, [clearSession, abortStream, questionId, isStreaming, resetStreamingText])

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

  useEffect(() => {
    if (!initialPrompt || lastInitialPromptIdRef.current === initialPrompt.id) return
    if (initialPrompt.questionId !== questionId) return
    if (!isReady || isStreaming) return

    lastInitialPromptIdRef.current = initialPrompt.id
    void handleSend(initialPrompt.text)
    onInitialPromptConsumed?.(initialPrompt.id)
  }, [handleSend, initialPrompt, isReady, isStreaming, onInitialPromptConsumed, questionId])

  if (!isReady) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <NotConfigured onOpenSettings={onOpenSettings} />
      </div>
    )
  }

  const canSend = input.trim().length > 0

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {messages.length > 0 && (
        <div className="flex shrink-0 justify-end px-3 pt-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleClear}
            aria-label="清空当前题目 AI 会话"
            title="清空当前题目 AI 会话"
            className="hover:bg-danger-subtle hover:text-danger"
          >
            <Trash2 />
          </Button>
        </div>
      )}

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex flex-1 flex-col overflow-y-auto"
      >
        {messages.length === 0 && !isStreaming ? (
          <EmptyChat hasAnswer={answerVisible} onQuickAction={handleQuickAction} />
        ) : (
          <div className="flex flex-col gap-3.5 px-3.5 py-4">
            {messages.map((msg, idx) => {
              const isLastAssistant = idx === messages.length - 1 && msg.role === 'assistant'
              const messageKey = `${idx}-${msg.role}-${msg.content}`
              return (
                <MessageBubble
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

            {/* The reply bubble before the store has appended the assistant message. */}
            {isStreaming && messages[messages.length - 1]?.role === 'user' && (
              <MessageBubble
                message={{ role: 'assistant', content: streamingText }}
                isStreaming
                streamingText={streamingText}
              />
            )}

            {error && (
              <div
                role="alert"
                className="animate-fade-in rounded-[10px] border border-danger/20 bg-danger-subtle px-3 py-2.5 text-xs leading-normal text-danger"
              >
                <span className="font-semibold">错误：</span>
                {error}
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="ml-2 text-xs text-danger underline"
                >
                  关闭
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <QuickActionBar
          hasAnswer={answerVisible}
          onAction={handleQuickAction}
          disabled={isStreaming}
        />
      )}

      <div
        className={cn(
          'flex flex-col gap-1.5 px-3 py-2.5',
          messages.length === 0 && 'border-t border-line',
        )}
      >
        <div className="flex items-end gap-2 rounded-xl border border-line-strong bg-subtle py-2 pr-2 pl-3 transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-3 focus-within:ring-ring/40">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
            }}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'AI 正在回复…' : '输入问题，Enter 发送，Shift+Enter 换行'}
            aria-label="向 AI 提问"
            disabled={isStreaming}
            rows={1}
            className="max-h-[120px] min-h-6 flex-1 resize-none overflow-y-auto bg-transparent py-1 text-sm leading-normal text-fg outline-none placeholder:text-fg-subtle"
          />
          <button
            type="button"
            onClick={isStreaming ? abortStream : () => void handleSend()}
            disabled={!isStreaming && !canSend}
            aria-label={isStreaming ? '停止生成' : '发送'}
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors [&_svg]:size-3.5',
              isStreaming
                ? 'bg-danger text-white'
                : canSend
                  ? 'bg-accent text-accent-fg hover:bg-accent-hover'
                  : 'bg-muted text-fg-subtle',
            )}
          >
            {isStreaming ? <Square className="fill-current" /> : <Send />}
          </button>
        </div>

        <p className="text-center text-[10px] text-fg-subtle">
          AI 回答仅供参考，请结合实际情况判断 · {config.model}
        </p>
      </div>
    </div>
  )
}
