# iFace 1.1.1 Smoke Result

> 状态：正式验收记录。这里记录 1.1.1 发版前的自动门禁、外部服务 smoke、浏览器抽样和数据安全证据。

## 环境

- 日期：2026-05-06
- 应用版本：`1.4.2`
- 生产预览：`http://127.0.0.1:4173`
- 浏览器验证：Playwright CLI
- 外部服务验证：真实 AI Key、真实 GitHub Gist Token，记录文件不包含密钥

## 自动门禁

已通过：

```bash
bun run check:all
```

覆盖结果：

- `bun run check`：通过，Biome 未报错。
- `bun run check:version`：通过，`package.json`、README 徽章、Roadmap、Smoke 记录和设置页版本展示一致。
- `bun run check:release`：通过，当前 `1.1.1` 与 `package.json` 一致；发版审计、Smoke 记录、外部服务证据和 Release notes 均为正式状态。
- `bun run check:quality-gate`：通过，`check:all` 子门禁顺序、发版脚本和文档门禁列表检查正常。
- `bun run check:docs`：通过，README/docs 本地链接、`.env.example`、`LICENSE`、README 预览截图 PNG / WebP 资源正常。
- `bun run check:external-records`：通过，外部 smoke JSON 结构、应用版本、7 天时效、关键 evidence 和密钥字段扫描正常。
- `bun run check:backup`：通过，覆盖本地备份 v3 fixture、旧备份来源 / 分类推导、自定义分类合并、重点题标记、内置分类过滤、AI 会话计数和错误输入拒绝。
- `bun run check:questions`：通过，865 道题、19 个 JSON 文件；内置题库 registry、public 题库文件和默认分类模块一致。
- `bun run check:sync`：通过，覆盖 Gist v1-v6 解析、未来版本拒绝、双端合并规则、v6 写入 payload 和 mock GitHub API 查找 / 创建 / 更新 / 读取 / 删除路径。
- `bun run check:ai`：通过，覆盖模型预设、默认 Prompt、作答反馈上下文、复盘笔记 Markdown、mock 请求体、API 错误解析和 SSE 流式解析。
- `bun run build`：通过，PWA 生成 `dist/sw.js` 和 `dist/manifest.webmanifest`。
- `bun run check:pwa`：通过，生产构建后的 manifest、Service Worker、Workbox、图标资源和内置题库 JSON 预缓存正常。

构建警告：

- 无。

## 外部服务 Smoke

已通过：

```bash
bun run smoke:external:ai
bun run smoke:external:gist
```

证据：

- `docs/external-ai-smoke-result.json`
  - `packageVersion` 为 `1.1.1`
  - `targets.ai=true`
  - 包含 `ai.chat`：真实流式对话返回模型、接口域名、响应长度和 streamed 长度
  - 包含 `ai.feedback`：真实作答反馈返回模型、接口域名、反馈长度、streamed 长度和复盘笔记长度
- `docs/external-gist-smoke-result.json`
  - `packageVersion` 为 `1.1.1`
  - `targets.gist=true`
  - 包含 `gist.read`：真实临时私有 Gist 读取到 v6 备份、题目笔记、重点题、AI 会话和自定义题
  - 包含 `gist.update`：真实 PATCH 后读取到 v6 备份和新增自定义来源
  - 包含 `gist.cleanup`：临时 Gist 删除成功

## 浏览器验证

已验证：

- PWA manifest 存在：`/manifest.webmanifest`。
- Service Worker 注册成功并处于 active 状态。
- PWA 离线可用提示会自动消失，不会常驻遮挡主界面。
- 首页「总体进度 / 模块进度」位于「下一步建议 / 最近笔记」之前；桌面端两张学习辅助卡片同排展示。
- 首页在 390px 移动宽度下学习辅助卡片自然折为单列，无横向溢出。
- 题目详情顶部「重点题 / 笔记」入口已弱化为仅图标按钮，并保留可理解的 aria 标签。
- 题目详情作答区语音输入已弱化为仅图标按钮。
- 参考答案右上角展示 AI、讲解题目、讲解知识点三个图标入口；点击讲解题目可打开 AI 抽屉。
- AI 助手单条消息支持复制；AI 回复支持重试回答，重试时会回滚到对应用户提问前的上下文。
- AI 助手抽屉清空按钮语义明确为「清空当前题目 AI 会话」，只清理当前题目的对话。
- 设置页数据管理 tab 展示题目、学习记录、题目笔记、重点题、AI 会话统计。
- 设置页数据统计在 390px 移动宽度下变为两列，无横向溢出。
- 题目详情、笔记抽屉、设置面板在 390px 和 414px 移动宽度下无横向溢出。
- 题目详情可标记 / 取消重点题；题库列表可通过「只看重点题」筛选重点题。
- 笔记抽屉可通过右上角「笔记」按钮打开，通过 `Esc` 关闭。
- 笔记抽屉可通过 `N` 打开 / 关闭；进入编辑框后不会抢占普通文本输入。
- 设置面板四个 tab 在 390px 和 414px 移动宽度下切换正常，`Esc` 可关闭面板。
- 设置面板和笔记抽屉已补充 `dialog` 语义与可理解的关闭按钮标签。
- 浏览器控制台无 error / warning；仅有 React DevTools info 和浏览器 password input verbose 提示。
- 导入页在 390px 移动宽度下上传 `scripts/fixtures/smoke-invalid-question.json`：
  - 展示「导入失败，没有有效题目」。
  - IndexedDB 题目数保持不变，未写入 smoke 来源题目。
