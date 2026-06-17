<div align="center">

# 😎 iFace

**八股面试题库 · 智能刷题工具**

[立即体验](https://face.dogxi.me) · [报告问题](https://github.com/dogxii/iFace/issues) · [功能建议](https://github.com/dogxii/iFace/issues)

![Version](https://img.shields.io/badge/version-1.4.2-6366f1?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-10b981?style=flat-square)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript)

</div>

---

## 👀 预览

https://face.dogxi.me

<div align="center">
  <img src="docs/screenshots/dashboard.png" alt="概览页" width="49%" />
  <img src="docs/screenshots/practice.png" alt="练习页" width="49%" />
  <br/><br/>
  <img src="docs/screenshots/question-detail.png" alt="题目详情 + AI 助手" width="49%" />
  <img src="docs/screenshots/settings.png" alt="设置面板" width="49%" />
</div>


## 📚 简介

iFace 是一款专为 前端/Agent/Golang 等工程师备战技术面试打造的本地刷题工具。题库、进度、AI 对话全部存储在浏览器本地，无需注册、无需服务器，打开即用。

**核心理念：** 不只是背题，而是真正理解——通过 AI 教练辅助、进度追踪和薄弱点分析，帮助你在面试中清晰表达。


## ⚡️ 功能特性

- 题库管理：内置高频题库，支持自定义导入
- 智能刷题：按模块、难度、状态灵活练习
- AI 面试教练：辅助拆题、复盘、追问和模拟面试
- 数据与进度：本地保存进度，支持导入导出和备份


## 🚀 快速开始

https://face.dogxi.me

线上版本，实时更新，支持 GitHub 登陆备份数据。

## 本地运行

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

## 🧭 使用指南

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

## 📈 项目 Star 历史

<a href="https://www.star-history.com/?repos=dogxii%2Fiface&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=dogxii/iface&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=dogxii/iface&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=dogxii/iface&type=date&legend=top-left" />
 </picture>
</a>

## 💰 赞赏项目

如果觉得这个项目对你有帮助，欢迎请我喝咖啡 ☕️

> 采取自愿原则, 收到的赞赏将用于提高开发者积极性和开发环境。

<div style="display:flex; gap:24px; align-items:center;">
  <img src="https://s2.loli.net/2022/12/29/TtNiqZnwy6ESGjO.jpg" alt="WeChat Pay" width="160" />
  <img src="https://s2.loli.net/2022/12/29/5xk8paK4wGDnAhW.jpg" alt="Alipay" width="160" />
</div>

## 🪪 License

[MIT](LICENSE) © 2026 Dogxi
