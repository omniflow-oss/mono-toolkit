import type { ToolkitConfig, ScopeRecord } from "../core/config/types";
import { getChangedScopes } from "../changed/changed";

export interface SelectionOptions {
	scope?: string;
	tag?: string;
	changed: boolean;
	all: boolean;
	since?: string;
	base?: string;
}

const selectByScope = (
	scopes: ScopeRecord[],
	scopeIdOrPath: string,
): ScopeRecord[] => {
	return scopes.filter(
		(scope) => scope.id === scopeIdOrPath || scope.path === scopeIdOrPath,
	);
};

const selectByTag = (scopes: ScopeRecord[], tag: string): ScopeRecord[] => {
	return scopes.filter((scope) => scope.tags.includes(tag));
};

export const selectScopes = async (options: {
	repoRoot: string;
	config: ToolkitConfig;
	scopes: ScopeRecord[];
	selection: SelectionOptions;
}): Promise<ScopeRecord[]> => {
	const { selection } = options;
	if (selection.scope) {
		return selectByScope(options.scopes, selection.scope);
	}
	if (selection.tag) {
		return selectByTag(options.scopes, selection.tag);
	}
	if (selection.all) {
		return options.scopes;
	}
	if (!selection.changed) {
		return options.scopes;
	}

	const changedScopes = await getChangedScopes({
		since: selection.since,
		base: selection.base,
		defaultBranch: options.config.git.defaultBranch,
		allowFetchBase: options.config.git.allowFetchBase,
		cwd: options.repoRoot,
		scopes: options.scopes,
		changedConfig: options.config.changed,
	});

	if (changedScopes.includes("__ALL__")) {
		return options.scopes;
	}

	const scopeMap = new Set(
		changedScopes.filter((entry) => !entry.startsWith("__")),
	);
	if (changedScopes.includes("__CONTRACTS__")) {
		for (const scope of options.scopes) {
			if (scope.type === "service") {
				scopeMap.add(scope.id);
			}
		}
	}
	if (changedScopes.includes("__DOCS__")) {
		for (const scope of options.scopes) {
			if (scope.type === "docs") {
				scopeMap.add(scope.id);
			}
		}
	}

	return options.scopes.filter((scope) => scopeMap.has(scope.id));
};
