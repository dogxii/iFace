import {
  ArrowRight,
  BookOpen,
  Download,
  Ellipsis,
  Eye,
  FileText,
  FlaskConical,
  House,
  Inbox,
  Lightbulb,
  Mic,
  Moon,
  PenLine,
  Play,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
  Target,
  Trash2,
} from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { ModuleMark } from '@/components/ModuleMark'
import {
  Box,
  BoxHeader,
  Breadcrumb,
  Button,
  Callout,
  Composer,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Field,
  Input,
  Kbd,
  PageHeader,
  PageTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  ProgressRing,
  SectionHeader,
  SegmentedControl,
  Select,
  Sheet,
  SheetContent,
  SheetTrigger,
  Sidebar,
  SidebarGroupLabel,
  SidebarItem,
  Skeleton,
  Spinner,
  Stat,
  StatGroup,
  StatusDot,
  StepProgress,
  SwitchRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tag,
  Textarea,
  Tooltip,
  toast,
} from '@/ui'

const COLOR_TOKENS = [
  ['canvas', 'bg-canvas'],
  ['subtle', 'bg-subtle'],
  ['muted', 'bg-muted'],
  ['line', 'bg-line'],
  ['line-strong', 'bg-line-strong'],
  ['fg-subtle', 'bg-fg-subtle'],
  ['fg-muted', 'bg-fg-muted'],
  ['fg', 'bg-fg'],
  ['accent', 'bg-accent'],
  ['accent-subtle', 'bg-accent-subtle'],
  ['success', 'bg-success'],
  ['warning', 'bg-warning'],
  ['danger', 'bg-danger'],
  ['highlight', 'bg-highlight'],
] as const

const TYPE_SCALE = [
  ['3xl · 28', 'text-3xl font-semibold tracking-tight', '什么是 AI Agent？'],
  ['2xl · 24', 'text-2xl font-semibold tracking-tight', '早上好，今天有 5 道题到期'],
  ['xl · 20', 'text-xl font-semibold', 'React 中 useEffect 的执行时机'],
  ['lg · 17', 'text-lg font-semibold', '核心结论'],
  ['md · 15', 'text-md', '答案正文：Agent 不仅会回答，还会行动、调用工具、管理状态。'],
  ['base · 14', 'text-base', '默认正文与表单文字'],
  ['sm · 13', 'text-sm text-fg-muted', '列表、按钮、导航'],
  ['xs · 12', 'text-xs text-fg-subtle', '辅助信息 · 3 天前 · #标签'],
] as const

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-line py-10 first:border-t-0">
      <h2 className="mb-6 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {label ? <span className="w-24 shrink-0 text-xs text-fg-subtle">{label}</span> : null}
      {children}
    </div>
  )
}

const NAV = [
  ['tokens', '设计 Token'],
  ['buttons', '按钮'],
  ['tags', '标签与状态'],
  ['forms', '表单'],
  ['controls', '选择控件'],
  ['progress', '进度'],
  ['surfaces', '容器与数据'],
  ['feedback', '反馈'],
  ['overlays', '浮层'],
  ['shell', '应用外壳'],
  ['patterns', '组合示例'],
] as const

