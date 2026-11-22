# iFace 1.5.0 Smoke Result

> 状态：待验收。自动门禁结果已记录（外部服务记录除外）；外部服务 smoke 和人工验收由维护者用真实凭证补齐后改为正式验收记录。

## 环境

- 日期：2026-11-22
- 应用版本：`1.5.0`
- 分支：`refactor/v1.5`
- 浏览器验证：Playwright（Chromium）
- 外部服务验证：待补齐（需要真实 AI Key 和 GitHub Gist Token）

## 自动门禁

`bun run check:all` 中各子门禁的结果：

- `bun run check`：通过，Biome 检查 223 个文件无错误。
- `bun run test`：通过，Vitest 27 个文件、134 个用例。
- `bun run check:version`：通过，`package.json`、README 徽章、Roadmap、本记录和设置页版本展示一致。
- `bun run check:release`：通过。
- `bun run check:quality-gate`：通过，`check:all` 子门禁顺序、发版脚本和本记录的门禁列表一致。
- `bun run check:docs`：通过，README/docs 本地链接、`.env.example`、`LICENSE` 和截图资源正常。
- `bun run check:external-records`：**未通过，待补齐**。现有外部 smoke 记录超过 7 天，且版本仍为 `1.4.2`。
- `bun run check:backup`：通过。
- `bun run check:questions`：通过，1222 道题，29 个 JSON 文件。
- `bun run check:sync`：通过，Gist v1-v8 解析、未来版本拒绝、双端合并和 mock GitHub API 读写路径正常。
- `bun run check:ai`：通过。
- `bun run build`：通过，无大 chunk 警告；PWA 预缓存 73 项（约 1.6 MB）。
- `bun run check:pwa`：通过，题库 JSON 走运行时缓存、不进预缓存。

额外：

- `bun run test:e2e`：通过，14 个 Playwright smoke 用例。

## 外部服务 Smoke（待补齐）

```bash
IFACE_AI_API_KEY=... IFACE_AI_MODEL=... bun run smoke:external:ai
```

```bash
IFACE_GIST_TOKEN=... bun run smoke:external:gist
```

变量名模板见 `.env.example`。

运行后会更新 `docs/external-ai-smoke-result.json` 和 `docs/external-gist-smoke-result.json`，`check:external-records` 随之通过。

## 浏览器抽样（开发过程中已覆盖）

- 题目详情：显示答案、划线高亮刷新后保留、自定义答案保存 / 恢复默认、快捷键（`Space`、`1/2/3`、`←/→`、`N`、`L`）。
- 目录栏：1440px 及以上显示，点击跳转、滚动高亮；窄屏隐藏。
- 学习检验：单选 / 多选、答案解析、结果汇总，亮色和暗色。
- AI 助手：未配置提示、空状态、流式回答（mock 接口）、Markdown 渲染、重试、清空会话，亮色和暗色。
- 首次引导只出现一次；主题切换持久化。
- 左侧导航：拖动调整宽度、拖到最窄折叠、`[` 切换、双击 / Enter 恢复默认、方向键调整，刷新后保持。
- 右侧停靠侧栏：`N` / `A` 切换笔记与 AI，内容区让出宽度不被遮挡，拖动调整宽度，翻题保持打开，`Esc` 关闭；手机上为底部面板。
- 本模块题目列表：宽屏停靠左侧、翻题保持打开、刷新后保持、与右侧栏同时打开时正文不被挤压；1100px 宽且右侧栏打开时改为抽屉；手机上为左侧抽屉。
- 表单草稿：JD 诊断、AI 工具、模拟面试、导入粘贴、练习组合离开页面和刷新后保留；「新诊断」可撤销。
- 题库：返回后恢复滚动位置和已加载条数，滚动自动加载，筛选栏吸顶；手机端各页面无横向溢出。
- 笔记：打开即可输入、`⌘↵` 预览、点击正文编辑；输入后立即切题或刷新页面，内容不丢失。
- 滚动条：打开对话框时页面不再横向抖动。

## 人工验收（待维护者确认）

按 [SMOKE_TEST.md](SMOKE_TEST.md) 在亮色和暗色下走一遍，重点：

- [ ] 导入内置题库、粘贴 Markdown 导入
- [ ] 练习：快速开始、到期复习、会话结束总结
- [ ] 题目详情、笔记、AI 对话与作答反馈（真实模型）
- [ ] 设置：AI 配置、数据导出 / 导入、Gist 同步（真实 Token）
- [ ] 移动端主要页面
