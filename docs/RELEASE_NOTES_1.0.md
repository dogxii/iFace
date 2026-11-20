# iFace 1.0 Release Notes

> 状态：正式发布说明。版本号、README 徽章、发版审计、Smoke 记录和外部服务证据已统一到 `1.0.0`。

## iFace v1.0.0

iFace 1.0.0 把刷题、重点题、笔记、AI 反馈和数据备份几条主链路稳定到可日用状态。

## 重点变化

### 刷题体验

- 固化三种答题模式：先答题、边看边记、纯记忆。
- 优化 `Space`、`1/2/3`、方向键、`N`、`Esc` 等快捷键冲突处理。
- 支持语音输入作答，带浏览器能力检测、识别状态和错误提示。
- 练习会话支持结束总结、重练未掌握题和继续练习入口。
- 修复桌面端不同 tab 因滚动条出现 / 消失导致的横向偏移。

### 笔记与复盘

- 题目详情支持标记重点题，题库列表支持只看重点题，便于集中复习。
- 题目笔记改为右上角按钮 + 抽屉形态，避免题目页被笔记区撑得过长。
- 支持 `N` 快捷键打开 / 关闭笔记抽屉，编辑区内保留正常文本输入，`Esc` 可随时关闭抽屉。
- 题库列表支持只看有笔记、搜索笔记内容和按最近笔记排序。
- Dashboard 增加最近笔记入口。
- AI 作答反馈可保存为题目复盘笔记；保存成功后会保持已保存状态，避免误重复追加。

### AI 面试教练

- 设置页按服务商组织模型配置，支持 OpenAI、DeepSeek、DashScope、智谱和自定义兼容接口。
- 更新 DeepSeek 配置到 V4 模型，不再默认使用旧 `deepseek-chat` 名称。
- 重构默认 System Prompt、作答反馈 Prompt 和快捷动作 Prompt。
- AI 对话支持流式输出，手动上滑时暂停自动跟随；流式解析可处理 SSE 行被拆分到多个网络 chunk 的情况。
- AI 会话支持本地保存、清空、导出、导入和 Gist 同步。

### 数据安全

- 本地 JSON 备份覆盖题库、学习记录、题目笔记、重点题和 AI 会话，不导出 API Key。
- 导入前展示数据预览和新增 / 覆盖影响，确认后才写入。
- 本地备份格式升级到 v3，覆盖自定义来源、自定义分类和重点题标记；固定 smoke 备份已验证确认后可恢复题库、进度、笔记、重点题、AI 会话、来源和分类且不写入 API Key。
- 新增 `bun run check:backup`，覆盖本地备份解析、旧备份来源 / 分类推导、自定义分类合并、重点题标记、内置分类过滤和错误输入拒绝。
- 自定义 JSON 题目导入会登记来源，来源管理列表可继续删除 / 维护该来源。
- 导入页增加内置题库状态和加载 / 重刷入口，内置题库元数据在并行加载后保持完整。
- Gist 同步升级到 v6 备份格式，支持记录、笔记、重点题和 AI 会话按更新时间合并，避免旧数据覆盖新数据。
- 新增 `bun run check:sync`，覆盖旧版本备份解析、未来版本拒绝、双端合并规则、v6 写入 payload 和 mock GitHub API 读写路径。
- 新增 `bun run check:version`，校验包版本、README 徽章、Roadmap、Smoke 记录和设置页版本展示一致。
- 新增 `bun run check:release`，阻止发版目标版本与 `package.json` 不一致，并在 1.0 审计 / Smoke / 外部服务证据 / 发布说明不符合正式状态时阻止发版。
- 新增 `bun run check:quality-gate`，防止 `check:all`、发版脚本或文档门禁列表漏掉关键子门禁。
- 新增 `bun run check:external`，用真实 AI Key 和 GitHub Gist Token 验证外部 AI 流式接口、作答反馈和临时私有 Gist 创建 / 读取 / 更新 / 删除权限。
- 新增 `bun run smoke:external:ai` 和 `bun run smoke:external:gist`，通过后固定写入 1.0 发版检查读取的外部 smoke 记录路径。
- `check:release 1.0.0` 会校验外部 smoke JSON 证据、记录内的应用版本和 7 天时效，避免只更新文字或复用旧记录。
- 新增 `bun run check:external-records`，在外部 smoke JSON 存在时校验记录结构、应用版本、7 天时效、关键 evidence，并防止误提交 API Key、GitHub Token 或 Authorization 字段。

### 题库与内容

- 题库扩展到前端、Golang、AI Agent 三类内容。
- 新增 `bun run check:questions`，校验题目 schema、ID、模块、难度、标签质量、内置题库 registry 和默认分类模块一致性。
- 新增 `bun run check:ai`，校验模型预设、AI Prompt、作答反馈上下文、复盘笔记格式和流式解析。
- 优化部分题目答案风格，让回答更适合面试口述。

### PWA 与发布体验

- 支持 PWA manifest、Service Worker、离线缓存和新版本刷新提示。
- 新增 `bun run check:pwa`，在生产构建后校验 manifest、Service Worker、Workbox、图标资源和内置题库 JSON 预缓存。
- README 截图更新到当前 UI。
- 新增 `bun run check:docs`，校验 README/docs 本地链接、`.env.example`、License 和截图资源，避免发版文档断链。
- 新增 1.0 Roadmap、Smoke Test 清单和完整质量门禁 `bun run check:all`。
- 发版脚本会先确认命令行版本与 `package.json` 一致，再跑 `bun run check:all`，最后创建 Tag 和 GitHub Release。

## 发版前门禁

正式发布前必须通过：

```bash
bun run check:all
```

它依次覆盖：

- `bun run check`
- `bun run check:version`
- `bun run check:release`
- `bun run check:quality-gate`
- `bun run check:docs`
- `bun run check:external-records`
- `bun run check:backup`
- `bun run check:questions`
- `bun run check:sync`
- `bun run check:ai`
- `bun run build`
- `bun run check:pwa`

外部服务 smoke 证据已生成：

```bash
IFACE_AI_API_KEY=... IFACE_AI_MODEL=... bun run smoke:external:ai
IFACE_GIST_TOKEN=... bun run smoke:external:gist
```

变量名模板见 `.env.example`，真实值只放在本地 shell 或忽略的 `.env` 中。

## 发布验证

- `docs/external-ai-smoke-result.json` 记录真实 AI 流式对话、作答反馈和复盘笔记生成证据。
- `docs/external-gist-smoke-result.json` 记录真实 GitHub Gist 创建、读取、更新和删除证据，临时 Gist 已清理。
- `docs/RELEASE_AUDIT_1.0.md` 记录 1.0 审计结论。
- `docs/SMOKE_RESULT_2026-05-05.md` 记录自动门禁、浏览器抽样和数据安全验证。
