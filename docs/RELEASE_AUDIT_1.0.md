# iFace 1.0 Release Audit

> 状态：完成。本文把 1.0.0 目标拆成可核验清单，避免只凭测试通过或实现进度判断可发版。

## 目标

将 iFace 迭代到 `1.0.0` 稳定版：刷题、重点题、笔记、AI 反馈、数据备份几条主链路可日用，且文档、版本号、截图、发布说明与实际功能一致。

## 审计清单

| 要求 | 证据 | 状态 |
| --- | --- | --- |
| `bun run check:all` 通过 | 1.0 发版门禁覆盖 Biome、版本一致性、1.0 发版就绪、本地备份导入兼容、题库质量、Gist 同步兼容 / mock API 读写路径、AI Prompt / 流式解析、生产构建和 PWA 产物 | 已通过 |
| 版本一致性有自动检查 | `bun run check:version` 覆盖 `package.json`、README 徽章、Roadmap、Smoke 记录、Vite `__APP_VERSION__` 注入和设置页展示 | 已通过 |
| 1.0 防误发有自动检查 | `bun run check:release 1.0.0` 要求发版目标与 `package.json` 一致，并校验审计、Smoke 记录、外部服务 smoke 证据和 Release notes 均为正式完成状态 | 已通过 |
| 完整质量门禁有防退化检查 | `bun run check:quality-gate` 校验 `check:all` 子门禁顺序，并确认发版脚本和文档门禁列表没有漏掉关键检查 | 已通过 |
| 题库质量可控 | `bun run check:questions` 校验 865 道题、19 个 JSON 文件，覆盖 schema、重复 ID、重复题干、答案长度、标签数量、内置题库 registry 和默认分类模块一致性 | 已通过 |
| 本地备份导入兼容有自动检查 | `bun run check:backup` 覆盖本地 v3 smoke 备份、旧备份来源 / 分类推导、自定义分类合并、重点题标记、内置分类过滤、AI 会话计数和错误输入拒绝 | 已通过 |
| Gist 合并规则和 API 路径有自动检查 | `bun run check:sync` 覆盖 v1-v6 解析、未来版本拒绝、记录 / 笔记 / 重点题 / AI 会话按更新时间合并、v6 写入 payload、mock Gist 查找 / 创建 / 更新 / 读取 / 删除 / API 错误解析 | 已通过 |
| AI 配置和 Prompt 有自动检查 | `bun run check:ai` 覆盖模型预设、DeepSeek V4、默认 System Prompt、作答反馈上下文、复盘笔记 Markdown、快捷动作、mock 请求体、API 错误解析和 SSE 流式解析 | 已通过 |
| 外部 AI smoke 有真实证据 | `bun run smoke:external:ai` 使用真实 AI Key 验证流式对话、作答反馈和复盘笔记生成，并写入 `docs/external-ai-smoke-result.json`；记录内 `packageVersion` 为 `1.0.0` | 已通过 |
| 外部 Gist smoke 有真实证据 | `bun run smoke:external:gist` 使用真实 Gist Token 创建临时私有 Gist，验证读取 / 更新 / 删除权限，并写入 `docs/external-gist-smoke-result.json`；记录内 `backupVersion` 为 v6，且临时 Gist 已清理 | 已通过 |
| 外部服务证据可安全提交 | `bun run check:external-records` 校验外部 smoke JSON 结构、应用版本、7 天时效、关键 evidence，并扫描 API Key、GitHub Token、Authorization、Bearer 和 `apiKey` 字段 | 已通过 |
| 生产构建可用 | `bun run build` 通过，PWA 生成 `dist/sw.js` 和 `dist/manifest.webmanifest` | 已通过 |
| PWA 产物有自动检查 | `bun run check:pwa` 在生产构建后校验 `dist/manifest.webmanifest`、`dist/sw.js`、Workbox runtime、manifest 字段、图标资源和内置题库 JSON 预缓存 | 已通过 |
| 文档资产可发布 | `bun run check:docs` 覆盖 README/docs 本地链接、`.env.example`、`LICENSE`、README 预览截图 PNG 和 WebP 文件头 / 文件大小 | 已通过 |
| 内置题库首次加载 / 重刷 | Playwright 390px 验证导入页「加载内置题库」从空 IndexedDB 写入 865 道题、`builtin_questions_version=0.11.0`、`loaded_modules=19`，重刷后数量不丢失 | 已通过 |
| 导入页自定义题库兼容 README 示例 | Playwright 验证无 `id` / `tags` 的合法 JSON 可导入，非法顶层对象会被拒绝且写入 0 道题 | 已通过 |
| 桌面核心路由无明显布局错位 | Playwright 生产预览扫过 `/`、`/questions`、`/practice`、`/weak`、`/import`、`/prompt`、`/questions/js-001`，均无水平溢出；核心 tab 导航位置一致 | 已通过 |
| 移动端关键弹层无水平溢出 | 390px 下验证题目详情、笔记抽屉、设置面板，`documentWidth === viewportWidth` | 已通过 |
| 练习会话完成态可用 | Playwright 生产预览复测 `/practice?ids=js-001,js-002`，可进入题目、展开参考答案、标记掌握，并显示本轮总结、重练入口和调整练习入口 | 已通过 |
| PWA 基础能力 | Smoke 已验证 manifest、Service Worker active、更新提示不常驻遮挡界面 | 已通过 |
| 本地数据导出 / 导入安全 | Smoke 和 `check:backup` 验证备份包含题库、学习记录、题目笔记、重点题、AI 会话、自定义来源和自定义分类，不包含 API Key；导入预览阶段不写入，确认后恢复数据 | 已通过 |
| AI 配置和模型预设 | 设置页支持 OpenAI、DeepSeek、DashScope、智谱、自定义兼容接口；自动检查覆盖 DeepSeek V4 预设和旧模型名不再暴露 | 已通过 |
| AI 对话流式输出 | `bun run smoke:external:ai` 使用真实接口验证流式对话；`bun run check:ai` 覆盖 SSE chunk 拆分解析 | 已通过 |
| 作答反馈与保存为笔记 | `bun run smoke:external:ai` 使用真实接口验证作答反馈和复盘笔记生成；`bun run check:ai` 覆盖复盘笔记 Markdown 和重复保存防护 | 已通过 |
| Gist push / pull 数据安全 | `bun run smoke:external:gist` 验证真实 GitHub Gist 权限；`bun run check:sync` 验证本地与云端双端合并不会用旧记录覆盖较新的记录、笔记、重点题或 AI 会话 | 已通过 |
| 版本号一致 | `package.json`、README 徽章、Roadmap、Smoke 记录、Vite 注入版本和设置页展示统一为 `1.0.0` | 已通过 |
| Release notes 可正式发布 | `docs/RELEASE_NOTES_1.0.md` 已切换为正式发布说明，标题包含 `iFace v1.0.0` | 已通过 |

## 当前结论

iFace 1.0.0 的代码、数据格式、外部服务 smoke、文档和发版门禁已经收口。发布前使用 `bash scripts/release.sh 1.0.0` 会再次执行 `check:release 1.0.0` 与 `bun run check:all`，然后创建 Git tag 和 GitHub Release。
