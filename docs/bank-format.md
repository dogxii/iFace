# iFace 题库包格式 `iface-bank@1`

> 给作者和 AI Agent 的完整规范。机器可读的版本是 JSON Schema：
> `https://face.dogxi.me/schema/iface-bank-1.json`（源文件 `public/schema/iface-bank-1.json`，由 `src/data/bank/schema.ts` 生成）。

一个题库包 = 一个公开 GitHub 仓库，根目录有 `iface-bank.json`。给仓库加上 topic `iface-bank`，它就会出现在 iFace 的题库市场里。

## 最小例子

```json
{
  "$schema": "https://face.dogxi.me/schema/iface-bank-1.json",
  "format": "iface-bank@1",
  "name": "Go 后端面试题",
  "version": "1.0.0",
  "license": "CC-BY-4.0",
  "modules": [
    {
      "id": "basics",
      "name": "Go基础",
      "questions": [
        {
          "id": "basics-001",
          "difficulty": 1,
          "question": "slice 和数组有什么区别？",
          "answer": "## 区别\n\n- 数组长度是类型的一部分……",
          "tags": ["slice", "数组"]
        }
      ]
    }
  ]
}
```

## 推荐的仓库结构

题目多的时候，每个模块一个 Markdown 文件，清单只写引用：

```text
iface-bank.json
questions/
  basics.md
  concurrency.md
checks/              # 可选：学习检验
  basics.md
README.md
AGENTS.md            # 可选：给 AI Agent 的写作约定
```

```json
{
  "$schema": "https://face.dogxi.me/schema/iface-bank-1.json",
  "format": "iface-bank@1",
  "name": "Go 后端面试题",
  "description": "Go 语言、并发、GC 和工程实践高频题",
  "version": "1.2.0",
  "license": "CC-BY-4.0",
  "authors": ["your-github-name"],
  "tags": ["go", "backend"],
  "modules": [
    { "id": "basics", "name": "Go基础", "icon": "terminal", "color": "cyan", "questions": "questions/basics.md", "checks": "checks/basics.md" },
    { "id": "concurrency", "name": "并发编程", "icon": "split", "questions": "questions/concurrency.md" }
  ]
}
```

## 清单字段

| 字段 | 必填 | 规则 |
|---|---|---|
| `$schema` | 否 | 建议写上，编辑器和 Agent 能据此校验和补全 |
| `format` | 是 | 固定 `"iface-bank@1"` |
| `name` | 是 | 1–40 字 |
| `description` | 否 | ≤ 200 字，市场卡片上显示 |
| `version` | 是 | semver，例如 `1.0.0`。**内容有任何改动都要提版本号**，用户那边才会收到更新 |
| `license` | 是 | SPDX 标识，如 `CC-BY-4.0`、`CC-BY-SA-4.0`、`MIT`。不确定写 `NOASSERTION`（市场会提示没有声明协议） |
| `authors` | 否 | 字符串数组，≤ 20 个 |
| `language` | 否 | 默认 `zh-CN` |
| `tags` | 否 | ≤ 10 个，每个 ≤ 20 字，用于市场搜索 |
| `homepage` | 否 | `https://` 链接 |
| `modules` | 是 | 1–50 个模块 |

### 模块

| 字段 | 必填 | 规则 |
|---|---|---|
| `id` | 是 | 见「ID 规则」，包内唯一 |
| `name` | 是 | 1–20 字，显示名 |
| `description` | 否 | ≤ 200 字 |
| `icon` | 否 | 下列图标之一，不认识的会被忽略：`atom` `bot` `braces` `brain` `chart-line` `coffee` `cog` `cpu` `database` `database-zap` `file-code` `folder-search` `gauge` `globe` `leaf` `library` `memory-stick` `message-square-text` `network` `palette` `pen-line` `server` `shield` `smartphone` `sparkles` `split` `terminal` `triangle` `workflow` `wrench` |
| `color` | 否 | `blue` `violet` `pink` `rose` `orange` `amber` `green` `teal` `cyan` 之一，不填按名称自动分配 |
| `questions` | 是 | 题目数组；或包内相对路径，指向 `.json`（题目数组）或 `.md`（见下文） |
| `checks` | 否 | 本模块题目的学习检验，包内 `.md` 文件的相对路径（见「学习检验」） |

