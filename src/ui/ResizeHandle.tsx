import { useRef } from 'react'
import { cn } from './cn'

export interface ResizeHandleProps {
  /** Which edge of the panel the handle sits on: `right` for a left sidebar, `left` for a right panel. */
  edge: 'left' | 'right'
  /** Current panel width (px). */
  value: number
  min: number
  max: number
  /** Called with the raw dragged width; the owner clamps or snaps it. */
  onResize: (width: number) => void
  /** Called when a pointer drag starts, with the width at that moment. */
  onResizeStart?: (width: number) => void
  /** Double-click (or Enter) action, e.g. reset to the default width. */
  onReset?: () => void
  /** Keyboard step in px; Shift multiplies it by 4. */
  step?: number
  label: string
  className?: string
}

/**
 * Drag handle for resizable panels. A pointer-captured drag updates the width live; the handle
 * is also a focusable `separator`, so arrow keys / Home / End resize it from the keyboard.
 */
export function ResizeHandle({
  edge,
  value,
  min,
  max,
  onResize,
  onResizeStart,
  onReset,
  step = 16,
  label,
  className,
}: ResizeHandleProps) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null)
  // Dragging right grows a panel whose handle is on its right edge, and shrinks the other kind.
  const direction = edge === 'right' ? 1 : -1

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    drag.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    delete document.documentElement.dataset.resizing
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: <hr> cannot be focused or dragged; ARIA's focusable separator pattern is the standard for splitters
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { startX: event.clientX, startWidth: value }
        onResizeStart?.(value)
        document.documentElement.dataset.resizing = ''
      }}
      onPointerMove={(event) => {
        if (!drag.current) return
        const delta = (event.clientX - drag.current.startX) * direction
        onResize(drag.current.startWidth + delta)
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={(event) => {
        const amount = event.shiftKey ? step * 4 : step
        let next: number | null = null
        if (event.key === 'ArrowRight') next = value + amount * direction
        else if (event.key === 'ArrowLeft') next = value - amount * direction
        else if (event.key === 'Home') next = min
        else if (event.key === 'End') next = max
        else if (event.key === 'Enter' && onReset) {
          event.preventDefault()
          onReset()
          return
        }
        if (next === null) return
        event.preventDefault()
        onResize(next)
      }}
      className={cn(
        'group absolute inset-y-0 z-10 w-2 cursor-col-resize touch-none outline-none select-none',
        edge === 'right' ? '-right-1' : '-left-1',
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors delay-75 group-hover:bg-accent/60 group-focus-visible:bg-accent group-active:bg-accent"
      />
    </div>
  )
}
