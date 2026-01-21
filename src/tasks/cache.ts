import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import type { ScopeRecord, TaskDefinition } from "../core/config/types";
import { ensureDir } from "../core/fs";

export interface TaskCacheEntry {
	inputHash: string;
	outputs: string[];
}

export interface TaskCache {
	version: 1;
	scopes: Record<string, Record<string, TaskCacheEntry>>;
}

const cacheRoot = ".cache/mono-toolkit/cache";
const cacheFile = "tasks.json";

const resolvePattern = (
	repoRoot: string,
	scope: ScopeRecord,
	pattern: string,
): string => {
	if (path.isAbsolute(pattern)) {
		return pattern;
	}
	return path.join(repoRoot, scope.path, pattern);
};

const hashFiles = async (files: string[]): Promise<string> => {
	const hash = crypto.createHash("sha256");
	for (const file of files) {
		const content = await fs.readFile(file);
		hash.update(file);
		hash.update(content);
	}
	return hash.digest("hex");
};

export const loadTaskCache = async (repoRoot: string): Promise<TaskCache> => {
	const filePath = path.join(repoRoot, cacheRoot, cacheFile);
	try {
		const raw = await fs.readFile(filePath, "utf8");
		const parsed = JSON.parse(raw) as TaskCache;
		if (parsed.version === 1 && parsed.scopes) {
			return parsed;
		}
	} catch {
		// ignore
	}
	return { version: 1, scopes: {} };
};

export const saveTaskCache = async (
	repoRoot: string,
	cache: TaskCache,
): Promise<void> => {
	const dir = path.join(repoRoot, cacheRoot);
	await ensureDir(dir);
	await fs.writeFile(
		path.join(dir, cacheFile),
		`${JSON.stringify(cache, null, 2)}\n`,
		"utf8",
	);
};

export const computeTaskInputsHash = async (options: {
	repoRoot: string;
	scope: ScopeRecord;
	task: TaskDefinition;
}): Promise<{ hash: string; inputs: string[] }> => {
	const patterns = options.task.inputs ?? [];
	const resolvedPatterns = patterns.map((pattern) =>
		resolvePattern(options.repoRoot, options.scope, pattern),
	);
	const files = await fg(resolvedPatterns, {
		dot: true,
		onlyFiles: true,
		unique: true,
	});
	files.sort();
	if (!files.length) {
		return { hash: "", inputs: [] };
	}
	const hash = await hashFiles(files);
	return { hash, inputs: files };
};

export const resolveTaskOutputs = async (options: {
	repoRoot: string;
	scope: ScopeRecord;
	task: TaskDefinition;
}): Promise<string[]> => {
	const patterns = options.task.outputs ?? [];
	const resolvedPatterns = patterns.map((pattern) =>
		resolvePattern(options.repoRoot, options.scope, pattern),
	);
	const files = await fg(resolvedPatterns, {
		dot: true,
		onlyFiles: true,
		unique: true,
	});
	files.sort();
	return files;
};
