const RECOVERY_KEY = `iface_app_recovery_${__APP_VERSION__}`

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '')
  }
  return String(error ?? '')
}

export function isRecoverableAppLoadError(error: unknown): boolean {
  const message = getErrorMessage(error)
  return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|Failed to fetch module script|vite:preloadError/i.test(
    message,
  )
}

export function recoverFromAppLoadError(error: unknown): boolean {
  if (!isRecoverableAppLoadError(error)) return false

  try {
    if (window.sessionStorage.getItem(RECOVERY_KEY)) return false
    window.sessionStorage.setItem(RECOVERY_KEY, `${Date.now()}:${window.location.href}`)
  } catch {
    // Ignore storage failures and still try a single hard reload.
  }

  window.location.reload()
  return true
}

export function installAppRecoveryHandlers(): () => void {
  const handlePreloadError = (event: Event) => {
    const customEvent = event as CustomEvent<unknown>
    const payload =
      customEvent.detail ?? (event as Event & { payload?: unknown }).payload ?? 'vite:preloadError'
    if (recoverFromAppLoadError(payload)) {
      event.preventDefault()
    }
  }

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (recoverFromAppLoadError(event.reason)) {
      event.preventDefault()
    }
  }

  window.addEventListener('vite:preloadError', handlePreloadError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)

  return () => {
    window.removeEventListener('vite:preloadError', handlePreloadError)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  }
}
