# 题库开放计划（iFace 2.0）

> 状态：方案已定，按阶段实施。分支 `feat/bank-market`。P0（格式规范、校验器、JSON Schema、`llms.txt`）已完成。
> 兼容代码统一在 2027-06-30 后删除（见「兼容与迁移」）。

## 目标

把「题库」从写死在应用里的几个分类，变成**任何人都能发布、任何人都能安装的题库包**：

- 题库包是一个公开 GitHub 仓库：根目录放 `iface-bank.json`，打上 topic `iface-bank`，就会出现在 iFace 的题库市场里。不需要中心仓库，也不需要我们审核 PR。
- 官方题库（前端 / Golang / AI Agent / Java）也改成同样格式的题库包，随应用打包，默认安装，可以停用或卸载。
- 粘贴导入、AI 出题生成的题目归入「本地题库」，可以导出成题库包发布出去。
- 对 AI Agent 友好：格式有 JSON Schema、`llms.txt`、仓库模板里的 `AGENTS.md`、一键复制的 Agent 提示词和校验命令。让 Claude Code / Codex / Cursor 帮你做一个题库，应该是一句话的事。

不做的事：账号体系、评分评论、服务端存储题库内容。题库内容永远在作者自己的仓库里。

## 核心概念

| 概念 | 说明 |
|---|---|
| 题库（Bank） | 一组模块和题目，有名称、作者、版本、协议。安装、停用、更新、卸载都以题库为单位 |
| 模块（Module） | 题库下的分组，比如「Go基础」。替代现在的「分类 → 模块」两层结构里的模块 |
| 题目（Question） | 和现在一样：题干、答案（Markdown）、难度 1–3、标签，可选学习检验 |
| 来源（Origin） | 题库从哪来：`bundled`（随应用打包的官方题库）、`github`、`url`、`local` |

「分类」概念整体删除，由「题库」取代。侧栏、筛选、概览、练习、引导里的分类都改成题库。

## ID 规则

所有 ID 全局唯一、可读、URL 安全（只用 `a-z0-9 . - _ :` 和 `/` 出现在查询参数里时会被编码）。

| 对象 | 格式 | 例子 |
|---|---|---|
| 官方题库 | `iface.<name>` | `iface.frontend` |
| GitHub 题库 | `gh.<owner>.<repo>`（小写） | `gh.dogxi.go-interview` |
| 链接题库 | `url.<sha256 前 10 位>` | `url.3f9a1c07be` |
| 本地题库 | `local.<slug>-<4 位随机>` | `local.my-notes-k3x9` |
| 题目 | `<bankId>:<题目 id>` | `iface.frontend:js-001` |
| 模块 | `<bankId>/<模块 id>` | `iface.frontend/js` |

- GitHub owner 不能含 `.`，所以 `gh.` 后第一个 `.` 之前一定是 owner，后面整段是 repo，可以无歧义地还原。
- 包内题目 id 和模块 id 必须匹配 `^[a-z0-9][a-z0-9._-]{0,63}$`（大写会被拒绝，避免大小写冲突），不能含 `:`。
- 题库更新时，题目 id 不变，学习记录、笔记、划线、星标就都跟着走。题目 id 是作者对用户的承诺，规范里写明「不要重新编号」。
- 题目页 URL 变成 `/questions/iface.frontend:js-001`。旧链接 `/questions/js-001` 由兼容层重定向。

## 题库包格式 `iface-bank@1`

一个仓库一个题库。最简形式只要一个文件：

```json
{
  "$schema": "https://face.dogxi.me/schema/iface-bank-1.json",
  "format": "iface-bank@1",
  "name": "Go 后端面试题",
  "description": "Go 语言、并发、GC 和工程实践高频题",
  "version": "1.0.0",
  "license": "CC-BY-4.0",
  "authors": ["dogxi"],
  "language": "zh-CN",
  "tags": ["go", "backend"],
  "modules": [
    {
      "id": "basics",
      "name": "Go基础",
      "description": "语法、类型系统和常见陷阱",
      "questions": [
        {
          "id": "basics-001",
          "difficulty": 1,
          "question": "slice 和数组有什么区别？",
          "answer": "## 区别\n\n...",
          "tags": ["slice"]
        }
      ]
    }
  ]
}
```

题目多了可以拆文件：模块的 `questions` 写成相对路径，指向 JSON 数组或 Markdown 文件。

```json
{ "id": "basics", "name": "Go基础", "questions": "questions/basics.md" }
```

Markdown 题目文件每题以 `<!-- id: ...; difficulty: ... -->` 开头，下一行 `# 题目`，之后是答案（细节见 [bank-format.md](bank-format.md)）。注释在 GitHub 上不显示，读起来就是一篇普通文档。

