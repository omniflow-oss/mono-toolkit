import type { CommandContext } from "@stricli/core";
import { ExitCode, ToolkitError } from "../core/errors";

export interface CliContext extends CommandContext {
	readonly cwd: string;
}

export const writeJson = (context: CommandContext, payload: unknown): void => {
	context.process.stdout.write(`${JSON.stringify(payload)}\n`);
};

export const writeText = (context: CommandContext, text: string): void => {
	context.process.stdout.write(`${text}\n`);
};

export const writeError = (
	context: CommandContext,
	error: Error,
	json: boolean,
): ExitCode => {
	if (json) {
		const toolkit = error instanceof ToolkitError;
		writeJson(context, {
			status: "error",
			message: error.message,
			code: toolkit ? error.code : ExitCode.TaskFailed,
			details: toolkit ? error.details : undefined,
		});
	} else {
		context.process.stderr.write(`${error.message}\n`);
	}
	return error instanceof ToolkitError ? error.code : ExitCode.TaskFailed;
};

export const setExitCode = (context: CommandContext, code: number): void => {
	(context.process as { exitCode?: number }).exitCode = code;
};
