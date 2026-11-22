import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react'
import { type ThemePreference, useStudyState } from '@/store/useStudyStore'
import { SegmentedControl } from '@/ui'

export const THEME_OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
]

const SEGMENTS = THEME_OPTIONS.map(({ value, label, icon: Icon }) => ({
  value,
  label,
  icon: <Icon />,
}))

/** Light / dark / system picker for settings and onboarding (the shell uses a menu instead). */
export function ThemeSegmentedControl({ className }: { className?: string }) {
  const theme = useStudyState((s) => s.theme)
  const setTheme = useStudyState((s) => s.setTheme)
  return (
    <SegmentedControl
      label="主题"
      value={theme}
      onValueChange={setTheme}
      options={SEGMENTS}
      className={className}
    />
  )
}
