import { useEffect, useMemo, useState, useCallback } from "react";

import { Link } from "react-router-dom";
import { Button, EmptyState, SegmentedRing, Skeleton } from "@/components/ui";
import { useQuestions } from "@/hooks/useQuestions";
import { useStudyStore, type StreakData } from "@/store/useStudyStore";
import { getCategoryMap, DEFAULT_CATEGORY_MAP } from "@/lib/db";
import {
	DIFFICULTY_LABELS,
	type Module,
	STATUS_LABELS,
	type StudyStatus,
} from "@/types";

// ─── Streak Banner ────────────────────────────────────────────────────────────

const STREAK_DISMISS_KEY = "iface_streak_banner_dismissed_date";

function StreakBanner({ streak, dailyGoal }: { streak: StreakData; dailyGoal: number }) {
	const [dismissed, setDismissed] = useState(() => {
		try {
			const stored = localStorage.getItem(STREAK_DISMISS_KEY);
			if (!stored) return false;
			const today = new Date().toISOString().slice(0, 10);
			return stored === today;
		} catch {
			return false;
		}
	});
	const [visible, setVisible] = useState(false);

	// Animate in after mount
	useEffect(() => {
		const t = setTimeout(() => setVisible(true), 80);
		return () => clearTimeout(t);
	}, []);

	const handleDismiss = useCallback(() => {
		try {
			const today = new Date().toISOString().slice(0, 10);
			localStorage.setItem(STREAK_DISMISS_KEY, today);
		} catch {
			// ignore
		}
		setDismissed(true);
	}, []);

	if (dismissed || streak.todayCount === 0) return null;

	// Pick the best milestone message
	const milestones: { min: number; emoji: string; msg: string; color: string; bg: string; border: string }[] = [
		{ min: 50, emoji: "🏆", msg: "史诗级连击！你已经达到传说级别！", color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.18)" },
		{ min: 20, emoji: "👑", msg: "王者连击！专注力惊人！",           color: "#6366f1", bg: "rgba(99,102,241,0.06)", border: "rgba(99,102,241,0.18)" },
		{ min: 10, emoji: "🚀", msg: "10 连击！你已进入深度专注状态！",  color: "#10b981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.18)" },
		{ min: 5,  emoji: "⚡", msg: "5 连击！手感火热，继续冲！",       color: "#6366f1", bg: "rgba(99,102,241,0.06)", border: "rgba(99,102,241,0.18)" },
		{ min: 3,  emoji: "🔥", msg: "连击开启！越刷越顺！",             color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.18)" },
		{ min: 1,  emoji: "✅", msg: "今日已作答，坚持就是胜利！",        color: "#10b981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.18)" },
	];

	const hit = milestones.find((m) => streak.currentStreak >= m.min) ?? milestones[milestones.length - 1];

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 12,
				padding: "12px 16px",
				borderRadius: 12,
				background: hit.bg,
				border: `1px solid ${hit.border}`,
				marginBottom: 20,
				opacity: visible ? 1 : 0,
				transform: visible ? "translateY(0)" : "translateY(-6px)",
				transition: "opacity 0.3s var(--ease-out), transform 0.3s var(--ease-out)",
			}}
		>
			{/* Emoji */}
			<span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{hit.emoji}</span>

			{/* Text */}
			<div style={{ flex: 1, minWidth: 0 }}>
				<p style={{ fontSize: 13, fontWeight: 600, color: hit.color, marginBottom: 1 }}>
					{hit.msg}
				</p>
				<div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
					<span style={{ fontSize: 12, color: "var(--text-3)" }}>
						今日作答{" "}
						<span style={{ fontWeight: 600, color: "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>
							{streak.todayCount}
						</span>{" "}
						题
					</span>
					{streak.currentStreak >= 2 && (
						<span style={{ fontSize: 12, color: "var(--text-3)" }}>
							🔥 当前连击{" "}
							<span style={{ fontWeight: 600, color: hit.color, fontVariantNumeric: "tabular-nums" }}>
								{streak.currentStreak}
							</span>
						</span>
					)}
					{streak.bestStreak > 0 && (
						<span style={{ fontSize: 12, color: "var(--text-3)" }}>
							最高记录{" "}
							<span style={{ fontWeight: 600, color: "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>
								{streak.bestStreak}
							</span>
						</span>
					)}
				</div>
			</div>

			{/* Progress mini bar */}
			{streak.todayCount > 0 && (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-end",
						gap: 4,
						flexShrink: 0,
					}}
				>
					<span style={{ fontSize: 11, color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
							目标 {dailyGoal} 题
						</span>
						<div style={{ width: 80, height: 4, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
							<div
								style={{
									height: "100%",
									background: hit.color,
									borderRadius: 99,
									width: `${Math.min(100, (streak.todayCount / dailyGoal) * 100)}%`,
									transition: "width 0.6s var(--ease-out)",
								}}
							/>
						</div>
						{streak.todayCount >= dailyGoal && (
							<span style={{ fontSize: 10, color: hit.color, fontWeight: 600 }}>今日目标达成 🎉</span>
						)}
				</div>
			)}

			{/* Dismiss */}
			<button
				onClick={handleDismiss}
				style={{
					background: "none",
					border: "none",
					color: "var(--text-3)",
					cursor: "pointer",
					padding: "2px 4px",
					borderRadius: 4,
					fontSize: 16,
					lineHeight: 1,
					flexShrink: 0,
					transition: "color 0.15s",
				}}
				onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
				onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; }}
				aria-label="关闭"
			>
				×
			</button>
		</div>
	);
}

// ─── Module Progress Bar ──────────────────────────────────────────────────────

function ModuleProgressBar({
	module,
	questions,
	records,
}: {
	module: Module;
	questions: { id: string }[];
	records: Record<string, { status: StudyStatus }>;
}) {
	const total = questions.length;
	const mastered = questions.filter(
		(q) => records[q.id]?.status === "mastered",
	).length;
	const review = questions.filter(
		(q) => records[q.id]?.status === "review",
	).length;
	const percent = total > 0 ? Math.round((mastered / total) * 100) : 0;

	return (
		<Link
			to={`/questions?module=${encodeURIComponent(module)}`}
			style={{
				display: "flex",
				alignItems: "center",
				gap: 12,
				padding: "8px 10px",
				borderRadius: 10,
				textDecoration: "none",
				transition: "background 0.15s",
			}}
			onMouseEnter={(e) => {
				(e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
			}}
			onMouseLeave={(e) => {
				(e.currentTarget as HTMLElement).style.background = "transparent";
			}}
		>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 5,
					}}
				>
					<span
						style={{
							fontSize: 13,
							fontWeight: 500,
							color: "var(--text)",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{module}
					</span>
					<span
						style={{
							fontSize: 11,
							color: "var(--text-3)",
							flexShrink: 0,
							marginLeft: 8,
						}}
					>
						{mastered}/{total}
					</span>
				</div>
				<div
					style={{
						height: 4,
						background: "var(--surface-3)",
						borderRadius: 99,
						overflow: "hidden",
					}}
				>
					<div
						style={{
							height: "100%",
							display: "flex",
							borderRadius: 99,
							overflow: "hidden",
						}}
					>
						{mastered > 0 && (
							<div
								style={{
									height: "100%",
									background: "var(--success)",
									width: `${(mastered / total) * 100}%`,
									transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)",
								}}
							/>
						)}
						{review > 0 && (
							<div
								style={{
									height: "100%",
									background: "var(--warning)",
									width: `${(review / total) * 100}%`,
									transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)",
								}}
							/>
						)}
					</div>
				</div>
			</div>
			<span
				style={{
					fontSize: 11,
					fontWeight: 600,
					flexShrink: 0,
					minWidth: 30,
					textAlign: "right",
					color:
						percent === 100
							? "var(--success)"
							: percent > 0
								? "var(--primary)"
								: "var(--text-3)",
					fontVariantNumeric: "tabular-nums",
				}}
			>
				{percent}%
			</span>
		</Link>
	);
}

// ─── Daily Card ───────────────────────────────────────────────────────────────

function DailyQuestionCard({
	questionId,
	index,
	questions,
	records,
}: {
	questionId: string;
	index: number;
	questions: {
		id: string;
		question: string;
		module: Module;
		difficulty: number;
		source?: string;
	}[];
	records: Record<string, { status: StudyStatus }>;
}) {
	const q = questions.find((q) => q.id === questionId);
	if (!q) return null;

	const status: StudyStatus = records[questionId]?.status ?? "unlearned";

	const diffStyle: Record<number, { color: string }> = {
		1: { color: "var(--success)" },
		2: { color: "var(--warning)" },
		3: { color: "var(--danger)" },
	};

	const statusLabel: Record<StudyStatus, string | null> = {
		unlearned: null,
		mastered: "已掌握",
		review: "待复习",
	};

	const statusColor: Record<StudyStatus, string> = {
		unlearned: "transparent",
		mastered: "var(--success)",
		review: "var(--warning)",
	};

	return (
		<Link
			to={`/questions/${q.id}`}
			className="animate-fade-in"
			style={{
				display: "flex",
				alignItems: "flex-start",
				gap: 12,
				padding: "12px 14px",
				borderRadius: 10,
				border: "1px solid var(--border-subtle)",
				textDecoration: "none",
				transition: "border-color 0.15s, background 0.15s",
				animationDelay: `${index * 0.04}s`,
				background: "var(--surface)",
				minWidth: 0,
				overflow: "hidden",
			}}
			onMouseEnter={(e) => {
				(e.currentTarget as HTMLElement).style.borderColor =
					"rgba(var(--primary-rgb), 0.3)";
				(e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
			}}
			onMouseLeave={(e) => {
				(e.currentTarget as HTMLElement).style.borderColor =
					"var(--border-subtle)";
				(e.currentTarget as HTMLElement).style.background = "var(--surface)";
			}}
		>
			{/* Index */}
			<div
				style={{
					width: 22,
					height: 22,
					borderRadius: 6,
					background: "var(--surface-3)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: 11,
					fontWeight: 600,
					color: "var(--text-3)",
					flexShrink: 0,
					marginTop: 1,
				}}
			>
				{index + 1}
			</div>

			{/* Content */}
			<div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
				<p
					style={{
						fontSize: 13,
						color: "var(--text)",
						lineHeight: 1.5,
						overflow: "hidden",
						display: "-webkit-box",
						WebkitLineClamp: 2,
						WebkitBoxOrient: "vertical",
						marginBottom: 6,
						wordBreak: "break-word",
					}}
				>
					{q.question}
				</p>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 6,
						flexWrap: "wrap",
					}}
				>
					<span style={{ fontSize: 11, color: "var(--text-3)" }}>
						{q.module}
					</span>
					<span
						style={{
							fontSize: 11,
							fontWeight: 500,
							color: diffStyle[q.difficulty]?.color ?? "var(--text-3)",
						}}
					>
						{DIFFICULTY_LABELS[q.difficulty as 1 | 2 | 3]}
					</span>
					{statusLabel[status] && (
						<span
							style={{
								fontSize: 11,
								fontWeight: 500,
								color: statusColor[status],
							}}
						>
							{statusLabel[status]}
						</span>
					)}
				</div>
			</div>

			{/* Arrow */}
			<svg
				width="13"
				height="13"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				style={{ flexShrink: 0, marginTop: 4, color: "var(--text-3)" }}
			>
				<polyline points="9 18 15 12 9 6" />
			</svg>
		</Link>
	);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
	label,
	value,
	sub,
	accentColor,
	delay = 0,
	icon,
}: {
	label: string;
	value: number | string;
	sub?: string;
	accentColor: string;
	delay?: number;
	icon: React.ReactNode;
}) {
	return (
		<div
			className="card animate-fade-in"
			style={{
				padding: "16px 18px",
				display: "flex",
				alignItems: "center",
				gap: 14,
				animationDelay: `${delay}s`,
			}}
		>
			<div
				style={{
					width: 38,
					height: 38,
					borderRadius: 10,
					background: accentColor,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
					color: "var(--text-2)",
				}}
			>
				{icon}
			</div>
			<div style={{ minWidth: 0 }}>
				<p
					style={{
						fontSize: 11,
						color: "var(--text-3)",
						marginBottom: 2,
					}}
				>
					{label}
				</p>
				<p
					style={{
						fontSize: 20,
						fontWeight: 700,
						color: "var(--text)",
						lineHeight: 1,
						fontVariantNumeric: "tabular-nums",
					}}
				>
					{value}
				</p>
				{sub && (
					<p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
						{sub}
					</p>
				)}
			</div>
		</div>
	);
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(4, 1fr)",
					gap: 12,
				}}
			>
				{Array.from({ length: 4 }).map((_, i) => (
					<div
						key={i}
						className="card"
						style={{
							padding: 16,
							display: "flex",
							alignItems: "center",
							gap: 12,
						}}
					>
						<Skeleton width={38} height={38} rounded="lg" />
						<div
							style={{
								flex: 1,
								display: "flex",
								flexDirection: "column",
								gap: 6,
							}}
						>
							<Skeleton width="60%" height={11} />
							<Skeleton width="40%" height={18} />
						</div>
					</div>
				))}
			</div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "2fr 3fr",
					gap: 14,
				}}
			>
				<div
					className="card"
					style={{
						padding: 20,
						display: "flex",
						flexDirection: "column",
						gap: 16,
					}}
				>
					<Skeleton width={80} height={14} />
					<div style={{ display: "flex", justifyContent: "center" }}>
						<Skeleton width={140} height={140} rounded="full" />
					</div>
				</div>
				<div
					className="card"
					style={{
						padding: 20,
						display: "flex",
						flexDirection: "column",
						gap: 12,
					}}
				>
					<Skeleton width={80} height={14} />
					{Array.from({ length: 6 }).map((_, i) => (
						<div
							key={i}
							style={{ display: "flex", alignItems: "center", gap: 12 }}
						>
							<div
								style={{
									flex: 1,
									display: "flex",
									flexDirection: "column",
									gap: 5,
								}}
							>
								<Skeleton width="65%" height={12} />
								<Skeleton width="100%" height={4} />
							</div>
							<Skeleton width={28} height={12} />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconBook = () => (
	<svg
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
		<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
	</svg>
);

const IconCheck = () => (
	<svg
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<polyline points="20 6 9 17 4 12" />
	</svg>
);

const IconRefresh = () => (
	<svg
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<polyline points="23 4 23 10 17 10" />
		<path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
	</svg>
);

const IconClock = () => (
	<svg
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<circle cx="12" cy="12" r="10" />
		<polyline points="12 6 12 12 16 14" />
	</svg>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
	const { questions, allQuestions, loading, initializing, getDailyIds } =
		useQuestions();
	const { records, getEstimatedDays, streak, dailyGoal, hiddenCategories } = useStudyStore();

	// ── Resolve which module names belong to hidden categories ────────────────
	// We read from DEFAULT_CATEGORY_MAP synchronously for instant render, then
	// upgrade with the full persisted map (which may include custom categories).
	const [categoryModuleMap, setCategoryModuleMap] = useState<Record<string, string[]>>(
		() => Object.fromEntries(
			Object.entries(DEFAULT_CATEGORY_MAP).map(([k, v]) => [k, v.modules]),
		),
	);

	useEffect(() => {
		getCategoryMap().then((map) => {
			setCategoryModuleMap(
				Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.modules])),
			);
		});
	}, []);

	// Set of module names that are in at least one hidden category
	const hiddenModules = useMemo<Set<string>>(() => {
		const s = new Set<string>();
		for (const [catName, modules] of Object.entries(categoryModuleMap)) {
			if (hiddenCategories.has(catName)) {
				for (const m of modules) s.add(m);
			}
		}
		return s;
	}, [hiddenCategories, categoryModuleMap]);

	// Visible questions: exclude any question whose module is in a hidden category
	const visibleQuestions = useMemo(
		() => allQuestions.filter((q) => !hiddenModules.has(q.module)),
		[allQuestions, hiddenModules],
	);

	const [dailyIds, setDailyIds] = useState<string[]>([]);
	const [dailyLoading, setDailyLoading] = useState(true);
	const [greeting, setGreeting] = useState("");

	useEffect(() => {
		const h = new Date().getHours();
		if (h < 6) setGreeting("夜深了，注意休息");
		else if (h < 10) setGreeting("早上好，开始今天的备战");
		else if (h < 13) setGreeting("上午好，专注备战");
		else if (h < 17) setGreeting("下午好，继续加油");
		else if (h < 20) setGreeting("晚上好，刷题时间到");
		else setGreeting("晚上好，坚持就是胜利");
	}, []);

	useEffect(() => {
		if (visibleQuestions.length === 0) return;
		setDailyLoading(true);
		getDailyIds(
			Object.fromEntries(
				Object.entries(records).map(([k, v]) => [
					k,
					{ status: v.status, lastUpdated: v.lastUpdated },
				]),
			),
			dailyGoal,
		)
			.then(setDailyIds)
			.finally(() => setDailyLoading(false));
	}, [visibleQuestions.length, records, getDailyIds, dailyGoal]);

	// Counts based on visible questions only
	const counts = useMemo(() => {
		const visibleIds = new Set(visibleQuestions.map((q) => q.id));
		let mastered = 0;
		let review = 0;
		for (const [id, r] of Object.entries(records)) {
			if (!visibleIds.has(id)) continue;
			if (r.status === "mastered") mastered++;
			else if (r.status === "review") review++;
		}
		const tracked = mastered + review;
		const unlearned = Math.max(0, visibleQuestions.length - tracked);
		return { mastered, review, unlearned };
	}, [records, visibleQuestions]);

	const totalQuestions = visibleQuestions.length;
	const masteredPercent =
		totalQuestions > 0
			? Math.round((counts.mastered / totalQuestions) * 100)
			: 0;
	const estimatedDays = getEstimatedDays(totalQuestions, dailyGoal);

	// Module progress: derive from visible questions grouped by module,
	// preserving the order defined in categoryModuleMap, then appending any
	// modules not covered by any category (e.g. freshly-imported custom ones).
	const moduleStats = useMemo(() => {
		// Ordered module names from visible categories
		const orderedModules: string[] = [];
		const seen = new Set<string>();
		// Sort categories by their order field
		const sortedCategories = Object.entries(categoryModuleMap).sort(
			([a], [b]) => {
				const aOrder = DEFAULT_CATEGORY_MAP[a]?.order ?? 99;
				const bOrder = DEFAULT_CATEGORY_MAP[b]?.order ?? 99;
				return aOrder - bOrder;
			},
		);
		for (const [catName, modules] of sortedCategories) {
			if (hiddenCategories.has(catName)) continue;
			for (const m of modules) {
				if (!seen.has(m)) { orderedModules.push(m); seen.add(m); }
			}
		}
		// Append any module present in visibleQuestions but not in any category
		for (const q of visibleQuestions) {
			if (!seen.has(q.module)) { orderedModules.push(q.module); seen.add(q.module); }
		}

		return orderedModules
			.map((mod) => ({
				module: mod as Module,
				questions: visibleQuestions.filter((q) => q.module === mod),
			}))
			.filter((s) => s.questions.length > 0);
	}, [visibleQuestions, categoryModuleMap, hiddenCategories]);

	if (initializing) {
		return (
			<div className="page-container">
				<DashboardSkeleton />
			</div>
		);
	}

	const hasNoQuestions = allQuestions.length === 0 && !loading;
	const allHidden = allQuestions.length > 0 && totalQuestions === 0;

	return (
		<div className="page-container">
			{/* ── Streak Banner ── */}
			{!hasNoQuestions && <StreakBanner streak={streak} dailyGoal={dailyGoal} />}

			{/* ── Greeting ── */}
			<div className="animate-fade-in" style={{ marginBottom: 28 }}>
				<h1
					style={{
						fontSize: 22,
						fontWeight: 700,
						color: "var(--text)",
						letterSpacing: "-0.02em",
						marginBottom: 4,
					}}
				>
					{greeting}
				</h1>
				<p style={{ fontSize: 13, color: "var(--text-3)" }}>
					{hasNoQuestions
						? "暂无题目，请先导入题库"
						: allHidden
						? "所有题库已隐藏，可在设置 → 刷题偏好中调整"
						: `共 ${totalQuestions} 道题，已掌握 ${counts.mastered} 道`}
				</p>
			</div>

			{hasNoQuestions ? (
				<div className="card" style={{ padding: "80px 20px" }}>
					<EmptyState
						title="题库为空"
						description="前往「导入题目」页面，导入内置题库或自定义 JSON 文件"
						action={
							<Link to="/import">
								<Button variant="primary">前往导入</Button>
							</Link>
						}
					/>
				</div>
			) : allHidden ? (
				<div className="card" style={{ padding: "80px 20px" }}>
					<EmptyState
						title="所有题库已隐藏"
						description="在「设置 → 刷题偏好 → 题库展示」中打开至少一个题库"
					/>
				</div>
			) : (
				<>
					{/* ── Stats Row ── */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(4, 1fr)",
							gap: 12,
							marginBottom: 20,
						}}
						className="stats-grid"
					>
						<StatCard
							label="题目总数"
							value={totalQuestions}
							accentColor="var(--surface-3)"
							delay={0}
							icon={<IconBook />}
						/>
						<StatCard
							label="已掌握"
							value={counts.mastered}
							sub={`占比 ${masteredPercent}%`}
							accentColor="var(--success-light)"
							delay={0.05}
							icon={<IconCheck />}
						/>
						<StatCard
							label="待复习"
							value={counts.review}
							accentColor="var(--warning-light)"
							delay={0.1}
							icon={<IconRefresh />}
						/>
						<StatCard
							label="预计完成"
							value={estimatedDays === 0 ? "已完成" : `${estimatedDays} 天`}
							sub={estimatedDays > 0 ? `每天 ${dailyGoal} 题` : undefined}
							accentColor="var(--surface-3)"
							delay={0.15}
							icon={<IconClock />}
						/>
					</div>

					{/* ── Main Grid ── */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "2fr 3fr",
							gap: 14,
							marginBottom: 20,
							alignItems: "start",
						}}
						className="main-grid"
					>
						{/* Overall Progress */}
						<div
							className="card animate-fade-in stagger-2"
							style={{ padding: 20 }}
						>
							<h2
								style={{
									fontSize: 13,
									fontWeight: 600,
									color: "var(--text)",
									marginBottom: 20,
								}}
							>
								总体进度
							</h2>

							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: 28,
									marginBottom: 20,
								}}
							>
								<SegmentedRing
									mastered={counts.mastered}
									review={counts.review}
									total={totalQuestions}
									size={130}
									strokeWidth={10}
									label={
										<div style={{ textAlign: "center" }}>
											<p
												style={{
													fontSize: 22,
													fontWeight: 700,
													color: "var(--text)",
													lineHeight: 1,
													fontVariantNumeric: "tabular-nums",
												}}
											>
												{masteredPercent}%
											</p>
											<p
												style={{
													fontSize: 11,
													color: "var(--text-3)",
													marginTop: 4,
												}}
											>
												已掌握
											</p>
										</div>
									}
								/>

								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: 10,
									}}
								>
									{(
										[
											{
												key: "mastered",
												label: STATUS_LABELS.mastered,
												color: "var(--success)",
												count: counts.mastered,
											},
											{
												key: "review",
												label: STATUS_LABELS.review,
												color: "var(--warning)",
												count: counts.review,
											},
											{
												key: "unlearned",
												label: STATUS_LABELS.unlearned,
												color: "var(--border)",
												count: counts.unlearned,
											},
										] as const
									).map((item) => (
										<div
											key={item.key}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
											}}
										>
											<span
												style={{
													width: 8,
													height: 8,
													borderRadius: "50%",
													background: item.color,
													flexShrink: 0,
												}}
											/>
											<span style={{ fontSize: 12, color: "var(--text-2)" }}>
												{item.label}
											</span>
											<span
												style={{
													fontSize: 12,
													fontWeight: 600,
													color: "var(--text)",
													marginLeft: 4,
													fontVariantNumeric: "tabular-nums",
												}}
											>
												{item.count}
											</span>
										</div>
									))}
								</div>
							</div>

							<div
								style={{
									paddingTop: 16,
									borderTop: "1px solid var(--border-subtle)",
									display: "flex",
									gap: 8,
								}}
							>
								<Link to="/questions" style={{ flex: 1 }}>
									<Button variant="secondary" size="sm" fullWidth>
										浏览题库
									</Button>
								</Link>
								<Link to="/practice" style={{ flex: 1 }}>
									<Button variant="primary" size="sm" fullWidth>
										开始练习
									</Button>
								</Link>
							</div>
						</div>

						{/* Module Progress */}
						<div
							className="card animate-fade-in stagger-3"
							style={{ padding: 20 }}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									marginBottom: 10,
								}}
							>
								<h2
									style={{
										fontSize: 13,
										fontWeight: 600,
										color: "var(--text)",
									}}
								>
									模块进度
								</h2>
								<Link
									to="/questions"
									style={{
										fontSize: 12,
										color: "var(--primary)",
										textDecoration: "none",
									}}
									onMouseEnter={(e) => {
										(e.currentTarget as HTMLElement).style.textDecoration =
											"underline";
									}}
									onMouseLeave={(e) => {
										(e.currentTarget as HTMLElement).style.textDecoration =
											"none";
									}}
								>
									查看全部
								</Link>
							</div>

							<div
								style={{
									maxHeight: 280,
									overflowY: "auto",
								}}
								className="no-scrollbar"
							>
								{moduleStats.map(({ module, questions: qs }) => (
									<ModuleProgressBar
										key={module}
										module={module}
										questions={qs}
										records={records}
									/>
								))}
							</div>
						</div>
					</div>

					{/* ── Today's Recommendations ── */}
					<div
						className="card animate-fade-in stagger-4"
						style={{ padding: 20, marginBottom: 20 }}
					>
						<div
							style={{
								display: "flex",
								alignItems: "flex-start",
								justifyContent: "space-between",
								marginBottom: 16,
							}}
						>
							<div>
								<h2
									style={{
										fontSize: 13,
										fontWeight: 600,
										color: "var(--text)",
										marginBottom: 3,
									}}
								>
									今日推荐
								</h2>
								<p style={{ fontSize: 12, color: "var(--text-3)" }}>
									优先待复习，其次未学习高频题
								</p>
							</div>
							<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
								{dailyIds.length > 0 && (
									<span
										style={{
											fontSize: 12,
											color: "var(--text-3)",
											fontVariantNumeric: "tabular-nums",
										}}
									>
										{
											dailyIds.filter(
												(id) => records[id]?.status === "mastered",
											).length
										}
										/{dailyIds.length} 完成
									</span>
								)}
								{dailyIds.length > 0 && (
									<Link to={`/practice?ids=${dailyIds.join(",")}`}>
										<Button variant="primary" size="sm" className="px-2!">
											连续刷题
										</Button>
									</Link>
								)}
							</div>
						</div>

						{dailyLoading ? (
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(2, 1fr)",
									gap: 8,
								}}
								className="daily-grid"
							>
								{Array.from({ length: 6 }).map((_, i) => (
									<div
										key={i}
										style={{
											display: "flex",
											alignItems: "flex-start",
											gap: 10,
											padding: "12px 14px",
											borderRadius: 10,
											border: "1px solid var(--border-subtle)",
										}}
									>
										<Skeleton width={22} height={22} rounded="sm" />
										<div
											style={{
												flex: 1,
												display: "flex",
												flexDirection: "column",
												gap: 6,
											}}
										>
											<Skeleton width="80%" height={12} />
											<Skeleton width="45%" height={11} />
										</div>
									</div>
								))}
							</div>
						) : dailyIds.length === 0 ? (
							<EmptyState
								title="今日已全部完成"
								description="所有题目都已掌握，真棒！"
							/>
						) : (
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(2, 1fr)",
									gap: 8,
								}}
								className="daily-grid"
							>
								{dailyIds.map((id, i) => (
									<DailyQuestionCard
										key={id}
										questionId={id}
										index={i}
										questions={questions}
										records={records}
									/>
								))}
							</div>
						)}
					</div>
				</>
			)}

			<style>{`
				@media (max-width: 900px) {
					.main-grid {
						grid-template-columns: 1fr !important;
					}
					.daily-grid {
						grid-template-columns: 1fr !important;
					}
				}
				@media (max-width: 640px) {
					.stats-grid {
						grid-template-columns: repeat(2, 1fr) !important;
					}
					.main-grid {
						grid-template-columns: 1fr !important;
					}
					.daily-grid {
						grid-template-columns: 1fr !important;
					}
					.page-container {
						padding-left: 12px !important;
						padding-right: 12px !important;
						overflow-x: hidden;
					}
				}
				@media (max-width: 480px) {
					.stats-grid {
						grid-template-columns: repeat(2, 1fr) !important;
					}
					.daily-grid {
						grid-template-columns: 1fr !important;
					}
				}
			`}</style>
		</div>
	);
}
