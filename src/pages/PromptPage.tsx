import React, { useCallback, useState } from "react";
import { Badge, Button } from "@/components/ui";

// The 8 built-in frontend modules — used in preset prompts
const BUILTIN_MODULE_VALUES = [
	"JS基础",
	"React",
	"性能优化",
	"网络",
	"CSS",
	"TypeScript",
	"手写题",
	"项目深挖",
];

// All suggestions shown in the CustomBuilder dropdown (builtin + common custom)
const MODULE_SUGGESTIONS = [
	...BUILTIN_MODULE_VALUES,
	"Golang",
	"Java",
	"Python",
	"Rust",
	"Node.js",
	"数据库",
	"算法",
	"系统设计",
	"DevOps",
	"Android",
	"iOS",
];

// ─── MD → JSON converter ─────────────────────────────────────────────────────

/**
 * Parse AI-generated Markdown into a Question JSON array.
 *
 * Expected Markdown block format (one per question):
 * ---
 * ## Q: <question text>
 * **模块**: <module>
 * **难度**: 初级 | 中级 | 高级
 * **标签**: tag1, tag2
 * **来源**: 高频          ← optional
 * **ID**: js-001          ← optional, auto-generated if missing
 *
 * <answer markdown, any content until next --- or end>
 * ---
 */
