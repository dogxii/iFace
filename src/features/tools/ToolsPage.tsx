import {
  ArrowUpRight,
  CalendarCheck,
  CircleHelp,
  ClipboardCheck,
  FileSearch,
  FlaskConical,
  FolderKanban,
  type LucideIcon,
  MessagesSquare,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { preloadPath } from '@/lib/routePreload'
import { Breadcrumb, PageHeader, PageTitle } from '@/ui'

interface Tool {
  title: string
  description: string
  href: string
  icon: LucideIcon
}

const SECTIONS: { title: string; description: string; tools: Tool[] }[] = [
  {
    title: '面试核心',
    description: '最接近真实面试的两件事',
    tools: [
      {
        title: '模拟面试',
        description: '基于岗位 JD 和简历进行中文一问一答，结束后查看评分与改进建议。',
        href: '/mock-interview',
        icon: MessagesSquare,
      },
      {
        title: '简历 JD 诊断',
        description: '对照目标岗位，找出简历里的匹配点、风险点和可能追问。',
        href: '/tools/jd-match',
        icon: FileSearch,
      },
    ],
  },
  {
    title: '准备打磨',
    description: '把经历讲清楚、讲出亮点',
    tools: [
      {
        title: '项目深挖',
        description: '拆解项目亮点、技术难点、追问清单和口语化回答。',
        href: '/tools/project-deep-dive',
        icon: FolderKanban,
      },
      {
        title: '面试问题预测',
        description: '基于简历、JD 或项目关键词预测这场面试的高概率问题。',
        href: '/tools/interview-questions',
        icon: CircleHelp,
      },
      {
        title: '自我介绍',
        description: '生成 30 秒、1 分钟、2 分钟中文面试自我介绍。',
        href: '/tools/self-intro',
        icon: UserRound,
      },
    ],
  },
  {
    title: '复盘提升',
    description: '每场面试都变成下一场的准备',
    tools: [
      {
        title: '复盘解析',
        description: '把面试记录转成失分点、补强项和下一轮练习清单。',
        href: '/tools/review-analysis',
        icon: ClipboardCheck,
      },
      {
        title: '学习计划',
        description: '按薄弱点、面试日期和可投入时间生成补强路径。',
        href: '/tools/learning-plan',
        icon: CalendarCheck,
      },
      {
        title: 'AI 出题',
        description: '复制结构化 Prompt，让 AI 批量生成符合 iFace 格式的面试题。',
        href: '/prompt',
        icon: FlaskConical,
      },
    ],
  },
]

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      to={tool.href}
      onPointerEnter={() => preloadPath(tool.href)}
      onFocus={() => preloadPath(tool.href)}
      className="group relative flex flex-col gap-3 rounded-xl border border-line bg-canvas p-4 transition-colors outline-none hover:border-line-strong hover:bg-subtle/60 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid size-9 place-items-center rounded-lg border border-line bg-subtle text-fg-muted transition-colors group-hover:border-accent/30 group-hover:bg-accent-subtle group-hover:text-accent">
        <tool.icon className="size-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-md font-medium text-fg">{tool.title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-fg-muted">{tool.description}</span>
      </span>
      <ArrowUpRight className="absolute top-4 right-4 size-4 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

export default function ToolsPage() {
  return (
    <>
      <PageHeader title={<Breadcrumb items={[{ label: 'AI 工具箱' }]} />} />
      <div className="mx-auto max-w-[1160px] px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <PageTitle
          title="AI 工具箱"
          description="面试前后关键时刻用得上的 AI 辅助。需要先在设置中配置 AI。"
        />
        <div className="mt-8 flex flex-col gap-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-base font-semibold text-fg">{section.title}</h2>
                <span className="text-sm text-fg-subtle">{section.description}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.tools.map((tool) => (
                  <ToolCard key={tool.href} tool={tool} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
