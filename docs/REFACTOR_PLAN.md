# iFace 重构优化计划（v1.5 草案）

> 基于 `main@f60c0a5` 的代码分析，2026-11-20

## 一、现状

| 指标 | 数据 |
| --- | --- |
| 源码规模 | `src/` 约 3.4 万行，`scripts/` 约 4400 行 |
| 超大文件 | `QuestionDetail.tsx` **6689 行**、`SettingsDrawer.tsx` 3595、`PromptPage.tsx` 2461、`QuestionList.tsx` 2155、`Dashboard.tsx` 1964、`MockInterview.tsx` 1606、`ImportPage.tsx` 1557、`AIPanel.tsx` 1351、`gistSync.ts` 1213 |
| 样式 | 约 1200 处 `style={{}}` 内联样式，`className` 只有约 280 处，Tailwind 基本没用起来 |
| 测试 | 没有单元测试，只有一组 `scripts/check*.ts` 冒烟脚本 |
| Lint | `bun run check` 现在有 2 个格式错误（`Tools.tsx`、`OnboardingGuide.tsx`） |
| 构建 | 能通过；`QuestionDetail` chunk 134 KB，`MarkdownRenderer` chunk 340 KB |
| PWA 预缓存 | 90 个文件，**约 6 MB**，其中题库和 learning-checks 的 JSON 约 4.6 MB（46 个文件） |

## 二、主要问题（按影响排序）

1. **Store 不是真正的单例**
   `useStudyStore` / `useAIStore` / `useAuthStore` 都是 `useReducer` 写的 hook，每调用一次就是一份独立状态，靠模块级 listener 和 BroadcastChannel 互相广播来"同步"。
   - `useStudyStore()` 在 9 处被调用，每个实例挂载时都会**从 IndexedDB 读一遍全部学习记录**。
   - reducer 里直接写 localStorage，是有副作用的；在 `StrictMode` 下会执行两次。
   - 状态可能出现短暂不一致，比如某个实例还没收到 `INIT`。
2. **页面组件过大，逻辑和 UI 混在一起**
   `QuestionDetail.tsx` 一个文件里塞了笔记编辑器、答案划线批注（Range/Selection 计算）、作答评分、模块题目抽屉、AI 抽屉、会话进度、快捷键等十几个子功能，`useState/useEffect/useRef` 出现了 100 多次，很难改，也没法测。
3. **样式体系不统一**：内联样式、`index.css`（1000 行）和 Tailwind 三种写法并存，重复样式很多，主题和暗色模式维护成本高。
4. **持久化散落各处**：localStorage key（`iface_*`）分散在 store、页面和组件里，没有统一的版本号和迁移逻辑；IndexedDB 访问也有多处直接全量读取（`SettingsDrawer` 里有 3 处 `getAllQuestions + getAllStudyRecords`）。
5. **PWA 首次安装太重**：6 MB 预缓存里大部分是用户未必会用到的题库 JSON。
6. **缺少安全网**：没有单测和 CI，重构的回归风险全靠手动点。

## 三、原则

- **数据兼容**：数据格式（IndexedDB、localStorage、备份 JSON、Gist 同步格式）向后兼容，必要时写迁移。
- **小步提交，每步可验证**：每个 PR 都要通过 `check + test + build + 冒烟脚本`。
- **先建安全网，再动结构**。
- 为后续和 QFace（UGC）融合留好数据层接口，但不提前实现。
- **界面整体改版**：视觉和布局按「设计方向」重做，功能和数据保持不变。

## 设计方向（已确认）

参考稿见 `docs/design/mockup.html`（静态 HTML，用浏览器直接打开）。

- **风格**：现代简约，参考 Linear / Vercel。中性色为主，主色靛蓝（`#5e5ce6`）只用在主按钮、选中态、进度；状态（掌握 / 模糊 / 不会）只用小圆点和文字表达。
- **层次**：1px 细边框 + 留白分组，基本不用阴影和渐变；圆角 8 / 12 / 16。
- **字体**：西文与数字 Inter（等宽数字），中文用系统字体（苹方 / 微软雅黑）；不打包中文字体。
- **布局**：左侧边栏导航；题目详情为文档式单栏 + 右侧目录；掌握程度放在底部悬浮条；练习为沉浸式（左侧本轮题目、中间题卡、右侧统计与提示，答案模糊预览）。
- **暗色模式**：同一套 token 切换。
- **组件库**：交互复杂的组件基于 Radix 无样式组件，外观自定义；简单组件自写，用 `cva` 管理变体；开发环境提供 `/design` 组件展示页。

## 四、分阶段计划

### 阶段 0：基线与安全网（约 1–2 天）
- [ ] 修掉现有 2 个 Biome 格式错误
- [ ] 接入 **Vitest**（加 `bun run test`），先给纯逻辑补测试：`data/schema`、`questionLoader`（合并/去重）、`gistSync`（合并冲突）、`localBackup`（导入导出往返）、`feedbackNote`
- [ ] 用 **Playwright** 写一条 E2E 主流程：加载内置题库 → 刷题标记 → 详情页写笔记 → 设置页导出备份
- [ ] 加 GitHub Actions：`check / test / build`