export function mdToQuestions(md: string): {
	questions: Record<string, unknown>[];
	errors: string[];
} {
	const questions: Record<string, unknown>[] = [];
	const errors: string[] = [];

	// Split on horizontal rules (--- or ***) at start of line
	const blocks = md.split(/\n(?:---|\*\*\*)\n/).map((b) => b.trim()).filter(Boolean);

	const diffMap: Record<string, number> = {
		初级: 1, 入门: 1, easy: 1, "1": 1,
		中级: 2, 中等: 2, medium: 2, "2": 2,
		高级: 3, 进阶: 3, hard: 3, "3": 3,
	};

	const moduleAlias: Record<string, string> = {
		js: "JS基础", javascript: "JS基础", "js基础": "JS基础",
		react: "React",
		css: "CSS",
		ts: "TypeScript", typescript: "TypeScript",
		网络: "网络", network: "网络", http: "网络",
		性能: "性能优化", performance: "性能优化", "性能优化": "性能优化",
		手写: "手写题", algorithm: "手写题", "手写题": "手写题",
		项目: "项目深挖", project: "项目深挖", "项目深挖": "项目深挖",
	};

	const idCounters: Record<string, number> = {};

	for (let bi = 0; bi < blocks.length; bi++) {
		const block = blocks[bi];
		if (!block) continue;

		// Extract question line: "## Q: ..." or "## <number>. ..." or "## ..."
		const qMatch = block.match(/^##\s+(?:Q:\s*|【.*?】\s*|\d+[.、]\s*)?(.+)/m);
		if (!qMatch) {
			// Try "### " as fallback
			const q2 = block.match(/^###?\s+(.+)/m);
			if (!q2) {
				errors.push(`第 ${bi + 1} 块：未找到题目标题（需以 ## 开头）`);
				continue;
			}
		}
		const questionText = (qMatch ?? block.match(/^###?\s+(.+)/m))![1].trim()
			.replace(/^\*+|\*+$/g, "").trim();

		// Extract meta fields
		const getField = (key: string) => {
			const re = new RegExp(`\\*\\*${key}\\*\\*[:：]\\s*(.+)`, "i");
			return block.match(re)?.[1]?.trim() ?? "";
		};

		const rawModule = getField("模块") || getField("module");
		const rawDiff   = getField("难度") || getField("difficulty");
		const rawTags   = getField("标签") || getField("tags");
		const rawSource = getField("来源") || getField("source");
		const rawId     = getField("ID") || getField("id");

		// Resolve module
		const moduleKey = (rawModule || "").toLowerCase().replace(/\s/g, "");
		const resolvedModule = moduleAlias[moduleKey] ?? rawModule;
		if (!resolvedModule) {
			errors.push(`第 ${bi + 1} 块「${questionText.slice(0, 20)}…」：缺少模块字段`);
			continue;
		}

		// Resolve difficulty
		const diffKey = (rawDiff || "").toLowerCase().trim();
		const difficulty = diffMap[rawDiff] ?? diffMap[diffKey] ?? 2;

		// Tags
		const tags = rawTags
			? rawTags.split(/[,，、]/).map((t) => t.trim()).filter(Boolean)
			: [];

		// Auto-generate ID
		let id = rawId;
		if (!id) {
			const prefix = resolvedModule
				.toLowerCase()
				.replace("js基础", "js")
				.replace("性能优化", "perf")
				.replace("手写题", "code")
				.replace("项目深挖", "proj")
				.replace(/[^a-z]/g, "")
				.slice(0, 6);
			idCounters[prefix] = (idCounters[prefix] ?? 0) + 1;
			id = `${prefix}-${String(idCounters[prefix]).padStart(3, "0")}`;
		}

		// Extract answer: everything after the meta block
		// Remove the header line + all **Field**: lines
		const answerRaw = block
			.replace(/^##\s+.+/m, "")
			.replace(/^###?\s+.+/m, "")
			.replace(/^\*\*(?:模块|module|难度|difficulty|标签|tags|来源|source|ID|id)\*\*[:：].+$/gim, "")
			.trim();

		if (!answerRaw) {
			errors.push(`第 ${bi + 1} 块「${questionText.slice(0, 20)}…」：答案为空`);
			continue;
		}

		questions.push({
			id,
			module: resolvedModule,
			difficulty,
			question: questionText,
			answer: answerRaw,
			tags,
			...(rawSource ? { source: rawSource } : {}),
		});
	}

	return { questions, errors };
}

// ─── Preset Prompts ───────────────────────────────────────────────────────────

interface PromptPreset {
	id: string;
	icon: React.ReactNode;
	title: string;
	description: string;
	prompt: string;
}

/**
 * Build a prompt that asks the AI to output Markdown instead of JSON.
 * Markdown is far more natural for LLMs and avoids JSON escaping errors.
 * The mdToQuestions() converter above turns it into a JSON array afterward.
 */
function buildBasePrompt(
	module: string,
	count: number,
	difficulty: string,
	extra = "",
): string {
	return `你是一位资深面试官，精通 ${module} 技术体系。请生成 ${count} 道关于「${module}」的面试题。

## 难度分布
${difficulty}

## 质量要求
- 每道题必须是**真实面试中出现过的考点**，不要编造生僻问题
- 答案要**完整、准确、有深度**，覆盖核心知识点、边界情况和最佳实践
- 答案自由使用 Markdown：代码块、表格、列表、小标题随意用，写得清晰即可
- 代码示例要**可运行、注释清晰**
- 难度梯度合理：初级考基础概念，中级考原理与应用，高级考底层实现与优化

## 内容覆盖
${extra || `覆盖 ${module} 模块的核心知识点，包括基础概念、实际应用、常见陷阱和最佳实践。`}

## 输出格式

**每道题用 \`---\` 分隔，严格按下方模板输出，不要有任何额外说明文字。**

---
## <题目内容，一句话>
**模块**: ${module}
**难度**: 初级 | 中级 | 高级  ← 三选一
**标签**: 标签1, 标签2, 标签3
**来源**: 高频  ← 可选，高频考点填"高频"，大厂题填公司名，否则省略此行

<答案正文，完整 Markdown，可包含代码块、列表、表格等>

---
## <下一题题目>
**模块**: ${module}
...

---

## 示例（仅供格式参考，请生成新内容）

---
## 请解释 JavaScript 中的事件循环机制
**模块**: JS基础
**难度**: 中级
**标签**: 事件循环, 宏任务, 微任务
**来源**: 高频

## 核心概念

JavaScript 是单线程语言，事件循环（Event Loop）是其处理异步操作的核心机制。

### 执行顺序

1. 执行同步代码（调用栈）
2. 清空微任务队列（Promise.then、queueMicrotask）
3. 执行一个宏任务（setTimeout、setInterval、I/O）
4. 重复步骤 2-3

\`\`\`js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// 输出：1 4 3 2
\`\`\`

---

现在请生成 ${count} 道题目：`;
}

// ─── Preset Icons ─────────────────────────────────────────────────────────────

const IconDatabase = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<ellipse cx="12" cy="5" rx="9" ry="3" />
		<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
		<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
	</svg>
);

const IconList = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<line x1="8" y1="6" x2="21" y2="6" />
		<line x1="8" y1="12" x2="21" y2="12" />
		<line x1="8" y1="18" x2="21" y2="18" />
		<line x1="3" y1="6" x2="3.01" y2="6" />
		<line x1="3" y1="12" x2="3.01" y2="12" />
		<line x1="3" y1="18" x2="3.01" y2="18" />
	</svg>
);

const IconBriefcase = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
		<path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
	</svg>
);

const IconBuilding = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<rect x="2" y="2" width="20" height="20" rx="2" />
		<path d="M16 2v20" />
		<path d="M8 6h2" />
		<path d="M8 10h2" />
		<path d="M8 14h2" />
		<path d="M18 6h.01" />
		<path d="M18 10h.01" />
		<path d="M18 14h.01" />
	</svg>
);

const IconCode = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
		<polyline points="16 18 22 12 16 6" />
		<polyline points="8 6 2 12 8 18" />
	</svg>
);

const PRESETS: PromptPreset[] = [
	{
		id: "full",
		icon: <IconDatabase />,
		title: "全量题库生成（推荐）",
		description: "分模块批量生成，覆盖所有方向，生成后用转换器一键转 JSON",
		prompt: `你是一位资深前端面试官，精通前端技术体系。请为前端面试刷题系统生成完整题库。

## 任务

分 8 个模块，每个模块生成 60-75 道题，总计约 500-600 道题。

## 模块列表
${BUILTIN_MODULE_VALUES.map((m) => `- ${m}`).join("\n")}

## 难度分布（每个模块内）
- 初级（难度：初级）：占 30%，约 18-22 道
- 中级（难度：中级）：占 50%，约 30-38 道
- 高级（难度：高级）：占 20%，约 12-15 道

## 质量要求
1. **真实性**：所有题目必须是真实面试中出现过的考点
2. **深度**：答案完整、准确，覆盖核心知识点、边界情况和最佳实践
3. **代码**：中高级题目必须包含可运行的代码示例（Markdown 代码块）
4. **多样性**：避免同类题目重复，覆盖每个模块的不同子主题
5. **高频标注**：高频考点的来源填"高频"，大厂题填公司名

## 输出格式

**每道题用 \`---\` 分隔，严格按模板输出，不要有任何额外说明。**

---
## <题目内容>
**模块**: <模块名，从上方列表选>
**难度**: 初级 | 中级 | 高级
**标签**: 标签1, 标签2
**来源**: 高频  ← 可选

<完整答案，自由使用 Markdown：代码块、列表、小标题随意用>

---

由于数量较多，请分模块分批次生成，每次专注一个模块。现在从 **JS基础** 模块开始生成 65 道题：`,
	},
	{
		id: "module",
		icon: <IconList />,
		title: "单模块深度生成",
		description: "针对某一模块生成 60-80 道高质量题目，生成后转换器一键转 JSON",
		prompt: buildBasePrompt(
			"JS基础",
			70,
			"- 初级：20 道，覆盖基础概念\n- 中级：35 道，覆盖原理与应用\n- 高级：15 道，覆盖底层实现与优化",
			`覆盖以下子主题：
- 变量声明（var/let/const）、作用域、变量提升、TDZ
- 数据类型、类型检测、类型转换（隐式与显式）
- 原型与原型链、继承（原型继承、class 继承）
- this 绑定规则（默认、隐式、显式、new、箭头函数）
- 闭包（原理、应用场景、内存泄漏）
- 事件循环（宏任务、微任务、执行栈）
- Promise（状态、链式调用、错误处理）
- async/await（语法糖、错误处理、并发）
- ES6+（解构、扩展运算符、迭代器、生成器、Symbol、Proxy、Reflect）
- 模块化（CommonJS vs ESM）
- 内存管理（垃圾回收、内存泄漏场景）
- 正则表达式常见用法`,
		),
	},
	{
		id: "project",
		icon: <IconBriefcase />,
		title: "项目专题生成",
		description: "根据你的项目技术栈，生成针对性的项目深挖题",
		prompt: `你是一位资深前端面试官。我将描述我参与的项目，请根据项目技术栈和架构，生成 30 道「项目深挖」类型的面试题。

## 我的项目描述

[在此粘贴你的项目介绍，例如：]
> 参与开发了一个大型电商平台，前端使用 React 18 + TypeScript + Vite，状态管理使用 Zustand。
> 核心功能：商品列表虚拟滚动、购物车实时同步、订单支付流程、后台管理系统。
> 遇到的挑战：首页白屏时间过长（后来通过 SSR 优化到 1.2s）、大量 API 并发的竞态条件问题。

## 生成要求

1. **紧扣项目**：题目必须与项目技术栈强相关
2. **深度追问**：模拟"为什么这样做""遇到什么问题""如何解决"的思路
3. **难度分布**：中级 10 道 / 高级 15 道 / 挑战 5 道
4. **答案要点**：提供面试时的回答要点和亮点

## 输出格式

**每道题用 \`---\` 分隔，严格按模板输出：**

---
## <题目内容>
**模块**: 项目深挖
**难度**: 中级 | 高级
**标签**: 标签1, 标签2
**来源**: 项目深挖

<完整答案>

---

请根据我上面提供的项目信息生成题目：`,
	},
	{
		id: "company",
		icon: <IconBuilding />,
		title: "大厂真题还原",
		description: "还原字节、阿里、腾讯等大厂的高频面试题，生成后转换器转 JSON",
		prompt: `你是一位曾在多家大型互联网公司参与前端面试的资深工程师。请还原真实前端面试题，生成 60 道高质量面试题。

## 覆盖公司
- 字节跳动（15道）：算法思维、JS 底层原理、大量手写题
- 阿里巴巴/蚂蚁（12道）：工程化、架构设计、稳定性
- 腾讯（12道）：基础扎实、TCP/IP 网络
- 美团（10道）：业务场景、性能优化
- 滴滴（11道）：移动端、跨端开发

## 要求
- 来源字段填写公司名，如"字节"、"阿里"、"腾讯"
- 难度以中高级为主（中级 40%，高级 60%）
- 均匀分布在：JS基础、React、性能优化、网络、CSS、TypeScript、手写题、项目深挖

## 输出格式

**每道题用 \`---\` 分隔，严格按模板输出：**

---
## <题目内容>
**模块**: <模块名>
**难度**: 中级 | 高级
**标签**: 标签1, 标签2
**来源**: 字节 | 阿里 | 腾讯 | 美团 | 滴滴

<完整答案>

---

开始生成：`,
	},
	{
		id: "algorithm",
		icon: <IconCode />,
		title: "手写题专项",
		description: "生成 50 道高质量手写代码题，含详细实现，生成后转换器转 JSON",
		prompt: buildBasePrompt(
			"手写题",
			50,
			"- 初级：10 道，基础 API 实现\n- 中级：25 道，经典工具函数\n- 高级：15 道，复杂数据结构与设计模式",
			`覆盖以下手写题类型：

**工具函数（15道）**
- 防抖（debounce）、节流（throttle）
- 深拷贝（deepClone，处理循环引用、特殊类型）
- 深比较（isEqual）
- 数组去重、扁平化（flat）
- 柯里化（curry）、函数组合（compose/pipe）
- 睡眠函数（sleep）、重试函数（retry）

**原生 API 实现（15道）**
- call、apply、bind
- new 操作符
- instanceof
- Object.create、Object.assign
- Promise（完整实现，含 all/race/allSettled/any）
- Array 方法（map、filter、reduce、flat、forEach）
- JSON.stringify / JSON.parse

**数据结构与算法（10道）**
- LRU 缓存
- 发布订阅（EventEmitter）
- 观察者模式
- 链表操作
- 二叉树遍历

**框架相关（10道）**
- 虚拟 DOM 和 Diff 算法（简版）
- 简版 React（支持函数组件 + useState）
- 简版 Vue 响应式（ref/reactive）
- 前端路由（hash/history 模式）
- 简版 Vuex/Redux

每道手写题的答案必须包含：
1. 完整可运行的代码实现
2. 关键逻辑注释
3. 测试用例
4. 边界情况处理说明`,
		),
	},
];

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({
	text,
	className = "",
}: {
	text: string;
	className?: string;
}) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
			} else {
				// fallback
				const ta = document.createElement("textarea");
				ta.value = text;
				ta.style.position = "fixed";
				ta.style.opacity = "0";
				document.body.appendChild(ta);
				ta.select();
				document.execCommand("copy");
				document.body.removeChild(ta);
			}
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// ignore
		}
	};

	return (
		<button
			onClick={handleCopy}
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 6,
				padding: "6px 12px",
				borderRadius: 8,
				fontSize: 12,
				fontWeight: 500,
				border: copied
					? "1px solid rgba(16,185,129,0.3)"
					: "1px solid var(--border)",
				background: copied ? "rgba(16,185,129,0.08)" : "var(--surface)",
				color: copied ? "var(--success)" : "var(--text-2)",
				cursor: "pointer",
				transition: "all 0.18s",
				whiteSpace: "nowrap",
			}}
			className={className}
		>
			{copied ? (
				<>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
						<polyline points="20 6 9 17 4 12" />
					</svg>
					已复制
				</>
			) : (
				<>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
						<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
					</svg>
					复制
				</>
			)}
		</button>
	);
}