### 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `format` | 是 | 固定 `iface-bank@1`。以后有不兼容变化才升到 `@2` |
| `name` | 是 | 1–40 字 |
| `description` | 否 | ≤ 200 字，市场卡片上显示 |
| `version` | 是 | semver。改了内容就提版本号，用户那边才会看到「有更新」 |
| `license` | 是 | SPDX 标识，比如 `CC-BY-4.0`、`MIT`。不知道就写 `NOASSERTION`，市场里会标出来 |
| `authors` | 否 | 字符串数组 |
| `language` | 否 | 默认 `zh-CN` |
| `tags` | 否 | 用于市场搜索，≤ 10 个 |
| `homepage` | 否 | https 链接 |
| `modules[].id` / `name` | 是 | 见 ID 规则；`name` ≤ 20 字 |
| `modules[].description` | 否 | |
| `modules[].icon` | 否 | 图标名，限定在应用提供的一组 lucide 图标里，不认识的忽略 |
| `modules[].color` | 否 | `blue` `violet` `pink` `rose` `orange` `amber` `green` `teal` `cyan` 之一，不填按名称哈希 |
| `modules[].questions` | 是 | 题目数组，或相对路径（`.json` / `.md`） |
| `question.id` | 是 | 见 ID 规则 |
| `question.difficulty` | 是 | 1 初级 / 2 中级 / 3 高级 |
| `question.question` | 是 | 纯文本或 Markdown，≤ 2000 字（官方题里有附代码的题目） |
| `question.answer` | 是 | Markdown，≤ 50,000 字 |
| `question.tags` | 否 | |
| `question.source` | 否 | 出处标签，如「高频」「字节跳动」 |
| `question.checks` | 否 | 学习检验题，格式与现有学习检验一致（单选 / 多选 + 解析） |

未知字段忽略（向前兼容）。

### 限制

- 整个题库（清单 + 所有题目文件）≤ 5 MB，≤ 3000 题，≤ 50 个文件。
- 相对路径不能以 `/` 开头，不能含 `..`，只允许 `.json` 和 `.md`。
- 校验失败的题目跳过并列出原因；清单本身无效则整个题库无法安装。

## 发现：GitHub topic

市场列表就是 GitHub 搜索 `topic:iface-bank fork:false archived:false` 的结果。

新增 Vercel 函数 `api/market.js`：

- `GET /api/market?q=&sort=stars|updated&page=`：服务端用只读 token（环境变量 `GITHUB_MARKET_TOKEN`，fine-grained、无任何仓库权限即可）调用 GitHub 搜索，返回精简后的列表（仓库、简介、Star、更新时间、作者头像、协议、topics）。响应 `Cache-Control: s-maxage=600, stale-while-revalidate=86400`，绝大多数请求命中 CDN 缓存，碰不到 GitHub 的频率限制。
- `GET /api/market?repo=owner/repo`：返回该仓库默认分支最新 commit SHA 和清单摘要（名称、版本、题目数、模块、校验结果），同样缓存 10 分钟。
- `GET /api/market?file=owner/repo@<40 位 sha>/<path>`：按 commit 下载题库文件。sha 固定所以内容不可变，缓存一年。只允许 `.json` / `.md`、≤ 5 MB。国内能访问 iFace 就能装题库，不依赖直连 GitHub。
- 函数不存储任何东西，不记录用户信息。

客户端降级顺序：自己的 `api/market` → 直连 `api.github.com` + `raw.githubusercontent.com` → `cdn.jsdelivr.net`。自部署没配 token 时也能用，只是更容易碰到频率限制（每 IP 每分钟 10 次搜索）。

### 治理

没有审核，靠这几条兜底：

- 排序默认按 Star；没有合法 `iface-bank.json` 的仓库不显示。
- `public/market/curation.json`（在本仓库，随网站发布）：`featured`（精选，显示在最前）和 `blocked`（屏蔽，附原因，用于处理侵权和垃圾内容）。
- 市场里所有第三方题库标「社区题库」，安装前展示作者、协议、题目数、模块、3 道题预览。
- 安全：Markdown 本来就不渲染原始 HTML、过滤危险链接。社区题库里的外链图片默认不加载，显示「外部图片，点击加载」，避免第三方追踪。

## 安装、更新、卸载

- 安装入口：市场一键安装、输入 `owner/repo` 或 GitHub 链接、输入清单 URL、上传 `iface-bank.json`（或包含它的 zip）。
- 分享链接：`https://face.dogxi.me/market/gh/<owner>/<repo>` 打开就是该题库的详情和安装按钮。作者可以在 README 里放「Add to iFace」徽章。
- 安装时记录 commit SHA 和版本号。应用每天最多检查一次更新（打开市场页时立即检查）。
- 更新前展示差异：新增 N 题、修改 N 题、移除 N 题（移除的题目上有学习记录或笔记时单独提示）。确认后在一个事务里替换。
- 「停用」：题库保留，所有页面不显示它的题目，学习数据不动。取代现在的「隐藏分类」。
- 「卸载」：删除题目和这些题目上的学习数据，确认框写明会删多少条记录和笔记。
- 官方题库也能停用和卸载；卸载后可在市场「官方」分组里重新安装（从应用内置文件安装，不联网）。

