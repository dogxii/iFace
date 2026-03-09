import { useCallback, useEffect, useReducer, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIConfig {
	enabled: boolean;
	apiKey: string;
	baseUrl: string;
	model: string;
	temperature: number;
	maxTokens: number;
}

export interface AIMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

export interface AISession {
	questionId: string;
	messages: AIMessage[];
	createdAt: number;
	updatedAt: number;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "iface_ai_config";
const SESSIONS_KEY = "iface_ai_sessions";

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_AI_CONFIG: AIConfig = {
	enabled: false,
	apiKey: "",
	baseUrl: "https://api.openai.com/v1",
	model: "gpt-4o-mini",
	temperature: 0.7,
	maxTokens: 2000,
};

export const PRESET_MODELS = [
	{ label: "GPT-4o Mini", value: "gpt-4o-mini" },
	{ label: "GPT-4o", value: "gpt-4o" },
	{ label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
	{ label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-20241022" },
	{ label: "Claude 3 Haiku", value: "claude-3-haiku-20240307" },
	{ label: "DeepSeek Chat", value: "deepseek-chat" },
	{ label: "Qwen Turbo", value: "qwen-turbo" },
	{ label: "自定义", value: "custom" },
];

export const PRESET_BASE_URLS = [
	{ label: "OpenAI 官方", value: "https://api.openai.com/v1" },
	{ label: "Anthropic", value: "https://api.anthropic.com/v1" },
	{ label: "DeepSeek", value: "https://api.deepseek.com/v1" },
	{ label: "阿里云 DashScope", value: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
	{ label: "自定义", value: "custom" },
];

// ─── Persistence Helpers ──────────────────────────────────────────────────────

function loadConfig(): AIConfig {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULT_AI_CONFIG };
		const parsed = JSON.parse(raw);
		return { ...DEFAULT_AI_CONFIG, ...parsed };
	} catch {
		return { ...DEFAULT_AI_CONFIG };
	}
}

function saveConfig(config: AIConfig): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
	} catch {}
}

function loadSessions(): Record<string, AISession> {
	try {
		const raw = localStorage.getItem(SESSIONS_KEY);
		if (!raw) return {};
		return JSON.parse(raw);
	} catch {
		return {};
	}
}

function saveSessions(sessions: Record<string, AISession>): void {
	try {
		// Keep only the 50 most recent sessions to avoid storage bloat
		const entries = Object.entries(sessions).sort(
			([, a], [, b]) => b.updatedAt - a.updatedAt,
		);
		const trimmed = Object.fromEntries(entries.slice(0, 50));
		localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
	} catch {}
}

// ─── State ────────────────────────────────────────────────────────────────────

interface AIStoreState {
	config: AIConfig;
	sessions: Record<string, AISession>;
	streaming: boolean;
	streamingQuestionId: string | null;
}

type AIAction =
	| { type: "SET_CONFIG"; config: Partial<AIConfig> }
	| { type: "RESET_CONFIG" }
	| { type: "ADD_MESSAGE"; questionId: string; message: AIMessage }
	| { type: "CLEAR_SESSION"; questionId: string }
	| { type: "CLEAR_ALL_SESSIONS" }
	| { type: "SET_STREAMING"; streaming: boolean; questionId: string | null }
	| { type: "INIT"; config: AIConfig; sessions: Record<string, AISession> };

function reducer(state: AIStoreState, action: AIAction): AIStoreState {
	switch (action.type) {
		case "INIT":
			return { ...state, config: action.config, sessions: action.sessions };

		case "SET_CONFIG":
			return { ...state, config: { ...state.config, ...action.config } };

		case "RESET_CONFIG":
			return { ...state, config: { ...DEFAULT_AI_CONFIG } };

		case "ADD_MESSAGE": {
			const existing = state.sessions[action.questionId];
			const now = Date.now();
			const session: AISession = existing
				? {
						...existing,
						messages: [...existing.messages, action.message],
						updatedAt: now,
					}
				: {
						questionId: action.questionId,
						messages: [action.message],
						createdAt: now,
						updatedAt: now,
					};
			return {
				...state,
				sessions: { ...state.sessions, [action.questionId]: session },
			};
		}

		case "CLEAR_SESSION": {
			const next = { ...state.sessions };
			delete next[action.questionId];
			return { ...state, sessions: next };
		}

		case "CLEAR_ALL_SESSIONS":
			return { ...state, sessions: {} };

		case "SET_STREAMING":
			return {
				...state,
				streaming: action.streaming,
				streamingQuestionId: action.questionId,
			};

		default:
			return state;
	}
}

// ─── System Prompt Builder ────────────────────────────────────────────────────

export function buildSystemPrompt(): string {
	return `你是一位专业的前端面试教练，专注于帮助候选人更好地理解和回答前端技术面试题。

你的职责：
1. **解析题目**：深度分析题目考察的核心知识点和出题意图
2. **优化答案**：帮助候选人组织更清晰、更有层次的答案结构
3. **面试技巧**：提供实际面试中如何表达、展现思路的建议
4. **延伸拓展**：指出相关的高频考点和潜在追问方向
5. **纠正误区**：指出候选人理解中的偏差或不完整的地方

回答风格：
- 使用中文回复
- 结构清晰，善用列表和要点
- 结合实际项目经验给出建议
- 区分"能说出来"和"深刻理解"的差异
- 对于代码题，提供思路分析和关键代码片段

注意：你是辅助工具，重点是帮助候选人真正理解知识，而不是简单地背诵答案。`;
}

export function buildQuestionContext(
	question: string,
	module: string,
	difficulty: number,
	referenceAnswer?: string,
): string {
	const diffLabel = ["", "初级", "中级", "高级"][difficulty] ?? "未知";
	let ctx = `**当前面试题**\n- 模块：${module}\n- 难度：${diffLabel}\n- 题目：${question}`;
	if (referenceAnswer) {
		ctx += `\n\n**参考答案（系统提供）**\n${referenceAnswer}`;
	}
	return ctx;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAIStore() {
	const [state, dispatch] = useReducer(reducer, {
		config: loadConfig(),
		sessions: loadSessions(),
		streaming: false,
		streamingQuestionId: null,
	});

	const stateRef = useRef(state);
	stateRef.current = state;

	// Persist config on change
	useEffect(() => {
		saveConfig(state.config);
	}, [state.config]);

	// Persist sessions on change
	useEffect(() => {
		saveSessions(state.sessions);
	}, [state.sessions]);

	// ─── Config Actions ───────────────────────────────────────────────────────

	const updateConfig = useCallback((patch: Partial<AIConfig>) => {
		dispatch({ type: "SET_CONFIG", config: patch });
	}, []);

	const resetConfig = useCallback(() => {
		dispatch({ type: "RESET_CONFIG" });
	}, []);

	// ─── Session Actions ──────────────────────────────────────────────────────

	const getSession = useCallback(
		(questionId: string): AISession | undefined =>
			stateRef.current.sessions[questionId],
		[],
	);

	const getMessages = useCallback(
		(questionId: string): AIMessage[] =>
			stateRef.current.sessions[questionId]?.messages ?? [],
		[],
	);

	const clearSession = useCallback((questionId: string) => {
		dispatch({ type: "CLEAR_SESSION", questionId });
	}, []);

	const clearAllSessions = useCallback(() => {
		dispatch({ type: "CLEAR_ALL_SESSIONS" });
	}, []);

	// ─── AI Chat ──────────────────────────────────────────────────────────────

	const sendMessage = useCallback(
		async (
			questionId: string,
			userMessage: string,
			contextMessages: AIMessage[],
			onChunk: (chunk: string) => void,
			onDone: (fullText: string) => void,
			onError: (error: string) => void,
		): Promise<void> => {
			const { config } = stateRef.current;

			if (!config.apiKey.trim()) {
				onError("请先在设置中配置 API Key");
				return;
			}

			if (!config.enabled) {
				onError("请先在设置中启用 AI 功能");
				return;
			}

			dispatch({ type: "SET_STREAMING", streaming: true, questionId });

			// Add user message to store
			const userMsg: AIMessage = { role: "user", content: userMessage };
			dispatch({ type: "ADD_MESSAGE", questionId, message: userMsg });

			const messages: AIMessage[] = [
				{ role: "system", content: buildSystemPrompt() },
				...contextMessages,
				userMsg,
			];

			try {
				const response = await fetch(`${config.baseUrl}/chat/completions`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${config.apiKey}`,
					},
					body: JSON.stringify({
						model: config.model,
						messages,
						temperature: config.temperature,
						max_tokens: config.maxTokens,
						stream: true,
					}),
				});

				if (!response.ok) {
					const errText = await response.text();
					let errMsg = `API 请求失败 (${response.status})`;
					try {
						const errJson = JSON.parse(errText);
						errMsg = errJson?.error?.message ?? errMsg;
					} catch {}
					throw new Error(errMsg);
				}

				const reader = response.body?.getReader();
				if (!reader) throw new Error("无法读取响应流");

				const decoder = new TextDecoder();
				let fullText = "";

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value, { stream: true });
					const lines = chunk.split("\n");

					for (const line of lines) {
						if (!line.startsWith("data: ")) continue;
						const data = line.slice(6).trim();
						if (data === "[DONE]") continue;

						try {
							const parsed = JSON.parse(data);
							const delta = parsed.choices?.[0]?.delta?.content ?? "";
							if (delta) {
								fullText += delta;
								onChunk(delta);
							}
						} catch {}
					}
				}

				// Save assistant reply to store
				const assistantMsg: AIMessage = {
					role: "assistant",
					content: fullText,
				};
				dispatch({ type: "ADD_MESSAGE", questionId, message: assistantMsg });
				onDone(fullText);
			} catch (err) {
				const errMsg = err instanceof Error ? err.message : "未知错误";
				onError(errMsg);
			} finally {
				dispatch({ type: "SET_STREAMING", streaming: false, questionId: null });
			}
		},
		[],
	);

	// ─── Quick Actions (preset prompts) ──────────────────────────────────────

	const getQuickActions = useCallback(
		(hasAnswer: boolean) => [
			{
				id: "analyze",
				label: "分析考点",
				icon: "🎯",
				prompt: "请分析这道题的核心考察点，以及面试官想通过这道题了解候选人哪些能力？",
			},
			{
				id: "structure",
				label: "答题结构",
				icon: "📝",
				prompt: "请给我一个清晰的答题框架和结构，让我在面试中能有条理地回答这道题。",
			},
			...(hasAnswer
				? [
						{
							id: "improve",
							label: "优化答案",
							icon: "✨",
							prompt: "请帮我优化参考答案，使其更适合在面试中口头表达，并指出哪些点是加分项。",
						},
					]
				: []),
			{
				id: "followup",
				label: "追问预测",
				icon: "🔮",
				prompt: "面试官通常会在这道题上做哪些追问？请列出 3-5 个高频追问及简要回答思路。",
			},
			{
				id: "pitfalls",
				label: "踩坑提醒",
				icon: "⚠️",
				prompt: "回答这道题时有哪些常见的误区和陷阱？我应该注意避免哪些错误？",
			},
			{
				id: "practice",
				label: "模拟面试",
				icon: "🎤",
				prompt: "请模拟面试官的角色，对我进行关于这道题的追问式面试练习，一次只问一个问题。",
			},
		],
		[],
	);

	return {
		config: state.config,
		sessions: state.sessions,
		streaming: state.streaming,
		streamingQuestionId: state.streamingQuestionId,

		// Config
		updateConfig,
		resetConfig,

		// Sessions
		getSession,
		getMessages,
		clearSession,
		clearAllSessions,

		// AI
		sendMessage,
		getQuickActions,
	};
}
