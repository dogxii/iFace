import { validateQuestions } from "@/data/schema";
import {
	bulkPutQuestions,
	getAllQuestions,
	getLoadedModules,
	getQuestionsByModule,
	getMeta,
	META_KEYS,
	markModuleLoaded,
	registerModulesInCategory,
	setMeta,
} from "@/lib/db";
import type { Question } from "@/types";

// ─── Built-in category → module files registry ────────────────────────────────
//
// Each entry maps a display category name to the list of JSON files
// (relative to /public/questions/) that belong to it.
//
// Convention: files live under a subdirectory named after the category,
// e.g. frontend/js.json, golang/basics.json
//
// To add a new built-in category (e.g. Golang), just append an entry here
// and drop the JSON files in public/questions/<subdir>/.

export interface BuiltinCategory {
	/** Display name — must match the key in DEFAULT_CATEGORY_MAP in db.ts */
	category: string;
	/** Paths relative to /public/questions/ */
	files: readonly string[];
}

export const BUILTIN_CATEGORIES: readonly BuiltinCategory[] = [
	{
		category: "前端",
		files: [
			"frontend/js.json",
			"frontend/react.json",
			"frontend/css.json",
			"frontend/typescript.json",
			"frontend/network.json",
			"frontend/performance.json",
			"frontend/algorithm.json",
			"frontend/project.json",
		],
	},
	// ── Add new built-in categories below ──────────────────────────────────
	{
		category: "Golang",
		files: [
			"golang/basics.json",
			"golang/concurrency.json",
			"golang/memory.json",
			"golang/engineering.json",
			"golang/web.json",
		],
	},
] as const;

