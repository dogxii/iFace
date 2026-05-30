import { lazy, Suspense, useEffect, useLayoutEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { OnboardingGuide } from '@/components/layout/OnboardingGuide'
import { Spinner } from '@/components/ui'
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary'
import { PWAUpdatePrompt } from '@/components/ui/PWAUpdatePrompt'
import { installAppRecoveryHandlers } from '@/lib/appRecovery'
import { routeLoaders } from '@/lib/routePreload'

const Dashboard = lazy(routeLoaders.dashboard)
const QuestionList = lazy(routeLoaders.questionList)
const QuestionDetail = lazy(routeLoaders.questionDetail)
const Practice = lazy(routeLoaders.practice)
const MockInterview = lazy(routeLoaders.mockInterview)
const WeakPoints = lazy(routeLoaders.weakPoints)
const Tools = lazy(routeLoaders.tools)
const JdMatch = lazy(routeLoaders.jdMatch)
const AITool = lazy(routeLoaders.aiTool)
const ImportPage = lazy(routeLoaders.importPage)
const PromptPage = lazy(routeLoaders.promptPage)

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60dvh]">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="text-[var(--primary)]" />
        <p className="text-sm text-[var(--text-3)]">加载中…</p>
      </div>
    </div>
  )
}

/**
 * Fallback component for /api/auth — only rendered if the Service Worker
 * intercepts the OAuth callback and serves the SPA shell instead of letting
 * the request reach the Vercel serverless function.
 *
 * We immediately forward the browser to the real endpoint so the serverless
 * function can exchange the code for a token and redirect back to /?auth=success.
 */
function ApiAuthFallback() {
  const location = useLocation()

  useEffect(() => {
    // Re-issue the request as a full navigation so it bypasses any SW cache
    // and hits the Vercel edge network directly.
    const target = location.pathname + location.search
    window.location.replace(target)
  }, [location])

  return <PageLoader />
}

function AppRecoveryHandlers() {
  useEffect(() => installAppRecoveryHandlers(), [])
  return null
}

function QuestionDetailRoute() {
  const { id } = useParams()
  return <QuestionDetail key={id ?? 'question'} />
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previous
    }
  }, [])

  useLayoutEffect(() => {
    if (!pathname) return
    const previousScrollBehavior = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'auto'
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    document.documentElement.style.scrollBehavior = previousScrollBehavior
  }, [pathname])

  return null
}

function AppRoutes() {
  const location = useLocation()
  const resetKey = `${location.pathname}${location.search}`

  return (
    <AppErrorBoundary resetKey={resetKey}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Defensive catch for the OAuth callback path in case the
              Service Worker serves the SPA shell for /api/auth */}
          <Route path="/api/auth" element={<ApiAuthFallback />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/questions" element={<QuestionList />} />
          <Route path="/questions/:id" element={<QuestionDetailRoute />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/mock-interview" element={<MockInterview />} />
          <Route path="/weak" element={<WeakPoints />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/tools/jd-match" element={<JdMatch />} />
          <Route path="/tools/:toolId" element={<AITool />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/prompt" element={<PromptPage />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-dvh bg-[var(--surface)]">
        <AppRecoveryHandlers />
        <ScrollToTop />
        <Navbar />
        <main>
          <AppRoutes />
        </main>
        <OnboardingGuide />
        <PWAUpdatePrompt />
      </div>
    </BrowserRouter>
  )
}
