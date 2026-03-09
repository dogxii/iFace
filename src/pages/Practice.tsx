import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, EmptyState, Skeleton } from "@/components/ui";
import { useQuestions } from "@/hooks/useQuestions";
import { useStudyStore } from "@/store/useStudyStore";
import { getCategoryMap, type CategoryMap } from "@/lib/db";
import {
	DIFFICULTY_LABELS,
	DIFFICULTY_STYLES,
	type Difficulty,
	type Module,
	STATUS_LABELS,
	type StudyStatus,
} from "@/types";

// ─── Module Selector Card ─────────────────────────────────────────────────────

function ModuleCard({
	module,
	selected,
	questionCount,
	masteredCount,
	onClick,
}: {
	module: Module;
	selected: boolean;
	questionCount: number;
	masteredCount: number;
	onClick: () => void;
}) {
	const percent =
		questionCount > 0 ? Math.round((masteredCount / questionCount) * 100) : 0;

	return (
		<button
			onClick={onClick}
			style={{
				position: "relative",
				padding: "14px",
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
		>
			{/* Check indicator */}
			{selected && (
				<div
					style={{
						position: "absolute",
						top: 10,
						right: 10,
						width: 18,
						height: 18,
						borderRadius: "50%",
						background: "var(--primary)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<svg
						width="9"
						height="9"
						viewBox="0 0 24 24"
						fill="none"
						stroke="white"
						strokeWidth="3"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<polyline points="20 6 9 17 4 12" />
					</svg>
				</div>
			)}

			<p
				style={{
					fontSize: 12,
					fontWeight: 600,
					color: selected ? "var(--primary)" : "var(--text)",
					marginBottom: 4,
					marginTop: 2,
				}}
			>
				{module}
			</p>

			<p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10 }}>
				{questionCount} 道题
			</p>

			{/* Progress bar */}
			<div
				style={{
					height: 3,
					background: "var(--surface-3)",
					borderRadius: 99,
					overflow: "hidden",
				}}
			>
				<div
					style={{
						height: "100%",
						background: "var(--success)",
						borderRadius: 99,
						width: `${percent}%`,
						transition: "width 0.5s var(--ease-out)",
					}}
				/>
			</div>
			<p
				style={{
					fontSize: 10,
					color: "var(--text-3)",
					marginTop: 5,
					fontVariantNumeric: "tabular-nums",
				}}
			>
				{masteredCount}/{questionCount} 已掌握
			</p>
		</button>
	);
}

// ─── Difficulty Chip ──────────────────────────────────────────────────────────

function DifficultyChip({
	difficulty,
	selected,
	count,
	onClick,
}: {
	difficulty: Difficulty | "all";
	selected: boolean;
	count: number;
	onClick: () => void;
}) {
	const isAll = difficulty === "all";
	const dStyle = !isAll ? DIFFICULTY_STYLES[difficulty as Difficulty] : null;
	return (
		<button
			onClick={onClick}
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 6,
				padding: "6px 14px",
				borderRadius: 10,
				fontSize: 13,
				fontWeight: 500,
				cursor: "pointer",
				transition: "all 0.15s",
				border: "1px solid",
				borderColor:
					selected && isAll
						? "var(--primary)"
						: selected && dStyle
							? dStyle.borderColor
							: "var(--border)",
				background:
					selected && isAll
						? "var(--primary)"
						: selected && dStyle
							? dStyle.background
							: "var(--surface)",
				color:
					selected && isAll
						? "white"
						: selected && dStyle
							? dStyle.color
							: "var(--text-2)",
			}}
		>
			{isAll ? "全部" : DIFFICULTY_LABELS[difficulty as Difficulty]}
			<span
				style={{
					fontSize: 11,
					padding: "1px 6px",
					borderRadius: 6,
					background: selected ? "rgba(255,255,255,0.2)" : "var(--surface-2)",
					color: selected ? "currentColor" : "var(--text-3)",
				}}
			>
				{count}
			</span>
		</button>
	);
}

// ─── Status Filter Chip ───────────────────────────────────────────────────────