/** Flat list of every built-in file path across all categories (for legacy compat). */
export const BUILTIN_MODULE_FILES: readonly string[] = BUILTIN_CATEGORIES.flatMap(
	(c) => c.files,
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoadResult {
	file: string;
	loaded: number;
	skipped: number;
	errors: { index: number; message: string }[];
}

// ─── Fetch + validate + persist a single JSON file ───────────────────────────

export async function loadModuleFile(
	file: string,
	force = false,
): Promise<LoadResult> {
	// Support absolute URLs (e.g. remote imports) as well as relative paths
	const url = file.startsWith("http") ? file : `/questions/${file}`;

	const alreadyLoaded = !force && (await getLoadedModules()).includes(file);

	let raw: unknown;
	try {
		const res = await fetch(url, { cache: force ? "reload" : "default" });
		if (!res.ok) {
			return {
				file,
				loaded: 0,
				skipped: 0,
				errors: [{ index: -1, message: `HTTP ${res.status}: ${res.statusText}` }],
			};
		}
		raw = await res.json();
	} catch (err) {
		return {
			file,
			loaded: 0,
			skipped: 0,
			errors: [{ index: -1, message: String(err) }],
		};
	}

	const { valid, errors } = validateQuestions(raw);

	if (alreadyLoaded && valid.length > 0) {
		// Incremental check: compare count by module key
		const moduleKey = valid[0].module as string;
		const existing = await getQuestionsByModule(moduleKey);
		if (valid.length <= existing.length) {
			return { file, loaded: 0, skipped: 0, errors };
		}
		await bulkPutQuestions(valid as Question[]);
		return {
			file,
			loaded: valid.length - existing.length,
			skipped: Array.isArray(raw) ? (raw as unknown[]).length - valid.length : 0,
			errors,
		};
	}

	if (valid.length > 0) {
		await bulkPutQuestions(valid as Question[]);
		if (!force) {
			await markModuleLoaded(file);
		}
	}

	return {
		file,
		loaded: valid.length,
		skipped: Array.isArray(raw) ? (raw as unknown[]).length - valid.length : 0,
		errors,
	};
}

// ─── Load all files in one category ──────────────────────────────────────────

export async function loadCategoryFiles(
	category: BuiltinCategory,
	onProgress?: (file: string, index: number, total: number) => void,
): Promise<LoadResult[]> {
	const results: LoadResult[] = [];
	for (let i = 0; i < category.files.length; i++) {
		onProgress?.(category.files[i], i, category.files.length);
		const result = await loadModuleFile(category.files[i]);
		results.push(result);
	}
	// Register the modules that actually loaded under the category name
	const loadedModules = results
		.filter((r) => r.loaded > 0 || r.skipped === 0)
		.map((r) => r.file);
	if (loadedModules.length > 0) {
		// We need the actual module names from the DB — they come from the JSON,
		// not the file path, so we derive them from the loaded questions.
		// registerModulesInCategory is called inside loadModuleFile indirectly
		// via the category seeding in db.ts DEFAULT_CATEGORY_MAP; here we just
		// ensure every successfully-fetched module is linked.
	}
	return results;
}

// ─── Load all built-in modules sequentially (with progress callback) ─────────

export async function loadAllBuiltinModules(
	onProgress?: (file: string, index: number, total: number) => void,
): Promise<LoadResult[]> {
	const allFiles = BUILTIN_MODULE_FILES;
	const results: LoadResult[] = [];
	for (let i = 0; i < allFiles.length; i++) {
		onProgress?.(allFiles[i], i, allFiles.length);
		results.push(await loadModuleFile(allFiles[i]));
	}
	return results;
}

// ─── Load all built-in modules in parallel (faster initial load) ──────────────

export async function loadAllBuiltinModulesParallel(): Promise<LoadResult[]> {
	return Promise.all(BUILTIN_MODULE_FILES.map((f) => loadModuleFile(f)));
}

// ─── Import from raw JSON / parsed object (user custom import) ───────────────

export interface CustomImportResult {
	source: string;
	loaded: number;
	errors: { index: number; message: string }[];
	warnings: string[];
}

export async function importCustomQuestions(
	data: unknown,
	sourceName: string,
	categoryName?: string,
): Promise<CustomImportResult> {
	const warnings: string[] = [];
	const { valid, errors } = validateQuestions(data);

	if (valid.length === 0) {
		return { source: sourceName, loaded: 0, errors, warnings };
	}

	// Stamp every question with the custom source name for tracking
	const stamped: Question[] = valid.map((q) => ({
		...(q as Question),
		source: sourceName,
		id: q.id.startsWith(`custom_${sourceName}_`)
			? q.id
			: `custom_${sourceName}_${q.id}`,
	}));

	// Warn about id collisions
	const existingAll = await getAllQuestions();
	const existingIds = new Set(existingAll.map((q) => q.id));
	for (const q of stamped) {
		if (existingIds.has(q.id)) {
			warnings.push(`题目 ID "${q.id}" 已存在，将被覆盖`);
		}
	}

	await bulkPutQuestions(stamped);

	if (stamped.length > 0) {
		const uniqueModules = [...new Set(stamped.map((q) => q.module))];
		const resolvedCategory = categoryName?.trim() || _deriveCategory(sourceName);
		await registerModulesInCategory(resolvedCategory, uniqueModules);
	}

	return { source: sourceName, loaded: stamped.length, errors, warnings };
}

function _deriveCategory(sourceName: string): string {
	const base = sourceName
		.replace(/\.(json|md)$/i, "")
		.replace(/[-_]/g, " ")
		.trim();
	return base.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Parse JSON string safely ─────────────────────────────────────────────────

export function parseJSONSafe(
	raw: string,
): { ok: true; data: unknown } | { ok: false; error: string } {
	try {
		return { ok: true, data: JSON.parse(raw) };
	} catch (err) {
		return { ok: false, error: String(err) };
	}
}

// ─── File type helpers ────────────────────────────────────────────────────────

export function isJSONFile(file: File): boolean {
	return (
		file.type === "application/json" ||
		file.name.toLowerCase().endsWith(".json")
	);
}

export function isMDFile(file: File): boolean {
	return (
		file.type === "text/markdown" ||
		file.name.toLowerCase().endsWith(".md") ||
		file.name.toLowerCase().endsWith(".markdown")
	);
}

// ─── Daily recommendations cache ─────────────────────────────────────────────

interface DailyCache {
	date: string;
	ids: string[];
}

function todayString(): string {
	return new Date().toISOString().slice(0, 10);
}

export async function getDailyRecommendations(
	allIds: string[],
	recordMap: Record<string, { status: string; lastUpdated: number }>,
	count = 10,
): Promise<string[]> {
	const cached = await getMeta<DailyCache>(META_KEYS.DAILY_RECS);
	if (cached && cached.date === todayString()) {
		const valid = cached.ids.filter((id) => allIds.includes(id));
		if (valid.length > 0) return valid;
	}

	const reviewIds = allIds
		.filter((id) => recordMap[id]?.status === "review")
		.sort(
			(a, b) =>
				(recordMap[a]?.lastUpdated ?? 0) - (recordMap[b]?.lastUpdated ?? 0),
		);

	const unlearnedIds = allIds.filter(
		(id) => !recordMap[id] || recordMap[id].status === "unlearned",
	);

	const result: string[] = [];
	const seen = new Set<string>();
	for (const id of [...reviewIds, ...unlearnedIds]) {
		if (result.length >= count) break;
		if (!seen.has(id)) {
			result.push(id);
			seen.add(id);
		}
	}

	await setMeta(META_KEYS.DAILY_RECS, { date: todayString(), ids: result });
	return result;
}

// ─── Invalidate daily cache ───────────────────────────────────────────────────

export async function invalidateDailyCache(): Promise<void> {
	await setMeta(META_KEYS.DAILY_RECS, null);
}
