import path from "node:path";
import type {
	PathsConfig,
	ScopeRecord,
	ScopesConfig,
} from "../core/config/types";
import { listDirectories, pathExists } from "../core/fs";

const scopeRoots = (paths: PathsConfig) =>
	[
		{ root: paths.backServices, type: "service", prefix: "back:service" },
		{ root: paths.backLibs, type: "lib", prefix: "back:lib" },
		{ root: paths.frontApps, type: "app", prefix: "front:app" },
		{ root: paths.frontPackages, type: "package", prefix: "front:package" },
	] as const;

const toDeterministicPort = (
	scopeId: string,
	base = 4000,
	range = 10000,
): number => {
	let hash = 0;
	for (const char of scopeId) {
		hash = (hash * 31 + char.charCodeAt(0)) % range;
	}
	return base + hash;
};

export const discoverScopes = async (
	repoRoot: string,
	paths: PathsConfig,
	scopesConfig: ScopesConfig,
): Promise<ScopeRecord[]> => {
	const result: ScopeRecord[] = [];
	for (const rootEntry of scopeRoots(paths)) {
		const absoluteRoot = path.join(repoRoot, rootEntry.root);
		if (!(await pathExists(absoluteRoot))) {
			continue;
		}
		const scopes = await listDirectories(absoluteRoot);
		for (const name of scopes) {
			const scopeId = `${rootEntry.prefix}:${name}`;
			if (scopesConfig.exclude.includes(scopeId)) {
				continue;
			}
			const override = scopesConfig.overrides[scopeId] ?? {};
			result.push({
				id: scopeId,
				type: rootEntry.type,
				path: path.join(rootEntry.root, name),
				profile: override.profile ?? "default",
				tags: override.tags ?? [],
				port:
					override.port ??
					(rootEntry.type === "service"
						? toDeterministicPort(scopeId)
						: undefined),
				deps: override.deps,
			});
		}
	}

	const addSpecialScope = async (
		id: string,
		type: ScopeRecord["type"],
		relativePath: string,
		profile = "default",
	) => {
		const absolute = path.join(repoRoot, relativePath);
		if (!(await pathExists(absolute))) {
			return;
		}
		result.push({
			id,
			type,
			path: relativePath,
			profile,
			tags: [],
			port: undefined,
			deps: undefined,
		});
	};

	await addSpecialScope("contracts:root", "contracts", paths.contracts);
	await addSpecialScope("docs:root", "docs", paths.docs);
	await addSpecialScope("infra:root", "infra", paths.infra);
	result.push({
		id: "tooling:root",
		type: "tooling",
		path: ".",
		profile: "default",
		tags: [],
		port: undefined,
		deps: undefined,
	});
	result.push({
		id: "global:root",
		type: "global",
		path: ".",
		profile: "default",
		tags: [],
		port: undefined,
		deps: undefined,
	});

	return result;
};
