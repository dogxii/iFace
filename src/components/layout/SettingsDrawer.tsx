import { useCallback, useEffect, useRef, useState } from "react";
import {
	type AIConfig,
	DEFAULT_AI_CONFIG,
	PRESET_BASE_URLS,
	PRESET_MODELS,
	useAIStore,
} from "@/store/useAIStore";
import {
	exportAllData,
	getAllQuestions,
	getAllStudyRecords,
	bulkPutQuestions,
	bulkPutStudyRecords,
	resetDatabase,
} from "@/lib/db";
import { useStudyStore } from "@/store/useStudyStore";

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconAI() {
	return (
		<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
			<circle cx="7.5" cy="14.5" r="1.5" />
			<circle cx="16.5" cy="14.5" r="1.5" />
		</svg>
	);
}

function IconData() {
	return (
		<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<ellipse cx="12" cy="5" rx="9" ry="3" />
			<path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
			<path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
		</svg>
	);
}

function IconGitHub() {
	return (
		<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
			<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
		</svg>
	);
}

function IconClose() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
			<line x1="18" y1="6" x2="6" y2="18" />
			<line x1="6" y1="6" x2="18" y2="18" />
		</svg>
	);
}

function IconCheck() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
			<polyline points="20 6 9 17 4 12" />
		</svg>
	);
}

function IconDownload() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="7 10 12 15 17 10" />
			<line x1="12" y1="15" x2="12" y2="3" />
		</svg>
	);
}

function IconUpload() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="17 8 12 3 7 8" />
			<line x1="12" y1="3" x2="12" y2="15" />
		</svg>
	);
}

function IconTrash() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<polyline points="3 6 5 6 21 6" />
			<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
			<path d="M10 11v6M14 11v6" />
			<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
		</svg>
	);
}

function IconEye() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
			<circle cx="12" cy="12" r="3" />
		</svg>
	);
}

function IconEyeOff() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
			<line x1="1" y1="1" x2="23" y2="23" />
		</svg>
	);
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
			<div
				style={{
					width: 28,
					height: 28,
					borderRadius: 8,
					background: "var(--primary-light)",
					color: "var(--primary)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
				}}
			>
				{icon}
			</div>
			<span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{title}</span>
		</div>
	);
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({
	checked,
	onChange,
	label,
	description,
}: {
	checked: boolean;
	onChange: (v: boolean) => void;
	label: string;
	description?: string;
}) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 12,
				padding: "10px 12px",
				borderRadius: 10,
				background: "var(--surface-2)",
				border: "1px solid var(--border-subtle)",
				cursor: "pointer",
			}}
			onClick={() => onChange(!checked)}
		>
			<div>
				<p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: description ? 2 : 0 }}>
					{label}
				</p>
				{description && (
					<p style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.4 }}>{description}</p>
				)}
			</div>
			<div
				style={{
					width: 36,
					height: 20,
					borderRadius: 99,
					background: checked ? "var(--primary)" : "var(--border)",
					position: "relative",
					flexShrink: 0,
					transition: "background 0.2s",
				}}
			>
				<div
					style={{
						width: 16,
						height: 16,
						borderRadius: "50%",
						background: "white",
						position: "absolute",
						top: 2,
						left: checked ? 18 : 2,
						transition: "left 0.2s",
						boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
					}}
				/>
			</div>
		</div>
	);
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
	label,
	children,
	hint,
}: {
	label: string;
	children: React.ReactNode;
	hint?: string;
}) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
			<label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>
				{label}
			</label>
			{children}
			{hint && (
				<p style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.4 }}>{hint}</p>
			)}
		</div>
	);
}

// ─── API Key Input ────────────────────────────────────────────────────────────