## 存储（IndexedDB v9）

新增 `banks` store（keyPath `id`）：

```ts
interface InstalledBank {
  id: string
  origin:
    | { kind: 'bundled'; path: string }
    | { kind: 'github'; owner: string; repo: string; sha: string }
    | { kind: 'url'; url: string }
    | { kind: 'local' }
  name: string
  description?: string
  version: string
  license: string
  authors: string[]
  modules: { key: string; id: string; name: string; description?: string; icon?: string; color?: string; count: number }[]
  questionCount: number
  enabled: boolean
  order: number
  installedAt: number
  updatedAt: number
  checkedAt?: number
  latest?: { version: string; sha?: string } // 检查到的新版本
}
```

`questions` store 的记录改为：

```ts
interface Question {
  id: string        // iface.frontend:js-001
  bankId: string    // iface.frontend
  moduleKey: string // iface.frontend/js
  module: string    // 显示名「JS基础」
  difficulty: 1 | 2 | 3
  question: string
  answer: string
  tags: string[]
}
```

新增索引 `bankId`、`moduleKey`。学习检验存进新的 `learning_checks` store（keyPath `questionId`），官方学习检验也从 `public/learning-checks/` 迁进官方题库包。

删除：`CategoryMap` 及其 meta、`customSources`、`loadedModules`、`BUILTIN_QUESTIONS_VERSION` meta、内置题替换迁移、`BUILTIN_MODULES` / `BUILTIN_MODULE_CATEGORY` 常量、localStorage `iface_hidden_categories`。模块颜色和图标改为读题库清单，官方题库在清单里写明现在手挑的颜色。

## 官方题库

- 内容搬到 `banks/official/<name>/`（源文件，Markdown 优先，方便审阅），构建脚本生成 `public/banks/iface.<name>.json`（单文件，合并题目和学习检验），随 PWA 预缓存。
- 官方题库就是格式的参考实现，`scripts/checkQuestions.ts` 改成用同一套校验器校验它们。
- 应用版本更新带来新的官方题库版本时，自动按「更新」流程处理（不弹确认，只有在会删除带学习数据的题目时才提示）。

## 本地题库

- 导入页改为「本地题库」：粘贴 JSON / Markdown、上传文件，选择导入到已有本地题库或新建一个。旧的平铺题目数组仍然接受，自动包成本地题库。
- AI 出题页的结果直接存进本地题库。
- 本地题库可以「导出为题库包」：下载 `iface-bank.json`，附带一份发布到 GitHub 的三步说明。

## 备份与同步

- 备份 v9：记录已安装题库列表（来源 + 版本 + SHA + 启用状态），GitHub / 官方题库只存引用不存内容，本地题库存完整内容。恢复时自动重新安装引用的题库（装不上的列出来，学习数据照样保留，题库装回来后自动对上）。
- Gist 同步：写到新文件 `iface-sync-v4.json`，内容同上。旧文件 `iface-sync.json` 不再写入，只在首次同步时读一次做迁移，这样还没升级的设备不会读到看不懂的新格式，旧设备之间照常互相同步。

## Agent 友好

1. **规范可被机器读取**
   - `public/schema/iface-bank-1.json`：由 zod schema 用 `z.toJSONSchema` 生成，构建时校验与源码一致。清单里写 `$schema` 后编辑器和 Agent 都能直接校验和补全。
   - `public/llms.txt`：说明 iFace 是什么、题库格式、ID 规则、发布步骤、校验命令，并链接 schema 和完整规范 `docs/bank-format.md`。
2. **仓库模板**（`templates/bank/`，`npx iface-bank init` 生成）
   - `iface-bank.json`、`questions/example.md`
   - `AGENTS.md`：给 Agent 的写作规范（题目 id 规则和「永不重新编号」、答案结构建议、难度标准、禁止外链图片、每次改动后跑校验、提版本号）。`CLAUDE.md` 只写一行引用 `AGENTS.md`
   - `.github/workflows/validate.yml`：推送和 PR 时自动校验
   - `README.md`：带「Add to iFace」徽章
3. **命令行 `iface-bank`**（npm 包，零依赖，复用应用里的校验器）
   - `npx iface-bank init`：生成模板
   - `npx iface-bank validate`：完整校验，输出机器可读的 `--json` 结果，Agent 可以据此自我修正
   - `npx iface-bank pack`：把多文件题库打成单文件（给上传安装用）
   - `npx iface-bank stats`：题数、难度分布、模块分布
