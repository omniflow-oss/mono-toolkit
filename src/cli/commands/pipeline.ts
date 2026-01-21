import type { CommandContext } from "@stricli/core";
import { buildCommand } from "@stricli/core";
import { ensureCacheLayout } from "../../reports/cache";
import { writeScopeReport, writeSummaryReport } from "../../reports/write";
import { executePipeline } from "../../tasks/execute";
import { runtimeFlags, selectionFlags } from "../flags";
import { setExitCode, writeError, writeJson, writeText } from "../output";
import { selectScopes } from "../select";
import { loadRepoContext } from "./shared";

export const createPipelineCommand = (pipeline: string, brief: string) =>
	buildCommand<
		{
			scope?: string;
			tag?: string;
			changed: boolean;
			all: boolean;
			since?: string;
			base?: string;
			jobs?: number;
			dryRun: boolean;
			json: boolean;
			ci: boolean;
			verbose: boolean;
		},
		[],
		CommandContext
	>({
		parameters: {
			flags: {
				...selectionFlags,
				...runtimeFlags,
			},
		},
		docs: {
			brief,
		},
		func: async function (flags) {
			const context = this as CommandContext;
			try {
				const { repoRoot, config, scopes } = await loadRepoContext(
					context as { cwd?: string },
				);
				const changed =
					flags.scope || flags.tag || flags.all ? false : flags.changed;
				if (flags.jobs) {
					config.tasks.jobs = flags.jobs;
				}
				const selected = await selectScopes({
					repoRoot,
					config,
					scopes,
					selection: {
						scope: flags.scope,
						tag: flags.tag,
						changed,
						all: flags.all,
						since: flags.since,
						base: flags.base,
					},
				});
				await ensureCacheLayout(repoRoot);
				const results = await executePipeline({
					repoRoot,
					docker: config.docker,
					pipeline,
					scopes: selected,
					tasksConfig: config.tasks,
					dryRun: flags.dryRun,
					config,
				});
				await writeSummaryReport(repoRoot, {
					pipeline,
					status: "success",
					scopes: results.map((scope) => ({
						id: scope.scopeId,
						tasks: scope.tasks.map((task) => ({
							id: task.taskId,
							exitCode: task.exitCode,
							command: task.command,
							durationMs: task.durationMs,
							cached: task.cached,
							errorExcerpt:
								task.exitCode !== 0 ? task.stderr.slice(0, 500) : undefined,
						})),
					})),
				});
				for (const scope of results) {
					await writeScopeReport(repoRoot, {
						id: scope.scopeId,
						tasks: scope.tasks.map((task) => ({
							id: task.taskId,
							exitCode: task.exitCode,
							command: task.command,
							durationMs: task.durationMs,
							cached: task.cached,
							errorExcerpt:
								task.exitCode !== 0 ? task.stderr.slice(0, 500) : undefined,
						})),
					});
				}
				if (flags.json) {
					writeJson(context, { status: "ok", pipeline, scopes: results });
				} else {
					writeText(
						context,
						`Pipeline ${pipeline} completed for ${results.length} scopes`,
					);
				}
			} catch (error) {
				setExitCode(context, writeError(context, error as Error, flags.json));
			}
		},
	});