### 题目

| 字段 | 必填 | 规则 |
|---|---|---|
| `id` | 是 | 见「ID 规则」，**整个题库内唯一** |
| `difficulty` | 是 | `1` 初级 / `2` 中级 / `3` 高级 |
| `question` | 是 | ≤ 2000 字，可以是 Markdown（比如带一段代码） |
| `answer` | 是 | Markdown，≤ 50,000 字 |
| `tags` | 否 | ≤ 10 个，每个 ≤ 30 字 |
| `source` | 否 | 出处标签，如「高频」「字节跳动」，≤ 30 字 |
| `checks` | 否 | 学习检验题，≤ 10 道，见下文 |

未知字段会被忽略，所以加自己的字段不会导致安装失败，但 iFace 也不会用到它们。

## ID 规则

模块 id、题目 id、学习检验 id 都必须匹配：

```text
^[a-z0-9][a-z0-9._-]{0,63}$
```

小写字母、数字和 `.` `_` `-`，以字母或数字开头，最长 64 个字符。推荐 `<模块>-<三位序号>`，如 `basics-001`。

**题目 id 一旦发布就不要改，也不要重新编号。** 用户的学习进度、笔记、划线和星标都挂在题目 id 上。删掉一道题再用它的 id 放另一道题，用户会看到别人题目上的笔记。

在 iFace 里，题目的完整 id 是 `<题库 id>:<题目 id>`，例如 `gh.your-name.go-interview:basics-001`。作者不需要写题库 id，安装时自动加上。

## Markdown 题目文件

每道题以一行元信息注释开头，下一行是一级标题形式的题目，之后到下一道题之前都是答案。两种注释在 GitHub 上都不会显示。

````markdown
# Go 基础（文件开头到第一道题之前的内容会被忽略）

<!-- id: basics-001; difficulty: 1; tags: slice, 数组 -->
# slice 和数组有什么区别？

## 区别

- 数组长度是类型的一部分……

<!-- id: basics-002; difficulty: 2; tags: 字符串; source: 高频 -->
# 以下代码输出什么？

```go
fmt.Println(len("你好"))
```

<!-- answer -->

输出 `6`：`len` 返回字节数……
````

- 元信息用 `;` 或 `|` 分隔，键有 `id`、`difficulty`（`1`/`2`/`3`，也接受 `初级`/`中级`/`高级`）、`tags`（逗号或顿号分隔）、`source`。
- 题目只有一行时，标题之后全部是答案。题目需要多行（例如附代码）时，把多出来的内容写在标题后，用 `<!-- answer -->` 隔开答案。
- 答案里请从二级标题 `##` 开始用，不要用一级标题 `#`。
- 代码块里的内容不会被当成分隔符。

## 学习检验

题目可以附带选择题，用来检验是否真的理解。推荐给模块写一个 Markdown 文件，在模块上用 `checks` 引用：

```json
{ "id": "basics", "name": "Go基础", "questions": "questions/basics.md", "checks": "checks/basics.md" }
```

````markdown
# Go 基础 · 学习检验（第一个 ## 之前的内容会被忽略）

## basics-001

### Q1 single | 数组类型

`[3]int` 和 `[4]int` 是同一种类型吗？

- [ ] A. 是，长度不是类型的一部分
- [x] B. 不是，长度是数组类型的一部分

**解释**：数组长度是类型的一部分，所以两者不能互相赋值。

### Q2 multiple | 切片

关于 slice，哪些说法正确？

- [x] A. 底层引用一个数组
- [x] B. `append` 可能触发扩容
- [ ] C. `len` 永远等于 `cap`