4. **应用内的 Agent 入口**
   - 市场「发布」页：一键复制给 Agent 的提示词（填入主题、题量、难度分布后生成），内容是「按 https://face.dogxi.me/llms.txt 在当前目录创建 iFace 题库……完成后运行 `npx iface-bank validate` 直到通过，再给仓库加 topic `iface-bank`」。
   - AI 出题页增加「交给 Agent」模式：生成同类提示词，而不是在浏览器里直接调用模型。

## 兼容与迁移

所有兼容代码放在 `src/compat/legacy15/`，每个文件头部写 `// COMPAT: remove after 2027-06-30`。新增 `scripts/checkCompatExpiry.ts` 加入 `check:all`：过了日期还存在这个目录就失败，强制按时删除。

兼容层只做这几件事：

1. **IndexedDB v8 → v9 迁移**（打开数据库时一次性执行，先在 meta 里存一份迁移前快照的统计）
   - 内置题 `js-001` → `iface.frontend:js-001`（按旧的「文件 → 分类」表映射）
   - 导入题 `custom_<source>_<id>` → 每个 source 建一个本地题库 `local.<slug>-xxxx`，题目 id 规范化后挂进去
   - 学习记录、笔记、笔记图片、划线、自定义答案、星标、模拟面试推荐题、每日推荐全部按映射改 key；同一目标出现重复时按 `lastUpdated` 合并（复用现有合并逻辑）
   - `iface_hidden_categories` → 对应官方题库 `enabled: false`
2. **旧备份导入**（备份版本 ≤ 8）：先按同一映射转换再导入
3. **旧 Gist 文件读取**：首次同步时读 `iface-sync.json`，转换后合并
4. **旧链接重定向**：`/questions/<旧 id>` → 新 id；`/questions?module=<旧模块名>` → 新 `moduleKey`

迁移写成纯函数（输入旧数据，输出新数据），配完整单元测试；e2e 用 1.5 格式的数据预置 IndexedDB，验证升级后进度、笔记、星标都还在。

## 界面

- 侧栏新增「题库市场」。题库页左侧分组从「分类」改为「题库 → 模块」。
- `/market`：
  - **发现**：搜索、按 Star / 最近更新排序、精选置顶、官方分组
  - **已安装**：拖动排序、启用 / 停用、检查更新、更新、卸载、查看来源
  - **发布**：导出本地题库、Agent 提示词、三步发布说明
- `/market/gh/:owner/:repo`、`/market/url?src=`：题库详情（介绍、协议、模块和题数、难度分布、题目预览、安装 / 更新按钮）。
- 新手引导的「选择题库」步骤改为勾选官方题库，并提示可以去市场找更多。
- 设置「数据」里的分类管理删除，指向市场「已安装」。

## 实施阶段

每个阶段单独提交、单独可验证，全部完成后发布 2.0.0（数据格式变了，用大版本号提醒）。

| 阶段 | 内容 | 验证 |
|---|---|---|
| P0 规范 | 题库包 zod schema、校验器（JSON + Markdown 题目文件）、JSON Schema 生成、`docs/bank-format.md`、`llms.txt` | 单元测试覆盖所有字段和限制 |
| P1 数据层 | IndexedDB v9、`banks` store、新 ID、官方题库改造和构建脚本、`compat/legacy15` 迁移、删除分类体系，全站改用题库 / moduleKey | 迁移单元测试；e2e 预置 1.5 数据升级 |
| P2 安装 | 从 GitHub / URL / 文件安装、更新差异、停用、卸载、本地题库、导出、备份 v9、Gist v4 | 单元测试 + e2e（用 Playwright 拦截网络模拟仓库） |
| P3 市场 | `api/market.js`、`curation.json`、市场页、详情页、分享链接、外链图片拦截 | 函数单元测试；e2e 模拟接口 |
| P4 Agent 工具 | `templates/bank/`、`iface-bank` CLI、发布页 Agent 提示词、AI 出题「交给 Agent」 | CLI 测试；用模板生成一个示例题库跑通校验 |
| P5 收尾 | 文档、发布说明、截图、smoke 清单、兼容到期检查 | `check:all` |

## 需要维护者在仓库外操作的事

- Vercel 环境变量加 `GITHUB_MARKET_TOKEN`（fine-grained token，不勾任何仓库权限，只用于提高搜索频率上限）。
- npm 发布 `iface-bank`：需要一个 npm token 放进 GitHub Actions secret，发布流程由 workflow 完成。
- 把官方题库也发到 GitHub 并打 topic（可选，用来给市场「打样」，内容由本仓库构建脚本同步）。