function StatusChip({
	status,
	selected,
	count,
	onClick,
}: {
	status: StudyStatus | "all";
	selected: boolean;
	count: number;
	onClick: () => void;
}) {
	const selectedBg: Record<string, string> = {
		all: "var(--primary)",
		unlearned: "#71717a",
		mastered: "#10b981",
		review: "#f59e0b",
	};
	const label =
		status === "all" ? "全部状态" : STATUS_LABELS[status as StudyStatus];

	return (
		<button
			onClick={onClick}
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 6,
				padding: "5px 12px",
				borderRadius: 8,
				fontSize: 12,
				fontWeight: 500,
				cursor: "pointer",
				transition: "all 0.15s",
				border: "1px solid",
				borderColor: selected ? selectedBg[status] : "var(--border)",
				background: selected ? selectedBg[status] : "var(--surface)",
				color: selected ? "white" : "var(--text-2)",
			}}
		>
			{label}
			<span
				style={{
					fontSize: 10,
					padding: "1px 5px",
					borderRadius: 5,
					background: selected ? "rgba(255,255,255,0.2)" : "var(--surface-2)",
					color: selected ? "white" : "var(--text-3)",
				}}
			>
				{count}
			</span>
		</button>
	);
}

// ─── Session Preview Card ─────────────────────────────────────────────────────

function SessionPreview({
	count,
	modules,
	difficulty,
	statusFilter,
	onStart,
	onShuffle,
	isShuffled,
}: {
	count: number;
	modules: Module[];
	difficulty: Difficulty | "all";
	statusFilter: StudyStatus | "all";
	onStart: () => void;
	onShuffle: () => void;
	isShuffled: boolean;
}) {
	const canStart = count > 0;

	return (
		<div
			className="card animate-scale-in"
			style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}
		>
			{/* Title */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
					练习配置
				</h3>
				<span
					style={{
						fontSize: 13,
						fontWeight: 600,
						color: canStart ? "var(--primary)" : "var(--text-3)",
						fontVariantNumeric: "tabular-nums",
					}}
				>
					{count} 道题
				</span>
			</div>

			{/* Config summary */}
			<div style={{ display: "flex", flexDirection: "column" }}>
				{[
					{
						label: "模块",
						value:
							modules.length === 0
								? "全部模块"
								: modules.length === 1
									? modules[0]
									: `${modules.length} 个模块`,
					},
					{
						label: "难度",
						value:
							difficulty === "all"
								? "全部难度"
								: DIFFICULTY_LABELS[difficulty as Difficulty],
					},
					{
						label: "状态",
						value:
							statusFilter === "all"
								? "全部状态"
								: STATUS_LABELS[statusFilter as StudyStatus],
					},
				].map((row, i, arr) => (
					<div
						key={row.label}
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							padding: "8px 0",
							borderBottom:
								i < arr.length - 1 ? "1px solid var(--border-subtle)" : "none",
						}}
					>
						<span style={{ fontSize: 13, color: "var(--text-3)" }}>
							{row.label}
						</span>
						<span
							style={{
								fontSize: 13,
								fontWeight: 500,
								color: "var(--text)",
								maxWidth: 180,
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
							}}
						>
							{row.value}
						</span>
					</div>
				))}
			</div>

			{/* Shuffle toggle */}
			<button
				onClick={onShuffle}
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "10px 12px",
					borderRadius: 10,
					border: "1px solid",
					borderColor: isShuffled
						? "rgba(var(--primary-rgb), 0.3)"
						: "var(--border-subtle)",
					background: isShuffled ? "var(--primary-light)" : "transparent",
					color: isShuffled ? "var(--primary)" : "var(--text-2)",
					cursor: "pointer",
					fontSize: 13,
					transition: "all 0.15s",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
						<polyline points="16 3 21 3 21 8" />
						<line x1="4" y1="20" x2="21" y2="3" />
						<polyline points="21 16 21 21 16 21" />
						<line x1="15" y1="15" x2="21" y2="21" />
					</svg>
					随机顺序
				</div>
				{/* Toggle track */}
				<div
					style={{
						width: 30,
						height: 18,
						borderRadius: 99,
						background: isShuffled ? "var(--primary)" : "var(--border)",
						position: "relative",
						transition: "background 0.2s",
						flexShrink: 0,
					}}
				>
					<div
						style={{
							position: "absolute",
							top: 2,
							left: isShuffled ? "calc(100% - 16px)" : 2,
							width: 14,
							height: 14,
							borderRadius: "50%",
							background: "white",
							boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
							transition: "left 0.2s var(--ease-out)",
						}}
					/>
				</div>
			</button>

			{/* Start button */}
			{!canStart ? (
				<p
					style={{
						textAlign: "center",
						fontSize: 13,
						color: "var(--text-3)",
						padding: "6px 0",
					}}
				>
					没有符合条件的题目
				</p>
			) : (
				<Button
					variant="primary"
					size="lg"
					fullWidth
					onClick={onStart}
					icon={
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
							<polygon points="5 3 19 12 5 21 5 3" />
						</svg>
					}
				>
					开始练习 {count} 道题
				</Button>
			)}
		</div>
	);
}

