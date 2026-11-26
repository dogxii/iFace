import {
  BookOpen,
  Download,
  FlaskConical,
  House,
  Library,
  type LucideIcon,
  Mic,
  PenLine,
  Sparkles,
  Target,
} from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  /** Extra path prefixes that should highlight this item. */
  match?: string[]
  /** Show the number of questions waiting for review. */
  showReviewCount?: boolean
}

export const PRIMARY_NAV: NavItem[] = [
  { path: '/', label: '概览', icon: House },
  { path: '/questions', label: '题库', icon: BookOpen },
  { path: '/practice', label: '练习', icon: PenLine, showReviewCount: true },
  { path: '/weak', label: '薄弱点', icon: Target },
  { path: '/mock-interview', label: '模拟面试', icon: Mic },
]

export const TOOL_NAV: NavItem[] = [
  { path: '/tools', label: 'AI 工具箱', icon: Sparkles, match: ['/tools/'] },
  { path: '/prompt', label: '出题', icon: FlaskConical },
  { path: '/banks', label: '题库管理', icon: Library },
  { path: '/import', label: '导入题目', icon: Download },
]

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.path === '/') return pathname === '/'
  if (pathname === item.path || pathname.startsWith(`${item.path}/`)) return true
  return item.match?.some((prefix) => pathname.startsWith(prefix)) ?? false
}
