export const routeLoaders = {
  dashboard: () => import('@/pages/Dashboard'),
  questionList: () => import('@/pages/QuestionList'),
  questionDetail: () => import('@/pages/QuestionDetail'),
  practice: () => import('@/pages/Practice'),
  mockInterview: () => import('@/pages/MockInterview'),
  weakPoints: () => import('@/pages/WeakPoints'),
  tools: () => import('@/pages/Tools'),
  jdMatch: () => import('@/pages/JdMatch'),
  aiTool: () => import('@/pages/AITool'),
  importPage: () => import('@/pages/ImportPage'),
  promptPage: () => import('@/pages/PromptPage'),
}

export type RoutePreloadKey = keyof typeof routeLoaders

const preloadedRoutes = new Set<RoutePreloadKey>()

export function preloadRoute(key: RoutePreloadKey) {
  if (preloadedRoutes.has(key)) return

  preloadedRoutes.add(key)
  void routeLoaders[key]().catch(() => {
    preloadedRoutes.delete(key)
  })
}

export function getRoutePreloadKey(pathname: string): RoutePreloadKey | null {
  if (pathname === '/') return 'dashboard'
  if (pathname.startsWith('/questions/')) return 'questionDetail'
  if (pathname === '/questions') return 'questionList'
  if (pathname === '/practice') return 'practice'
  if (pathname === '/mock-interview') return 'mockInterview'
  if (pathname === '/weak') return 'weakPoints'
  if (pathname === '/import') return 'importPage'
  if (pathname === '/prompt') return 'promptPage'
  if (pathname === '/tools/jd-match') return 'jdMatch'
  if (pathname.startsWith('/tools/')) return 'aiTool'
  if (pathname === '/tools') return 'tools'
  return null
}

export function preloadPath(pathname: string) {
  const key = getRoutePreloadKey(pathname)
  if (key) preloadRoute(key)
}