// ─── Preset Card ──────────────────────────────────────────────────────────────

function PresetCard({
	preset,
	selected,
	onClick,
}: {
	preset: PromptPreset;
	selected: boolean;
	onClick: () => void;
}) {
	return (
		<button
			onClick={onClick}
			style={{
				display: "flex",
				alignItems: "flex-start",
				gap: 12,
				width: "100%",
				padding: "12px 14px",
				borderRadius: 14,
				border: selected
					? "1px solid rgba(var(--primary-rgb), 0.5)"
					: "1px solid var(--border-subtle)",
				background: selected ? "var(--primary-light)" : "var(--surface)",
				textAlign: "left",
				transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
				cursor: "pointer",
				boxShadow: selected ? "none" : "var(--shadow-xs)",
			}}
			onMouseEnter={(e) => {
				if (!selected) {
					(e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
					(e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
				}
			}}
			onMouseLeave={(e) => {
				if (!selected) {
					(e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
					(e.currentTarget as HTMLElement).style.background = "var(--surface)";
				}
			}}
		>
			{/* Icon */}
			<div
				style={{
					width: 32,
					height: 32,
					borderRadius: 9,
					background: selected ? "rgba(var(--primary-rgb), 0.12)" : "var(--surface-3)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
					color: selected ? "var(--primary)" : "var(--text-3)",
					transition: "background 0.15s, color 0.15s",
				}}
			>
				{preset.icon}
			</div>

			{/* Text */}
			<div style={{ flex: 1, minWidth: 0 }}>
				<p
					style={{
						fontSize: 13,
						fontWeight: 600,
						color: selected ? "var(--primary)" : "var(--text)",
						marginBottom: 3,
						transition: "color 0.15s",
					}}
				>
					{preset.title}
				</p>
				<p
					style={{
						fontSize: 11,
						color: "var(--text-3)",
						lineHeight: 1.5,
					}}
				>
					{preset.description}
				</p>
			</div>

			{/* Selected indicator */}
			{selected && (
				<div
					style={{
						width: 18,
						height: 18,
						borderRadius: "50%",
						background: "var(--primary)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
						marginTop: 2,
					}}
				>
					<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
						<polyline points="20 6 9 17 4 12" />
					</svg>
				</div>
			)}
		</button>
	);
}

// ─── Tips section ─────────────────────────────────────────────────────────────

interface TipItem {
	icon: React.ReactNode;
	title: string;
	desc: string;
}

const TIPS: TipItem[] = [
	{
		icon: (
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
				<circle cx="12" cy="12" r="10" />
				<polyline points="12 6 12 12 16 14" />
			</svg>
		),
		title: "分批次生成效果更好",
		desc: "每次让 AI 专注一个模块，质量比一次性生成所有题目要高很多。建议每次生成 50-80 道题。",
	},
	{
		icon: (
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
				<polyline points="1 4 1 10 7 10" />
				<path d="M3.51 15a9 9 0 1 0 .49-3.51" />
			</svg>
		),
		title: "多次生成合并使用",
		desc: "同一模块可以多次生成，每次用不同 AI 或不同角度，然后合并成更完整的题库。注意 ID 不要重复。",
	},
	{
		icon: (
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
				<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
				<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
			</svg>
		),
		title: "可以让 AI 修改答案",
		desc: "对某道题的答案不满意，可以直接让 AI 补充、修正，然后手动更新对应 JSON 条目。",
	},
	{
		icon: (
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
				<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
				<circle cx="12" cy="10" r="3" />
			</svg>
		),
		title: "标注 source 字段",
		desc: '建议让 AI 将高频题标注 source: "高频"，大厂题标注公司名，方便在题库中快速筛选。',
	},
	{
		icon: (
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
				<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
				<line x1="8" y1="21" x2="16" y2="21" />
				<line x1="12" y1="17" x2="12" y2="21" />
			</svg>
		),
		title: "推荐模型",
		desc: "GPT-4o、Claude 3.5/3.7 Sonnet、Gemini 1.5 Pro 的输出质量较好，且能严格遵循 JSON 格式。",
	},
	{
		icon: (
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
				<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
				<line x1="12" y1="9" x2="12" y2="13" />
				<line x1="12" y1="17" x2="12.01" y2="17" />
			</svg>
		),
		title: "验证 JSON 有效性",
		desc: "粘贴前可先用 jsonlint.com 验证格式，避免导入失败。iFace 导入页也会自动检测并报告格式错误。",
	},
];

// ─── Custom prompt builder ────────────────────────────────────────────────────

function CustomBuilder({
	onGenerate,
}: {
	onGenerate: (prompt: string) => void;
}) {
	const [module, setModule] = useState("JS基础");
	const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);
	const [count, setCount] = useState(60);
	const [diffPreset, setDiffPreset] = useState("standard");
	const [extraContext, setExtraContext] = useState("");
	const moduleInputRef = React.useRef<HTMLInputElement>(null);
	const moduleDropdownRef = React.useRef<HTMLDivElement>(null);

	// Close dropdown on outside click
	React.useEffect(() => {
		if (!moduleDropdownOpen) return;
		const handler = (e: MouseEvent) => {
			if (
				!moduleInputRef.current?.contains(e.target as Node) &&
				!moduleDropdownRef.current?.contains(e.target as Node)
			) {
				setModuleDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [moduleDropdownOpen]);

	const filteredModules = MODULE_SUGGESTIONS.filter((m) =>
		m.toLowerCase().includes(module.toLowerCase()),
	);

	const diffOptions = {
		standard: "初级 30% / 中级 50% / 高级 20%（标准）",
		beginner: "初级 60% / 中级 35% / 高级 5%（入门）",
		advanced: "初级 10% / 中级 40% / 高级 50%（进阶）",
		mid: "初级 0% / 中级 60% / 高级 40%（中高级）",
	};

	const diffDetail = {
		standard: `- 初级（difficulty: 1）：${Math.round(count * 0.3)} 道\n- 中级（difficulty: 2）：${Math.round(count * 0.5)} 道\n- 高级（difficulty: 3）：${Math.round(count * 0.2)} 道`,
		beginner: `- 初级（difficulty: 1）：${Math.round(count * 0.6)} 道\n- 中级（difficulty: 2）：${Math.round(count * 0.35)} 道\n- 高级（difficulty: 3）：${Math.round(count * 0.05)} 道`,
		advanced: `- 初级（difficulty: 1）：${Math.round(count * 0.1)} 道\n- 中级（difficulty: 2）：${Math.round(count * 0.4)} 道\n- 高级（difficulty: 3）：${Math.round(count * 0.5)} 道`,
		mid: `- 初级（difficulty: 1）：0 道\n- 中级（difficulty: 2）：${Math.round(count * 0.6)} 道\n- 高级（difficulty: 3）：${Math.round(count * 0.4)} 道`,
	};

	const handleGenerate = () => {
		const detail = diffDetail[diffPreset as keyof typeof diffDetail]
			.replace(/（difficulty: \d）/g, "")
			.replace(/difficulty: \d,\s*/g, "");
		const prompt = buildBasePrompt(
			module,
			count,
			detail,
			extraContext,
		);
		onGenerate(prompt);
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: 12,
				}}
			>
				{/* Module */}
				<div style={{ position: "relative" }}>
					<label
						style={{
							display: "block",
							fontSize: 11,
							fontWeight: 500,
							color: "var(--text-2)",
							marginBottom: 6,
						}}
					>
						模块
						<span
							style={{
								marginLeft: 5,
								fontSize: 10,
								color: "var(--text-3)",
								fontWeight: 400,
							}}
						>
							（可自由输入，如 Golang、Java）
						</span>
					</label>
					<div style={{ position: "relative" }}>
						<input
							ref={moduleInputRef}
							type="text"
							value={module}
							onChange={(e) => {
								setModule(e.target.value);
								setModuleDropdownOpen(true);
							}}
							onFocus={() => setModuleDropdownOpen(true)}
							placeholder="输入或选择模块名…"
							style={{
								width: "100%",
								padding: "7px 30px 7px 10px",
								borderRadius: 10,
								fontSize: 13,
								background: "var(--surface)",
								border: moduleDropdownOpen
									? "1px solid var(--primary)"
									: "1px solid var(--border)",
								boxShadow: moduleDropdownOpen
									? "0 0 0 3px var(--primary-light)"
									: "none",
								color: "var(--text)",
								outline: "none",
								boxSizing: "border-box",
								transition: "border-color 0.15s, box-shadow 0.15s",
							}}
						/>
						{/* Chevron */}
						<svg
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--text-3)"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							style={{
								position: "absolute",
								right: 10,
								top: "50%",
								transform: moduleDropdownOpen
									? "translateY(-50%) rotate(180deg)"
									: "translateY(-50%)",
								transition: "transform 0.15s",
								pointerEvents: "none",
							}}
						>
							<polyline points="6 9 12 15 18 9" />
						</svg>

						{/* Custom dropdown */}
						{moduleDropdownOpen && filteredModules.length > 0 && (
							<div
								ref={moduleDropdownRef}
								style={{
									position: "absolute",
									top: "calc(100% + 4px)",
									left: 0,
									right: 0,
									zIndex: 200,
									background: "var(--surface)",
									border: "1px solid var(--border)",
									borderRadius: 10,
									boxShadow: "var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.12))",
									overflow: "hidden",
									maxHeight: 220,
									overflowY: "auto",
								}}
							>
								{filteredModules.map((m) => (
									<button
										key={m}
										onMouseDown={(e) => {
											e.preventDefault();
											setModule(m);
											setModuleDropdownOpen(false);
										}}
										style={{
											width: "100%",
											textAlign: "left",
											padding: "8px 12px",
											fontSize: 13,
											color: m === module ? "var(--primary)" : "var(--text)",
											background:
												m === module ? "var(--primary-light)" : "transparent",
											border: "none",
											cursor: "pointer",
											transition: "background 0.1s",
										}}
										onMouseEnter={(e) => {
											if (m !== module)
												(e.currentTarget as HTMLElement).style.background =
													"var(--surface-2)";
										}}
										onMouseLeave={(e) => {
											if (m !== module)
												(e.currentTarget as HTMLElement).style.background =
													"transparent";
										}}
									>
										{m}
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Count */}
				<div>
					<label
						style={{
							display: "block",
							fontSize: 11,
							fontWeight: 500,
							color: "var(--text-2)",
							marginBottom: 6,
						}}
					>
						题目数量：
						<span style={{ color: "var(--primary)", fontWeight: 600 }}>
							{count} 道
						</span>
					</label>
					<input
						type="range"
						min={20}
						max={100}
						step={5}
						value={count}
						onChange={(e) => setCount(Number(e.target.value))}
						style={{
							width: "100%",
							accentColor: "var(--primary)",
							cursor: "pointer",
							marginTop: 4,
						}}
					/>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							fontSize: 10,
							color: "var(--text-3)",
							marginTop: 2,
						}}
					>
						<span>20</span>
						<span>60</span>
						<span>100</span>
					</div>
				</div>
			</div>

			{/* Difficulty */}
			<div>
				<label
					style={{
						display: "block",
						fontSize: 11,
						fontWeight: 500,
						color: "var(--text-2)",
						marginBottom: 8,
					}}
				>
					难度分布
				</label>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: 6,
					}}
				>
					{Object.entries(diffOptions).map(([key, label]) => (
						<button
							key={key}
							onClick={() => setDiffPreset(key)}
							style={{
								padding: "7px 10px",
								borderRadius: 9,
								fontSize: 11,
								textAlign: "left",
								border: diffPreset === key
									? "1px solid rgba(var(--primary-rgb), 0.5)"
									: "1px solid var(--border)",
								background: diffPreset === key ? "var(--primary-light)" : "transparent",
								color: diffPreset === key ? "var(--primary)" : "var(--text-2)",
								fontWeight: diffPreset === key ? 500 : 400,
								cursor: "pointer",
								transition: "all 0.15s",
							}}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			{/* Extra context */}
			<div>
				<label
					style={{
						display: "block",
						fontSize: 11,
						fontWeight: 500,
						color: "var(--text-2)",
						marginBottom: 6,
					}}
				>
					补充说明（可选）
				</label>
				<textarea
					placeholder="例如：重点覆盖 React Hooks 原理，包含大量代码题；或：针对 2024 年面试热点…"
					value={extraContext}
					onChange={(e) => setExtraContext(e.target.value)}
					rows={3}
					style={{
						width: "100%",
						padding: "8px 10px",
						borderRadius: 10,
						fontSize: 12,
						background: "var(--surface-2)",
						border: "1px solid var(--border)",
						color: "var(--text)",
						resize: "none",
						outline: "none",
						fontFamily: "var(--font-sans)",
						lineHeight: 1.6,
					}}
				/>
			</div>

			<Button
				variant="primary"
				onClick={handleGenerate}
				icon={
					<svg
						width="13"
						height="13"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
					</svg>
				}
			>
				生成自定义 Prompt
			</Button>
		</div>
	);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// ─── MD → JSON Converter Panel ───────────────────────────────────────────────

function MdConverterPanel() {
	const [mdInput, setMdInput] = useState("");
	const [result, setResult] = useState<{
		json: string;
		count: number;
		errors: string[];
	} | null>(null);
	const [copied, setCopied] = useState(false);
	const mdFileInputRef = React.useRef<HTMLInputElement>(null);

	const handleMdFileImport = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = (ev) => {
				const text = ev.target?.result;
				if (typeof text === "string") {
					setMdInput(text);
					setResult(null);
					setCopied(false);
				}
			};
			reader.readAsText(file, "utf-8");
			// reset so same file can be re-imported
			e.target.value = "";
		},
		[],
	);

	const handleConvert = useCallback(() => {
		if (!mdInput.trim()) return;
		const { questions, errors } = mdToQuestions(mdInput);
		setResult({
			json: JSON.stringify(questions, null, 2),
			count: questions.length,
			errors,
		});
		setCopied(false);
	}, [mdInput]);

	const handleCopy = useCallback(() => {
		if (!result) return;
		navigator.clipboard.writeText(result.json).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}, [result]);

	const handleDownload = useCallback(() => {
		if (!result) return;
		const blob = new Blob([result.json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `questions-${new Date().toISOString().slice(0, 10)}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, [result]);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			{/* Hidden MD file input */}
			<input
				ref={mdFileInputRef}
				type="file"
				accept=".md,.markdown,text/markdown"
				style={{ display: "none" }}
				onChange={handleMdFileImport}
			/>

			{/* Header */}
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				<div>
					<p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
						Markdown → JSON 转换器
					</p>
					<p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
						将 AI 输出的 Markdown 题目粘贴或导入文件，转换后复制 JSON 导入题库
					</p>
				</div>
			</div>

			{/* Two columns: input + output */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: 12,
					alignItems: "start",
				}}
				className="converter-cols"
			>
				{/* Input */}
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
						<span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>
							AI 输出（Markdown）
						</span>
						<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
							{/* Import .md file button */}
							<button
								onClick={() => mdFileInputRef.current?.click()}
								title="从本地导入 .md 文件"
								style={{
									display: "flex",
									alignItems: "center",
									gap: 4,
									fontSize: 11,
									color: "var(--primary)",
									background: "none",
									border: "1px solid rgba(var(--primary-rgb), 0.3)",
									borderRadius: 6,
									cursor: "pointer",
									padding: "3px 8px",
									transition: "all 0.15s",
								}}
								onMouseEnter={(e) => {
									(e.currentTarget as HTMLElement).style.background = "var(--primary-light)";
								}}
								onMouseLeave={(e) => {
									(e.currentTarget as HTMLElement).style.background = "none";
								}}
							>
								<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
									<polyline points="14 2 14 8 20 8" />
									<line x1="12" y1="18" x2="12" y2="12" />
									<line x1="9" y1="15" x2="15" y2="15" />
								</svg>
								导入 .md
							</button>
							{mdInput && (
								<button
									onClick={() => { setMdInput(""); setResult(null); }}
									style={{ fontSize: 11, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
								>
									清空
								</button>
							)}
						</div>
					</div>
					<textarea
						value={mdInput}
						onChange={(e) => setMdInput(e.target.value)}
						placeholder={`粘贴 AI 生成的 Markdown，格式如：

---
## 请解释闭包的概念
**模块**: JS基础
**难度**: 中级
**标签**: 闭包, 作用域

闭包是指函数能够访问其词法作用域外部变量的特性...

---
## 下一道题...`}
						style={{
							width: "100%",
							minHeight: 360,
							padding: "12px",
							borderRadius: 10,
							border: "1px solid var(--border)",
							background: "var(--surface-2)",
							color: "var(--text)",
							fontSize: 12,
							fontFamily: "var(--font-mono)",
							lineHeight: 1.6,
							resize: "vertical",
							outline: "none",
						}}
						onFocus={(e) => {
							e.currentTarget.style.borderColor = "var(--primary)";
							e.currentTarget.style.boxShadow = "0 0 0 3px var(--primary-light)";
						}}
						onBlur={(e) => {
							e.currentTarget.style.borderColor = "var(--border)";
							e.currentTarget.style.boxShadow = "none";
						}}
					/>
					<button
						onClick={handleConvert}
						disabled={!mdInput.trim()}
						style={{
							padding: "9px 0",
							borderRadius: 9,
							border: "none",
							background: mdInput.trim() ? "var(--primary)" : "var(--surface-3)",
							color: mdInput.trim() ? "white" : "var(--text-3)",
							fontSize: 13,
							fontWeight: 600,
							cursor: mdInput.trim() ? "pointer" : "default",
							transition: "all 0.15s",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 6,
						}}
					>
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
							<polyline points="16 18 22 12 16 6" />
							<polyline points="8 6 2 12 8 18" />
						</svg>
						转换为 JSON
					</button>
				</div>

				{/* Output */}
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
						<span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>
							JSON 结果
							{result && (
								<span style={{
									marginLeft: 8,
									fontSize: 11,
									padding: "1px 6px",
									borderRadius: 4,
									background: "var(--success-light)",
									color: "var(--success)",
									border: "1px solid rgba(16,185,129,0.2)",
								}}>
									{result.count} 道题
								</span>
							)}
						</span>
						{result && (
							<div style={{ display: "flex", gap: 6 }}>
								<button
									onClick={handleCopy}
									style={{
										fontSize: 11,
										color: copied ? "var(--success)" : "var(--primary)",
										background: copied ? "var(--success-light)" : "var(--primary-light)",
										border: "none",
										borderRadius: 5,
										padding: "3px 8px",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: 4,
										fontWeight: 500,
									}}
								>
									{copied ? "✓ 已复制" : "复制 JSON"}
								</button>
								<button
									onClick={handleDownload}
									style={{
										fontSize: 11,
										color: "var(--text-2)",
										background: "var(--surface-3)",
										border: "none",
										borderRadius: 5,
										padding: "3px 8px",
										cursor: "pointer",
									}}
								>
									下载
								</button>
							</div>
						)}
					</div>

					{result ? (
						<>
							{result.errors.length > 0 && (
								<div style={{
									padding: "8px 12px",
									borderRadius: 8,
									background: "var(--warning-light)",
									border: "1px solid rgba(245,158,11,0.25)",
									fontSize: 11,
									color: "#92400e",
								}}>
									<p style={{ fontWeight: 600, marginBottom: 4 }}>⚠️ {result.errors.length} 个解析警告</p>
									{result.errors.map((e, i) => (
										<p key={i} style={{ opacity: 0.85, lineHeight: 1.5 }}>{e}</p>
									))}
								</div>
							)}
							<pre
								style={{
									minHeight: 360,
									padding: "12px",
									borderRadius: 10,
									border: "1px solid var(--border-subtle)",
									background: "var(--surface-2)",
									color: "var(--text)",
									fontSize: 11,
									fontFamily: "var(--font-mono)",
									lineHeight: 1.6,
									overflow: "auto",
									whiteSpace: "pre-wrap",
									wordBreak: "break-word",
									margin: 0,
								}}
							>
								{result.json}
							</pre>
							<a
								href="/import"
								style={{
									padding: "9px 0",
									borderRadius: 9,
									background: "var(--success)",
									color: "white",
									fontSize: 13,
									fontWeight: 600,
									textDecoration: "none",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: 6,
									transition: "opacity 0.15s",
								}}
								onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
								onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
							>
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
									<polyline points="17 8 12 3 7 8" />
									<line x1="12" y1="3" x2="12" y2="15" />
								</svg>
								前往导入题库
							</a>
						</>
					) : (
						<div style={{
							minHeight: 360,
							borderRadius: 10,
							border: "1px dashed var(--border)",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							gap: 8,
							color: "var(--text-3)",
							padding: 24,
							textAlign: "center",
						}}>
							<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
								<polyline points="16 18 22 12 16 6" />
								<polyline points="8 6 2 12 8 18" />
							</svg>
							<p style={{ fontSize: 12 }}>在左侧粘贴 AI 输出后点击「转换为 JSON」</p>
						</div>
					)}
				</div>
			</div>

			{/* Format guide */}
			<div style={{
				padding: "12px 16px",
				borderRadius: 10,
				background: "var(--surface-2)",
				border: "1px solid var(--border-subtle)",
				fontSize: 12,
				color: "var(--text-2)",
				lineHeight: 1.6,
			}}>
				<p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>📋 Markdown 格式说明</p>
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px" }} className="format-guide-grid">
					<span>• 每题以 <code style={{ fontSize: 11, padding: "1px 4px", borderRadius: 3, background: "var(--surface-3)" }}>---</code> 分隔</span>
					<span>• 题目以 <code style={{ fontSize: 11, padding: "1px 4px", borderRadius: 3, background: "var(--surface-3)" }}>## 题目内容</code> 开头</span>
					<span>• <strong>模块</strong> 字段自动映射（js/react/css/ts/网络/性能/手写/项目）</span>
					<span>• <strong>难度</strong> 支持：初级/中级/高级</span>
					<span>• <strong>标签</strong> 用逗号或顿号分隔</span>
					<span>• <strong>来源</strong> 可选，如"高频"、"字节"</span>
					<span>• ID 未填时自动生成（模块前缀-序号）</span>
					<span>• 答案为 meta 字段之后的所有 Markdown 内容</span>
				</div>
			</div>
		</div>
	);
}

export default function PromptPage() {
	const [selectedPreset, setSelectedPreset] = useState<string>("full");
	const [customPrompt, setCustomPrompt] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");
	const [rightTab, setRightTab] = useState<"preview" | "converter">("preview");

	const currentPreset = PRESETS.find((p) => p.id === selectedPreset);
	const displayPrompt =
		activeTab === "custom" ? customPrompt : (currentPreset?.prompt ?? "");

	return (
		<div
			className="page-container animate-fade-in"
			style={{ maxWidth: 1100 }}
		>
			{/* ── Header ── */}
			<div style={{ marginBottom: 24 }}>
				<div
					style={{
						display: "flex",
						alignItems: "flex-start",
						justifyContent: "space-between",
						gap: 16,
					}}
				>
					<div>
						<h1
							style={{
								fontSize: 20,
								fontWeight: 700,
								color: "var(--text)",
								letterSpacing: "-0.02em",
								marginBottom: 6,
							}}
						>
							AI 出题 Prompt
						</h1>
						<p style={{ fontSize: 13, color: "var(--text-2)" }}>
							复制提示词，交给 AI 生成符合格式的题目，然后粘贴到「导入题目」页面
						</p>
					</div>
					<Badge variant="primary" style={{ flexShrink: 0, marginTop: 4 }}>
						推荐总量：500-600 题
					</Badge>
				</div>
			</div>

			{/* ── Two-column layout ── */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "minmax(0,2fr) minmax(0,3fr)",
					gap: 20,
					alignItems: "start",
				}}
				className="prompt-layout"
			>
				{/* ── Left: Preset selector ── */}
				<div
					className="animate-fade-in stagger-1"
					style={{ display: "flex", flexDirection: "column", gap: 12 }}
				>
					{/* Tab switcher */}
					<div
						style={{
							display: "flex",
							gap: 4,
							padding: 4,
							background: "var(--surface-2)",
							borderRadius: 12,
						}}
					>
						{(
							[
								{ key: "presets", label: "预设 Prompt" },
								{ key: "custom", label: "自定义构建" },
							] as const
						).map(({ key, label }) => (
							<button
								key={key}
								onClick={() => setActiveTab(key)}
								style={{
									flex: 1,
									padding: "6px 12px",
									borderRadius: 9,
									fontSize: 12,
									fontWeight: activeTab === key ? 500 : 400,
									color: activeTab === key ? "var(--text)" : "var(--text-2)",
									background: activeTab === key ? "var(--surface)" : "transparent",
									border: "none",
									cursor: "pointer",
									transition: "all 0.15s",
									boxShadow: activeTab === key ? "var(--shadow-sm)" : "none",
								}}
							>
								{label}
							</button>
						))}
					</div>

					{activeTab === "presets" ? (
						<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
							{PRESETS.map((preset) => (
								<PresetCard
									key={preset.id}
									preset={preset}
									selected={selectedPreset === preset.id}
									onClick={() => setSelectedPreset(preset.id)}
								/>
							))}
						</div>
					) : (
						<div className="card" style={{ padding: 16 }}>
							<CustomBuilder
								onGenerate={(prompt) => {
									setCustomPrompt(prompt);
								}}
							/>
						</div>
					)}
				</div>

				{/* ── Right: Prompt preview ── */}
				<div
					className="animate-fade-in stagger-2"
					style={{ position: "sticky", top: "calc(var(--navbar-h) + 20px)" }}
				>
					{/* Right panel tab switcher */}
					<div style={{
						display: "flex",
						gap: 4,
						padding: 4,
						background: "var(--surface-2)",
						borderRadius: 12,
						marginBottom: 12,
					}}>
						{([
							{ key: "preview", label: "Prompt 预览" },
							{ key: "converter", label: "MD → JSON 转换器" },
						] as const).map(({ key, label }) => {
							const active = rightTab === key;
							return (
								<button
									key={key}
									onClick={() => setRightTab(key)}
									style={{
										flex: 1,
										padding: "6px 10px",
										borderRadius: 9,
										fontSize: 12,
										fontWeight: active ? 600 : 400,
										color: active ? "var(--text)" : "var(--text-3)",
										background: active ? "var(--surface)" : "transparent",
										border: "none",
										cursor: "pointer",
										boxShadow: active ? "var(--shadow-sm)" : "none",
										transition: "all 0.15s",
									}}
								>
									{label}
								</button>
							);
						})}
					</div>

					{rightTab === "converter" ? (
						<MdConverterPanel />
					) : (
					<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
						{/* Preview header */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: 8,
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
								<span
									style={{
										fontSize: 13,
										fontWeight: 600,
										color: "var(--text)",
									}}
								>
									{activeTab === "custom"
										? customPrompt
											? "自定义 Prompt"
											: "请在左侧配置并生成"
										: currentPreset?.title}
								</span>
								{displayPrompt && (
									<span
										style={{
											fontSize: 11,
											padding: "2px 7px",
											borderRadius: 5,
											background: "var(--surface-3)",
											color: "var(--text-3)",
											border: "1px solid var(--border-subtle)",
										}}
									>
										{displayPrompt.length} 字符
									</span>
								)}
							</div>
						</div>

						{/* Prompt content */}
						{displayPrompt ? (
							<div style={{ position: "relative" }}>
								<pre
									style={{
										fontSize: 12,
										fontFamily: "var(--font-mono)",
										background: "var(--surface-2)",
										border: "1px solid var(--border-subtle)",
										borderRadius: 14,
										padding: "16px",
										overflow: "auto",
										maxHeight: "60dvh",
										color: "var(--text)",
										lineHeight: 1.7,
										whiteSpace: "pre-wrap",
										wordBreak: "break-word",
									}}
								>
									{displayPrompt}
								</pre>
								{/* Floating copy */}
								<div style={{ position: "absolute", top: 10, right: 10 }}>
									<CopyButton text={displayPrompt} />
								</div>
							</div>
						) : (
							<div
								className="card"
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									padding: "64px 24px",
									textAlign: "center",
								}}
							>
								<div>
									<svg
										width="28"
										height="28"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.4"
										strokeLinecap="round"
										strokeLinejoin="round"
										style={{
											color: "var(--text-3)",
											margin: "0 auto 12px",
											opacity: 0.5,
										}}
									>
										<circle cx="12" cy="12" r="3" />
										<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
									</svg>
									<p style={{ fontSize: 13, color: "var(--text-3)" }}>
										在左侧配置参数后点击「生成自定义 Prompt」
									</p>
								</div>
							</div>
						)}

						{/* Usage guide */}
						{displayPrompt && (
							<div
								className="card animate-scale-in"
								style={{
									padding: "14px 16px",
									borderColor: "rgba(var(--primary-rgb), 0.2)",
									background: "var(--primary-light)",
									display: "flex",
									flexDirection: "column",
									gap: 10,
								}}
							>
								<p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
									使用步骤
								</p>
								<ol style={{ display: "flex", flexDirection: "column", gap: 8 }}>
									{[
										"复制 Prompt，粘贴到 GPT-4o / Claude / Gemini 等 AI",
										"AI 生成 Markdown 格式题目（比 JSON 更稳定，少出错）",
										"复制 AI 输出，切换到「MD → JSON 转换器」粘贴转换",
										"复制转换后的 JSON，前往「导入题目」页面一键导入",
									].map((step, i) => (
										<li
											key={i}
											style={{
												display: "flex",
												gap: 8,
												fontSize: 12,
												color: "var(--text-2)",
												listStyle: "none",
											}}
										>
											<span
												style={{
													flexShrink: 0,
													width: 16,
													height: 16,
													borderRadius: "50%",
													background: "var(--primary)",
													color: "white",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													fontSize: 9,
													fontWeight: 700,
													marginTop: 1,
												}}
											>
												{i + 1}
											</span>
											<span style={{ lineHeight: 1.6 }}>{step}</span>
										</li>
									))}
								</ol>
							</div>
						)}
					</div>
					)}
				</div>
			</div>

			{/* ── Tips ── */}
			<div
				className="animate-fade-in stagger-3"
				style={{ marginTop: 32 }}
			>
				<p
					style={{
						fontSize: 11,
						fontWeight: 600,
						color: "var(--text-3)",
						textTransform: "uppercase",
						letterSpacing: "0.08em",
						marginBottom: 12,
					}}
				>
					使用技巧
				</p>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(3, 1fr)",
						gap: 10,
					}}
					className="tips-grid"
				>
					{TIPS.map((tip, i) => (
						<div
							key={i}
							className="card animate-fade-in"
							style={{
								padding: "14px 16px",
								display: "flex",
								alignItems: "flex-start",
								gap: 12,
								animationDelay: `${0.3 + i * 0.05}s`,
							}}
						>
							<div
								style={{
									width: 30,
									height: 30,
									borderRadius: 8,
									background: "var(--surface-3)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									flexShrink: 0,
									color: "var(--text-2)",
								}}
							>
								{tip.icon}
							</div>
							<div>
								<p
									style={{
										fontSize: 13,
										fontWeight: 600,
										color: "var(--text)",
										marginBottom: 4,
									}}
								>
									{tip.title}
								</p>
								<p
									style={{
										fontSize: 12,
										color: "var(--text-3)",
										lineHeight: 1.6,
									}}
								>
									{tip.desc}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* ── Recommended scale ── */}
			<div
				className="animate-fade-in stagger-4"
				style={{ marginTop: 20 }}
			>
				<div className="card" style={{ padding: 20 }}>
					<h2
						style={{
							fontSize: 13,
							fontWeight: 600,
							color: "var(--text)",
							marginBottom: 16,
						}}
					>
						推荐题库规模
					</h2>
					<div style={{ overflowX: "auto" }}>
						<table style={{ width: "100%", borderCollapse: "collapse" }}>
							<thead>
								<tr
									style={{
										borderBottom: "1px solid var(--border-subtle)",
									}}
								>
									{["目标", "题目数量", "生成策略", "预计用时"].map((h) => (
										<th
											key={h}
											style={{
												textAlign: "left",
												paddingBottom: 10,
												fontSize: 11,
												fontWeight: 600,
												color: "var(--text-3)",
												paddingRight: 16,
												textTransform: "uppercase",
												letterSpacing: "0.05em",
											}}
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{[
									["快速入门", "100-200 题", "全量生成 Prompt 运行一次", "15 分钟"],
									["覆盖全面", "500-600 题", "按模块分批生成，每模块 60-75 题", "1-2 小时"],
									["深度备战", "800-1000 题", "全量 + 大厂真题 + 手写题专项", "3-4 小时"],
									["超全题库", "1500+ 题", "多 AI 多轮次生成 + 去重合并", "1 天"],
								].map(([target, count, strategy, time]) => (
									<tr
										key={target}
										style={{ borderBottom: "1px solid var(--border-subtle)" }}
									>
										<td
											style={{
												padding: "10px 16px 10px 0",
												fontSize: 13,
												fontWeight: 500,
												color: "var(--text)",
											}}
										>
											{target}
										</td>
										<td style={{ padding: "10px 16px 10px 0" }}>
											<span
												style={{
													fontSize: 11,
													fontWeight: 500,
													padding: "2px 8px",
													borderRadius: 5,
													background: "var(--primary-light)",
													color: "var(--primary)",
													border: "1px solid rgba(var(--primary-rgb),0.2)",
													whiteSpace: "nowrap",
												}}
											>
												{count}
											</span>
										</td>
										<td
											style={{
												padding: "10px 16px 10px 0",
												fontSize: 12,
												color: "var(--text-2)",
											}}
										>
											{strategy}
										</td>
										<td
											style={{
												padding: "10px 0",
												fontSize: 12,
												color: "var(--text-3)",
												whiteSpace: "nowrap",
											}}
										>
											{time}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<p
						style={{
							fontSize: 12,
							color: "var(--text-3)",
							marginTop: 12,
							lineHeight: 1.6,
						}}
					>
						推荐从「覆盖全面」开始，500-600 题已足够覆盖 95%
						的前端面试考点。超过 800 题后边际收益递减，建议重点放在薄弱点的深度理解。
					</p>
				</div>
			</div>

			<style>{`
				@media (max-width: 768px) {
					.prompt-layout {
						grid-template-columns: 1fr !important;
					}
					.tips-grid {
						grid-template-columns: 1fr 1fr !important;
					}
					.converter-cols {
						grid-template-columns: 1fr !important;
					}
					.format-guide-grid {
						grid-template-columns: 1fr !important;
					}
				}
				@media (max-width: 480px) {
					.tips-grid {
						grid-template-columns: 1fr !important;
					}
				}
			`}</style>
		</div>
	);
}
