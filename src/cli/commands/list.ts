import type { CommandContext } from "@stricli/core";
import { buildCommand } from "@stricli/core";
import { getChangedScopes } from "../../changed/changed";
import { runtimeFlags, selectionFlags } from "../flags";
import { setExitCode, writeError, writeJson, writeText } from "../output";
import { loadRepoContext } from "./shared";

type ListFlags = { json: boolean };

export const listScopesCommand = buildCommand<ListFlags, [], CommandContext>({
	parameters: {
		flags: { json: { kind: "boolean", brief: "Output JSON", default: false } },
	},
	docs: { brief: "List discovered scopes" },
	func: async function (flags) {
		const context = this as CommandContext;
		try {
			const { scopes } = await loadRepoContext(context as { cwd?: string });
			if (flags.json) {
				writeJson(context, { scopes });
			} else {
				for (const scope of scopes) {
					writeText(context, `${scope.id} ${scope.type} ${scope.path}`);
				}
			}
		} catch (error) {
			setExitCode(context, writeError(context, error as Error, flags.json));
		}
	},
});

export const listPortsCommand = buildCommand<ListFlags, [], CommandContext>({
	parameters: {
		flags: { json: { kind: "boolean", brief: "Output JSON", default: false } },
	},
	docs: { brief: "List scopes with ports" },
	func: async function (flags) {
		const context = this as CommandContext;
		try {
			const { scopes } = await loadRepoContext(context as { cwd?: string });
			const ports = scopes.filter((scope) => scope.port);
			if (flags.json) {
				writeJson(context, { ports });
			} else {
				for (const scope of ports) {
					writeText(context, `${scope.id} ${scope.port}`);
				}
			}
		} catch (error) {
			setExitCode(context, writeError(context, error as Error, flags.json));
		}
	},
});

type ListChangedFlags = {
	json: boolean;
	scope?: string;
	tag?: string;
	changed: boolean;
	all: boolean;
	since?: string;
	base?: string;
	jobs?: number;
	dryRun: boolean;
	ci: boolean;
	verbose: boolean;
};

export const listChangedCommand = buildCommand<
	ListChangedFlags,
	[],
	CommandContext
>({
	parameters: {
		flags: {
			...selectionFlags,
			...runtimeFlags,
		},
	},
	docs: { brief: "List changed scopes" },
	func: async function (flags) {
		const context = this as CommandContext;
		try {
			const { repoRoot, config, scopes } = await loadRepoContext(
				context as { cwd?: string },
			);
			const changedScopes = await getChangedScopes({
				since: flags.since,
				base: flags.base,
				defaultBranch: config.git.defaultBranch,
				allowFetchBase: config.git.allowFetchBase,
				cwd: repoRoot,
				scopes,
				changedConfig: config.changed,
			});
			if (flags.json) {
				writeJson(context, { scopes: changedScopes });
			} else {
				for (const scope of changedScopes) {
					writeText(context, scope);
				}
			}
		} catch (error) {
			setExitCode(context, writeError(context, error as Error, flags.json));
		}
	},
});