function ApiKeyInput({
	value,
	onChange,
	placeholder,
}: {
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
}) {
	const [show, setShow] = useState(false);

	return (
		<div style={{ position: "relative" }}>
			<input
				type={show ? "text" : "password"}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder ?? "sk-..."}
				className="input-base"
				style={{ paddingRight: 36, fontFamily: value && !show ? "var(--font-mono)" : undefined }}
				autoComplete="off"
				spellCheck={false}
			/>
			<button
				type="button"
				onClick={() => setShow((v) => !v)}
				style={{
					position: "absolute",
					right: 10,
					top: "50%",
					transform: "translateY(-50%)",
					background: "none",
					border: "none",
					color: "var(--text-3)",
					cursor: "pointer",
					display: "flex",
					padding: 2,
				}}
				tabIndex={-1}
			>
				{show ? <IconEyeOff /> : <IconEye />}
			</button>
		</div>
	);
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: "success" | "error" | "info" }) {
	const colors = {
		success: { bg: "var(--success)", text: "white" },
		error: { bg: "var(--danger)", text: "white" },
		info: { bg: "var(--primary)", text: "white" },
	};
	const c = colors[type];
	return (
		<div
			style={{
				position: "fixed",
				bottom: 24,
				left: "50%",
				transform: "translateX(-50%)",
				zIndex: 9999,
				background: c.bg,
				color: c.text,
				padding: "8px 16px",
				borderRadius: 10,
				fontSize: 13,
				fontWeight: 500,
				boxShadow: "var(--shadow-lg)",
				animation: "slide-up 0.2s var(--ease-out) both",
				whiteSpace: "nowrap",
				maxWidth: "90vw",
				overflow: "hidden",
				textOverflow: "ellipsis",
			}}
		>
			{message}
		</div>
	);
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SettingsDrawerProps {
	open: boolean;
	onClose: () => void;
}

type Tab = "ai" | "data";

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
	const { config, updateConfig, resetConfig, clearAllSessions } = useAIStore();
	const { resetAll } = useStudyStore();

	const [tab, setTab] = useState<Tab>("ai");
	const [localConfig, setLocalConfig] = useState<AIConfig>({ ...config });
	const [customModel, setCustomModel] = useState("");
	const [customBaseUrl, setCustomBaseUrl] = useState("");
	const [isDirty, setIsDirty] = useState(false);
	const [saved, setSaved] = useState(false);
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
	const [confirmReset, setConfirmReset] = useState<"records" | "all" | null>(null);
	const [dataStats, setDataStats] = useState<{ questions: number; records: number } | null>(null);
	const [importing, setImporting] = useState(false);
	const [exporting, setExporting] = useState(false);

	const importRef = useRef<HTMLInputElement>(null);
	const drawerRef = useRef<HTMLDivElement>(null);

	// Sync local config when store changes or drawer opens
	useEffect(() => {
		if (open) {
			setLocalConfig({ ...config });
			setIsDirty(false);
			setSaved(false);
		}
	}, [open, config]);

	// Load data stats when data tab is open
	useEffect(() => {
		if (open && tab === "data") {
			Promise.all([getAllQuestions(), getAllStudyRecords()]).then(
				([questions, records]) => {
					setDataStats({ questions: questions.length, records: records.length });
				},
			);
		}
	}, [open, tab]);

	// Keyboard close
	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [open, onClose]);

	// Lock body scroll
	useEffect(() => {
		document.body.style.overflow = open ? "hidden" : "";
		return () => { document.body.style.overflow = ""; };
	}, [open]);

	const showToast = useCallback(
		(message: string, type: "success" | "error" | "info" = "success") => {
			setToast({ message, type });
			setTimeout(() => setToast(null), 2800);
		},
		[],
	);

	const patch = useCallback((partial: Partial<AIConfig>) => {
		setLocalConfig((prev) => ({ ...prev, ...partial }));
		setIsDirty(true);
		setSaved(false);
	}, []);

	const handleSave = useCallback(() => {
		// If using custom model
		const finalModel =
			localConfig.model === "custom" ? customModel.trim() : localConfig.model;
		const finalBaseUrl =
			localConfig.baseUrl === "custom" ? customBaseUrl.trim() : localConfig.baseUrl;

		if (!finalModel) {
			showToast("请填写模型名称", "error");
			return;
		}
		if (!finalBaseUrl) {
			showToast("请填写 Base URL", "error");
			return;
		}

		updateConfig({ ...localConfig, model: finalModel, baseUrl: finalBaseUrl });
		setIsDirty(false);
		setSaved(true);
		showToast("设置已保存 ✓");
		setTimeout(() => setSaved(false), 2000);
	}, [localConfig, customModel, customBaseUrl, updateConfig, showToast]);

	const handleReset = useCallback(() => {
		setLocalConfig({ ...DEFAULT_AI_CONFIG });
		resetConfig();
		setIsDirty(false);
		showToast("已恢复默认设置");
	}, [resetConfig, showToast]);

	// ─── Data Actions ──────────────────────────────────────────────────────────

	const handleExport = useCallback(async () => {
		setExporting(true);
		try {
			const data = await exportAllData();
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `iface-backup-${new Date().toISOString().slice(0, 10)}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast(`已导出 ${data.questions.length} 题、${data.studyRecords.length} 条记录`);
		} catch {
			showToast("导出失败，请重试", "error");
		} finally {
			setExporting(false);
		}
	}, [showToast]);

	const handleImport = useCallback(
		async (file: File) => {
			setImporting(true);
			try {
				const text = await file.text();
				const data = JSON.parse(text);

				if (!data || typeof data !== "object") throw new Error("文件格式无效");

				let qCount = 0;
				let rCount = 0;

				if (Array.isArray(data.questions) && data.questions.length > 0) {
					await bulkPutQuestions(data.questions);
					qCount = data.questions.length;
				}

				if (Array.isArray(data.studyRecords) && data.studyRecords.length > 0) {
					await bulkPutStudyRecords(data.studyRecords);
					rCount = data.studyRecords.length;
				}

				showToast(`导入成功：${qCount} 题、${rCount} 条记录`);

				// Refresh stats
				const [questions, records] = await Promise.all([
					getAllQuestions(),
					getAllStudyRecords(),
				]);
				setDataStats({ questions: questions.length, records: records.length });
			} catch (err) {
				const msg = err instanceof Error ? err.message : "文件解析失败";
				showToast(msg, "error");
			} finally {
				setImporting(false);
				if (importRef.current) importRef.current.value = "";
			}
		},
		[showToast],
	);

	const handleResetConfirm = useCallback(async () => {
		if (!confirmReset) return;
		try {
			if (confirmReset === "records") {
				await resetAll();
				showToast("学习记录已清空");
			} else {
				await resetDatabase();
				await resetAll();
				clearAllSessions();
				showToast("所有数据已重置");
			}
			setDataStats({ questions: 0, records: 0 });
		} catch {
			showToast("操作失败，请重试", "error");
		} finally {
			setConfirmReset(null);
		}
	}, [confirmReset, resetAll, clearAllSessions, showToast]);

	// ─── Determine model/url selection ────────────────────────────────────────

	const isCustomModel = !PRESET_MODELS.slice(0, -1).some((m) => m.value === localConfig.model);
	const isCustomUrl = !PRESET_BASE_URLS.slice(0, -1).some((u) => u.value === localConfig.baseUrl);

	const selectedModel = isCustomModel ? "custom" : localConfig.model;
	const selectedUrl = isCustomUrl ? "custom" : localConfig.baseUrl;

	useEffect(() => {
		if (isCustomModel) setCustomModel(localConfig.model);
		if (isCustomUrl) setCustomBaseUrl(localConfig.baseUrl);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	if (!open) return null;

	return (
		<>
			{/* Backdrop */}
			<div
				onClick={onClose}
				style={{
					position: "fixed",
					inset: 0,
					zIndex: 200,
					background: "rgba(0,0,0,0.35)",
					backdropFilter: "blur(2px)",
					animation: "fade-in 0.18s var(--ease-out) both",
				}}
			/>

			{/* Drawer */}
			<div
				ref={drawerRef}
				style={{
					position: "fixed",
					top: 0,
					right: 0,
					bottom: 0,
					zIndex: 201,
					width: "min(440px, 100vw)",
					background: "var(--surface)",
					borderLeft: "1px solid var(--border-subtle)",
					boxShadow: "var(--shadow-xl)",
					display: "flex",
					flexDirection: "column",
					animation: "drawer-slide-in 0.22s var(--ease-out) both",
					overflow: "hidden",
				}}
			>
				{/* Header */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "16px 20px",
						borderBottom: "1px solid var(--border-subtle)",
						flexShrink: 0,
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
						<div
							style={{
								width: 32,
								height: 32,
								borderRadius: 9,
								background: "var(--primary-light)",
								color: "var(--primary)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<circle cx="12" cy="12" r="3" />
								<path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2" />
							</svg>
						</div>
						<span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
							设置
						</span>
					</div>
					<button
						onClick={onClose}
						style={{
							width: 30,
							height: 30,
							borderRadius: 8,
							border: "none",
							background: "transparent",
							color: "var(--text-3)",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							transition: "background 0.15s, color 0.15s",
						}}
						onMouseEnter={(e) => {
							(e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
							(e.currentTarget as HTMLElement).style.color = "var(--text)";
						}}
						onMouseLeave={(e) => {
							(e.currentTarget as HTMLElement).style.background = "transparent";
							(e.currentTarget as HTMLElement).style.color = "var(--text-3)";
						}}
					>
						<IconClose />
					</button>
				</div>

				{/* Tabs */}
				<div
					style={{
						display: "flex",
						gap: 4,
						padding: "10px 20px",
						borderBottom: "1px solid var(--border-subtle)",
						flexShrink: 0,
					}}
				>
					{(["ai", "data"] as Tab[]).map((t) => {
						const labels: Record<Tab, string> = { ai: "AI 助手", data: "数据管理" };
						const icons: Record<Tab, React.ReactNode> = {
							ai: <IconAI />,
							data: <IconData />,
						};
						const active = tab === t;
						return (
							<button
								key={t}
								onClick={() => setTab(t)}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 6,
									padding: "6px 12px",
									borderRadius: 8,
									border: "none",
									cursor: "pointer",
									fontSize: 13,
									fontWeight: active ? 500 : 400,
									color: active ? "var(--primary)" : "var(--text-2)",
									background: active ? "var(--primary-light)" : "transparent",
									transition: "all 0.15s",
								}}
							>
								{icons[t]}
								{labels[t]}
							</button>
						);
					})}
				</div>

				{/* Body */}
				<div
					style={{
						flex: 1,
						overflowY: "auto",
						padding: "20px",
						display: "flex",
						flexDirection: "column",
						gap: 20,
					}}
				>
					{/* ── AI Tab ── */}
					{tab === "ai" && (
						<>
							<SectionHeader icon={<IconAI />} title="AI 助手配置" />

							{/* Enable Toggle */}
							<Toggle
								checked={localConfig.enabled}
								onChange={(v) => patch({ enabled: v })}
								label="启用 AI 助手"
								description="在题目详情页启用 AI 辅助分析和面试指导"
							/>

							{/* API Key */}
							<Field
								label="API Key"
								hint="密钥仅存储在本地，不会上传到任何服务器"
							>
								<ApiKeyInput
									value={localConfig.apiKey}
									onChange={(v) => patch({ apiKey: v })}
									placeholder="sk-..."
								/>
							</Field>

							{/* Base URL */}
							<Field label="API Base URL">
								<select
									value={selectedUrl}
									onChange={(e) => {
										const v = e.target.value;
										if (v === "custom") {
											patch({ baseUrl: customBaseUrl || "custom" });
										} else {
											patch({ baseUrl: v });
										}
									}}
									className="input-base"
									style={{ cursor: "pointer" }}
								>
									{PRESET_BASE_URLS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
								{selectedUrl === "custom" && (
									<input
										type="text"
										value={customBaseUrl}
										onChange={(e) => {
											setCustomBaseUrl(e.target.value);
											patch({ baseUrl: e.target.value });
										}}
										placeholder="https://your-api.com/v1"
										className="input-base"
										style={{ marginTop: 6 }}
									/>
								)}
							</Field>

							{/* Model */}
							<Field label="模型">
								<select
									value={selectedModel}
									onChange={(e) => {
										const v = e.target.value;
										if (v === "custom") {
											patch({ model: customModel || "custom" });
										} else {
											patch({ model: v });
										}
									}}
									className="input-base"
									style={{ cursor: "pointer" }}
								>
									{PRESET_MODELS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
								{selectedModel === "custom" && (
									<input
										type="text"
										value={customModel}
										onChange={(e) => {
											setCustomModel(e.target.value);
											patch({ model: e.target.value });
										}}
										placeholder="模型名称，如 gpt-4-turbo"
										className="input-base"
										style={{ marginTop: 6 }}
									/>
								)}
							</Field>

							{/* Advanced */}
							<details style={{ marginTop: -4 }}>
								<summary
									style={{
										fontSize: 12,
										color: "var(--text-3)",
										cursor: "pointer",
										userSelect: "none",
										listStyle: "none",
										display: "flex",
										alignItems: "center",
										gap: 4,
									}}
								>
									<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
										<polyline points="9 18 15 12 9 6" />
									</svg>
									高级参数
								</summary>
								<div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
									<Field label={`Temperature：${localConfig.temperature}`} hint="越高越有创意，越低越保守">
										<input
											type="range"
											min="0"
											max="2"
											step="0.1"
											value={localConfig.temperature}
											onChange={(e) => patch({ temperature: parseFloat(e.target.value) })}
											style={{ width: "100%", accentColor: "var(--primary)" }}
										/>
									</Field>
									<Field label="最大 Token 数" hint="控制单次回复的最大长度">
										<input
											type="number"
											value={localConfig.maxTokens}
											onChange={(e) => patch({ maxTokens: parseInt(e.target.value) || 2000 })}
											min={100}
											max={8000}
											step={100}
											className="input-base"
										/>
									</Field>
								</div>
							</details>

							{/* Usage tip */}
							<div
								style={{
									padding: "12px 14px",
									borderRadius: 10,
									background: "var(--primary-light)",
									border: "1px solid rgba(var(--primary-rgb), 0.15)",
									fontSize: 12,
									color: "var(--text-2)",
									lineHeight: 1.6,
								}}
							>
								<p style={{ fontWeight: 500, color: "var(--primary)", marginBottom: 6 }}>
									💡 使用说明
								</p>
								<p>在题目详情页点击「AI 分析」按钮即可开始对话。</p>
								<p style={{ marginTop: 4 }}>可使用快捷动作快速获取考点分析、答题结构、追问预测等辅助。</p>
							</div>

							{/* AI Sessions Clear */}
							<div
								style={{
									padding: "12px 14px",
									borderRadius: 10,
									background: "var(--surface-2)",
									border: "1px solid var(--border-subtle)",
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: 12,
								}}
							>
								<div>
									<p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>清除对话记录</p>
									<p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>删除所有 AI 对话历史（本地存储）</p>
								</div>
								<button
									onClick={() => {
										clearAllSessions();
										showToast("对话记录已清除");
									}}
									style={{
										padding: "5px 12px",
										borderRadius: 7,
										border: "1px solid var(--border)",
										background: "transparent",
										color: "var(--text-2)",
										fontSize: 12,
										cursor: "pointer",
										whiteSpace: "nowrap",
										transition: "all 0.15s",
									}}
									onMouseEnter={(e) => {
										(e.currentTarget as HTMLElement).style.background = "var(--danger-light)";
										(e.currentTarget as HTMLElement).style.color = "var(--danger)";
										(e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.3)";
									}}
									onMouseLeave={(e) => {
										(e.currentTarget as HTMLElement).style.background = "transparent";
										(e.currentTarget as HTMLElement).style.color = "var(--text-2)";
										(e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
									}}
								>
									清除
								</button>
							</div>
						</>
					)}

					{/* ── Data Tab ── */}
					{tab === "data" && (
						<>
							<SectionHeader icon={<IconData />} title="数据管理" />

							{/* Stats */}
							{dataStats && (
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 1fr",
										gap: 10,
									}}
								>
									{[
										{ label: "题目总数", value: dataStats.questions, color: "var(--primary)" },
										{ label: "学习记录", value: dataStats.records, color: "var(--success)" },
									].map((stat) => (
										<div
											key={stat.label}
											style={{
												padding: "14px 16px",
												borderRadius: 10,
												background: "var(--surface-2)",
												border: "1px solid var(--border-subtle)",
												textAlign: "center",
											}}
										>
											<p
												style={{
													fontSize: 22,
													fontWeight: 700,
													color: stat.color,
													fontVariantNumeric: "tabular-nums",
													lineHeight: 1,
													marginBottom: 6,
												}}
											>
												{stat.value.toLocaleString()}
											</p>
											<p style={{ fontSize: 11, color: "var(--text-3)" }}>{stat.label}</p>
										</div>
									))}
								</div>
							)}

							{/* Export */}
							<div
								style={{
									padding: "14px 16px",
									borderRadius: 10,
									background: "var(--surface-2)",
									border: "1px solid var(--border-subtle)",
								}}
							>
								<p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>
									导出数据
								</p>
								<p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12, lineHeight: 1.5 }}>
									将题目库和学习记录导出为 JSON 文件，可用于备份或在其他设备恢复。
								</p>
								<button
									onClick={handleExport}
									disabled={exporting}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 6,
										padding: "7px 14px",
										borderRadius: 8,
										border: "1px solid var(--border)",
										background: "var(--surface)",
										color: "var(--text)",
										fontSize: 13,
										fontWeight: 500,
										cursor: exporting ? "wait" : "pointer",
										transition: "all 0.15s",
										opacity: exporting ? 0.6 : 1,
									}}
									onMouseEnter={(e) => {
										if (!exporting) {
											(e.currentTarget as HTMLElement).style.background = "var(--primary-light)";
											(e.currentTarget as HTMLElement).style.color = "var(--primary)";
											(e.currentTarget as HTMLElement).style.borderColor = "rgba(var(--primary-rgb),0.3)";
										}
									}}
									onMouseLeave={(e) => {
										(e.currentTarget as HTMLElement).style.background = "var(--surface)";
										(e.currentTarget as HTMLElement).style.color = "var(--text)";
										(e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
									}}
								>
									<IconDownload />
									{exporting ? "导出中…" : "导出 JSON"}
								</button>
							</div>

							{/* Import */}
							<div
								style={{
									padding: "14px 16px",
									borderRadius: 10,
									background: "var(--surface-2)",
									border: "1px solid var(--border-subtle)",
								}}
							>
								<p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>
									导入数据
								</p>
								<p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12, lineHeight: 1.5 }}>
									从备份文件恢复数据。已存在的题目和记录将被覆盖更新。
								</p>
								<input
									ref={importRef}
									type="file"
									accept=".json"
									style={{ display: "none" }}
									onChange={(e) => {
										const file = e.target.files?.[0];
										if (file) handleImport(file);
									}}
								/>
								<button
									onClick={() => importRef.current?.click()}
									disabled={importing}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 6,
										padding: "7px 14px",
										borderRadius: 8,
										border: "1px solid var(--border)",
										background: "var(--surface)",
										color: "var(--text)",
										fontSize: 13,
										fontWeight: 500,
										cursor: importing ? "wait" : "pointer",
										transition: "all 0.15s",
										opacity: importing ? 0.6 : 1,
									}}
									onMouseEnter={(e) => {
										if (!importing) {
											(e.currentTarget as HTMLElement).style.background = "var(--primary-light)";
											(e.currentTarget as HTMLElement).style.color = "var(--primary)";
											(e.currentTarget as HTMLElement).style.borderColor = "rgba(var(--primary-rgb),0.3)";
										}
									}}
									onMouseLeave={(e) => {
										(e.currentTarget as HTMLElement).style.background = "var(--surface)";
										(e.currentTarget as HTMLElement).style.color = "var(--text)";
										(e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
									}}
								>
									<IconUpload />
									{importing ? "导入中…" : "选择文件"}
								</button>
							</div>

							{/* Danger Zone */}
							<div
								style={{
									borderRadius: 10,
									border: "1px solid rgba(239,68,68,0.2)",
									overflow: "hidden",
								}}
							>
								<div
									style={{
										padding: "10px 14px",
										background: "rgba(239,68,68,0.06)",
										borderBottom: "1px solid rgba(239,68,68,0.15)",
									}}
								>
									<p style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
										危险操作
									</p>
								</div>

								<div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
									{/* Clear records */}
									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											gap: 12,
										}}
									>
										<div>
											<p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>清除学习记录</p>
											<p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>保留题库，仅删除进度数据</p>
										</div>
										{confirmReset === "records" ? (
											<div style={{ display: "flex", gap: 6 }}>
												<button
													onClick={handleResetConfirm}
													style={{
														padding: "4px 10px",
														borderRadius: 6,
														border: "1px solid rgba(239,68,68,0.3)",
														background: "var(--danger)",
														color: "white",
														fontSize: 12,
														cursor: "pointer",
													}}
												>
													确认
												</button>
												<button
													onClick={() => setConfirmReset(null)}
													style={{
														padding: "4px 10px",
														borderRadius: 6,
														border: "1px solid var(--border)",
														background: "transparent",
														color: "var(--text-2)",
														fontSize: 12,
														cursor: "pointer",
													}}
												>
													取消
												</button>
											</div>
										) : (
											<button
												onClick={() => setConfirmReset("records")}
												style={{
													display: "flex",
													alignItems: "center",
													gap: 5,
													padding: "5px 10px",
													borderRadius: 7,
													border: "1px solid rgba(239,68,68,0.25)",
													background: "var(--danger-light)",
													color: "var(--danger)",
													fontSize: 12,
													cursor: "pointer",
													whiteSpace: "nowrap",
												}}
											>
												<IconTrash />
												清除
											</button>
										)}
									</div>

									{/* Reset all */}
									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											gap: 12,
										}}
									>
										<div>
											<p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>重置所有数据</p>
											<p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>删除题库、记录、AI 对话等全部数据</p>
										</div>
										{confirmReset === "all" ? (
											<div style={{ display: "flex", gap: 6 }}>
												<button
													onClick={handleResetConfirm}
													style={{
														padding: "4px 10px",
														borderRadius: 6,
														border: "1px solid rgba(239,68,68,0.3)",
														background: "var(--danger)",
														color: "white",
														fontSize: 12,
														cursor: "pointer",
													}}
												>
													确认
												</button>
												<button
													onClick={() => setConfirmReset(null)}
													style={{
														padding: "4px 10px",
														borderRadius: 6,
														border: "1px solid var(--border)",
														background: "transparent",
														color: "var(--text-2)",
														fontSize: 12,
														cursor: "pointer",
													}}
												>
													取消
												</button>
											</div>
										) : (
											<button
												onClick={() => setConfirmReset("all")}
												style={{
													display: "flex",
													alignItems: "center",
													gap: 5,
													padding: "5px 10px",
													borderRadius: 7,
													border: "1px solid rgba(239,68,68,0.25)",
													background: "var(--danger-light)",
													color: "var(--danger)",
													fontSize: 12,
													cursor: "pointer",
													whiteSpace: "nowrap",
												}}
											>
												<IconTrash />
												重置
											</button>
										)}
									</div>
								</div>
							</div>
						</>
					)}
				</div>

				{/* Footer */}
				<div
					style={{
						borderTop: "1px solid var(--border-subtle)",
						flexShrink: 0,
					}}
				>
					{/* Save bar (AI tab) */}
					{tab === "ai" && (
						<div
							style={{
								padding: "12px 20px",
								display: "flex",
								alignItems: "center",
								gap: 8,
								borderBottom: "1px solid var(--border-subtle)",
							}}
						>
							<button
								onClick={handleSave}
								disabled={!isDirty}
								style={{
									flex: 1,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: 6,
									padding: "8px 16px",
									borderRadius: 9,
									border: "none",
									background: isDirty ? "var(--primary)" : "var(--surface-3)",
									color: isDirty ? "white" : "var(--text-3)",
									fontSize: 13,
									fontWeight: 500,
									cursor: isDirty ? "pointer" : "default",
									transition: "all 0.15s",
								}}
							>
								{saved ? <><IconCheck /> 已保存</> : "保存设置"}
							</button>
							<button
								onClick={handleReset}
								style={{
									padding: "8px 12px",
									borderRadius: 9,
									border: "1px solid var(--border)",
									background: "transparent",
									color: "var(--text-3)",
									fontSize: 12,
									cursor: "pointer",
									whiteSpace: "nowrap",
									transition: "all 0.15s",
								}}
								onMouseEnter={(e) => {
									(e.currentTarget as HTMLElement).style.color = "var(--text)";
									(e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
								}}
								onMouseLeave={(e) => {
									(e.currentTarget as HTMLElement).style.color = "var(--text-3)";
									(e.currentTarget as HTMLElement).style.background = "transparent";
								}}
							>
								恢复默认
							</button>
						</div>
					)}

					{/* GitHub link */}
					<div
						style={{
							padding: "10px 20px",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<a
							href="https://github.com/dogxii/iFace"
							target="_blank"
							rel="noopener noreferrer"
							style={{
								display: "flex",
								alignItems: "center",
								gap: 7,
								fontSize: 12,
								color: "var(--text-3)",
								textDecoration: "none",
								transition: "color 0.15s",
							}}
							onMouseEnter={(e) => {
								(e.currentTarget as HTMLElement).style.color = "var(--text)";
							}}
							onMouseLeave={(e) => {
								(e.currentTarget as HTMLElement).style.color = "var(--text-3)";
							}}
						>
							<IconGitHub />
							dogxii/iFace
						</a>
						<span style={{ fontSize: 11, color: "var(--text-3)" }}>
							Made with ❤️
						</span>
					</div>
				</div>
			</div>

			{toast && <Toast message={toast.message} type={toast.type} />}

			<style>{`
        @keyframes drawer-slide-in {
          from { transform: translateX(100%); opacity: 0.8; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
		</>
	);
}
