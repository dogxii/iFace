# iFace v1.5.0 发布说明

> 状态：草稿。外部服务 smoke 和人工验收补齐后改为正式版本。

## iFace v1.5.0

1.5.0 是一次界面和代码结构的整体重构：换上更克制的极简界面，所有页面用新的组件库重建，状态层和数据访问也一并整理。刷题、笔记、AI、备份和同步的数据格式保持兼容，升级后不需要迁移。

### 界面

- 全新外观：桌面端侧边栏外壳，移动端顶栏和抽屉菜单；统一的设计 token，亮色 / 暗色主题一致。
- 新增 `⌘K` / `Ctrl K` 命令面板，可以搜索题目、跳转页面、打开设置。
- 概览页：继续上次、今日目标、统计、今日推荐、活跃度热力图、模块进度、最近笔记。
- 题库页：分类侧栏、搜索（包含笔记内容）、筛选与排序；筛选状态写在 URL 里，可以分享和回退。
- 题目详情页：新的题目区和答案卡片，掌握程度按钮吸底；长答案右侧显示目录栏（宽屏），点击跳转并随滚动高亮。
- AI 助手抽屉、学习检验、Markdown 渲染全部改用新组件和 token 样式。
- 设置从 3.6k 行的抽屉改为按 tab 拆分的对话框（学习 / AI / 数据 / 同步），并显示当前版本号。
- 薄弱点、模拟面试（聊天式面试间 + 评分报告）、导入、出题、AI 工具箱、简历 / JD 诊断、首次引导全部重建。

### 学习功能

- 练习页新增快速开始：到期复习、待复习、学新题、随机。
- 间隔复习：根据现有学习记录推算到期时间（待复习次日、已掌握 7 / 14 / 30 / 60 天），不改存储格式。
- 薄弱点页显示到期状态，标记掌握后可以撤销。
- 导入页支持直接粘贴 Markdown 题目，并显示各来源题目数量。

### 修复

- 内置题库迁移不再误删自定义题目：以前 Markdown 导入自动生成的 id（例如 `js-001`）可能和内置题 id 撞上，迁移时被当成重复题删除。现在除了 id 还要求模块和题干 / 答案一致。
- 备份导入、Gist 拉取后，内存中的学习记录会自动刷新，不再显示旧数据。
- PWA 同源运行时缓存路由此前用 RegExp 匹配完整 URL，永远匹配不上，已改为按 pathname 匹配。

### 性能

- 题库和学习检验 JSON 不再预缓存，改为 `NetworkFirst` 运行时缓存，预缓存从约 6.5 MB（104 项）降到约 1.6 MB（71 项）。
- 设置对话框、Gist 同步按需加载，React 单独分包；入口 chunk 从约 613 kB 降到约 325 kB，构建不再有大 chunk 警告。

### 工程

- 状态层改用 zustand 单例 store（`useStudyState`、`useAIState` 等），localStorage 读写集中到 `src/lib/storage.ts`。
- 新增可替换的 data source 接口，为后续 QFace 后端预留。
- 页面按 `src/features/<feature>/` 组织，纯逻辑放在同目录 `*.ts` 并配单元测试。
- 新增 Vitest 单元测试和 Playwright E2E smoke 测试，`check:all` 增加 `bun run test`。
- 开发模式下 `/design` 展示所有组件和 token。

### 数据与兼容性

- IndexedDB：结构和版本号不变。
- localStorage：键名和格式不变；不再使用 `iface_streak_banner_dismissed_date`（概览页旧横幅已移除，遗留值无影响）。
- 内置题库 JSON：内容不变（1222 道题，29 个文件）。
- 备份文件、Gist 同步格式：不变，旧备份可以直接导入。

### 外观变化说明

Markdown 样式迁移到 token 类名后有几处有意的细微变化：答案第一个标题和最后一段不再有外边距；未标注语言的代码块和普通代码块样式一致；表格改为外框 + 行分隔线。

### 升级前确认

```bash
bun run check:all
```

`check:all` 包含 `bun run check`、`bun run test`、`bun run check:version`、`bun run check:release`、`bun run check:quality-gate`、`bun run check:docs`、`bun run check:external-records`、`bun run check:backup`、`bun run check:questions`、`bun run check:sync`、`bun run check:ai`、`bun run build`、`bun run check:pwa`。其中 `check:external-records` 需要先用真实凭证运行 `bun run smoke:external:ai` 和 `bun run smoke:external:gist`。

验收记录见 [SMOKE_RESULT_1.5.0.md](SMOKE_RESULT_1.5.0.md)。
