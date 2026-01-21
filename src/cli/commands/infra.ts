import path from "node:path";
import type { CommandContext } from "@stricli/core";
import { buildCommand } from "@stricli/core";
import { ExitCode, ToolkitError } from "../../core/errors";
import { execCommand } from "../../core/exec";
import { assertPathWithinRoot } from "../../core/fs";
import { validateComposeFile } from "../../docker/compose";
import { setExitCode, writeError, writeJson, writeText } from "../output";
import { loadRepoContext } from "./shared";

type InfraFlags = { json: boolean };

const runInfra = async (
	context: CommandContext,
	subcommand: string[],
	json: boolean,
): Promise<void> => {
	const { repoRoot, config } = await loadRepoContext(
		context as { cwd?: string },
	);
	const composeFile = path.join(repoRoot, config.docker.infraCompose);
	assertPathWithinRoot(repoRoot, composeFile, "infra compose file");
	await validateComposeFile({ repoRoot, composeFile });
	const allowedCommands = new Set(["docker", "podman"]);
	if (!allowedCommands.has(config.docker.command)) {
		throw new ToolkitError(
			"Unsupported docker command",
			ExitCode.InvalidConfig,
			{
				command: config.docker.command,
			},
		);
	}
	const result = await execCommand(
		config.docker.command,
		["compose", "-f", composeFile, ...subcommand],
		{
			cwd: repoRoot,
		},
	);
	if (json) {
		writeJson(context, {
			exitCode: result.exitCode,
			stdout: result.stdout,
			stderr: result.stderr,
		});
	} else {
		if (result.stdout) {
			writeText(context, result.stdout.trimEnd());
		}
		if (result.stderr) {
			context.process.stderr.write(result.stderr);
		}
	}
	if (result.exitCode !== 0) {
		setExitCode(context, result.exitCode);
	}
};

export const infraUpCommand = buildCommand<InfraFlags, [], CommandContext>({
	parameters: {
		flags: { json: { kind: "boolean", brief: "Output JSON", default: false } },
	},
	docs: { brief: "Start infra services" },
	func: async function (flags) {
		const context = this as CommandContext;
		try {
			await runInfra(context, ["up", "-d"], flags.json);
		} catch (error) {
			setExitCode(context, writeError(context, error as Error, flags.json));
		}
	},
});

export const infraDownCommand = buildCommand<InfraFlags, [], CommandContext>({
	parameters: {
		flags: { json: { kind: "boolean", brief: "Output JSON", default: false } },
	},
	docs: { brief: "Stop infra services" },
	func: async function (flags) {
		const context = this as CommandContext;
		try {
			await runInfra(context, ["down"], flags.json);
		} catch (error) {
			setExitCode(context, writeError(context, error as Error, flags.json));
		}
	},
});

export const infraPsCommand = buildCommand<InfraFlags, [], CommandContext>({
	parameters: {
		flags: { json: { kind: "boolean", brief: "Output JSON", default: false } },
	},
	docs: { brief: "List infra services" },
	func: async function (flags) {
		const context = this as CommandContext;
		try {
			await runInfra(context, ["ps"], flags.json);
		} catch (error) {
			setExitCode(context, writeError(context, error as Error, flags.json));
		}
	},
});

export const infraLogsCommand = buildCommand<InfraFlags, [], CommandContext>({
	parameters: {
		flags: { json: { kind: "boolean", brief: "Output JSON", default: false } },
	},
	docs: { brief: "Tail infra logs" },
	func: async function (flags) {
		const context = this as CommandContext;
		try {
			await runInfra(context, ["logs"], flags.json);
		} catch (error) {
			setExitCode(context, writeError(context, error as Error, flags.json));
		}
	},
});