**解释**：扩容时会分配新的底层数组；`len` 小于等于 `cap`。
````

- `## <题目 id>` 指定下面的检验属于哪道题，题目必须在同一个模块里。
- `### Q<序号> single|multiple | <考察点>`：`single` 单选（恰好一个正确项），`multiple` 多选。考察点可省略。
- 选项写成 `- [x] A. 文本`（正确）或 `- [ ] B. 文本`，字母 A–H，2–8 个。
- `**解释**：` 之后到下一道检验之前都是解释。
- 检验 id 自动生成为 `<题目 id>-check-<两位序号>`，所以同一道题里序号不能重复。

也可以直接写在 JSON 题目里（同一道题只能选一种写法）：

```json
{
  "id": "basics-001",
  "difficulty": 1,
  "question": "slice 和数组有什么区别？",
  "answer": "……",
  "checks": [
    {
      "id": "basics-001-c1",
      "kind": "single",
      "prompt": "`[3]int` 和 `[4]int` 是同一种类型吗？",
      "options": [
        { "id": "a", "text": "是，长度不是类型的一部分" },
        { "id": "b", "text": "不是，长度是数组类型的一部分" }
      ],
      "answerIds": ["b"],
      "explanation": "数组长度是类型的一部分，所以两者不能互相赋值。",
      "focus": "数组类型"
    }
  ]
}
```

- 每道题最多 10 道检验；选项 `id` 为 1–8 个小写字母或数字，不能重复；`answerIds` 里的每一项都必须是某个选项的 `id`。

## 限制

| 项目 | 上限 |
|---|---|
| 清单 + 所有题目文件 | 5 MB |
| 题目总数 | 3000 |
| 文件数（含清单） | 50 |
| 模块数 | 50 |

- 文件路径必须是包内相对路径：不能以 `/` 开头，不能包含 `..`，只能是 `.json` 或 `.md`。
- 清单无效、超过限制或没有任何可用题目时，整个题库无法安装。
- 单道题有问题（字段缺失、id 重复等）时，这道题会被跳过，其余照常安装，并在安装界面列出原因。

## 版本与更新

- iFace 安装时记录题库的版本号和 commit。之后会定期检查默认分支上的 `iface-bank.json`，版本号变了就提示更新。
- 更新时，iFace 按题目 id 对比：新增、修改、删除分别列出；删除的题目上如果有用户的学习记录或笔记，会单独提醒。
- 只改了错别字也请提一个补丁版本（`1.2.0` → `1.2.1`）。

## 发布

1. 新建一个**公开**仓库，放入 `iface-bank.json` 和题目文件。
2. 在仓库首页右侧「About」的齿轮里添加 topic `iface-bank`。
3. 几分钟后，题库会出现在 iFace 的「题库市场」。也可以直接分享链接 `https://face.dogxi.me/market/gh/<owner>/<repo>`。

不想公开到市场，也可以不加 topic，只把上面的链接发给别人。

## 内容与安全

- 答案按 Markdown 渲染，不支持原始 HTML，`javascript:` 等危险链接会被过滤。
- 社区题库里的外链图片默认不加载，用户点击后才加载。尽量用文字和代码块表达，必要的图片放在自己仓库里。
- 请只发布你有权分享的内容，并如实填写 `license`。iFace 会处理侵权投诉并在市场中屏蔽相关仓库。

## 写好一道题

- **难度**：`1` 概念、定义、常用 API；`2` 原理、对比、常见场景和坑；`3` 底层实现、设计取舍、复杂场景排查。
- **题目**：像面试官那样问，一句话说清楚，避免「请谈谈你对 X 的理解」这种过宽的问法。
- **答案**：先给结论，再分点展开，最后补充追问方向或常见误区。代码块标注语言。篇幅以能在面试中 2–3 分钟讲完为宜。
- **标签**：2–5 个具体知识点，比如 `GMP`、`逃逸分析`，不要写 `Go`、`面试` 这种所有题都适用的词。
