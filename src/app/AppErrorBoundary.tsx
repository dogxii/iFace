import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { recoverFromAppLoadError } from '@/lib/appRecovery'
import { Button } from '@/ui'

interface AppErrorBoundaryProps {
  children: ReactNode
  resetKey: string
}

interface AppErrorBoundaryState {
  error: Error | null
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidUpdate(prevProps: AppErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (recoverFromAppLoadError(error)) return
    console.error('iFace render error', error, errorInfo)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-[70dvh] items-center justify-center px-4 py-16">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-warning-subtle text-warning">
            <TriangleAlert className="size-5" />
          </span>
          <h1 className="text-lg font-semibold text-fg">页面加载遇到问题</h1>
          <p className="text-sm leading-relaxed text-fg-muted">
            可能是 PWA 缓存中的页面资源已经更新。刷新后会重新加载最新资源。
          </p>
          <Button variant="primary" className="mt-2" onClick={() => window.location.reload()}>
            <RefreshCw />
            刷新页面
          </Button>
        </div>
      </div>
    )
  }
}
