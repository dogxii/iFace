import { useCallback, useEffect, useRef, useState } from "react";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import {
	buildQuestionContext,
	useAIStore,
	type AIMessage,
} from "@/store/useAIStore";
import type { Question } from "@/types";

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconSend() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<line x1="22" y1="2" x2="11" y2="13" />
			<polygon points="22 2 15 22 11 13 2 9 22 2" />
		</svg>
	);
}

function IconStop() {
	return (
		<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="currentColor"
		>
			<rect x="4" y="4" width="16" height="16" rx="2" />
		</svg>
	);
}

function IconClear() {
	return (
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
			<polyline points="3 6 5 6 21 6" />
			<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
			<path d="M10 11v6M14 11v6" />
			<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
		</svg>
	);
}

function IconBot() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
			<circle cx="7.5" cy="14.5" r="1.5" />
			<circle cx="16.5" cy="14.5" r="1.5" />
		</svg>
	);
}

function IconUser() {
	return (
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
			<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
			<circle cx="12" cy="7" r="4" />
		</svg>
	);
}

function IconChevronDown() {
	return (
		<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<polyline points="6 9 12 15 18 9" />
		</svg>
	);
}

function IconChevronUp() {
	return (
		<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<polyline points="18 15 12 9 6 15" />
		</svg>
	);
}

