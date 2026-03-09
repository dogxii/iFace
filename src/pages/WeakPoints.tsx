import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, EmptyState, Skeleton } from "@/components/ui";
import { useQuestions } from "@/hooks/useQuestions";
import { useStudyStore } from "@/store/useStudyStore";
import {
	DIFFICULTY_COLORS,
	DIFFICULTY_LABELS,
	type Difficulty,
	MODULE_LIST,
	type Module,
} from "@/types";

// ─── Time formatter ───────────────────────────────────────────────────────────

function timeAgo(timestamp: number): string {
	const diff = Date.now() - timestamp;
	const minutes = Math.floor(diff / 60_000);
	const hours = Math.floor(diff / 3_600_000);
	const days = Math.floor(diff / 86_400_000);

	if (minutes < 1) return "刚刚";
	if (minutes < 60) return `${minutes} 分钟前`;
	if (hours < 24) return `${hours} 小时前`;
	if (days < 30) return `${days} 天前`;
	return `${Math.floor(days / 30)} 个月前`;
}

// ─── Weak Question Row ────────────────────────────────────────────────────────

function WeakQuestionRow({
	question,
	lastUpdated,
	reviewCount,
	index,
	sessionIds,
}: {
	question: {
		id: string;
		module: Module;
		difficulty: Difficulty;
		question: string;
		tags: string[];
		source?: string;
	};
	lastUpdated: number;
	reviewCount: number;
	index: number;
	sessionIds: string[];
}) {
	const idsParam = sessionIds.length > 0 ? `?ids=${sessionIds.join(",")}` : "";

	const rankBg =
		index < 3
			? "rgba(239,68,68,0.1)"
			: index < 10
				? "rgba(245,158,11,0.1)"
				: "var(--surface-3)";
	const rankColor =
		index < 3
			? "var(--danger)"
			: index < 10
				? "var(--warning)"
				: "var(--text-3)";

	return (
		<Link
			to={`/questions/${question.id}${idsParam}`}
			className="animate-fade-in card card-interactive"
			style={{
				display: "flex",
				alignItems: "flex-start",
				gap: 14,
				padding: "14px 16px",
				textDecoration: "none",
				animationDelay: `${Math.min(index * 0.03, 0.4)}s`,
			}}
		>
			{/* Rank badge */}
			<div
				style={{
					width: 26,
					height: 26,
					borderRadius: 8,
					background: rankBg,
					color: rankColor,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: 11,
					fontWeight: 700,
					flexShrink: 0,
					marginTop: 1,
				}}
			>
				{index + 1}
			</div>

			{/* Status strip */}
			<div
				style={{
					width: 3,
					alignSelf: "stretch",
					borderRadius: 99,
					background: "var(--warning)",
					flexShrink: 0,
				}}
			/>

			{/* Content */}
			<div style={{ flex: 1, minWidth: 0 }}>
				<p
					style={{
						fontSize: 14,
						fontWeight: 500,
						color: "var(--text)",
						lineHeight: 1.55,
						marginBottom: 8,
						overflow: "hidden",
						display: "-webkit-box",
						WebkitLineClamp: 2,
						WebkitBoxOrient: "vertical",
					}}
				>
					{question.question}
				</p>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 6,
						flexWrap: "wrap",
					}}
				>
					<span style={{ fontSize: 12, color: "var(--text-3)" }}>
						{question.module}
					</span>
					<span style={{ fontSize: 12, color: "var(--border)" }}>·</span>
					<span
						className={`text-xs font-medium px-1.5 py-0.5 rounded border ${DIFFICULTY_COLORS[question.difficulty]}`}
					>
						{DIFFICULTY_LABELS[question.difficulty]}
					</span>
					{question.tags.slice(0, 2).map((tag) => (
						<span
							key={tag}
							style={{
								fontSize: 11,
								padding: "1px 7px",
								borderRadius: 5,
								border: "1px solid var(--border-subtle)",
								color: "var(--text-3)",
							}}
						>
							{tag}
						</span>
					))}
				</div>
			</div>

			{/* Right meta */}
			<div
				style={{
					flexShrink: 0,
					display: "flex",
					flexDirection: "column",
					alignItems: "flex-end",
					gap: 4,
					textAlign: "right",
				}}
			>
				<span
					style={{
						fontSize: 11,
						fontWeight: 500,
						padding: "2px 8px",
						borderRadius: 5,
						background: "var(--warning-light)",
						color: "var(--warning)",
						border: "1px solid rgba(245,158,11,0.2)",
					}}
				>
					待复习
				</span>
				<span
					style={{
						fontSize: 11,
						color: "var(--text-3)",
						whiteSpace: "nowrap",
					}}
				>
					{timeAgo(lastUpdated)}
				</span>
				{reviewCount > 0 && (
					<span style={{ fontSize: 11, color: "var(--text-3)" }}>
						已复习 {reviewCount} 次
					</span>
				)}
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

