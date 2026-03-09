<div align="center">

# iFace

**前端面试题库 · 智能刷题工具**

[立即体验](https://i-face.vercel.app) · [报告问题](https://github.com/dogxii/iFace/issues) · [功能建议](https://github.com/dogxii/iFace/issues)

![Version](https://img.shields.io/badge/version-0.8.0-6366f1?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-10b981?style=flat-square)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript)

</div>

---

## 截图

> 📸 截图待补充

<!-- 建议截图尺寸：1280×800，放入 docs/screenshots/ 目录 -->
<!--
<div align="center">
  <img src="docs/screenshots/dashboard.png" alt="概览页" width="49%" />
  <img src="docs/screenshots/practice.png" alt="练习页" width="49%" />
  <br/><br/>
  <img src="docs/screenshots/question-detail.png" alt="题目详情 + AI 助手" width="49%" />
  <img src="docs/screenshots/settings.png" alt="设置面板" width="49%" />
</div>
-->

---

## 简介

iFace 是一款专为前端工程师备战技术面试打造的本地刷题工具。题库、进度、AI 对话全部存储在浏览器本地，无需注册、无需服务器，打开即用。

**核心理念：** 不只是背题，而是真正理解——通过 AI 教练辅助、进度追踪和薄弱点分析，帮助你在面试中清晰表达。

---

## 功能特性

### 📚 题库管理

- 内置前端高频面试题，覆盖 JS 基础、React、CSS、网络、手写题等模块
- 支持导入自定义 JSON 题库，也可通过 AI 出题 Prompt 批量生成
- 三级难度标注（初级 / 中级 / 高级），支持按模块、难度、状态筛选

### 🎯 智能刷题

- 学习状态追踪：未学习 / 待复习 / 已掌握
- 今日推荐：自动优先推送待复习题目，其次未学习高频题
- 连刷记录：每日作答计数、连击天数、历史最高记录
- 专项练习：自由组合模块 × 难度 × 状态，支持随机顺序

### 🤖 AI 面试教练

- 接入任意兼容 OpenAI API 的模型（GPT、Claude、DeepSeek、Qwen 等）
- 快捷动作：分析考点 / 答题结构 / 优化答案 / 追问预测 / 踩坑提醒 / 模拟面试
- 流式输出，手动上划时自动暂停跟随滚动
- 支持自定义 System Prompt，内置高质量前端面试教练默认 prompt

### 📊 数据与进度

- 模块进度环形图 + 分项进度条，一眼看清短板
- 薄弱点分析：按复习频次聚合，聚焦最需强化的知识点
- 数据全量导出 / 导入（JSON 备份），支持多设备迁移
- 所有数据存储在浏览器 IndexedDB，完全离线可用

---

## 快速开始

### 前置要求

- Node.js ≥ 18 或 [Bun](https://bun.sh)
- （可选）[GitHub CLI](https://cli.github.com) — 用于发版脚本

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/dogxii/iFace.git
cd iFace

# 安装依赖（推荐 bun，也可用 npm/pnpm）
bun install

# 启动开发服务器
bun dev
```

访问 [http://localhost:5173](http://localhost:5173)

### 构建生产版本

```bash
bun run build
bun run preview
```

---

## 使用指南

### 导入题库

1. 进入「**导入**」页面
2. 点击「加载内置题库」即可使用开箱即用的题目
3. 或上传自己的 JSON 文件（格式见下方）

<details>
<summary>自定义题库 JSON 格式</summary>

```json
[
  {
    "question": "请解释 JavaScript 中的事件循环机制",
    "answer": "事件循环是 JS 处理异步操作的核心机制...",
    "module": "JS基础",
    "difficulty": 2,
    "tags": ["异步", "事件循环", "宏任务", "微任务"]
  }
]
```

| 字段         | 类型        | 必填 | 说明                           |
| ------------ | ----------- | ---- | ------------------------------ |
| `question`   | string      | ✅   | 题目内容                       |
| `answer`     | string      | ✅   | 参考答案（支持 Markdown）      |
| `module`     | string      | ✅   | 所属模块                       |
| `difficulty` | 1 \| 2 \| 3 | ✅   | 难度：1 初级 / 2 中级 / 3 高级 |
| `tags`       | string[]    | —    | 标签（用于薄弱点聚合）         |

</details>

### 配置 AI 助手

1. 点击右上角**齿轮图标**打开设置
2. 切换到「**AI 助手**」tab
3. 填入 API Key 和 Base URL，选择模型，保存
4. 在任意题目详情页即可开始与 AI 对话

> API Key 仅存储在本地浏览器，不会上传到任何服务器。

---

## 发版

项目内置发版脚本，一条命令完成构建 → 打 Tag → 推送 → 创建 GitHub Release：

```bash
# 使用 package.json 中的版本号发版
bash scripts/release.sh

# 指定版本号
bash scripts/release.sh 1.0.0

# 预览，不实际执行
bash scripts/release.sh --dry-run
```

发版前请确保已通过 `gh auth login` 登录 GitHub CLI。

---

## 技术栈

| 类别     | 技术                              |
| -------- | --------------------------------- |
| 框架     | React 19 + TypeScript 5.9         |
| 构建     | Vite 7 + Tailwind CSS v4          |
| 路由     | React Router v7                   |
| 存储     | IndexedDB（idb）+ localStorage    |
| Markdown | react-markdown + rehype-highlight |
| 代码规范 | Biome                             |
| 部署     | Vercel                            |

---

## 项目结构

```
src/
├── components/
│   ├── layout/       # Navbar、SettingsDrawer
│   └── ui/           # 通用组件、AIPanel
├── pages/            # 各页面（Dashboard、Practice、QuestionDetail 等）
├── store/            # 状态管理（useStudyStore、useAIStore）
├── hooks/            # useQuestions 等
├── lib/              # IndexedDB 操作封装
├── types/            # 全局类型定义
└── data/             # 内置题库数据
```

---

## 贡献

欢迎提交 Issue 和 Pull Request。

提交代码时请遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范：

```
feat: 新增功能描述
fix: 修复问题描述
perf: 性能优化描述
docs: 文档更新描述
```

---

## License

[MIT](LICENSE) © 2025 dogxii
