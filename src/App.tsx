import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { Spinner } from '@/components/ui'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const QuestionList = lazy(() => import('@/pages/QuestionList'))
const QuestionDetail = lazy(() => import('@/pages/QuestionDetail'))
const Practice = lazy(() => import('@/pages/Practice'))
const WeakPoints = lazy(() => import('@/pages/WeakPoints'))
const ImportPage = lazy(() => import('@/pages/ImportPage'))
const PromptPage = lazy(() => import('@/pages/PromptPage'))

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

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-dvh bg-[var(--surface)]">
        <Navbar />
        <main>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Defensive catch for the OAuth callback path in case the
							    Service Worker serves the SPA shell for /api/auth */}
              <Route path="/api/auth" element={<ApiAuthFallback />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/questions" element={<QuestionList />} />
              <Route path="/questions/:id" element={<QuestionDetail />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/weak" element={<WeakPoints />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/prompt" element={<PromptPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  )
}
