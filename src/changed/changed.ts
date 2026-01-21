import path from "node:path";
import { execCommand } from "../core/exec";
import { ExitCode, ToolkitError } from "../core/errors";
import type { ChangedConfig, ScopeRecord } from "../core/config/types";
import { resolveBaseRef } from "./base";

const normalizePath = (filePath: string): string =>
	filePath.replace(/\\/g, "/");

export const getChangedFiles = async (options: {
	since?: string;
	base?: string;
	defaultBranch: string;
	allowFetchBase: boolean;
	cwd: string;
}): Promise<string[]> => {
	const baseRef = await resolveBaseRef(options);
	const result = await execCommand(
		"git",
		["diff", "--name-only", `${baseRef}...HEAD`],
		{
			cwd: options.cwd,
		},
	);
	if (result.exitCode !== 0) {
		throw new ToolkitError(
			"Unable to compute changed files",
			ExitCode.GitMissing,
			{
				stderr: result.stderr,
			},
		);
	}
	return result.stdout
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map(normalizePath);
};

export const mapChangedFilesToScopes = (
	changedFiles: string[],
	scopes: ScopeRecord[],
	changedConfig: ChangedConfig,
): string[] => {
	const result = new Set<string>();
	const special = new Set<string>();
	const toolingPrefixes = changedConfig.toolingPrefixes.map(normalizePath);
	const contractsPrefix = normalizePath(changedConfig.contractsPrefix);
	const docsPrefix = normalizePath(changedConfig.docsPrefix);

	for (const file of changedFiles) {
		if (toolingPrefixes.some((prefix) => file.startsWith(prefix))) {
			special.add("__ALL__");
			continue;
		}
		if (contractsPrefix && file.startsWith(contractsPrefix)) {
			special.add("__CONTRACTS__");
			continue;
		}
		if (docsPrefix && file.startsWith(docsPrefix)) {
			special.add("__DOCS__");
			continue;
		}

		const match = scopes.find((scope) =>
			file.startsWith(normalizePath(scope.path) + "/"),
		);
		if (match) {
			result.add(match.id);
		}
	}

	if (special.has("__ALL__")) {
		return ["__ALL__"];
	}
	for (const entry of special) {
		result.add(entry);
	}
	return Array.from(result);
};

export const getChangedScopes = async (options: {
	since?: string;
	base?: string;
	defaultBranch: string;
	allowFetchBase: boolean;
	cwd: string;
	scopes: ScopeRecord[];
	changedConfig: ChangedConfig;
}): Promise<string[]> => {
	const changedFiles = await getChangedFiles(options);
	return mapChangedFilesToScopes(
		changedFiles,
		options.scopes,
		options.changedConfig,
	);
};
