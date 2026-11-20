import { useRegisterSW } from 'virtual:pwa-register/react'
import { useEffect } from 'react'

function RefreshIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
  })

  useEffect(() => {
    if (!offlineReady || needRefresh) return

    const timer = window.setTimeout(() => {
      setOfflineReady(false)
    }, 4200)

    return () => window.clearTimeout(timer)
  }, [needRefresh, offlineReady, setOfflineReady])

  if (!needRefresh && !offlineReady) return null

  const isUpdate = needRefresh

  return (
    <>
      <div
        aria-live="polite"
        className="pwa-update-toast"
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          zIndex: 260,
          width: 'min(360px, calc(100vw - 32px))',
          padding: 14,
          borderRadius: 12,
          border: '1px solid var(--border-subtle)',
          background: 'var(--surface)',
          color: 'var(--text)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: isUpdate ? 'var(--primary-light)' : 'var(--success-light)',
            color: isUpdate ? 'var(--primary)' : 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isUpdate ? <RefreshIcon /> : <CheckIcon />}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, marginBottom: 3 }}>
            {isUpdate ? '新版本已准备好' : '已可离线使用'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.55 }}>
            {isUpdate ? '刷新后即可使用最新版本。' : '核心资源已缓存，断网时也能继续打开。'}
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {isUpdate ? (
              <>
                <button
                  type="button"
                  onClick={() => updateServiceWorker(true)}
                  aria-label="刷新并使用新版本"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    minHeight: 30,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--primary)',
                    background: 'var(--primary)',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <RefreshIcon />
                  刷新更新
                </button>
                <button
                  type="button"
                  onClick={() => setNeedRefresh(false)}
                  aria-label="稍后再更新"
                  style={{
                    minHeight: 30,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--text-2)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  稍后
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setOfflineReady(false)}
                aria-label="关闭离线可用提示"
                style={{
                  minHeight: 30,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-2)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                知道了
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 520px) {
          .pwa-update-toast {
            left: 14px !important;
            right: 14px !important;
            bottom: 14px !important;
            width: auto !important;
          }
        }
      `}</style>
    </>
  )
}
