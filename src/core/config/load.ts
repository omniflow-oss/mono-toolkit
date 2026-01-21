import path from "node:path";
import { pathExists, readJsonFile } from "../fs";
import { getPackageRoot } from "../package-root";
import { mergeObjects, type MergePolicy } from "./merge";
import { validateConfig } from "./validate";
import {
	configFiles,
	type ConfigMap,
	type ConfigName,
	type ToolkitConfig,
} from "./types";

const readMergePolicy = async (repoRoot: string): Promise<MergePolicy> => {
	const policyPath = path.join(repoRoot, "config", "merge-policy.json");
	if (!(await pathExists(policyPath))) {
		return {};
	}
	return readJsonFile<MergePolicy>(policyPath);
};

const loadConfigFile = async <T extends ConfigName>(
	name: T,
	repoRoot: string,
	policy: MergePolicy,
): Promise<ConfigMap[T]> => {
	const packageRoot = getPackageRoot();
	const defaultsPath = path.join(
		packageRoot,
		"config",
		"defaults",
		`${name}.json`,
	);
	const repoPath = path.join(repoRoot, "config", `${name}.json`);
	const defaults = await readJsonFile<ConfigMap[T]>(defaultsPath);
	let result = defaults;
	if (await pathExists(repoPath)) {
		const override = await readJsonFile<Partial<ConfigMap[T]>>(repoPath);
		result = mergeObjects(defaults, override, policy, [name]);
	}
	await validateConfig(name, result);
	return result;
};

export const loadConfig = async (repoRoot: string): Promise<ToolkitConfig> => {
	const policy = await readMergePolicy(repoRoot);
	const entries = await Promise.all(
		configFiles.map(async (name) => {
			const config = await loadConfigFile(name, repoRoot, policy);
			return [name, config] as const;
		}),
	);

	const config = entries.reduce<Record<ConfigName, ConfigMap[ConfigName]>>(
		(acc, [name, configEntry]) => {
			acc[name] = configEntry;
			return acc;
		},
		{} as Record<ConfigName, ConfigMap[ConfigName]>,
	);

	return config as ToolkitConfig;
};