// ─── Module Breakdown ─────────────────────────────────────────────────────────

function ModuleBreakdown({
	weakByModule,
	selectedModule,
	onSelect,
}: {
	weakByModule: Record<Module, number>;
	selectedModule: Module | null;
	onSelect: (m: Module | null) => void;
}) {
	const modules = MODULE_LIST.filter((m) => weakByModule[m] > 0);
	if (modules.length === 0) return null;

	const total = Object.values(weakByModule).reduce((a, b) => a + b, 0);

	return (
		<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
			{/* All button */}
			<button
				onClick={() => onSelect(null)}
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: 5,
					padding: "5px 12px",
					borderRadius: 8,
					fontSize: 12,
					fontWeight: 500,
					border: "1px solid",
					borderColor:
						selectedModule === null ? "var(--primary)" : "var(--border)",
					background:
						selectedModule === null ? "var(--primary)" : "var(--surface)",
					color: selectedModule === null ? "white" : "var(--text-2)",
					cursor: "pointer",
					transition: "all 0.15s",
				}}
			>
				全部
				<span
					style={{
						fontSize: 10,
						padding: "1px 5px",
						borderRadius: 4,
						background: "rgba(255,255,255,0.25)",
					}}
				>
					{total}
				</span>
			</button>

			{modules.map((mod) => {
				const active = selectedModule === mod;
				return (
					<button
						key={mod}
						onClick={() => onSelect(active ? null : mod)}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 5,
							padding: "5px 12px",
							borderRadius: 8,
							fontSize: 12,
							fontWeight: 500,
							border: "1px solid",
							borderColor: active ? "var(--warning)" : "var(--border)",
							background: active ? "var(--warning)" : "var(--surface)",
							color: active ? "white" : "var(--text-2)",
							cursor: "pointer",
							transition: "all 0.15s",
						}}
					>
						{mod}
						<span
							style={{
								fontSize: 10,
								padding: "1px 5px",
								borderRadius: 4,
								background: active
									? "rgba(255,255,255,0.25)"
									: "var(--surface-2)",
								color: active ? "white" : "var(--text-3)",
							}}
						>
							{weakByModule[mod]}
						</span>
					</button>
				);
			})}
		</div>
	);
}

// ─── Stats row ────────────────────────────────────────────────────────────────