### 阶段 1：设计系统与组件库（约 3–4 天）
- [ ] 设计 token：颜色、字号、间距、圆角、阴影、动效，写进 Tailwind v4 `@theme`，亮色 / 暗色各一套
- [ ] 基础组件：Button、IconButton、Tag、Kbd、Input、Textarea、Select、Switch、SegmentedControl、Progress、Box/Card、EmptyState、Skeleton、Spinner
- [ ] 交互组件（Radix）：Dialog、Sheet（抽屉）、DropdownMenu、Popover、Tooltip、Tabs、Toast、CommandPalette（⌘K）
- [ ] 应用外壳：Sidebar、页面 Header、PageContainer
- [ ] 开发环境 `/design` 展示页，覆盖全部组件和状态，亮色 / 暗色对照
- 验收：组件全部有类型和变体，`/design` 页截图对齐设计稿

### 阶段 2：状态层重写（约 2–3 天）
- [ ] 每个 store 改成**模块级单例 + `useSyncExternalStore`**（或引入 `zustand`，约 1 KB），组件通过 selector 订阅，减少无关重渲染
- [ ] reducer 改为纯函数，持久化放到 store 的 subscribe 里统一处理
- [ ] 新建 `lib/storage.ts`：集中管理所有 `iface_*` key，带 schema 校验和版本迁移
- [ ] 跨标签页同步保留 BroadcastChannel，但只在 store 层做一次
- 验收：IndexedDB 学习记录全量读取从每页约 N 次降到 1 次；已有用户数据零迁移失败

### 阶段 3：页面重建（拆分大文件 + 新界面，约 6–8 天）
拆文件的同时用新组件重建页面，结构重构和视觉改版一次完成。
改成按功能组织的目录结构：

```
src/
  app/                  # App、路由、全局 Provider
  features/
    question-detail/
      QuestionDetailPage.tsx
      notes/            # 笔记编辑器、图片、格式化工具栏
      annotations/      # 划线/批注：纯函数 range 计算 + 组件
      answer/           # 作答输入、AI 评分面板
      module-drawer/
      session/          # 刷题会话进度、连击庆祝
    settings/           # 按 tab 拆分 SettingsDrawer
    practice/  dashboard/  question-list/  import/  prompt/  mock-interview/  tools/
  shared/
    ui/  hooks/  lib/
  store/  types/
```

- [ ] `QuestionDetail` → 页面壳不超过 400 行；划线/批注、笔记格式化、评分解析等**纯函数抽出来并补测试**
- [ ] `SettingsDrawer` → 每个 tab 一个文件，抽出数据导入导出的 service
- [ ] `PromptPage` / `QuestionList` / `Dashboard` / `MockInterview` / `ImportPage` 照同样方式拆
- [ ] 页面顺序：应用外壳 → 概览 → 题库 → 题目详情 → 练习 → 设置 → 其余页面
- [ ] 内联样式全部改为 token / class（只保留动态计算的值）
- 验收：单文件原则上不超过 600 行；功能不变，E2E 通过；亮色 / 暗色截图检查

### 阶段 4：数据与性能（约 2 天）
- [ ] PWA：题库 JSON 不再预缓存，改为 `StaleWhileRevalidate` 运行时缓存（加载过的模块离线也能用），预缓存目标降到 1.5 MB 以下
- [ ] `db.ts` 收敛为 repository 层（questions / records / notes），给 SettingsDrawer 等调用方提供按需查询
- [ ] Markdown：`rehype-highlight` 只注册题库实际用到的语言；评估 `MarkdownRenderer` chunk 体积
- [ ] 长列表（QuestionList）评估是否需要虚拟滚动
- 验收：Lighthouse 性能分和首屏 JS 体积给出对比数据

### 阶段 5：收尾（约 1 天）
- [ ] 更新 `AGENTS.md`、README，以及目录结构说明
- [ ] 清理无用的资源（如 `src/assets/react.svg`、根目录 531 KB 的 `origin-icon.png`）
- [ ] 发布 v1.5.0，`check:all` 全部通过

## 五、分支与发布

- 在 `refactor/v1.5` 分支上开发，每个阶段（或每个拆分子任务）单独开 PR 合进这个分支，最后合到 `main`
- PR 标题和描述用中文，写明是否涉及 IndexedDB、localStorage 或题库 JSON 的变更（遵循 AGENTS.md）

## 六、待确认的问题

1. 状态管理：引入 `zustand`，还是用原生 `useSyncExternalStore` 自己写？（推荐 zustand，代码更少）
2. 这次重构要不要为和 QFace 融合预留接口（比如后端 API 的数据源抽象），还是只聚焦前端质量？
3. 练习评分后的「下次复习时间」需要新增间隔复习规则，是否纳入本次？