- 导入页在 390px 移动宽度下上传 `scripts/fixtures/smoke-valid-question.json`：
  - 展示「成功导入 1 道题」。
  - IndexedDB 新增 1 道来源为 `smoke-valid-question` 的题目。
  - `custom_sources` 正确记录 `smoke-valid-question`，来源管理链路可继续删除 / 维护该来源。
  - 页面宽度保持 `bodyWidth=390`、`viewportWidth=390`，无横向溢出。
- 导入页内置题库卡片在 390px 移动宽度下验证通过：
  - 清空本地 IndexedDB 后展示「加载内置题库」。
  - 首次加载写入 865 道内置题。
  - `builtin_questions_version` 写入 `0.11.0`。
  - `loaded_modules` 写入 19 个内置题库文件，避免并行加载时元数据缺失。
  - 重刷内置题库后仍保持 865 道内置题。
  - 页面宽度保持 `bodyWidth=390`、`viewportWidth=390`，无横向溢出。
- 生产预览桌面路由扫过 `/`、`/questions`、`/practice`、`/weak`、`/import`、`/prompt` 和 `/questions/js-001`，均无水平溢出；概览、题库、练习、薄弱点、导入、出题之间的顶部 tab 位置保持一致。
- 生产预览补充复测 2 题练习会话：`/practice?ids=js-001,js-002` 进入题目页，参考答案可展开；标记掌握后出现「本轮完成」总结、「重练 1 题」、「调整练习」和「回概览」入口，过程无水平溢出。
- README 四张预览图已从当前生产预览重新截图：
  - `docs/screenshots/dashboard.png`
  - `docs/screenshots/practice.png`
  - `docs/screenshots/question-detail.png`
  - `docs/screenshots/settings.png`

## 数据安全验证

已验证：

- 本地导出 JSON 包含题库、学习记录、题目笔记、重点题、AI 会话。
- 本地导出 JSON 不包含 API Key。
- 导入 JSON 会先展示预览，不会在选择文件后立即写入。
- 导入预览展示新增 / 覆盖影响。
- 设置页在 390px 移动宽度下导入 `scripts/fixtures/smoke-backup.json`：
  - 预览阶段未写入 smoke 题目、学习记录、题目笔记、重点题和 AI 会话。
  - 点击「确认导入」后恢复 1 道题、1 条学习记录、1 条题目笔记、1 个重点题和 1 个 AI 会话。
  - `custom_sources` 恢复 `smoke-backup`，自定义分类恢复 `Smoke Backup` 模块。
  - 导入后 `iface_ai_config.apiKey` 仍为空，备份不会写入 API Key。
  - 设置面板保持 `bodyWidth=390`、`viewportWidth=390`，无横向溢出。
- 本地备份格式升级到 `formatVersion: 3`，导出 / 导入覆盖自定义来源、自定义分类和重点题标记。
- `check:backup` 覆盖本地备份解析、旧备份兼容推导、分类合并、重点题标记和错误输入拒绝，避免导入解析只依赖设置页人工路径。
- 自定义题库导入兼容 README 示例：`id` 可缺省并生成稳定 ID，`tags` 可缺省并补为空数组。
- 自定义 JSON 题目导入会登记来源，避免题目已写入但来源管理列表缺失。
- 内置题库并行加载后会一次性补齐 `loaded_modules` 元数据，避免并发读写丢失部分文件记录。
- AI 请求层可通过 mock 流验证 URL、请求体、API 错误解析和流式返回；流式解析可处理同一条 SSE `data:` 被拆到多个网络 chunk 的情况，避免丢失局部回复。
- `check:external` 使用真实 AI 和 GitHub Gist 外部 smoke：AI 部分验证真实流式对话、作答反馈和复盘笔记生成；Gist 部分创建临时私有 Gist，验证读取 / 更新后删除，避免触碰正式 `iface-backup.json`。
- AI 反馈保存为笔记的 Markdown 格式已纳入 `check:ai`；保存成功后按钮保持「已保存」状态，避免同一条反馈被误重复追加。
- 版本一致性已纳入 `check:version`，覆盖 `package.json`、README 徽章、Roadmap、Smoke 记录和设置页 `__APP_VERSION__` 展示链路。
- 发版防误发已纳入 `check:release`，避免目标 Tag 与应用内版本不一致，或在 1.0 外部验证证据缺失 / 过期时误发正式版。
- `check:sync` 覆盖旧版本 Gist 备份解析、未来版本拒绝、记录 / 笔记 / 重点题 / AI 会话合并规则、v6 写入 payload，以及 mock GitHub API 查找、创建、更新、读取、删除和错误信息解析。

## 当前结论

自动门禁、真实外部服务 smoke、浏览器抽样和数据安全验证均已通过，当前状态可作为 iFace 1.1.1 正式发布候选。
