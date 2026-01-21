import type { CommandContext } from "@stricli/core";
import { buildCommand } from "@stricli/core";
import { getChangedScopes } from "../../changed/changed";
import { runtimeFlags, selectionFlags } from "../flags";
import { setExitCode, writeError, writeJson, writeText } from "../output";
import { loadRepoContext } from "./shared";

export const listScopesCommand = buildCommand({
	parameters: {
		flags: { json: { kind: "boolean", brief: "Output JSON", default: false } },
	},
	docs: { brief: "List discovered scopes" },
	func: async function (flags) {
		const context = this as CommandContext;
		try {
			const { scopes } = await loadRepoContext(context);
			if (flags.json) {
				writeJson(context, { scopes });
			} else {
				for (const scope of scopes) {
					writeText(context, `${scope.id} ${scope.path}`);
				}
			}
		} catch (error) {
			setExitCode(context, writeError(context, error as Error, flags.json));
		}
	},
});

export const listPortsCommand = buildCommand({
	parameters: {
		flags: { json: { kind: "boolean", brief: "Output JSON", default: false } },
	},
	docs: { brief: "List scopes with ports" },
	func: async function (flags) {
		const context = this as CommandContext;
		try {
			const { scopes } = await loadRepoContext(context);
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

export const listChangedCommand = buildCommand({
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
			const { repoRoot, config, scopes } = await loadRepoContext(context);
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