function IconSettings() {
	return (
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
			<circle cx="12" cy="12" r="3" />
			<path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2" />
		</svg>
	);
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingDots() {
	return (
		<span
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 3,
				verticalAlign: "middle",
			}}
		>
			{[0, 1, 2].map((i) => (
				<span
					key={i}
					style={{
						width: 5,
						height: 5,
						borderRadius: "50%",
						background: "var(--primary)",
						display: "inline-block",
						animation: `ai-dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
					}}
				/>
			))}
		</span>
	);
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
	message: AIMessage;
	isStreaming?: boolean;
	streamingText?: string;
}

function MessageBubble({ message, isStreaming, streamingText }: MessageBubbleProps) {
	const isUser = message.role === "user";
	const content = isStreaming && streamingText !== undefined ? streamingText : message.content;

	return (
		<div
			style={{
				display: "flex",
				flexDirection: isUser ? "row-reverse" : "row",
				gap: 8,
				alignItems: "flex-start",
				animation: "fade-up 0.2s var(--ease-out) both",
			}}
		>
			{/* Avatar */}
			<div
				style={{
					width: 26,
					height: 26,
					borderRadius: isUser ? "50%" : 8,
					background: isUser ? "var(--primary)" : "var(--surface-3)",
					color: isUser ? "white" : "var(--primary)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
					marginTop: 2,
					border: isUser ? "none" : "1px solid var(--border-subtle)",
				}}
			>
				{isUser ? <IconUser /> : <IconBot />}
			</div>

			{/* Bubble */}
			<div
				style={{
					maxWidth: "85%",
					padding: isUser ? "8px 12px" : "10px 14px",
					borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
					background: isUser ? "var(--primary)" : "var(--surface-2)",
					color: isUser ? "white" : "var(--text)",
					border: isUser ? "none" : "1px solid var(--border-subtle)",
					fontSize: 13,
					lineHeight: 1.65,
					wordBreak: "break-word",
				}}
			>
				{isUser ? (
					<span style={{ whiteSpace: "pre-wrap" }}>{content}</span>
				) : content ? (
					<div
						className="prose"
						style={{
							fontSize: 13,
							color: "var(--text)",
							"--text": "var(--text)",
						} as React.CSSProperties}
					>
						<MarkdownRenderer content={content} />
						{isStreaming && <TypingDots />}
					</div>
				) : (
					<TypingDots />
				)}
			</div>
		</div>
	);
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyChat({ onQuickAction }: { onQuickAction: (prompt: string) => void }) {
	const quickStarters = [
		{ icon: "🎯", label: "分析考点", prompt: "请分析这道题的核心考察点，以及面试官想通过这道题了解候选人哪些能力？" },
		{ icon: "📝", label: "答题结构", prompt: "请给我一个清晰的答题框架和结构，让我在面试中能有条理地回答这道题。" },
		{ icon: "🔮", label: "追问预测", prompt: "面试官通常会在这道题上做哪些追问？请列出 3-5 个高频追问及简要回答思路。" },
		{ icon: "🎤", label: "模拟面试", prompt: "请模拟面试官的角色，对我进行关于这道题的追问式面试练习，一次只问一个问题。" },
	];

	return (
		<div
			style={{
				flex: 1,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "24px 16px",
				gap: 16,
			}}
		>
			<div
				style={{
					width: 48,
					height: 48,
					borderRadius: 14,
					background: "var(--primary-light)",
					color: "var(--primary)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<IconBot />
			</div>
			<div style={{ textAlign: "center" }}>
				<p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
					AI 面试助手
				</p>
				<p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>
					帮你深度分析题目、优化答案、预测追问
				</p>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: 8,
					width: "100%",
				}}
			>
				{quickStarters.map((item) => (
					<button
						key={item.label}
						onClick={() => onQuickAction(item.prompt)}
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "flex-start",
							gap: 4,
							padding: "10px 12px",
							borderRadius: 10,
							border: "1px solid var(--border-subtle)",
							background: "var(--surface-2)",
							cursor: "pointer",
							textAlign: "left",
							transition: "all 0.15s",
						}}
						onMouseEnter={(e) => {
							(e.currentTarget as HTMLElement).style.background = "var(--primary-light)";
							(e.currentTarget as HTMLElement).style.borderColor = "rgba(var(--primary-rgb), 0.3)";
						}}
						onMouseLeave={(e) => {
							(e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
							(e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
						}}
					>
						<span style={{ fontSize: 16 }}>{item.icon}</span>
						<span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>
							{item.label}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}

// ─── Not Configured ───────────────────────────────────────────────────────────

function NotConfigured({ onOpenSettings }: { onOpenSettings: () => void }) {
	return (
		<div
			style={{
				flex: 1,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "24px",
				gap: 14,
				textAlign: "center",
			}}
		>
			<div
				style={{
					width: 48,
					height: 48,
					borderRadius: 14,
					background: "var(--surface-3)",
					color: "var(--text-3)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<IconBot />
			</div>
			<div>
				<p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
					AI 助手未配置
				</p>
				<p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5, maxWidth: 220 }}>
					请在设置中配置 API Key 并启用 AI 功能
				</p>
			</div>
			<button
				onClick={onOpenSettings}
				style={{
					display: "flex",
					alignItems: "center",
					gap: 6,
					padding: "7px 14px",
					borderRadius: 8,
					border: "1px solid var(--border)",
					background: "var(--surface-2)",
					color: "var(--text-2)",
					fontSize: 12,
					fontWeight: 500,
					cursor: "pointer",
					transition: "all 0.15s",
				}}
				onMouseEnter={(e) => {
					(e.currentTarget as HTMLElement).style.background = "var(--primary-light)";
					(e.currentTarget as HTMLElement).style.color = "var(--primary)";
					(e.currentTarget as HTMLElement).style.borderColor = "rgba(var(--primary-rgb), 0.3)";
				}}
				onMouseLeave={(e) => {
					(e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
					(e.currentTarget as HTMLElement).style.color = "var(--text-2)";
					(e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
				}}
			>
				<IconSettings />
				前往设置
			</button>
		</div>
	);
}

// ─── Quick Action Bar ─────────────────────────────────────────────────────────

function QuickActionBar({
	hasAnswer,
	onAction,
	disabled,
}: {
	hasAnswer: boolean;
	onAction: (prompt: string) => void;
	disabled: boolean;
}) {
	const { getQuickActions } = useAIStore();
	const actions = getQuickActions(hasAnswer);
	const [expanded, setExpanded] = useState(false);
	const visible = expanded ? actions : actions.slice(0, 3);

	return (
		<div
			style={{
				padding: "8px 12px",
				borderTop: "1px solid var(--border-subtle)",
				background: "var(--surface)",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 6,
					flexWrap: "wrap",
				}}
			>
				{visible.map((action) => (
					<button
						key={action.id}
						onClick={() => onAction(action.prompt)}
						disabled={disabled}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 4,
							padding: "3px 9px",
							borderRadius: 6,
							border: "1px solid var(--border-subtle)",
							background: "var(--surface-2)",
							color: "var(--text-2)",
							fontSize: 11,
							fontWeight: 500,
							cursor: disabled ? "not-allowed" : "pointer",
							transition: "all 0.15s",
							opacity: disabled ? 0.5 : 1,
							whiteSpace: "nowrap",
						}}
						onMouseEnter={(e) => {
							if (!disabled) {
								(e.currentTarget as HTMLElement).style.background = "var(--primary-light)";
								(e.currentTarget as HTMLElement).style.color = "var(--primary)";
								(e.currentTarget as HTMLElement).style.borderColor = "rgba(var(--primary-rgb), 0.3)";
							}
						}}
						onMouseLeave={(e) => {
							(e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
							(e.currentTarget as HTMLElement).style.color = "var(--text-2)";
							(e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
						}}
					>
						<span>{action.icon}</span>
						{action.label}
					</button>
				))}

				{actions.length > 3 && (
					<button
						onClick={() => setExpanded((v) => !v)}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 3,
							padding: "3px 7px",
							borderRadius: 6,
							border: "1px solid transparent",
							background: "transparent",
							color: "var(--text-3)",
							fontSize: 11,
							cursor: "pointer",
							transition: "all 0.15s",
						}}
						onMouseEnter={(e) => {
							(e.currentTarget as HTMLElement).style.color = "var(--text)";
						}}
						onMouseLeave={(e) => {
							(e.currentTarget as HTMLElement).style.color = "var(--text-3)";
						}}
					>
						{expanded ? <IconChevronUp /> : <IconChevronDown />}
						{expanded ? "收起" : `+${actions.length - 3}`}
					</button>
				)}
			</div>
		</div>
	);
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AIPanelProps {
	question: Question;
	answerVisible: boolean;
	onOpenSettings: () => void;
}

export function AIPanel({ question, answerVisible, onOpenSettings }: AIPanelProps) {
	const {
		config,
		streaming,
		streamingQuestionId,
		getMessages,
		clearSession,
		sendMessage,
	} = useAIStore();

	const questionId = question.id;
	const messages = getMessages(questionId);
	const isStreaming = streaming && streamingQuestionId === questionId;

	const [input, setInput] = useState("");
	const [streamingText, setStreamingText] = useState("");
	const [error, setError] = useState<string | null>(null);

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, streamingText]);

	// Reset streaming text when done
	useEffect(() => {
		if (!isStreaming) {
			setStreamingText("");
		}
	}, [isStreaming]);

	const isReady = config.enabled && config.apiKey.trim().length > 0;

	const buildContextMessages = useCallback((): AIMessage[] => {
		const ctx = buildQuestionContext(
			question.question,
			question.module,
			question.difficulty,
			answerVisible ? question.answer : undefined,
		);
		return [
			{ role: "user", content: ctx },
			{
				role: "assistant",
				content: "好的，我已了解这道题的信息。你有什么想了解的，或者需要我帮你分析什么？",
			},
			...messages,
		];
	}, [question, answerVisible, messages]);

	const handleSend = useCallback(
		async (text?: string) => {
			const msg = (text ?? input).trim();
			if (!msg || isStreaming) return;

			setInput("");
			setError(null);
			setStreamingText("");

			const contextMessages = buildContextMessages();

			await sendMessage(
				questionId,
				msg,
				contextMessages,
				(chunk) => {
					setStreamingText((prev) => prev + chunk);
				},
				() => {
					setStreamingText("");
				},
				(err) => {
					setError(err);
					setStreamingText("");
				},
			);
		},
		[input, isStreaming, questionId, buildContextMessages, sendMessage],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

	const handleClear = useCallback(() => {
		clearSession(questionId);
		setError(null);
		setStreamingText("");
	}, [clearSession, questionId]);

	const handleQuickAction = useCallback(
		(prompt: string) => {
			handleSend(prompt);
		},
		[handleSend],
	);

	// ── Render: not configured ──
	if (!isReady) {
		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					height: "100%",
					background: "var(--surface)",
					borderRadius: 14,
					border: "1px solid var(--border-subtle)",
					overflow: "hidden",
				}}
			>
				<PanelHeader
					title="AI 助手"
					hasMessages={false}
					onClear={handleClear}
				/>
				<NotConfigured onOpenSettings={onOpenSettings} />
			</div>
		);
	}

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				height: "100%",
				background: "var(--surface)",
				borderRadius: 14,
				border: "1px solid var(--border-subtle)",
				overflow: "hidden",
			}}
		>
			<PanelHeader
				title="AI 助手"
				hasMessages={messages.length > 0}
				onClear={handleClear}
				model={config.model}
			/>

			{/* Messages area */}
			<div
				style={{
					flex: 1,
					overflowY: "auto",
					display: "flex",
					flexDirection: "column",
				}}
			>
				{messages.length === 0 && !isStreaming ? (
					<EmptyChat onQuickAction={handleQuickAction} />
				) : (
					<div
						style={{
							padding: "16px 14px",
							display: "flex",
							flexDirection: "column",
							gap: 14,
						}}
					>
						{messages.map((msg, idx) => {
							const isLastAssistant =
								idx === messages.length - 1 && msg.role === "assistant";
							return (
								<MessageBubble
									key={idx}
									message={msg}
									isStreaming={isStreaming && isLastAssistant && streamingText !== ""}
									streamingText={isStreaming && isLastAssistant ? streamingText : undefined}
								/>
							);
						})}

						{/* Show streaming bubble if not yet in messages */}
						{isStreaming && messages[messages.length - 1]?.role === "user" && (
							<MessageBubble
								message={{ role: "assistant", content: streamingText }}
								isStreaming
								streamingText={streamingText}
							/>
						)}

						{/* Error */}
						{error && (
							<div
								style={{
									padding: "10px 12px",
									borderRadius: 10,
									background: "var(--danger-light)",
									border: "1px solid rgba(239,68,68,0.2)",
									fontSize: 12,
									color: "var(--danger)",
									lineHeight: 1.5,
									animation: "fade-up 0.2s var(--ease-out) both",
								}}
							>
								<span style={{ fontWeight: 600 }}>错误：</span>{error}
								<button
									onClick={() => setError(null)}
									style={{
										marginLeft: 8,
										background: "none",
										border: "none",
										color: "var(--danger)",
										cursor: "pointer",
										fontSize: 12,
										textDecoration: "underline",
										padding: 0,
									}}
								>
									关闭
								</button>
							</div>
						)}

						<div ref={messagesEndRef} />
					</div>
				)}
			</div>

			{/* Quick actions */}
			{messages.length > 0 && (
				<QuickActionBar
					hasAnswer={answerVisible}
					onAction={handleQuickAction}
					disabled={isStreaming}
				/>
			)}

			{/* Input area */}
			<div
				style={{
					padding: "10px 12px",
					borderTop: messages.length > 0 ? "none" : "1px solid var(--border-subtle)",
					background: "var(--surface)",
					display: "flex",
					flexDirection: "column",
					gap: 6,
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "flex-end",
						gap: 8,
						padding: "8px 10px",
						borderRadius: 12,
						border: "1px solid var(--border)",
						background: "var(--surface-2)",
						transition: "border-color 0.15s, box-shadow 0.15s",
					}}
					onFocusCapture={(e) => {
						(e.currentTarget as HTMLElement).style.borderColor = "var(--primary)";
						(e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px var(--primary-light)";
					}}
					onBlurCapture={(e) => {
						(e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
						(e.currentTarget as HTMLElement).style.boxShadow = "none";
					}}
				>
					<textarea
						ref={inputRef}
						value={input}
						onChange={(e) => {
							setInput(e.target.value);
							// Auto-resize
							e.target.style.height = "auto";
							e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
						}}
						onKeyDown={handleKeyDown}
						placeholder={isStreaming ? "AI 正在回复…" : "输入问题，Enter 发送，Shift+Enter 换行"}
						disabled={isStreaming}
						rows={1}
						style={{
							flex: 1,
							background: "none",
							border: "none",
							outline: "none",
							color: "var(--text)",
							fontSize: 13,
							lineHeight: 1.5,
							resize: "none",
							fontFamily: "var(--font-sans)",
							minHeight: 22,
							maxHeight: 120,
							overflowY: "auto",
						}}
					/>
					<button
						onClick={isStreaming ? undefined : () => handleSend()}
						disabled={!isStreaming && !input.trim()}
						style={{
							width: 30,
							height: 30,
							borderRadius: 8,
							border: "none",
							background:
								isStreaming
									? "var(--danger)"
									: input.trim()
										? "var(--primary)"
										: "var(--surface-3)",
							color:
								isStreaming || input.trim() ? "white" : "var(--text-3)",
							cursor: isStreaming ? "pointer" : input.trim() ? "pointer" : "default",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
							transition: "background 0.15s",
						}}
					>
						{isStreaming ? <IconStop /> : <IconSend />}
					</button>
				</div>

				<p style={{ fontSize: 10, color: "var(--text-3)", textAlign: "center" }}>
					AI 回答仅供参考，请结合实际情况判断 · {config.model}
				</p>
			</div>
		</div>
	);
}

// ─── Panel Header ─────────────────────────────────────────────────────────────

function PanelHeader({
	title,
	hasMessages,
	onClear,
	model,
}: {
	title: string;
	hasMessages: boolean;
	onClear: () => void;
	model?: string;
}) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "12px 14px",
				borderBottom: "1px solid var(--border-subtle)",
				flexShrink: 0,
				background: "var(--surface)",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: 7 }}>
				<div
					style={{
						width: 24,
						height: 24,
						borderRadius: 7,
						background: "var(--primary-light)",
						color: "var(--primary)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<IconBot />
				</div>
				<span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
					{title}
				</span>
				{model && (
					<span
						style={{
							fontSize: 10,
							padding: "1px 6px",
							borderRadius: 4,
							background: "var(--surface-3)",
							color: "var(--text-3)",
							border: "1px solid var(--border-subtle)",
							fontFamily: "var(--font-mono)",
							maxWidth: 100,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{model}
					</span>
				)}
			</div>

			{hasMessages && (
				<button
					onClick={onClear}
					title="清除对话"
					style={{
						width: 26,
						height: 26,
						borderRadius: 7,
						border: "none",
						background: "transparent",
						color: "var(--text-3)",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						transition: "all 0.15s",
					}}
					onMouseEnter={(e) => {
						(e.currentTarget as HTMLElement).style.background = "var(--danger-light)";
						(e.currentTarget as HTMLElement).style.color = "var(--danger)";
					}}
					onMouseLeave={(e) => {
						(e.currentTarget as HTMLElement).style.background = "transparent";
						(e.currentTarget as HTMLElement).style.color = "var(--text-3)";
					}}
				>
					<IconClear />
				</button>
			)}
		</div>
	);
}

// ─── CSS for dot animation ────────────────────────────────────────────────────

const dotStyle = (
	<style>{`
    @keyframes ai-dot-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-4px); opacity: 1; }
    }
  `}</style>
);

// Export a wrapper that includes the style
export function AIPanelWithStyles(props: AIPanelProps) {
	return (
		<>
			{dotStyle}
			<AIPanel {...props} />
		</>
	);
}
