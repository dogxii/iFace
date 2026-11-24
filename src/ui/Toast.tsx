import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { Toast as T } from 'radix-ui'
import { type ReactNode, useSyncExternalStore } from 'react'
import { cn } from './cn'

type ToastTone = 'neutral' | 'success' | 'danger'

interface ToastItem {
  id: number
  title: ReactNode
  description?: ReactNode
  tone: ToastTone
  action?: { label: string; onClick: () => void }
  duration?: number
}

let items: ToastItem[] = []
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function dismiss(id: number) {
  items = items.filter((item) => item.id !== id)
  emit()
}

/** Show a toast from anywhere: `toast('已保存')`, `toast.success(...)`, `toast.error(...)`. */
export function toast(title: ReactNode, options: Omit<Partial<ToastItem>, 'id' | 'title'> = {}) {
  const id = nextId++
  items = [...items.slice(-3), { id, title, tone: 'neutral', ...options }]
  emit()
  return id
}
toast.success = (
  title: ReactNode,
  options: Omit<Partial<ToastItem>, 'id' | 'title' | 'tone'> = {},
) => toast(title, { ...options, tone: 'success' })
toast.error = (title: ReactNode, options: Omit<Partial<ToastItem>, 'id' | 'title' | 'tone'> = {}) =>
  toast(title, { ...options, tone: 'danger' })
toast.dismiss = dismiss

const icons: Record<ToastTone, ReactNode> = {
  neutral: <Info className="text-fg-subtle" />,
  success: <CircleCheck className="text-success" />,
  danger: <CircleAlert className="text-danger" />,
}

/** Mount once near the app root. */
export function Toaster() {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => items,
    () => items,
  )

  return (
    <T.Provider swipeDirection="right" duration={3500}>
      {current.map((item) => (
        <T.Root
          key={item.id}
          duration={item.duration}
          onOpenChange={(open) => !open && dismiss(item.id)}
          className={cn(
            'group flex w-[360px] max-w-[calc(100vw-32px)] items-start gap-3 rounded-xl border border-line bg-elevated p-3.5 shadow-popover',
            'data-[state=open]:animate-scale-in data-[state=closed]:animate-fade-out data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
          )}
        >
          <span className="mt-0.5 [&_svg]:size-4">{icons[item.tone]}</span>
          <div className="min-w-0 flex-1">
            <T.Title className="text-sm font-medium text-fg">{item.title}</T.Title>
            {item.description ? (
              <T.Description className="mt-0.5 text-xs text-fg-muted">
                {item.description}
              </T.Description>
            ) : null}
          </div>
          {item.action ? (
            <T.Action
              altText={item.action.label}
              onClick={item.action.onClick}
              className="h-7 shrink-0 rounded-md px-2 text-xs font-medium text-accent hover:bg-accent-subtle"
            >
              {item.action.label}
            </T.Action>
          ) : null}
          <T.Close aria-label="关闭" className="rounded-md p-0.5 text-fg-subtle hover:text-fg">
            <X className="size-3.5" />
          </T.Close>
        </T.Root>
      ))}
      <T.Viewport className="fixed right-4 bottom-4 z-[100] flex flex-col gap-2 outline-none" />
    </T.Provider>
  )
}
