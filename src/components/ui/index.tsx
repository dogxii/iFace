import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}

export function Badge({
  variant = 'default',
  size = 'md',
  className = '',
  style: styleProp,
  children,
  ...props
}: BadgeProps) {
  const variantStyle: React.CSSProperties = (() => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--primary-light)',
          color: 'var(--primary)',
          border: '1px solid rgba(var(--primary-rgb), 0.2)',
        }
      case 'success':
        return {
          background: 'rgba(16,185,129,0.1)',
          color: '#10b981',
          border: '1px solid rgba(16,185,129,0.2)',
        }
      case 'warning':
        return {
          background: 'rgba(245,158,11,0.1)',
          color: '#f59e0b',
          border: '1px solid rgba(245,158,11,0.2)',
        }
      case 'danger':
        return {
          background: 'rgba(239,68,68,0.1)',
          color: '#ef4444',
          border: '1px solid rgba(239,68,68,0.2)',
        }
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--text-3)',
          border: '1px solid var(--border-subtle)',
        }
      default: // "default"
        return {
          background: 'var(--surface-3)',
          color: 'var(--text-2)',
          border: '1px solid var(--border)',
        }
    }
  })()

  const sizeStyle: React.CSSProperties =
    size === 'sm'
      ? { fontSize: 10, padding: '2px 6px', borderRadius: 4 }
      : { fontSize: 12, padding: '2px 8px', borderRadius: 6 }

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium leading-none whitespace-nowrap ${className}`}
      style={{ ...variantStyle, ...sizeStyle, ...styleProp }}
      {...props}
    >
      {children}
    </span>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const sizeClass = {
    sm: 'text-xs px-3 py-1.5 h-7',
    md: 'text-sm px-4 py-2 h-9',
    lg: 'text-sm px-5 py-2.5 h-11',
  }[size]

  // Use inline styles for CSS-variable-based colors so Tailwind scan is not needed
  const variantStyle: React.CSSProperties = (() => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--primary)',
          borderColor: 'var(--primary)',
          color: 'white',
          boxShadow: 'var(--shadow-md)',
        }
      case 'secondary':
        return {
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }
      case 'ghost':
        return {
          background: 'transparent',
          borderColor: 'transparent',
          color: 'var(--text-2)',
        }
      case 'danger':
        return {
          background: 'rgba(239,68,68,0.1)',
          borderColor: 'rgba(239,68,68,0.2)',
          color: '#ef4444',
        }
      case 'success':
        return {
          background: 'rgba(16,185,129,0.1)',
          borderColor: 'rgba(16,185,129,0.2)',
          color: '#10b981',
        }
    }
  })()

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-xl border transition-all duration-150 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none btn-${variant} ${sizeClass} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={variantStyle}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        if (variant === 'primary') {
          el.style.background = 'var(--primary-hover)'
          el.style.borderColor = 'var(--primary-hover)'
        } else if (variant === 'secondary') {
          el.style.background = 'var(--surface-2)'
        } else if (variant === 'ghost') {
          el.style.background = 'var(--surface-2)'
          el.style.color = 'var(--text)'
        } else if (variant === 'danger') {
          el.style.background = '#ef4444'
          el.style.borderColor = '#ef4444'
          el.style.color = 'white'
        } else if (variant === 'success') {
          el.style.background = '#10b981'
          el.style.borderColor = '#10b981'
          el.style.color = 'white'
        }
        props.onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        Object.assign(el.style, variantStyle)
        props.onMouseLeave?.(e)
      }}
      {...props}
    >
      {loading ? (
        <Spinner size={size === 'lg' ? 'md' : 'sm'} />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
    </button>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-7 h-7' }
  return (
    <svg
      className={`${sizes[size]} animate-spin shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  )
}

// ─── ProgressRing ─────────────────────────────────────────────────────────────

interface ProgressRingProps {
  /** 0–100 */
  percent: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  label?: ReactNode
  className?: string
}

export function ProgressRing({
  percent,
  size = 80,
  strokeWidth = 7,
  color = 'var(--primary)',
  trackColor = 'var(--border)',
  label,
  className = '',
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(100, Math.max(0, percent)) / 100) * circ

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="progress-ring-circle"
        />
      </svg>
      {label && <div className="absolute inset-0 flex items-center justify-center">{label}</div>}
    </div>
  )
}

// ─── Multi-segment ProgressRing (mastered / review / unlearned) ──────────────

interface SegmentedRingProps {
  mastered: number
  review: number
  total: number
  size?: number
  strokeWidth?: number
  label?: ReactNode
  className?: string
}

export function SegmentedRing({
  mastered,
  review,
  total,
  size = 140,
  strokeWidth = 10,
  label,
  className = '',
}: SegmentedRingProps) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const gap = total > 0 ? Math.min(2, circ * 0.01) : 0

  const masteredPct = total > 0 ? mastered / total : 0
  const reviewPct = total > 0 ? review / total : 0

  const masteredLen = masteredPct * circ - gap
  const reviewLen = reviewPct * circ - gap

  const masteredOffset = 0
  const reviewOffset = -(masteredPct * circ)

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        {/* Mastered segment (emerald) */}
        {mastered > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(0, masteredLen)} ${circ}`}
            strokeDashoffset={masteredOffset}
            className="progress-ring-circle"
          />
        )}
        {/* Review segment (amber) */}
        {review > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(0, reviewLen)} ${circ}`}
            strokeDashoffset={reviewOffset}
            className="progress-ring-circle"
          />
        )}
      </svg>
      {label && <div className="absolute inset-0 flex items-center justify-center">{label}</div>}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

export function Skeleton({
  width,
  height,
  rounded = 'md',
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const roundedMap = {
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  }
  return (
    <div
      className={`skeleton ${roundedMap[rounded]} ${className}`}
      style={{ width, height, ...style }}
      {...props}
    />
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

const DefaultEmptyIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: 'var(--text-3)' }}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '56px 16px',
        textAlign: 'center',
      }}
      className={className}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'var(--surface-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        {icon ?? <DefaultEmptyIcon />}
      </div>
      <p
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text)',
          marginBottom: 6,
        }}
      >
        {title}
      </p>
      {description && (
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-3)',
            maxWidth: 280,
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  )
}

// ─── Kbd ─────────────────────────────────────────────────────────────────────

export function Kbd({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`kbd ${className}`}>{children}</span>
}

// ─── Tooltip (CSS-only) ───────────────────────────────────────────────────────

interface TooltipProps {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Tooltip({ content, children, position = 'top', className = '' }: TooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div className={`relative group inline-flex ${className}`}>
      {children}
      <div
        className={`
	          absolute z-50 px-2 py-1 text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none
	          bg-[var(--text)] text-[var(--surface)]
	          opacity-0 group-hover:opacity-100
	          scale-95 group-hover:scale-100
	          transition-all duration-150
	          ${positionClasses[position]}
	        `}
      >
        {content}
      </div>
    </div>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`border-0 h-px bg-[var(--border-subtle)] ${className}`} />
}

// ─── StatusDot ────────────────────────────────────────────────────────────────

import type { StudyStatus } from '@/types'

const statusDotStyles: Record<StudyStatus, string> = {
  unlearned: 'var(--border)',
  mastered: 'var(--success)',
  review: 'var(--warning)',
}

export function StatusDot({ status }: { status: StudyStatus }) {
  return <span className="status-dot" style={{ background: statusDotStyles[status] }} />
}
