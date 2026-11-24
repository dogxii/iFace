import { Analytics } from '@vercel/analytics/react'
import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { AppErrorBoundary } from '@/app/AppErrorBoundary'
import { AppShell } from '@/app/AppShell'
import { PWAUpdatePrompt } from '@/app/PWAUpdatePrompt'
import { ScrollManager } from '@/app/ScrollManager'
import { OnboardingDialog } from '@/features/onboarding/OnboardingDialog'
import { useDelayedFlag } from '@/hooks/useDelayedFlag'
import { installAppRecoveryHandlers } from '@/lib/appRecovery'
import { routeLoaders } from '@/lib/routePreload'
import { Spinner, Toaster, TooltipProvider } from '@/ui'

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
// Component showcase — only bundled in development builds.
const DesignSystem = import.meta.env.DEV ? lazy(() => import('@/pages/DesignSystem')) : null

function PageLoader() {
  // Route chunks are usually preloaded on hover; only show the spinner if loading is slow.
  const visible = useDelayedFlag(true, 300)
  return (
    <div className="flex items-center justify-center min-h-[60dvh]">
      <div className={visible ? 'flex flex-col items-center gap-3' : 'invisible'}>
        <Spinner size="lg" className="text-fg-subtle" />
        <p className="text-sm text-fg-subtle">加载中…</p>
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

function AppLayout() {
  return (
    <AppShell>
      <AppRecoveryHandlers />
      <ScrollManager />
      <main>
        <AppRoutes />
      </main>
      <OnboardingDialog />
      <PWAUpdatePrompt />
      <Analytics />
    </AppShell>
  )
}

export default function App() {
  return (
    <TooltipProvider delayDuration={400}>
      <BrowserRouter>
        <Routes>
          {DesignSystem ? (
            <Route
              path="/design"
              element={
                <Suspense fallback={<PageLoader />}>
                  <DesignSystem />
                </Suspense>
              }
            />
          ) : null}
          <Route path="*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </TooltipProvider>
  )
}