// ─── Quick Preset ─────────────────────────────────────────────────────────────

interface Preset {
	label: string;
	description: string;
	modules: Module[];
	difficulty: Difficulty | "all";
	statusFilter: StudyStatus | "all";
}

const PRESETS: Preset[] = [
	{
		label: "快速复习",
		description: "所有待复习题目",
		modules: [],
		difficulty: "all",
		statusFilter: "review",
	},
	{
		label: "高频考点",
		description: "JS + React 初中级",
		modules: ["JS基础", "React"],
		difficulty: "all",
		statusFilter: "all",
	},
	{
		label: "进阶挑战",
		description: "全模块高级题",
		modules: [],
		difficulty: 3,
		statusFilter: "all",
	},
	{
		label: "手写专项",
		description: "手写题全集",
		modules: ["手写题"],
		difficulty: "all",
		statusFilter: "all",
	},
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Practice() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { allQuestions, initializing } = useQuestions();
	const { records } = useStudyStore();

	const [selectedModules, setSelectedModules] = useState<Module[]>([]);
	const [selectedDifficulty, setSelectedDifficulty] = useState<
		Difficulty | "all"
	>("all");
	const [selectedStatus, setSelectedStatus] = useState<StudyStatus | "all">(
		"all",
	);
	const [isShuffled, setIsShuffled] = useState(false);

	// Handle preset from URL params (e.g. from daily recommendations)
	useEffect(() => {
		const ids = searchParams.get("ids");
		if (ids) {
			const idList = ids.split(",").filter(Boolean);
			if (idList.length > 0) {
				// Navigate directly into session
				navigate(`/questions/${idList[0]}?ids=${ids}`, { replace: true });
			}
		}
	}, [searchParams, navigate]);

	// ── Category map (for grouping modules) ──
	const [categoryMap, setCategoryMap] = useState<CategoryMap>({});

	useEffect(() => {
		getCategoryMap().then(setCategoryMap);
	}, [allQuestions]); // re-fetch when questions change (new imports)

	// ── All unique modules that actually have questions ──
	const activeModules = useMemo(() => {
		return [...new Set(allQuestions.map((q) => q.module))];
	}, [allQuestions]);

	// ── Derived stats — for ALL active modules (not just builtin) ──
	const moduleStats = useMemo(() => {
		return activeModules.map((mod) => {
			const qs = allQuestions.filter((q) => q.module === mod);
			const mastered = qs.filter(
				(q) => records[q.id]?.status === "mastered",
			).length;
			return { module: mod, total: qs.length, mastered };
		});
	}, [allQuestions, activeModules, records]);

	// ── Ordered categories with their modules (only those with questions) ──
	const categoriesWithModules = useMemo(() => {
		const activeSet = new Set(activeModules);

		// Build ordered list from categoryMap
		const fromMap = Object.values(categoryMap)
			.sort((a, b) => {
				if (a.builtin !== b.builtin) return a.builtin ? -1 : 1;
				return (a.order ?? 0) - (b.order ?? 0);
			})
			.map((cat) => ({
				name: cat.name,
				builtin: cat.builtin,
				modules: cat.modules.filter((m) => activeSet.has(m)),
			}))
			.filter((cat) => cat.modules.length > 0);

		// Modules not in any category → "其他" bucket
		const assignedModules = new Set(fromMap.flatMap((c) => c.modules));
		const uncategorized = activeModules.filter((m) => !assignedModules.has(m));
		if (uncategorized.length > 0) {
			fromMap.push({ name: "其他", builtin: false, modules: uncategorized });
		}

		return fromMap;
	}, [categoryMap, activeModules]);

	const difficultyStats = useMemo(() => {
		const base = { 1: 0, 2: 0, 3: 0 };
		let filtered = allQuestions;
		if (selectedModules.length > 0) {
			const set = new Set(selectedModules);
			filtered = filtered.filter((q) => set.has(q.module));
		}
		for (const q of filtered) base[q.difficulty]++;
		return base;
	}, [allQuestions, selectedModules]);

	// ── Filtered question list ──
	const filteredQuestions = useMemo(() => {
		let result = allQuestions;

		if (selectedModules.length > 0) {
			const set = new Set(selectedModules);
			result = result.filter((q) => set.has(q.module));
		}

		if (selectedDifficulty !== "all") {
			result = result.filter((q) => q.difficulty === selectedDifficulty);
		}

		if (selectedStatus !== "all") {
			result = result.filter((q) => {
				const status = records[q.id]?.status ?? "unlearned";
				return status === selectedStatus;
			});
		}

		return result;
	}, [
		allQuestions,
		selectedModules,
		selectedDifficulty,
		selectedStatus,
		records,
	]);

	const statusCounts = useMemo(() => {
		let pool = allQuestions;
		if (selectedModules.length > 0) {
			const set = new Set(selectedModules);
			pool = pool.filter((q) => set.has(q.module));
		}
		if (selectedDifficulty !== "all") {
			pool = pool.filter((q) => q.difficulty === selectedDifficulty);
		}
		const counts = { all: pool.length, unlearned: 0, mastered: 0, review: 0 };
		for (const q of pool) {
			const s = records[q.id]?.status ?? "unlearned";
			counts[s]++;
		}
		return counts;
	}, [allQuestions, selectedModules, selectedDifficulty, records]);

	// ── Handlers ──
	const toggleModule = useCallback((mod: Module) => {
		setSelectedModules((prev) =>
			prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod],
		);
	}, []);

	// Select / deselect all modules in a category
	const toggleCategory = useCallback(
		(catModules: Module[]) => {
			setSelectedModules((prev) => {
				const allSelected = catModules.every((m) => prev.includes(m));
				if (allSelected) {
					return prev.filter((m) => !catModules.includes(m));
				}
				const toAdd = catModules.filter((m) => !prev.includes(m));
				return [...prev, ...toAdd];
			});
		},
		[],
	);

	const applyPreset = useCallback((preset: Preset) => {
		setSelectedModules(preset.modules);
		setSelectedDifficulty(preset.difficulty);
		setSelectedStatus(preset.statusFilter);
	}, []);

	const handleStart = useCallback(() => {
		if (filteredQuestions.length === 0) return;

		const ids = filteredQuestions.map((q) => q.id);

		if (isShuffled) {
			// Fisher-Yates shuffle
			for (let i = ids.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[ids[i], ids[j]] = [ids[j], ids[i]];
			}
		}

		const firstId = ids[0];
		navigate(`/questions/${firstId}?ids=${ids.join(",")}`);
	}, [filteredQuestions, isShuffled, navigate]);

	// ── Loading ──
	if (initializing) {
		return (
			<div className="page-container">
				<Skeleton
					width={160}
					height={26}
					rounded="lg"
					style={{ marginBottom: 24 }}
				/>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(4, 1fr)",
						gap: 10,
					}}
				>
					{Array.from({ length: 8 }).map((_, i) => (
						<div
							key={i}
							className="card"
							style={{
								padding: 14,
								display: "flex",
								flexDirection: "column",
								gap: 10,
							}}
						>
							<Skeleton width="65%" height={13} />
							<Skeleton width="45%" height={11} />
							<Skeleton width="100%" height={3} rounded="full" />
						</div>
					))}
				</div>
			</div>
		);
	}

	const noQuestions = allQuestions.length === 0;

	return (
		<div className="page-container">
			{/* ── Header ── */}
			<div className="animate-fade-in" style={{ marginBottom: 28 }}>
				<h1
					style={{
						fontSize: 20,
						fontWeight: 700,
						color: "var(--text)",
						letterSpacing: "-0.015em",
						marginBottom: 4,
					}}
				>
					专项练习
				</h1>
				<p style={{ fontSize: 13, color: "var(--text-3)" }}>
					自由组合模块、难度和状态，开启专注刷题模式
				</p>
			</div>

			{noQuestions ? (
				<div className="card" style={{ padding: "80px 20px" }}>
					<EmptyState
						title="题库为空"
						description="请先前往「导入题目」页面加载题库"
						action={
							<Button variant="primary" onClick={() => navigate("/import")}>
								前往导入
							</Button>
						}
					/>
				</div>
			) : (
				<div
						style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 20, minWidth: 0 }}
						className="practice-grid"
					>
					{/* ── Left: Config ── */}
					<div style={{ display: "flex", flexDirection: "column", gap: 28, minWidth: 0, overflow: "hidden" }}>
						{/* Quick Presets */}
						<div className="animate-fade-in">
							<p
								style={{
									fontSize: 11,
									fontWeight: 600,
									color: "var(--text-3)",
									textTransform: "uppercase",
									letterSpacing: "0.06em",
									marginBottom: 12,
								}}
							>
								快速预设
							</p>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(4, 1fr)",
									gap: 8,
								}}
								className="presets-grid"
							>
								{PRESETS.map((preset) => (
									<button
										key={preset.label}
										onClick={() => applyPreset(preset)}
										style={{
											display: "flex",
											flexDirection: "column",
											alignItems: "flex-start",
											gap: 4,
											padding: "12px 14px",
											borderRadius: 10,
											border: "1px solid var(--border-subtle)",
											background: "var(--surface)",
											textAlign: "left",
											cursor: "pointer",
											transition: "all 0.15s",
											boxShadow: "var(--shadow-xs)",
										}}
										onMouseEnter={(e) => {
											(e.currentTarget as HTMLElement).style.borderColor =
												"rgba(var(--primary-rgb), 0.4)";
											(e.currentTarget as HTMLElement).style.background =
												"var(--surface-2)";
										}}
										onMouseLeave={(e) => {
											(e.currentTarget as HTMLElement).style.borderColor =
												"var(--border-subtle)";
											(e.currentTarget as HTMLElement).style.background =
												"var(--surface)";
										}}
									>
										<span
											style={{
												fontSize: 12,
												fontWeight: 600,
												color: "var(--text)",
											}}
										>
											{preset.label}
										</span>
										<span
											style={{
												fontSize: 11,
												color: "var(--text-3)",
												lineHeight: 1.4,
											}}
										>
											{preset.description}
										</span>
									</button>
								))}
							</div>
						</div>

						{/* Module Selection — grouped by category */}
						<div className="animate-fade-in stagger-1">
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									marginBottom: 16,
								}}
							>
								<p
									style={{
										fontSize: 11,
										fontWeight: 600,
										color: "var(--text-3)",
										textTransform: "uppercase",
										letterSpacing: "0.06em",
									}}
								>
									选择模块
								</p>
								{selectedModules.length > 0 && (
									<button
										onClick={() => setSelectedModules([])}
										style={{
											fontSize: 12,
											color: "var(--primary)",
											background: "none",
											border: "none",
											cursor: "pointer",
											padding: 0,
										}}
									>
										清除选择
									</button>
								)}
							</div>

							{/* Render one section per category */}
							<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
								{categoriesWithModules.map((cat) => {
									const catModules = cat.modules as Module[];
									const allCatSelected = catModules.length > 0 && catModules.every((m) => selectedModules.includes(m));
									const someCatSelected = catModules.some((m) => selectedModules.includes(m));
									return (
										<div key={cat.name}>
											{/* Category header */}
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 8,
													marginBottom: 10,
												}}
											>
												<button
													onClick={() => toggleCategory(catModules)}
													title={allCatSelected ? "取消全选此分类" : "全选此分类"}
													style={{
														display: "flex",
														alignItems: "center",
														gap: 6,
														background: "none",
														border: "none",
														cursor: "pointer",
														padding: 0,
													}}
												>
													{/* Mini checkbox */}
													<span
														style={{
															width: 14,
															height: 14,
															borderRadius: 4,
															border: allCatSelected
																? "1.5px solid var(--primary)"
																: someCatSelected
																	? "1.5px solid var(--primary)"
																	: "1.5px solid var(--border)",
															background: allCatSelected
																? "var(--primary)"
																: someCatSelected
																	? "var(--primary-light)"
																	: "transparent",
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
															flexShrink: 0,
															transition: "all 0.15s",
														}}
													>
														{allCatSelected && (
															<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
																<polyline points="20 6 9 17 4 12" />
															</svg>
														)}
														{someCatSelected && !allCatSelected && (
															<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
																<line x1="5" y1="12" x2="19" y2="12" />
															</svg>
														)}
													</span>
													<span
														style={{
															fontSize: 12,
															fontWeight: 700,
															color: allCatSelected || someCatSelected ? "var(--primary)" : "var(--text-2)",
															letterSpacing: "0.04em",
															textTransform: "uppercase",
															transition: "color 0.15s",
														}}
													>
														{cat.name}
													</span>
												</button>
												{!cat.builtin && (
													<span
														style={{
															fontSize: 10,
															fontWeight: 500,
															color: "var(--text-3)",
															background: "var(--surface-3)",
															border: "1px solid var(--border-subtle)",
															borderRadius: 4,
															padding: "1px 5px",
														}}
													>
														自定义
													</span>
												)}
												<span
													style={{
														fontSize: 11,
														color: "var(--text-3)",
													}}
												>
													{catModules.length} 个模块 · {catModules.reduce((sum, m) => sum + (moduleStats.find((s) => s.module === m)?.total ?? 0), 0)} 道题
												</span>
											</div>

											{/* Module cards */}
											<div
												style={{
													display: "grid",
													gridTemplateColumns: "repeat(4, 1fr)",
													gap: 8,
												}}
												className="modules-grid"
											>
												{catModules.map((mod) => {
													const stat = moduleStats.find((s) => s.module === mod);
													return (
														<ModuleCard
															key={mod}
															module={mod}
															selected={selectedModules.includes(mod)}
															questionCount={stat?.total ?? 0}
															masteredCount={stat?.mastered ?? 0}
															onClick={() => toggleModule(mod)}
														/>
													);
												})}
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* Difficulty Selection */}
						<div className="animate-fade-in stagger-2">
							<p
								style={{
									fontSize: 11,
									fontWeight: 600,
									color: "var(--text-3)",
									textTransform: "uppercase",
									letterSpacing: "0.06em",
									marginBottom: 10,
								}}
							>
								难度
							</p>
							<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
								<DifficultyChip
									difficulty="all"
									selected={selectedDifficulty === "all"}
									count={
										selectedModules.length > 0
											? allQuestions.filter((q) =>
													selectedModules.includes(q.module),
												).length
											: allQuestions.length
									}
									onClick={() => setSelectedDifficulty("all")}
								/>
								{([1, 2, 3] as Difficulty[]).map((d) => (
									<DifficultyChip
										key={d}
										difficulty={d}
										selected={selectedDifficulty === d}
										count={difficultyStats[d]}
										onClick={() => setSelectedDifficulty(d)}
									/>
								))}
							</div>
						</div>

						{/* Status Filter */}
						<div className="animate-fade-in stagger-3">
							<p
								style={{
									fontSize: 11,
									fontWeight: 600,
									color: "var(--text-3)",
									textTransform: "uppercase",
									letterSpacing: "0.06em",
									marginBottom: 10,
								}}
							>
								学习状态
							</p>
							<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
								{(["all", "unlearned", "review", "mastered"] as const).map(
									(s) => (
										<StatusChip
											key={s}
											status={s}
											selected={selectedStatus === s}
											count={statusCounts[s]}
											onClick={() => setSelectedStatus(s)}
										/>
									),
								)}
							</div>
						</div>
					</div>

					{/* ── Right: Session Preview ── */}
					<div
						className="animate-fade-in stagger-2 practice-session-preview"
						style={{
							position: "sticky",
							top: "calc(var(--navbar-h) + 20px)",
							alignSelf: "flex-start",
							minWidth: 0,
						}}
					>
						<SessionPreview
							count={filteredQuestions.length}
							modules={selectedModules}
							difficulty={selectedDifficulty}
							statusFilter={selectedStatus}
							onStart={handleStart}
							onShuffle={() => setIsShuffled((v) => !v)}
							isShuffled={isShuffled}
						/>

						{/* Question preview list */}
						{filteredQuestions.length > 0 && (
							<div style={{ marginTop: 16 }}>
								<p
									style={{
										fontSize: 11,
										color: "var(--text-3)",
										marginBottom: 8,
										paddingLeft: 2,
									}}
								>
									前 5 题预览
								</p>
								<div
									style={{ display: "flex", flexDirection: "column", gap: 4 }}
								>
									{filteredQuestions.slice(0, 5).map((q, i) => {
										const status = records[q.id]?.status ?? "unlearned";
										const dotColor =
											status === "mastered"
												? "var(--success)"
												: status === "review"
													? "var(--warning)"
													: "var(--border)";

										return (
											<div
												key={q.id}
												className="animate-fade-in"
												style={{
													display: "flex",
													alignItems: "center",
													gap: 8,
													padding: "7px 10px",
													borderRadius: 8,
													background: "var(--surface-2)",
													animationDelay: `${i * 0.05}s`,
												}}
											>
												<span
													style={{
														width: 6,
														height: 6,
														borderRadius: "50%",
														flexShrink: 0,
														background: dotColor,
													}}
												/>
												<span
													style={{
														fontSize: 12,
														color: "var(--text-2)",
														flex: 1,
														minWidth: 0,
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
													}}
												>
													{q.question}
												</span>
											</div>
										);
									})}
									{filteredQuestions.length > 5 && (
										<p
											style={{
												textAlign: "center",
												fontSize: 11,
												color: "var(--text-3)",
												paddingTop: 4,
											}}
										>
											还有 {filteredQuestions.length - 5} 道
										</p>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			<style>{`
					/* ── Practice page responsive ── */
					@media (max-width: 900px) {
						.practice-grid {
							grid-template-columns: 1fr !important;
						}
						.modules-grid {
							grid-template-columns: repeat(3, 1fr) !important;
						}
						.presets-grid {
							grid-template-columns: repeat(2, 1fr) !important;
						}
						.practice-session-preview {
							position: static !important;
							align-self: auto !important;
						}
					}
					@media (max-width: 640px) {
						.modules-grid {
							grid-template-columns: repeat(2, 1fr) !important;
						}
						.presets-grid {
							grid-template-columns: repeat(2, 1fr) !important;
						}
						.practice-session-preview {
							position: static !important;
						}
						/* Prevent page-container horizontal overflow */
						.page-container {
							padding-left: 12px !important;
							padding-right: 12px !important;
							overflow-x: hidden;
						}
					}
					@media (max-width: 480px) {
						.modules-grid {
							grid-template-columns: repeat(2, 1fr) !important;
						}
						.presets-grid {
							grid-template-columns: repeat(2, 1fr) !important;
						}
					}
				`}</style>
		</div>
	);
}
