import { Mic } from 'lucide-react'
import { cn } from '@/ui'

interface SpeechInputButtonProps {
  supported: boolean
  listening: boolean
  disabled?: boolean
  onToggle: () => void
  showLabel?: boolean
  className?: string
}

export function SpeechInputButton({
  supported,
  listening,
  disabled = false,
  onToggle,
  showLabel = false,
  className,
}: SpeechInputButtonProps) {
  const unavailable = disabled || !supported
  const title = supported
    ? listening
      ? '停止语音输入'
      : '开始语音输入'
    : '当前浏览器不支持语音输入'

  return (
    <button
      type="button"
      aria-pressed={listening}
      aria-label={title}
      title={title}
      disabled={unavailable}
      onClick={onToggle}
      className={cn(
        'inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
        'disabled:cursor-default disabled:opacity-50',
        showLabel ? 'px-2' : 'w-7',
        listening
          ? 'bg-accent-subtle text-accent'
          : 'text-fg-subtle enabled:hover:bg-muted enabled:hover:text-accent',
        className,
      )}
    >
      <span className="relative inline-flex">
        <Mic className="size-3.5" />
        {listening ? (
          <span className="absolute -top-0.5 -right-0.5 size-1.5 animate-pulse rounded-full bg-danger" />
        ) : null}
      </span>
      {showLabel ? (listening ? '停止' : '语音输入') : null}
    </button>
  )
}