export default function DesignSystem() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [segment, setSegment] = useState<'answer' | 'mine' | 'check'>('answer')
  const [status, setStatus] = useState('unmastered')
  const [mastery, setMastery] = useState<'danger' | 'warning' | 'success'>('success')
  const [toggles, setToggles] = useState({ voice: true, fab: false })
  const [showHidden, setShowHidden] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <div className="min-h-dvh bg-canvas font-sans text-fg antialiased">
      <PageHeader
        title={<Breadcrumb items={[{ label: 'iFace' }, { label: '设计系统' }]} />}
        actions={
          <>
            <Tag variant="soft">v1.5 · dev only</Tag>
            <Tooltip content={dark ? '切换到亮色' : '切换到暗色'}>
              <Button
                variant="secondary"
                size="icon"
                aria-label="切换主题"
                onClick={() => setDark((value) => !value)}
              >
                {dark ? <Sun /> : <Moon />}
              </Button>
            </Tooltip>
          </>
        }
      />
      <div className="mx-auto flex max-w-6xl gap-12 px-8">
        <nav className="sticky top-13 hidden h-[calc(100dvh-52px)] w-40 shrink-0 py-10 lg:block">
          {NAV.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="block border-l border-line py-1 pl-3 text-sm text-fg-subtle hover:border-fg hover:text-fg"
            >
              {label}
            </a>
          ))}
        </nav>

        <main className="min-w-0 flex-1 py-10">
          <PageTitle
            title="设计系统"
            description="现代简约：中性色为主，主色只用于强调；1px 细边框与留白分组；Inter + 系统中文字体。"
          />

          <Section id="tokens" title="设计 Token">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {COLOR_TOKENS.map(([name, bg]) => (
                <div key={name}>
                  <div className={`h-14 rounded-lg border border-line ${bg}`} />
                  <div className="mt-1.5 text-xs text-fg-muted">{name}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 space-y-3">
              {TYPE_SCALE.map(([label, cls, sample]) => (
                <div key={label} className="flex items-baseline gap-6">
                  <span className="w-20 shrink-0 text-xs text-fg-subtle tabular-nums">{label}</span>
                  <span className={cls}>{sample}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              {['rounded-md · 6', 'rounded-lg · 8', 'rounded-xl · 12', 'rounded-2xl · 16'].map(
                (r) => (
                  <div
                    key={r}
                    className={`flex h-16 w-28 items-end border border-line-strong bg-subtle p-2 text-xs text-fg-muted ${r.split(' ')[0]}`}
                  >
                    {r}
                  </div>
                ),
              )}
              <div className="flex h-16 w-28 items-end rounded-xl bg-elevated p-2 text-xs text-fg-muted shadow-raised">
                shadow-raised
              </div>
              <div className="flex h-16 w-28 items-end rounded-xl bg-elevated p-2 text-xs text-fg-muted shadow-popover">
                shadow-popover
              </div>
            </div>
          </Section>

          <Section id="buttons" title="按钮">
            <Row label="变体">
              <Button variant="primary">开始练习</Button>
              <Button variant="secondary">随机一题</Button>
              <Button variant="ghost">取消</Button>
              <Button variant="danger">删除</Button>
              <Button variant="danger-ghost">
                <Trash2 />
                清空记录
              </Button>
              <Button variant="link">查看全部</Button>
            </Row>
            <Row label="尺寸">
              <Button size="sm">小号</Button>
              <Button size="md">默认</Button>
              <Button size="lg" variant="primary">
                <Play />
                大号
              </Button>
            </Row>
            <Row label="图标 / 快捷键">
              <Button variant="primary" shortcut="↵">
                开始练习
              </Button>
              <Button shortcut="A">
                <Sparkles />问 AI
              </Button>
              <Button variant="primary">
                下一题
                <ArrowRight />
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label="更多">
                <Ellipsis />
              </Button>
              <Button size="icon" aria-label="搜索">
                <Search />
              </Button>
              <Button size="icon-lg" variant="secondary" aria-label="设置">
                <Settings />
              </Button>
            </Row>
            <Row label="状态">
              <Button loading>保存中</Button>
              <Button variant="primary" loading>
                同步中
              </Button>
              <Button disabled>不可用</Button>
            </Row>
          </Section>

          <Section id="tags" title="标签与状态">
            <Row label="标签">
              <Tag>Agent 架构</Tag>
              <Tag dot="success">初级</Tag>
              <Tag dot="warning">模糊</Tag>
              <Tag variant="soft">#上下文</Tag>
              <Tag variant="accent">新题</Tag>
              <Tag variant="success">已掌握</Tag>
              <Tag variant="warning">待复习</Tag>
              <Tag variant="danger">不会</Tag>
            </Row>
            <Row label="状态点">
              {(['success', 'warning', 'danger', 'accent', 'neutral', 'current'] as const).map(
                (tone) => (
                  <span key={tone} className="flex items-center gap-1.5 text-sm text-fg-muted">
                    <StatusDot tone={tone} />
                    {tone}
                  </span>
                ),
              )}
            </Row>
            <Row label="模块标识">
              {['JS基础', 'React', 'Vue', 'CSS', 'Go基础', 'Redis', 'Agent架构', '自定义模块'].map(
                (module) => (
                  <span key={module} className="flex items-center gap-2 text-sm text-fg">
                    <ModuleMark module={module} />
                    {module}
                  </span>
                ),
              )}
            </Row>
            <Row label="快捷键">
              <Kbd>⌘K</Kbd>
              <Kbd>Space</Kbd>
              <Kbd>1</Kbd>
              <Kbd>←</Kbd>
              <Kbd>Esc</Kbd>
            </Row>
          </Section>

          <Section id="forms" title="表单">
            <div className="grid max-w-3xl gap-6 md:grid-cols-2">
              <Field label="搜索" htmlFor="ds-search">
                <Input
                  id="ds-search"
                  placeholder="搜索题目、标签、笔记…"
                  leading={<Search />}
                  trailing={<Kbd>/</Kbd>}
                />
              </Field>
              <Field label="API Base URL" htmlFor="ds-url" hint="以 /v1 结尾的 OpenAI 兼容地址">
                <Input id="ds-url" defaultValue="https://api.deepseek.com/v1" />
              </Field>
              <Field label="API Key" htmlFor="ds-key" error="Key 格式不正确">
                <Input id="ds-key" aria-invalid defaultValue="sk-123" />
              </Field>
              <Field label="系统提示词" htmlFor="ds-prompt">
                <Textarea id="ds-prompt" placeholder="你是 iFace 的技术面试教练…" />
              </Field>
            </div>
            <div className="mt-6 max-w-3xl">
              <Composer
                placeholder="先用自己的话写下理解，不用完整……"
                toolbar={
                  <>
                    <Button variant="ghost" size="sm">
                      <Mic />
                      语音
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Lightbulb />
                      提示
                    </Button>
                    <span className="ml-auto text-xs text-fg-subtle">⌘↵ 提交</span>
                    <Button variant="primary" size="sm">
                      获取 AI 点评
                    </Button>
                  </>
                }
              />
            </div>
          </Section>

          <Section id="controls" title="选择控件">
            <Row label="分段控件">
              <SegmentedControl
                label="答案视图"
                value={segment}
                onValueChange={setSegment}
                options={[
                  { value: 'answer', label: '参考答案' },
                  { value: 'mine', label: '我的版本' },
                  { value: 'check', label: '学习检查' },
                ]}
              />
              <SegmentedControl
                size="sm"
                label="掌握程度"
                value={mastery}
                onValueChange={setMastery}
                options={[
                  { value: 'danger', label: '不会', icon: <StatusDot tone="danger" /> },
                  { value: 'warning', label: '模糊', icon: <StatusDot tone="warning" /> },
                  { value: 'success', label: '掌握', icon: <StatusDot tone="success" /> },
                ]}
              />
            </Row>
            <Row label="下拉选择">
              <Select
                label="状态"
                prefix="状态"
                value={status}
                onValueChange={setStatus}
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'unmastered', label: '未掌握' },
                  { value: 'review', label: '待复习' },
                  { value: 'mastered', label: '已掌握' },
                ]}
              />
              <Select
                label="难度"
                placeholder="难度"
                onValueChange={() => {}}
                options={[
                  { value: '1', label: '初级' },
                  { value: '2', label: '中级' },
                  { value: '3', label: '高级' },
                ]}
              />
            </Row>
            <div className="mb-6 max-w-md divide-y divide-line rounded-xl border border-line px-4">
              <SwitchRow
                id="ds-voice"
                label="语音输入"
                description="使用浏览器语音识别，在作答框中口述答案"
                checked={toggles.voice}
                onCheckedChange={(voice) => setToggles((t) => ({ ...t, voice }))}
              />
              <SwitchRow
                id="ds-fab"
                label="显示 AI 悬浮按钮"
                checked={toggles.fab}
                onCheckedChange={(fab) => setToggles((t) => ({ ...t, fab }))}
              />
            </div>
            <Tabs defaultValue="ai" className="max-w-xl">
              <TabsList variant="underline">
                <TabsTrigger value="general">通用</TabsTrigger>
                <TabsTrigger value="ai">AI 助手</TabsTrigger>
                <TabsTrigger value="bank">题库</TabsTrigger>
                <TabsTrigger value="data">数据与同步</TabsTrigger>
              </TabsList>
              <TabsContent value="general" className="pt-4 text-sm text-fg-muted">
                通用设置
              </TabsContent>
              <TabsContent value="ai" className="pt-4 text-sm text-fg-muted">
                选择模型服务商、填写 API Key。
              </TabsContent>
              <TabsContent value="bank" className="pt-4 text-sm text-fg-muted">
                启用或关闭题库分类。
              </TabsContent>
              <TabsContent value="data" className="pt-4 text-sm text-fg-muted">
                导入导出、GitHub Gist 同步。
              </TabsContent>
            </Tabs>
          </Section>

          <Section id="progress" title="进度">
            <div className="grid max-w-3xl gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Progress value={60} label="今日目标" />
                <Progress
                  size="xs"
                  label="React 模块"
                  segments={[
                    { value: 81, tone: 'fg' },
                    { value: 6, tone: 'warning' },
                  ]}
                />
                <StepProgress
                  label="本轮练习"
                  steps={['success', 'warning', 'current', 'todo', 'todo', 'todo', 'todo', 'todo']}
                />
              </div>
              <div className="flex items-center gap-4 text-sm text-fg-muted">
                {[10, 35, 63, 100].map((value) => (
                  <span key={value} className="flex items-center gap-2">
                    <ProgressRing value={value} size={16} />
                    {value}%
                  </span>
                ))}
                <Spinner />
              </div>
            </div>
          </Section>

          <Section id="surfaces" title="容器与数据">
            <StatGroup className="mb-6">
              <Stat
                label="已掌握"
                indicator={<StatusDot tone="success" />}
                value="128"
                unit="/ 865"
                hint="+23 本周"
                hintTone="positive"
              />
              <Stat
                label="待复习"
                indicator={<StatusDot tone="warning" />}
                value="17"
                hint="今日到期 5"
              />
              <Stat
                label="笔记"
                indicator={<StatusDot />}
                value="42"
                hint="+4 本周"
                hintTone="positive"
              />
              <Stat
                label="连续学习"
                indicator={<StatusDot tone="accent" />}
                value="6"
                unit="天"
                hint="最长 14 天"
              />
            </StatGroup>
            <div className="grid gap-4 md:grid-cols-2">
              <Box padding="md">
                <BoxHeader
                  title="今日复习"
                  description="5 道题到期，预计 15 分钟"
                  action={
                    <Button size="sm" variant="primary">
                      开始
                    </Button>
                  }
                />
              </Box>
              <Box padding="md" interactive elevation="raised">
                <p className="text-xs text-fg-subtle">继续上次 · 2 小时前</p>
                <p className="mt-2 text-md font-semibold">
                  React 中 useEffect 与 useLayoutEffect 的执行时机有什么区别？
                </p>
                <div className="mt-3 flex gap-1.5">
                  <Tag>React</Tag>
                  <Tag dot="warning">模糊</Tag>
                </div>
              </Box>
            </div>
          </Section>

          <Section id="feedback" title="反馈">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <Callout tone="success" icon={<Lightbulb />} title="面试这样说">
                  聊天机器人解决“说什么”，Agent 进一步解决“怎么做、做完没有、下一步是什么”。
                </Callout>
                <Callout tone="warning" title="尚未配置 AI">
                  在设置中填写 API Key 后即可使用 AI 点评。
                </Callout>
                <Callout tone="danger">同步失败：GitHub 返回 401，请重新登录。</Callout>
                <div className="flex gap-2">
                  <Button onClick={() => toast('已复制到剪贴板')}>普通提示</Button>
                  <Button
                    onClick={() =>
                      toast.success('已同步到 GitHub Gist', { description: '共 128 条记录' })
                    }
                  >
                    成功
                  </Button>
                  <Button
                    onClick={() =>
                      toast.error('删除笔记失败', {
                        action: { label: '重试', onClick: () => toast('正在重试…') },
                      })
                    }
                  >
                    失败
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {showHidden ? (
                  <EmptyState
                    icon={<Inbox />}
                    title="还没有题目笔记"
                    description="在题目页按 N 打开笔记，复盘内容会自动汇总到这里。"
                    action={
                      <Button size="sm" onClick={() => setShowHidden(false)}>
                        去题库
                      </Button>
                    }
                  />
                ) : (
                  <Box padding="md" className="space-y-3">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Button size="sm" variant="ghost" onClick={() => setShowHidden(true)}>
                      恢复空状态
                    </Button>
                  </Box>
                )}
              </div>
            </div>
          </Section>

          <Section id="overlays" title="浮层">
            <Row>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>打开对话框</Button>
                </DialogTrigger>
                <DialogContent
                  title="清空学习记录？"
                  description="将删除所有题目的掌握状态，笔记和自定义题目不受影响。此操作无法撤销。"
                  size="sm"
                  footer={
                    <>
                      <DialogClose asChild>
                        <Button variant="ghost">取消</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button variant="danger">清空</Button>
                      </DialogClose>
                    </>
                  }
                >
                  <Callout tone="warning">建议先在「数据与同步」中导出一份备份。</Callout>
                </DialogContent>
              </Dialog>

              <Sheet>
                <SheetTrigger asChild>
                  <Button>
                    <Sparkles />
                    打开 AI 面板
                  </Button>
                </SheetTrigger>
                <SheetContent
                  title="AI 面试教练"
                  description="gpt-5.4-mini · 已连接"
                  footer={<Composer placeholder="问点什么…" textareaClassName="min-h-16" />}
                >
                  <div className="space-y-2 p-4">
                    {['分析考点', '梳理答题结构', '讲解相关知识', '模拟面试追问'].map((label) => (
                      <Button key={label} variant="secondary" className="w-full justify-start">
                        <Sparkles />
                        {label}
                      </Button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    题目操作
                    <Ellipsis />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>当前题目</DropdownMenuLabel>
                  <DropdownMenuItem shortcut="N">
                    <FileText />
                    写笔记
                  </DropdownMenuItem>
                  <DropdownMenuItem shortcut="A">
                    <Sparkles />问 AI
                  </DropdownMenuItem>
                  <DropdownMenuCheckboxItem checked>
                    <Star />
                    标为重点
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive>
                    <Trash2 />
                    重置学习记录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Popover>
                <PopoverTrigger asChild>
                  <Button>
                    <Eye />
                    显示选项
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <p className="text-sm font-medium">题目页显示</p>
                  <p className="mt-1 text-xs text-fg-muted">调整题目页的默认展示方式。</p>
                  <div className="mt-3 divide-y divide-line">
                    <SwitchRow
                      id="ds-pop-voice"
                      label="默认展开答案"
                      checked={toggles.voice}
                      onCheckedChange={(voice) => setToggles((t) => ({ ...t, voice }))}
                    />
                  </div>
                </PopoverContent>
              </Popover>

              <Tooltip content="分析考点" shortcut="A">
                <Button size="icon" variant="secondary" aria-label="分析考点">
                  <Sparkles />
                </Button>
              </Tooltip>
            </Row>
          </Section>

          <Section id="shell" title="应用外壳">
            <div className="flex h-[420px] overflow-hidden rounded-xl border border-line">
              <Sidebar>
                <div className="mb-3 flex h-9 items-center gap-2 px-2 text-md font-semibold tracking-tight">
                  <span className="flex size-5.5 items-center justify-center rounded-md bg-fg text-xs text-canvas">
                    i
                  </span>
                  iFace
                </div>
                <SidebarItem icon={<House />}>概览</SidebarItem>
                <SidebarItem icon={<BookOpen />} active count={865}>
                  题库
                </SidebarItem>
                <SidebarItem icon={<PenLine />} count={5}>
                  练习
                </SidebarItem>
                <SidebarItem icon={<Target />}>薄弱点</SidebarItem>
                <SidebarItem icon={<FileText />}>笔记</SidebarItem>
                <SidebarItem icon={<Mic />}>模拟面试</SidebarItem>
                <SidebarGroupLabel>工具</SidebarGroupLabel>
                <SidebarItem icon={<Sparkles />}>AI 工具箱</SidebarItem>
                <SidebarItem icon={<FlaskConical />}>出题</SidebarItem>
                <SidebarItem icon={<Download />}>导入</SidebarItem>
                <div className="mt-auto border-t border-line px-2 pt-3">
                  <div className="flex justify-between text-xs text-fg-muted">
                    <span>今日目标</span>
                    <span className="font-medium text-fg tabular-nums">6 / 10</span>
                  </div>
                  <Progress value={60} size="xs" className="mt-2" label="今日目标" />
                </div>
              </Sidebar>
              <div className="min-w-0 flex-1">
                <PageHeader
                  className="static"
                  title={
                    <Breadcrumb
                      items={[{ label: '题库', onClick: () => {} }, { label: 'Agent 架构' }]}
                    />
                  }
                  actions={
                    <Input
                      size="sm"
                      className="w-52"
                      placeholder="搜索"
                      leading={<Search />}
                      trailing={<Kbd>⌘K</Kbd>}
                    />
                  }
                />
                <div className="p-6">
                  <PageTitle
                    title="Agent 架构"
                    description="48 道题 · 已掌握 5 · 待复习 3"
                    actions={
                      <Button variant="primary">
                        <Play />
                        练习这 12 道
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>
          </Section>

          <Section id="patterns" title="组合示例">
            <SectionHeader title="题目列表" action="12 个结果" />
            <Box className="mb-8 divide-y divide-line">
              {[
                [
                  'warning',
                  'Agent 的「记忆」通常分为哪几类？各自适合用什么方式实现？',
                  '中级',
                  '3 天前',
                ],
                ['neutral', 'ReAct 模式中，观察结果如何写回到 Agent 的工作记忆里？', '初级', '—'],
                ['danger', '上下文窗口不够用时，Agent 有哪些常见的记忆压缩方法？', '中级', '昨天'],
              ].map(([tone, title, level, time]) => (
                <div
                  key={title}
                  className="flex items-center gap-4 px-4 py-3 text-sm hover:bg-subtle/60"
                >
                  <StatusDot tone={tone as 'warning'} />
                  <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
                  <span className="w-14 text-xs text-fg-subtle">{level}</span>
                  <span className="w-14 text-xs text-fg-subtle">{time}</span>
                  <Star className="size-4 text-fg-subtle" />
                </div>
              ))}
            </Box>

            <SectionHeader title="掌握程度悬浮条" />
            <div className="flex justify-center rounded-xl border border-dashed border-line-strong bg-subtle py-10">
              <div className="flex items-center gap-1 rounded-2xl border border-line-strong bg-elevated p-1.5 shadow-popover">
                <span className="px-2 text-xs text-fg-subtle">掌握程度</span>
                <SegmentedControl
                  label="掌握程度"
                  value={mastery}
                  onValueChange={setMastery}
                  className="bg-transparent"
                  options={[
                    { value: 'danger', label: '不会', icon: <StatusDot tone="danger" /> },
                    { value: 'warning', label: '模糊', icon: <StatusDot tone="warning" /> },
                    { value: 'success', label: '掌握', icon: <StatusDot tone="success" /> },
                  ]}
                />
                <span className="mx-1 h-5 w-px bg-line" />
                <Button variant="primary" size="md">
                  下一题
                  <ArrowRight />
                </Button>
              </div>
            </div>
          </Section>
        </main>
      </div>
    </div>
  )
}
