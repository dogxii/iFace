import { Component, type ErrorInfo, type ReactNode } from 'react'
import { recoverFromAppLoadError } from '@/lib/appRecovery'

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
      <div className="page-container" style={{ paddingTop: 'calc(var(--navbar-h) + 56px)' }}>
        <div
          className="card"
          style={{
            maxWidth: 520,
            margin: '0 auto',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            页面加载遇到问题
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 18 }}>
            可能是 PWA 缓存中的页面资源已经更新。刷新后会重新加载最新资源。
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--primary)',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            刷新页面
          </button>
        </div>
      </div>
    )
  }
}
