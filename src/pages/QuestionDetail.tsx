import { useCallback, useEffect, useRef, useState } from "react";
import {
	Link,
	useNavigate,
	useParams,
	useSearchParams,
} from "react-router-dom";
import { AIPanelWithStyles } from "@/components/ui/AIPanel";
import { Button, Kbd, Skeleton, Spinner } from "@/components/ui";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { useQuestion } from "@/hooks/useQuestions";
import { useAIStore } from "@/store/useAIStore";
import { useStudyStore } from "@/store/useStudyStore";
import {
	DIFFICULTY_LABELS,
	DIFFICULTY_STYLES,
	type StudyStatus,
} from "@/types";
import { SettingsDrawer } from "@/components/layout/SettingsDrawer";

// ─── Status Action Button ─────────────────────────────────────────────────────

interface StatusButtonProps {
	onClick: () => void;
	label: string;
	sublabel: string;
	variant: "danger" | "warning" | "success";
	kbd: string;
	active: boolean;
	disabled?: boolean;
}

function StatusButton({
	onClick,
	label,
	sublabel,
	variant,
	kbd: kbdKey,
	active,
	disabled,
}: StatusButtonProps) {
	const colors = {
		danger: {
			base: "border-rose-500/20 text-rose-500",
			active:
				"bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/25",
			hover: "hover:bg-rose-500/10",
		},
		warning: {
			base: "border-amber-500/20 text-amber-500",
			active:
				"bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/25",
			hover: "hover:bg-amber-500/10",
		},
		success: {
			base: "border-emerald-500/20 text-emerald-500",
			active:
				"bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25",
			hover: "hover:bg-emerald-500/10",
		},
	};

	const c = colors[variant];

	return (
		<button
			onClick={onClick}
			disabled={disabled}
			className={`
        flex-1 flex flex-col items-center justify-center gap-1
        px-3 py-3 rounded-xl border text-center
        transition-all duration-200 cursor-pointer
        active:scale-95 disabled:opacity-40 disabled:pointer-events-none
        ${active ? c.active : `${c.base} ${c.hover} bg-transparent`}
      `}
		>
			<div className="flex items-center gap-1.5">
				<span className="text-sm font-semibold">{label}</span>
				<span
					style={{
						fontSize: 10,
						fontFamily: "var(--font-mono)",
						padding: "1px 4px",
						borderRadius: 4,
						border: "1px solid",
						borderColor: active ? "rgba(255,255,255,0.3)" : "var(--border)",
						background: active ? "rgba(255,255,255,0.2)" : "var(--surface-2)",
					}}
				>
					{kbdKey}
				</span>
			</div>
			<span className={`text-xs ${active ? "opacity-80" : "opacity-60"}`}>
				{sublabel}
			</span>
		</button>
	);
}

// ─── Progress indicator (for practice session) ────────────────────────────────

interface SessionProgressProps {
	current: number;
	total: number;
	onExit: () => void;
}

function SessionProgress({ current, total, onExit }: SessionProgressProps) {
	const percent = total > 0 ? (current / total) * 100 : 0;

	return (
		<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
			<button
				onClick={onExit}
				style={{
					display: "flex",
					alignItems: "center",
					gap: 6,
					fontSize: 12,
					color: "var(--text-2)",
					background: "none",
					border: "none",
					cursor: "pointer",
					padding: 0,
				}}
			>
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
					<line x1="19" y1="12" x2="5" y2="12" />
					<polyline points="12 19 5 12 12 5" />
				</svg>
				退出练习
			</button>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 8,
					marginLeft: "auto",
				}}
			>
				<div
					style={{
						width: 80,
						height: 4,
						background: "var(--border)",
						borderRadius: 99,
						overflow: "hidden",
					}}
				>
					<div
						style={{
							height: "100%",
							background: "var(--primary)",
							borderRadius: 99,
							width: `${percent}%`,
							transition: "width 0.4s var(--ease-out)",
						}}
					/>
				</div>
				<span
					style={{
						fontSize: 12,
						fontWeight: 500,
						color: "var(--text-2)",
						fontVariantNumeric: "tabular-nums",
						whiteSpace: "nowrap",
					}}
				>
					{current} / {total}
				</span>
			</div>
		</div>
	);
}

