import { PALETTE_SHORTCUT } from '@/features/command-palette/shortcut'
import { MASTERY_OPTIONS } from '@/features/question-detail/mastery'

export const REPO_URL = 'https://github.com/dogxii/iface'

export const ABOUT_LINKS = [
  { label: '源代码', href: REPO_URL },
  { label: '更新日志', href: `${REPO_URL}/releases` },
  { label: '反馈问题', href: `${REPO_URL}/issues` },
  { label: '作者主页', href: 'https://dogxi.me' },
] as const

export interface ShortcutGroup {
  title: string
  items: { keys: string[]; label: string }[]
}

/** Every keyboard shortcut in the app, grouped by where it works. */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: '全局',
    items: [
      { keys: [PALETTE_SHORTCUT], label: '命令面板' },
      { keys: ['['], label: '收起 / 展开侧边栏' },
    ],
  },
  {
    title: '题库',
    items: [
      { keys: ['/'], label: '搜索题目' },
      { keys: ['N'], label: '只看有笔记的题' },
    ],
  },
  {
    title: '题目',
    items: [
      { keys: ['Space'], label: '查看答案' },
      {
        keys: MASTERY_OPTIONS.map((option) => option.key),
        label: MASTERY_OPTIONS.map((option) => option.label).join(' / '),
      },
      { keys: ['←', '→'], label: '上一题 / 下一题' },
      { keys: ['N'], label: '笔记' },
      { keys: ['A'], label: 'AI 助手' },
      { keys: ['L'], label: '本模块题目' },
    ],
  },
]
