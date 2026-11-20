import { BookOpenText, Brain, type LucideIcon, PenLine, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { type CategoryMap, DEFAULT_CATEGORY_MAP, getCategoryMap } from '@/lib/db'
import {
  type AnswerNavigationMode,
  DAILY_GOAL_DEFAULT,
  DAILY_GOAL_MAX,
  DAILY_GOAL_MIN,
  type StudyMode,
  useStudyStore,
} from '@/store/useStudyStore'
import { Button, cn, SegmentedControl, Stat, StatGroup, Switch, SwitchRow, Tag, toast } from '@/ui'
import { SettingsBody, SettingsSection } from './parts'

const STUDY_MODES: { value: StudyMode; label: string; description: string; icon: LucideIcon }[] = [
  {
    value: 'answer-first',
    label: '先答后看',
    description: '先写下自己的理解，再展开参考答案，最有助于记忆',
    icon: PenLine,
  },
  {
    value: 'answer-alongside',
    label: '边看边记',
    description: '查看答案的同时作答，作答区显示在答案卡片内',
    icon: BookOpenText,
  },
  {
    value: 'memory-only',
    label: '纯记忆',
    description: '不显示作答区，直接翻答案，快速过一遍知识点',
    icon: Brain,
  },
]

const GOAL_PRESETS = [5, 10, 20, 30, 50]

const MILESTONES = [
  { n: 3, label: '3 连击' },
  { n: 5, label: '5 连击' },
  { n: 10, label: '10 连击' },
  { n: 20, label: '20 连击' },
  { n: 50, label: '50 连击' },
]

export function StudySettings() {
  const {
    studyMode,
    setStudyMode,
    answerNavigationMode,
    setAnswerNavigationMode,
    mobileQuestionNavEnabled,
    setMobileQuestionNavEnabled,
    aiFabVisible,
    setAiFabVisible,
    streak,
    resetStreak,
    dailyGoal,
    setDailyGoal,
    hiddenCategories,
    toggleCategoryVisibility,
  } = useStudyStore()
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({ ...DEFAULT_CATEGORY_MAP })

  useEffect(() => {
    getCategoryMap().then(setCategoryMap)
  }, [])

  const categories = Object.entries(categoryMap).sort(
    ([, a], [, b]) => (a.order ?? 99) - (b.order ?? 99),
  )

  return (
    <SettingsBody>
      <SettingsSection
        title="每日目标"
        description="概览和侧边栏会按这个数字显示今日进度。"
        action={
          <span className="text-sm font-semibold text-fg tabular-nums">{dailyGoal} 题 / 天</span>
        }
      >
        <input
          type="range"
          min={DAILY_GOAL_MIN}
          max={DAILY_GOAL_MAX}
          step={1}
          value={dailyGoal}
          onChange={(e) => setDailyGoal(Number.parseInt(e.target.value, 10))}
          aria-label="每日目标题数"
          className="w-full accent-accent"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {GOAL_PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDailyGoal(n)}
              className={cn(
                'h-7 rounded-md border px-2.5 text-xs tabular-nums transition-colors',
                dailyGoal === n
                  ? 'border-accent bg-accent-subtle font-medium text-accent'
                  : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
              )}
            >
              {n} 题{n === DAILY_GOAL_DEFAULT ? '（推荐）' : ''}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="答题方式" description="决定题目页是否显示「我的作答」以及它的位置。">
        <div className="grid gap-2 sm:grid-cols-3">
          {STUDY_MODES.map((mode) => {
            const active = studyMode === mode.value
            return (
              <button
                key={mode.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setStudyMode(mode.value)
                  toast(`已切换至「${mode.label}」`)
                }}
                className={cn(
                  'flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-accent bg-accent-subtle/60'
                    : 'border-line hover:border-line-strong hover:bg-subtle',
                )}
              >
                <mode.icon className={cn('size-4', active ? 'text-accent' : 'text-fg-subtle')} />
                <span className="text-sm font-medium text-fg">{mode.label}</span>
                <span className="text-xs leading-relaxed text-fg-muted">{mode.description}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-fg">切题后默认进入</p>
            <p className="mt-0.5 text-xs text-fg-muted">题目带有自测题时，展开答案后先看哪一页</p>
          </div>
          <SegmentedControl<AnswerNavigationMode>
            size="sm"
            label="切题后默认进入"
            value={answerNavigationMode}
            onValueChange={setAnswerNavigationMode}
            options={[
              { value: 'answer', label: '参考答案' },
              { value: 'check', label: '测试一下' },
            ]}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="题库展示"
        description="关闭的题库会从概览、题库和练习中隐藏，学习记录仍会保留。"
      >
        {categories.length === 0 ? (
          <p className="text-sm text-fg-subtle">暂无题库</p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {categories.map(([key, cat]) => {
              const visible = !hiddenCategories.has(key)
              const id = `category-visible-${key}`
              return (
                <li key={key} className="flex items-center gap-3 px-3.5 py-2.5">
                  <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                    <span className="flex items-center gap-2 text-sm font-medium text-fg">
                      {cat.name}
                      {cat.builtin ? <Tag variant="soft">内置</Tag> : null}
                    </span>
                    <span className="text-xs text-fg-subtle">{cat.modules.length} 个模块</span>
                  </label>
                  <Switch
                    id={id}
                    checked={visible}
                    onCheckedChange={() => {
                      toggleCategoryVisibility(key)
                      toast(visible ? `已隐藏「${cat.name}」` : `已显示「${cat.name}」`)
                    }}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </SettingsSection>

      <SettingsSection title="题目页" description="只影响手机等小屏幕。">
        <div className="divide-y divide-line">
          <SwitchRow
            id="mobile-question-nav"
            label="底部切题按钮"
            description="在题目页底部固定显示上一题、下一题"
            checked={mobileQuestionNavEnabled}
            onCheckedChange={setMobileQuestionNavEnabled}
          />
          <SwitchRow
            id="mobile-ai-fab"
            label="AI 助手悬浮按钮"
            description="在题目页右下角显示 AI 助手入口"
            checked={aiFabVisible}
            onCheckedChange={setAiFabVisible}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="连刷记录"
        description="今天连续标记的题数，跨天自动归零。"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              resetStreak()
              toast('连刷记录已重置')
            }}
          >
            <RotateCcw />
            重置
          </Button>
        }
      >
        <StatGroup>
          <Stat label="今日作答" value={streak.todayCount} unit="题" />
          <Stat label="当前连击" value={streak.currentStreak} unit="连" />
          <Stat label="历史最高" value={streak.bestStreak} unit="连" />
        </StatGroup>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {MILESTONES.map((m) => {
            const reached = streak.bestStreak >= m.n
            return (
              <Tag
                key={m.n}
                variant={reached ? 'success' : 'outline'}
                dot={reached ? 'success' : undefined}
              >
                {m.label}
                {reached ? ' · 已达成' : ''}
              </Tag>
            )
          })}
        </div>
      </SettingsSection>
    </SettingsBody>
  )
}