// ─── Shortcut hint bar ────────────────────────────────────────────────────────

function ShortcutHints({ answerVisible }: { answerVisible: boolean }) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 12,
				flexWrap: "wrap",
				fontSize: 12,
				color: "var(--text-3)",
			}}
		>
			{!answerVisible && (
				<span className="flex items-center gap-1">
					<Kbd>Space</Kbd>
					<span>查看答案</span>
				</span>
			)}
			{answerVisible && (
				<>
					<span className="flex items-center gap-1">
						<Kbd>1</Kbd>
						<span>没掌握</span>
					</span>
					<span className="flex items-center gap-1">
						<Kbd>2</Kbd>
						<span>大概会</span>
					</span>
					<span className="flex items-center gap-1">
						<Kbd>3</Kbd>
						<span>完全掌握</span>
					</span>
				</>
			)}
			<span className="flex items-center gap-1">
				<Kbd>→</Kbd>
				<span>下一题</span>
			</span>
			<span className="flex items-center gap-1">
				<Kbd>←</Kbd>
				<span>上一题</span>
			</span>
		</div>
	);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuestionDetail() {
	const { id } = useParams<{ id: string }>();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const { question, loading } = useQuestion(id);
	const { getStatus, setStatus, getRecord } = useStudyStore();
	const { config: aiConfig } = useAIStore();

	const [answerVisible, setAnswerVisible] = useState(false);
	const [marking, setMarking] = useState(false);
	const [justMarked, setJustMarked] = useState<StudyStatus | null>(null);
	const [lastPressedKey, setLastPressedKey] = useState<"1" | "2" | "3" | null>(null);
	const [aiPanelOpen, setAiPanelOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const answerRef = useRef<HTMLDivElement>(null);

	// ── Session context (from ?ids=... or ?prev=...&next=... params) ──
	const sessionIds = searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
	const isInSession = sessionIds.length > 0;
	const sessionIndex = isInSession ? sessionIds.indexOf(id ?? "") : -1;
	const prevId =
		isInSession && sessionIndex > 0
			? sessionIds[sessionIndex - 1]
			: searchParams.get("prev");
	const nextId =
		isInSession && sessionIndex < sessionIds.length - 1
			? sessionIds[sessionIndex + 1]
			: searchParams.get("next");
	const sessionCurrent = sessionIndex + 1;
	const sessionTotal = sessionIds.length;

	// Reset answer visibility on question change
	useEffect(() => {
		setAnswerVisible(false);
		setJustMarked(null);
		setLastPressedKey(null);
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, [id]);

	const currentStatus = id ? getStatus(id) : "unlearned";
	const record = id ? getRecord(id) : undefined;

	const handleSetStatus = useCallback(
		async (status: StudyStatus, key?: "1" | "2" | "3") => {
			if (!id || marking) return;
			setMarking(true);
			setJustMarked(status);
			if (key) setLastPressedKey(key);
			await setStatus(id, status);
			setMarking(false);

			// Auto-advance after marking (in session mode)
			if (isInSession && nextId) {
				setTimeout(() => {
					const idsParam =
						sessionIds.length > 0 ? `?ids=${sessionIds.join(",")}` : "";
					navigate(`/questions/${nextId}${idsParam}`);
				}, 600);
			}
		},
		[id, marking, setStatus, isInSession, nextId, navigate, sessionIds],
	);

	const handleRevealAnswer = useCallback(() => {
		setAnswerVisible(true);
		// Reset marking state when revealing answer for a fresh question
		setJustMarked(null);
		setLastPressedKey(null);
	}, []);

	const navigateTo = useCallback(
		(targetId: string | null | undefined) => {
			if (!targetId) return;
			const idsParam =
				sessionIds.length > 0 ? `?ids=${sessionIds.join(",")}` : "";
			navigate(`/questions/${targetId}${idsParam}`);
		},
		[navigate, sessionIds],
	);

	// ── Keyboard shortcuts ──
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			// Ignore when typing in input/textarea
			const tag = (document.activeElement as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA") return;

			switch (e.key) {
				case " ":
					e.preventDefault();
					if (!answerVisible) handleRevealAnswer();
					break;
				case "1":
					if (answerVisible) handleSetStatus("review", "1");
					break;
				case "2":
					if (answerVisible) handleSetStatus("review", "2");
					break;
				case "3":
					if (answerVisible) handleSetStatus("mastered", "3");
					break;
				case "ArrowRight":
					e.preventDefault();
					navigateTo(nextId);
					break;
				case "ArrowLeft":
					e.preventDefault();
					navigateTo(prevId);
					break;
				default:
					break;
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [
		answerVisible,
		handleRevealAnswer,
		handleSetStatus,
		navigateTo,
		nextId,
		prevId,
	]);

	// ─── Loading state ─────────────────────────────────────────────────────────

	if (loading) {
		return (
			<div
				className="page-container animate-fade-in"
				style={{
					maxWidth: 760,
					display: "flex",
					flexDirection: "column",
					gap: 16,
				}}
			>
				<Skeleton width={180} height={13} />
				<div
					className="card"
					style={{
						padding: 24,
						display: "flex",
						flexDirection: "column",
						gap: 14,
					}}
				>
					<div style={{ display: "flex", gap: 8 }}>
						<Skeleton width={60} height={22} rounded="md" />
						<Skeleton width={48} height={22} rounded="md" />
					</div>
					<Skeleton width="80%" height={20} />
					<Skeleton width="60%" height={20} />
					<Skeleton width="70%" height={20} />
				</div>
			</div>
		);
	}

	if (!question) {
		return (
			<div className="page-container" style={{ maxWidth: 760 }}>
				<div
					className="card"
					style={{ padding: "48px 24px", textAlign: "center" }}
				>
					<p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
						找不到该题目
					</p>
					<p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 24 }}>
						题目 ID: {id}
					</p>
					<Link to="/questions">
						<Button variant="primary" size="sm">
							返回题库
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	const diffStyle = DIFFICULTY_STYLES[question.difficulty];
	const isAiEnabled = aiConfig.enabled && aiConfig.apiKey.trim().length > 0;

	return (
		<>
		<div
			className="page-container"
			style={{
				maxWidth: aiPanelOpen ? 1200 : 760,
				transition: "max-width 0.3s var(--ease-out)",
				display: "flex",
				flexDirection: aiPanelOpen ? "row" : "column",
				gap: aiPanelOpen ? 20 : 16,
				alignItems: "flex-start",
			}}
		>
		{/* Main content column */}
		<div
			style={{
				flex: 1,
				minWidth: 0,
				display: "flex",
				flexDirection: "column",
				gap: 16,
			}}
		>
				{/* ── Breadcrumb / Session progress ── */}
			<div className="animate-fade-in">
				{isInSession ? (
					<SessionProgress
						current={sessionCurrent}
						total={sessionTotal}
						onExit={() => navigate("/practice")}
					/>
				) : (
					<nav
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							fontSize: 13,
							color: "var(--text-3)",
						}}
					>
						<Link
							to="/questions"
							style={{ color: "var(--text-3)", textDecoration: "none" }}
							onMouseEnter={(e) => {
								(e.currentTarget as HTMLElement).style.color = "var(--primary)";
							}}
							onMouseLeave={(e) => {
								(e.currentTarget as HTMLElement).style.color = "var(--text-3)";
							}}
						>
							题库
						</Link>
						<svg
							width="10"
							height="10"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							style={{ opacity: 0.4 }}
						>
							<polyline points="9 18 15 12 9 6" />
						</svg>
						<Link
							to={`/questions?module=${encodeURIComponent(question.module)}`}
							style={{ color: "var(--text-3)", textDecoration: "none" }}
							onMouseEnter={(e) => {
								(e.currentTarget as HTMLElement).style.color = "var(--primary)";
							}}
							onMouseLeave={(e) => {
								(e.currentTarget as HTMLElement).style.color = "var(--text-3)";
							}}
						>
							{question.module}
						</Link>
						<svg
							width="10"
							height="10"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							style={{ opacity: 0.4 }}
						>
							<polyline points="9 18 15 12 9 6" />
						</svg>
						<span
							style={{
								color: "var(--text-2)",
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
								maxWidth: 200,
							}}
						>
							{question.question.slice(0, 30)}…
						</span>
					</nav>
				)}
			</div>

				{/* ── Question Card ── */}
				<div
					className="card animate-fade-in stagger-1"
					style={{
						padding: 24,
						display: "flex",
						flexDirection: "column",
						gap: 16,
					}}
				>
					{/* Meta */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
							flexWrap: "wrap",
						}}
					>
						<span
							style={{
								fontSize: 12,
								fontWeight: 500,
								color: "var(--text-2)",
								padding: "3px 10px",
								borderRadius: 6,
								background: "var(--surface-3)",
								border: "1px solid var(--border-subtle)",
							}}
						>
							{question.module}
						</span>

						<span
							style={{
								fontSize: 12,
								fontWeight: 500,
								padding: "3px 10px",
								borderRadius: 6,
								border: "1px solid",
								color: diffStyle.color,
								background: diffStyle.background,
								borderColor: diffStyle.borderColor,
							}}
						>
							{DIFFICULTY_LABELS[question.difficulty]}
						</span>

						{question.source && (
							<span
								style={{
									fontSize: 11,
									padding: "2px 8px",
									borderRadius: 5,
									background: "var(--primary-light)",
									color: "var(--primary)",
									border: "1px solid rgba(var(--primary-rgb),0.2)",
								}}
							>
								{question.source}
							</span>
						)}

						{currentStatus !== "unlearned" && (
							<span
								style={{
									fontSize: 11,
									fontWeight: 500,
									padding: "2px 8px",
									borderRadius: 5,
									background:
										currentStatus === "mastered"
											? "var(--success-light)"
											: "var(--warning-light)",
									color:
										currentStatus === "mastered"
											? "var(--success)"
											: "var(--warning)",
									border: `1px solid ${currentStatus === "mastered" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
								}}
							>
								{currentStatus === "mastered" ? "已掌握" : "待复习"}
							</span>
						)}

						{record && (
							<span
								style={{
									fontSize: 12,
									color: "var(--text-3)",
									marginLeft: "auto",
								}}
							>
								已复习 {record.reviewCount} 次
							</span>
						)}
					</div>

					{/* Question text */}
					<h1
						style={{
							fontSize: 17,
							fontWeight: 600,
							color: "var(--text)",
							lineHeight: 1.65,
							letterSpacing: "-0.005em",
						}}
					>
						{question.question}
					</h1>

					{/* Tags */}
					{question.tags.length > 0 && (
						<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
							{question.tags.map((tag) => (
								<span
									key={tag}
									style={{
										fontSize: 11,
										padding: "2px 8px",
										borderRadius: 5,
										border: "1px solid var(--border-subtle)",
										color: "var(--text-3)",
									}}
								>
									#{tag}
								</span>
							))}
						</div>
					)}

					{/* Reveal button */}
					{!answerVisible && (
						<button
							onClick={handleRevealAnswer}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: 8,
								width: "100%",
								padding: "14px",
								borderRadius: 12,
								border: "2px dashed var(--border)",
								background: "transparent",
								color: "var(--text-2)",
								cursor: "pointer",
								fontSize: 14,
								fontWeight: 500,
								transition: "all 0.18s",
								marginTop: 4,
							}}
							onMouseEnter={(e) => {
								const el = e.currentTarget as HTMLElement;
								el.style.borderColor = `rgba(var(--primary-rgb), 0.5)`;
								el.style.color = "var(--primary)";
								el.style.background = "var(--primary-light)";
							}}
							onMouseLeave={(e) => {
								const el = e.currentTarget as HTMLElement;
								el.style.borderColor = "var(--border)";
								el.style.color = "var(--text-2)";
								el.style.background = "transparent";
							}}
						>
							<svg
								width="15"
								height="15"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
								<circle cx="12" cy="12" r="3" />
							</svg>
							查看参考答案
							<Kbd>Space</Kbd>
						</button>
					)}
				</div>

				{/* ── Answer Card ── */}
				{answerVisible && (
					<div
						ref={answerRef}
						className="card animate-scale-in"
						style={{
							padding: 24,
							display: "flex",
							flexDirection: "column",
							gap: 20,
						}}
					>
						{/* Answer header */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 10,
								paddingBottom: 14,
								borderBottom: "1px solid var(--border-subtle)",
							}}
						>
							<div
								style={{
									width: 3,
									height: 18,
									borderRadius: 99,
									background: "var(--primary)",
									flexShrink: 0,
								}}
							/>
							<h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
								参考答案
							</h2>
						</div>

						{/* Markdown content */}
						<div className="prose" style={{ minWidth: 0 }}>
							<MarkdownRenderer content={question.answer} />
						</div>

						{/* ── Status actions ── */}
						<div
							style={{
								paddingTop: 16,
								borderTop: "1px solid var(--border-subtle)",
								display: "flex",
								flexDirection: "column",
								gap: 12,
							}}
						>
							<p
								style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}
							>
								你掌握了吗？
							</p>

							<div className="flex gap-2">
								<StatusButton
									onClick={() => handleSetStatus("review", "1")}
									label="没掌握"
									sublabel="加入待复习"
									variant="danger"
									kbd="1"
									active={
										(justMarked === "review" && lastPressedKey === "1") ||
										(currentStatus === "review" && lastPressedKey !== "2" && justMarked !== "review")
									}
									disabled={marking}
								/>
								<StatusButton
									onClick={() => handleSetStatus("review", "2")}
									label="大概会"
									sublabel="还需巩固"
									variant="warning"
									kbd="2"
									active={justMarked === "review" && lastPressedKey === "2"}
									disabled={marking}
								/>
								<StatusButton
									onClick={() => handleSetStatus("mastered", "3")}
									label="完全掌握"
									sublabel="不再推荐"
									variant="success"
									kbd="3"
									active={
										justMarked === "mastered" || currentStatus === "mastered"
									}
									disabled={marking}
								/>
							</div>

							{marking && (
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: 8,
										fontSize: 12,
										color: "var(--text-3)",
									}}
								>
									<Spinner size="sm" />
									<span>保存中…</span>
								</div>
							)}
						</div>
					</div>
				)}

				{/* ── AI Button (floating, shows when AI is configured) ── */}
				<div
					className="animate-fade-in stagger-2"
					style={{
						display: "flex",
						justifyContent: "center",
					}}
				>
					<button
						onClick={() => setAiPanelOpen((v) => !v)}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 7,
							padding: "8px 16px",
							borderRadius: 10,
							border: `1px solid ${aiPanelOpen ? "rgba(var(--primary-rgb),0.4)" : "var(--border-subtle)"}`,
							background: aiPanelOpen ? "var(--primary-light)" : "var(--surface-2)",
							color: aiPanelOpen ? "var(--primary)" : isAiEnabled ? "var(--text-2)" : "var(--text-3)",
							fontSize: 13,
							fontWeight: 500,
							cursor: "pointer",
							transition: "all 0.18s",
						}}
						onMouseEnter={(e) => {
							if (!aiPanelOpen) {
								(e.currentTarget as HTMLElement).style.background = "var(--primary-light)";
								(e.currentTarget as HTMLElement).style.color = "var(--primary)";
								(e.currentTarget as HTMLElement).style.borderColor = "rgba(var(--primary-rgb),0.3)";
							}
						}}
						onMouseLeave={(e) => {
							if (!aiPanelOpen) {
								(e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
								(e.currentTarget as HTMLElement).style.color = isAiEnabled ? "var(--text-2)" : "var(--text-3)";
								(e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
							}
						}}
					>
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
						{aiPanelOpen ? "关闭 AI 助手" : isAiEnabled ? "AI 分析" : "AI 助手（未配置）"}
						{!isAiEnabled && (
							<span
								style={{
									fontSize: 10,
									padding: "1px 6px",
									borderRadius: 4,
									background: "var(--surface-3)",
									color: "var(--text-3)",
									border: "1px solid var(--border-subtle)",
								}}
							>
								去设置
							</span>
						)}
					</button>
				</div>

				{/* ── Keyboard shortcuts ── */}
				<div className="animate-fade-in stagger-3">
					<ShortcutHints answerVisible={answerVisible} />
				</div>

				{/* ── Navigation ── */}
				<div
					className="animate-fade-in stagger-4"
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						paddingTop: 8,
					}}
				>
					<button
						onClick={() => navigateTo(prevId)}
						disabled={!prevId}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							padding: "7px 12px",
							borderRadius: 8,
							fontSize: 13,
							color: "var(--text-2)",
							background: "none",
							border: "none",
							cursor: "pointer",
							transition: "background 0.15s, color 0.15s",
							opacity: !prevId ? 0.3 : 1,
							pointerEvents: !prevId ? "none" : "auto",
						}}
						onMouseEnter={(e) => {
							(e.currentTarget as HTMLElement).style.background =
								"var(--surface-2)";
							(e.currentTarget as HTMLElement).style.color = "var(--text)";
						}}
						onMouseLeave={(e) => {
							(e.currentTarget as HTMLElement).style.background = "none";
							(e.currentTarget as HTMLElement).style.color = "var(--text-2)";
						}}
					>
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
							<line x1="19" y1="12" x2="5" y2="12" />
							<polyline points="12 19 5 12 12 5" />
						</svg>
						上一题
					</button>

					<Link
						to="/questions"
						style={{
							fontSize: 12,
							color: "var(--text-3)",
							textDecoration: "none",
						}}
						onMouseEnter={(e) => {
							(e.currentTarget as HTMLElement).style.color = "var(--primary)";
						}}
						onMouseLeave={(e) => {
							(e.currentTarget as HTMLElement).style.color = "var(--text-3)";
						}}
					>
						返回列表
					</Link>

					<button
						onClick={() => navigateTo(nextId)}
						disabled={!nextId}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							padding: "7px 12px",
							borderRadius: 8,
							fontSize: 13,
							color: "var(--text-2)",
							background: "none",
							border: "none",
							cursor: "pointer",
							transition: "background 0.15s, color 0.15s",
							opacity: !nextId ? 0.3 : 1,
							pointerEvents: !nextId ? "none" : "auto",
						}}
						onMouseEnter={(e) => {
							(e.currentTarget as HTMLElement).style.background =
								"var(--surface-2)";
							(e.currentTarget as HTMLElement).style.color = "var(--text)";
						}}
						onMouseLeave={(e) => {
							(e.currentTarget as HTMLElement).style.background = "none";
							(e.currentTarget as HTMLElement).style.color = "var(--text-2)";
						}}
					>
						下一题
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
							<line x1="5" y1="12" x2="19" y2="12" />
							<polyline points="12 5 19 12 12 19" />
						</svg>
					</button>
				</div>
			</div>

			{/* ── AI Panel (side column) ── */}
			{aiPanelOpen && (
				<div
					style={{
						width: 380,
						flexShrink: 0,
						position: "sticky",
						top: "calc(var(--navbar-h) + 20px)",
						height: "calc(100dvh - var(--navbar-h) - 40px)",
						animation: "slide-down 0.22s var(--ease-out) both",
					}}
					className="hidden-mobile"
				>
					<AIPanelWithStyles
						question={question}
						answerVisible={answerVisible}
						onOpenSettings={() => setSettingsOpen(true)}
					/>
				</div>
			)}

			{/* Mobile AI Panel (bottom sheet) */}
			{aiPanelOpen && (
				<div
					className="show-mobile"
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 100,
						background: "rgba(0,0,0,0.4)",
						backdropFilter: "blur(2px)",
					}}
					onClick={() => setAiPanelOpen(false)}
				>
					<div
						style={{
							position: "absolute",
							bottom: 0,
							left: 0,
							right: 0,
							height: "75dvh",
							borderRadius: "16px 16px 0 0",
							overflow: "hidden",
							background: "var(--surface)",
							animation: "slide-up 0.25s var(--ease-out) both",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<AIPanelWithStyles
							question={question}
							answerVisible={answerVisible}
							onOpenSettings={() => {
								setAiPanelOpen(false);
								setSettingsOpen(true);
							}}
						/>
					</div>
				</div>
			)}

			</div>

			{/* Settings Drawer */}
			<SettingsDrawer
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
			/>
			</>
		);
	}
