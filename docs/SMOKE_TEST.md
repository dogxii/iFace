# iFace 1.0 Smoke Test

这份清单用于每次接近发版时做人工验收。目标不是覆盖所有边角，而是确保刷题、笔记、AI、数据安全这几条主链路没有断。

## 运行前准备

- 使用干净浏览器 Profile，或先导出当前数据再清空本地数据。
- 本地启动：`bun dev`
- 打开：`http://localhost:5173`
- 质量门禁：
  - `bun run check:all`
- 外部服务 smoke（正式 1.0 前至少跑一次，需本地环境变量）：
  - `IFACE_AI_API_KEY=... IFACE_AI_MODEL=... bun run smoke:external:ai`
  - `IFACE_GIST_TOKEN=... bun run smoke:external:gist`
- 外部 smoke 的变量名模板见 `.env.example`；通过后会写入 `docs/external-ai-smoke-result.json`
  和 `docs/external-gist-smoke-result.json`。
- 这两个外部 smoke 记录不含密钥，并会写入当时的 `packageVersion`；正式 1.0 发版检查会读取它们作为证据，且要求记录在 7 天内生成。
- 单项排查命令：
  - `bun run check`
  - `bun run check:version`
  - `bun run check:release`
  - `bun run check:quality-gate`
  - `bun run check:docs`
  - `bun run check:external-records`
  - `bun run check:backup`
  - `bun run check:ai`
  - `bun run smoke:external:ai`
  - `bun run smoke:external:gist`
  - `bun run check:questions`
  - `bun run check:sync`
  - `bun run build`
  - `bun run check:pwa`

## 核心路径

### 1. 题库与导入

- 进入「导入」页面，在「内置题库」卡片点击「加载内置题库」。
- 确认题库数量、模块、难度分布展示正常。
- 再点击「重刷内置题库」，确认题目数量不丢失。
- 上传 `scripts/fixtures/smoke-valid-question.json`，确认合法 JSON 可导入并登记来源。
- 上传 `scripts/fixtures/smoke-invalid-question.json`，确认有明确错误提示且不会污染已有数据。

### 2. 题库列表

- 搜索题目标题、答案关键词、标签，结果应即时更新。
- 切换模块、难度、学习状态筛选，数量和列表应一致。
- 切换「只看有笔记」，有笔记题目应能稳定出现。
- 打开任意题目后返回列表，筛选条件不应意外丢失。

### 3. 练习主流程

- 从「今日推荐」开始练习，确认按钮有左右 padding 且移动端不挤压。
- 从「练习」页选择模块、难度、状态、题量并开始专项练习。
- 单题会话完成后：
  - 标记「没掌握」应出现「重练 N 题」和「调整练习」。
  - 标记「完全掌握」应出现「继续练习」，不应出现禁用的「无需重练」。
- 多题会话中，最后一题完成后应展示本轮总结。

### 4. 三种答题模式

- 「先答题」：进入题目后先聚焦我的作答，`Space` 显示参考答案。
- 「边看边记」：按 `Space` 展开答案后，不应自动滚动到输入框。
- 「纯记忆」：进入题目后直接展开参考答案，不需要再按 `Space`。
- 快捷键 `1/2/3` 只应单次标记，长按不应重复保存。
- 方向键切题、`N` 打开笔记、`Esc` 关闭抽屉时不应和输入框冲突。

### 5. 题目笔记

- 在题目右上角点击「笔记」打开抽屉。
- 使用 `N` 打开/关闭笔记抽屉；焦点在编辑框内时 `N` 应保留为正常输入。
- 使用 `Esc` 从编辑框内关闭笔记抽屉。
- 编辑笔记后离开页面再回来，内容应保留。
- Markdown 预览应能展示标题、列表、代码块。
- Dashboard 最近笔记、题库列表有笔记筛选、笔记搜索应同步更新。

### 6. AI 助手

- 未配置 API Key 时，题目详情和作答反馈入口应给出可理解提示。
- 在设置中选择模型预设，确认 Base URL、模型名、开关能保存。
- 配置有效 Key 后，在题目详情发起 AI 对话，流式输出应正常。
- 提交「我的作答」获得 AI 反馈，反馈应围绕题目、参考答案和用户作答。
- 将 AI 反馈保存为笔记，题目笔记应追加复盘内容。
- 手动上滑 AI 对话时，应暂停自动跟随最新消息。

### 7. 薄弱点与复盘

- 标记多道「没掌握」或「大概会」后，薄弱点页应展示聚合结果。
- 从薄弱点页进入专项练习，题目应来自对应薄弱模块或标签。
- 薄弱点页和其他 tab 间切换，桌面端导航不应因滚动条出现/消失而横向偏移。

### 8. 数据导出、导入与同步

- 导出数据后，确认 JSON 包含题库、学习记录、题目笔记、AI 会话和必要元信息，不包含 API Key。
- 清空本地数据后导入 `scripts/fixtures/smoke-backup.json`，题库、进度、笔记、重点题标记、AI 会话、自定义来源和自定义分类应恢复，且不会写入 API Key。
- `bun run check:backup` 应覆盖本地备份 fixture、旧备份来源 / 分类推导、重点题标记、分类合并和错误输入拒绝。
- `bun run check:external-records` 应确认外部 smoke 记录结构正确、版本匹配、7 天内生成，且不含 API Key、GitHub Token 或 Authorization 字段。
- `bun run check:questions` 应确认题库 JSON、内置题库 registry 和默认分类模块保持一致。
- `bun run check:sync` 应覆盖旧版本 Gist 备份解析、未来版本拒绝、重点题标记和双端合并规则。
- 配置 Gist 同步后，手动同步应有成功/失败反馈。
- 云端和本地同时变更后，同步不应让较新的记录、笔记或 AI 会话被旧数据覆盖。

### 9. 响应式与可访问性

- 桌面宽度下检查概览、题库、练习、薄弱点、导入、出题、题目详情。
- 移动宽度下检查题目详情、笔记抽屉、设置页、导入页。
- 生产预览下确认 PWA manifest 与 Service Worker 正常生成，离线可用 / 新版本提示不遮挡主操作。
- `bun run check:pwa` 应在 `bun run build` 后确认 manifest、Service Worker、Workbox、图标资源和内置题库 JSON 预缓存正常。
- `bun run check:docs` 应确认 README/docs 本地链接、`.env.example`、License 和截图资源都存在且截图文件有效。
- `bun run check:quality-gate` 应确认 `check:all` 包含完整子门禁，且发版脚本和文档门禁列表没有漏掉关键检查。
- 所有主要按钮文字不应溢出或重叠。
- 可点击图标应有可理解的 `aria-label` 或 title。
- 键盘 Tab 焦点应可见，弹层关闭后不应卡住页面。

## 通过标准

- 质量门禁全部通过。
- 核心路径没有阻断性问题。
- 任何数据导入、导出、同步问题必须在 1.0 前修复或明确标注为已知风险。
- README、截图、版本号和实际功能保持一致。