function WeakStats({
	total,
	avgReviewCount,
	oldest,
}: {
	total: number;
	avgReviewCount: number;
	oldest: number | null;
}) {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(3, 1fr)",
				gap: 12,
			}}
		>
			{[
				{
					value: total,
					label: "待复习题目",
					color: "var(--warning)",
				},
				{
					value: avgReviewCount.toFixed(1),
					label: "平均复习次数",
					color: "var(--text)",
				},
				{
					value: oldest ? timeAgo(oldest) : "—",
					label: "最久未复习",
					color: "var(--text)",
					small: true,
				},
			].map((item) => (
				<div
					key={item.label}
					className="card"
					style={{ padding: "16px", textAlign: "center" }}
				>
					<p
						style={{
							fontSize: item.small ? 15 : 22,
							fontWeight: 700,
							color: item.color,
							fontVariantNumeric: "tabular-nums",
							lineHeight: 1.2,
							marginBottom: 4,
						}}
					>
						{item.value}
					</p>
					<p style={{ fontSize: 11, color: "var(--text-3)" }}>{item.label}</p>
				</div>
			))}
		</div>
	);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function WeakSkeleton() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(3, 1fr)",
					gap: 12,
				}}
			>
				{Array.from({ length: 3 }).map((_, i) => (
					<div
						key={i}
						className="card"
						style={{
							padding: 16,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 8,
						}}
					>
						<Skeleton width={40} height={24} rounded="md" />
						<Skeleton width={60} height={11} />
					</div>
				))}
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
				{Array.from({ length: 6 }).map((_, i) => (
					<div
						key={i}
						className="card"
						style={{
							padding: "14px 16px",
							display: "flex",
							alignItems: "flex-start",
							gap: 14,
						}}
					>
						<Skeleton width={26} height={26} rounded="md" />
						<Skeleton width={3} height={52} rounded="sm" />
						<div
							style={{
								flex: 1,
								display: "flex",
								flexDirection: "column",
								gap: 8,
							}}
						>
							<Skeleton width="75%" height={14} />
							<Skeleton width="45%" height={12} />
						</div>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "flex-end",
								gap: 5,
							}}
						>
							<Skeleton width={52} height={20} rounded="md" />
							<Skeleton width={48} height={11} />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ─── Sort options ─────────────────────────────────────────────────────────────

type SortMode = "oldest" | "newest" | "most-reviewed" | "difficulty";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
	{ value: "oldest", label: "最久未复习" },
	{ value: "newest", label: "最近标记" },
	{ value: "most-reviewed", label: "复习次数最多" },
	{ value: "difficulty", label: "难度从高到低" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WeakPoints() {
	const { allQuestions, initializing } = useQuestions();
	const { records, setStatus } = useStudyStore();

	const [selectedModule, setSelectedModule] = useState<Module | null>(null);
	const [sortMode, setSortMode] = useState<SortMode>("oldest");
	const [clearing, setClearing] = useState<string | null>(null);

	const weakRecords = useMemo(() => {
		return Object.values(records).filter((r) => r.status === "review");
	}, [records]);

	const weakItems = useMemo(() => {
		const questionMap = new Map(allQuestions.map((q) => [q.id, q]));
		return weakRecords
			.map((r) => {
				const q = questionMap.get(r.questionId);
				if (!q) return null;
				return { record: r, question: q };
			})
			.filter(Boolean) as {
			record: (typeof weakRecords)[0];
			question: (typeof allQuestions)[0];
		}[];
	}, [weakRecords, allQuestions]);

	const weakByModule = useMemo(() => {
		const counts = {} as Record<Module, number>;
		for (const { question } of weakItems) {
			counts[question.module] = (counts[question.module] ?? 0) + 1;
		}
		return counts;
	}, [weakItems]);

	const stats = useMemo(() => {
		if (weakItems.length === 0)
			return { total: 0, avgReviewCount: 0, oldest: null };
		const total = weakItems.length;
		const avgReviewCount =
			weakItems.reduce((s, { record: r }) => s + r.reviewCount, 0) / total;
		const oldest = Math.min(...weakItems.map(({ record: r }) => r.lastUpdated));
		return { total, avgReviewCount, oldest };
	}, [weakItems]);

	const displayItems = useMemo(() => {
		let items = weakItems;
		if (selectedModule) {
			items = items.filter(({ question: q }) => q.module === selectedModule);
		}
		const sorted = [...items];
		switch (sortMode) {
			case "oldest":
				sorted.sort((a, b) => a.record.lastUpdated - b.record.lastUpdated);
				break;
			case "newest":
				sorted.sort((a, b) => b.record.lastUpdated - a.record.lastUpdated);
				break;
			case "most-reviewed":
				sorted.sort((a, b) => b.record.reviewCount - a.record.reviewCount);
				break;
			case "difficulty":
				sorted.sort((a, b) => b.question.difficulty - a.question.difficulty);
				break;
		}
		return sorted;
	}, [weakItems, selectedModule, sortMode]);

	const sessionIds = displayItems.map(({ question: q }) => q.id);

	const handleMarkAllMastered = async () => {
		if (displayItems.length === 0) return;
		setClearing("all");
		for (const { question: q } of displayItems) {
			await setStatus(q.id, "mastered");
		}
		setClearing(null);
	};

	if (initializing) {
		return (
			<div className="page-container" style={{ maxWidth: 760 }}>
				<WeakSkeleton />
			</div>
		);
	}

	return (
		<div
			className="page-container"
			style={{
				maxWidth: 760,
				display: "flex",
				flexDirection: "column",
				gap: 24,
			}}
		>
			{/* ── Header ── */}
			<div
				className="animate-fade-in"
				style={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: 12,
				}}
			>
				<div>
					<h1
						style={{
							fontSize: 20,
							fontWeight: 700,
							color: "var(--text)",
							letterSpacing: "-0.015em",
							marginBottom: 4,
						}}
					>
						我的薄弱点
					</h1>
					<p style={{ fontSize: 13, color: "var(--text-3)" }}>
						标记为「待复习」的题目，优先复习最久未练的
					</p>
				</div>

				{weakItems.length > 0 && sessionIds.length > 0 && (
					<div style={{ flexShrink: 0 }}>
						<Link
							to={`/questions/${sessionIds[0]}?ids=${sessionIds.join(",")}`}
						>
							<Button
								variant="primary"
								size="sm"
								icon={
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
										<polygon points="5 3 19 12 5 21 5 3" />
									</svg>
								}
								className="px-2!"
							>
								集中攻克
							</Button>
						</Link>
					</div>
				)}
			</div>

			{/* ── Empty state ── */}
			{weakItems.length === 0 ? (
				<div className="card animate-fade-in" style={{ padding: "80px 20px" }}>
					<EmptyState
						title="暂无待复习题目"
						description="做得很好！所有题目都已掌握，或者还没有开始刷题"
						action={
							<Link to="/questions">
								<Button variant="primary" size="sm">
									去刷题
								</Button>
							</Link>
						}
					/>
				</div>
			) : (
				<>
					{/* ── Stats ── */}
					<div className="animate-fade-in stagger-1">
						<WeakStats
							total={stats.total}
							avgReviewCount={stats.avgReviewCount}
							oldest={stats.oldest}
						/>
					</div>

					{/* ── Module breakdown ── */}
					<div className="animate-fade-in stagger-2">
						<ModuleBreakdown
							weakByModule={weakByModule}
							selectedModule={selectedModule}
							onSelect={setSelectedModule}
						/>
					</div>

					{/* ── Controls ── */}
					<div
						className="animate-fade-in stagger-3"
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 12,
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
							<select
								value={sortMode}
								onChange={(e) => setSortMode(e.target.value as SortMode)}
								style={{
									fontSize: 13,
									padding: "6px 10px",
									borderRadius: 8,
									background: "var(--surface)",
									border: "1px solid var(--border)",
									color: "var(--text)",
									cursor: "pointer",
									outline: "none",
								}}
							>
								{SORT_OPTIONS.map((o) => (
									<option key={o.value} value={o.value}>
										{o.label}
									</option>
								))}
							</select>

							<span style={{ fontSize: 12, color: "var(--text-3)" }}>
								{displayItems.length} 道题
							</span>
						</div>

						<Button
							variant="ghost"
							size="sm"
							loading={clearing === "all"}
							onClick={handleMarkAllMastered}
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
									<polyline points="20 6 9 17 4 12" />
								</svg>
							}
						>
							全部标为已掌握
						</Button>
					</div>

					{/* ── Question list ── */}
					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						{displayItems.map(({ question: q, record: r }, i) => (
							<WeakQuestionRow
								key={q.id}
								question={q}
								lastUpdated={r.lastUpdated}
								reviewCount={r.reviewCount}
								index={i}
								sessionIds={sessionIds}
							/>
						))}
					</div>

					{/* ── Tip ── */}
					{displayItems.length >= 10 && (
						<div className="animate-fade-in">
							<div
								className="card"
								style={{
									padding: "14px 16px",
									display: "flex",
									alignItems: "flex-start",
									gap: 12,
									borderColor: "rgba(245,158,11,0.2)",
									background: "rgba(245,158,11,0.04)",
								}}
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.8"
									strokeLinecap="round"
									strokeLinejoin="round"
									style={{
										color: "var(--warning)",
										flexShrink: 0,
										marginTop: 1,
									}}
								>
									<circle cx="12" cy="12" r="10" />
									<line x1="12" y1="8" x2="12" y2="12" />
									<line x1="12" y1="16" x2="12.01" y2="16" />
								</svg>
								<div>
									<p
										style={{
											fontSize: 13,
											fontWeight: 600,
											color: "var(--text)",
											marginBottom: 4,
										}}
									>
										建议每天专项复习
									</p>
									<p
										style={{
											fontSize: 12,
											color: "var(--text-2)",
											lineHeight: 1.6,
										}}
									>
										你有 {displayItems.length}{" "}
										道薄弱题，点击「集中攻克」进入连续刷题模式，每天坚持{" "}
										{Math.min(10, displayItems.length)} 道，
										{Math.ceil(displayItems.length / 10)} 天内可全部突破。
									</p>
								</div>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
