import type { CSSProperties } from 'react'

interface SpeechInputButtonProps {
  supported: boolean
  listening: boolean
  disabled?: boolean
  onToggle: () => void
  showLabel?: boolean
  style?: CSSProperties
}

export function SpeechInputButton({
  supported,
  listening,
  disabled = false,
  onToggle,
  showLabel = false,
  style,
}: SpeechInputButtonProps) {
  const unavailable = disabled || !supported
  const label = listening ? '停止' : '语音输入'
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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: showLabel ? 5 : 0,
        width: showLabel ? 'auto' : 26,
        height: 26,
        minHeight: 26,
        padding: showLabel ? '3px 8px' : 0,
        borderRadius: 7,
        border: '1px solid',
        borderColor: listening ? 'rgba(var(--primary-rgb), 0.3)' : 'transparent',
        background: listening ? 'var(--primary-light)' : 'transparent',
        color: listening ? 'var(--primary)' : 'var(--text-3)',
        fontSize: 11,
        fontWeight: 500,
        cursor: unavailable ? 'default' : 'pointer',
        opacity: unavailable ? 0.52 : 1,
        transition: 'background 0.15s, border-color 0.15s, color 0.15s',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (unavailable || listening) return
        e.currentTarget.style.background = 'var(--surface-2)'
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
        e.currentTarget.style.color = 'var(--primary)'
      }}
      onMouseLeave={(e) => {
        if (unavailable || listening) return
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = 'transparent'
        e.currentTarget.style.color = 'var(--text-3)'
      }}
    >
      <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
        {listening && (
          <span
            style={{
              position: 'absolute',
              right: -3,
              top: -3,
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--danger)',
            }}
          />
        )}
      </span>
      {showLabel && label}
    </button>
  )
}
