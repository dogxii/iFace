import { useRegisterSW } from 'virtual:pwa-register/react'
import { CircleCheck, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { Button, cn } from '@/ui'

/** Service-worker status card: "update ready" stays until handled, "offline ready" fades out. */
export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true })

  useEffect(() => {
    if (!offlineReady || needRefresh) return
    const timer = window.setTimeout(() => setOfflineReady(false), 4200)
    return () => window.clearTimeout(timer)
  }, [needRefresh, offlineReady, setOfflineReady])

  if (!needRefresh && !offlineReady) return null

  const isUpdate = needRefresh

  return (
    <output
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-[90] flex items-start gap-3 rounded-xl border border-line bg-elevated p-3.5 shadow-popover animate-scale-in sm:left-auto sm:w-[360px]"
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4',
          isUpdate ? 'bg-accent-subtle text-accent' : 'bg-success-subtle text-success',
        )}
      >
        {isUpdate ? <RefreshCw /> : <CircleCheck />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">
          {isUpdate ? '新版本已准备好' : '已可离线使用'}
        </p>
        <p className="mt-0.5 text-xs text-fg-muted">
          {isUpdate ? '刷新后即可使用最新版本。' : '核心资源已缓存，断网时也能继续打开。'}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {isUpdate ? (
            <>
              <Button variant="primary" size="sm" onClick={() => updateServiceWorker(true)}>
                <RefreshCw />
                刷新更新
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setNeedRefresh(false)}>
                稍后
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setOfflineReady(false)}>
              知道了
            </Button>
          )}
        </div>
      </div>
    </output>
  )
}
