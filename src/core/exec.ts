import { spawn } from "node:child_process";
import { ExitCode, ToolkitError } from "./errors";

export interface ExecResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

const redactValue = (text: string, value: string): string => {
	if (!value || value.length < 4) {
		return text;
	}
	const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return text.replace(new RegExp(escaped, "g"), "[REDACTED]");
};

const redactOutput = (
	text: string,
	options: { env?: NodeJS.ProcessEnv } = {},
): string => {
	let resultText = text;
	const secrets = new Set<string>();
	const envSources = [process.env, options.env].filter(
		(env): env is NodeJS.ProcessEnv => Boolean(env),
	);
	for (const env of envSources) {
		for (const [key, value] of Object.entries(env)) {
			if (!value) {
				continue;
			}
			if (/(token|secret|password|api[_-]?key|private|auth)/i.test(key)) {
				secrets.add(value);
			}
		}
	}
	for (const pattern of ["ghp_", "github_pat_", "AKIA", "ASIA"]) {
		if (resultText.includes(pattern)) {
			const regex = new RegExp(`${pattern}[0-9A-Za-z_\-]{8,}`, "g");
			resultText = resultText.replace(regex, "[REDACTED]");
		}
	}
	let redacted = resultText;
	for (const value of secrets) {
		redacted = redactValue(redacted, value);
	}
	return redacted;
};

export const execCommand = (
	command: string,
	args: string[],
	options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<ExecResult> => {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: options.cwd,
			env: options.env,
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (chunk) => {
			stdout += chunk.toString();
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});

		child.on("error", (error) => {
			reject(error);
		});

		child.on("close", (code) => {
			resolve({
				exitCode: code ?? 0,
				stdout: redactOutput(stdout, options),
				stderr: redactOutput(stderr, options),
			});
		});
	});
};

export const requireCommand = async (command: string): Promise<void> => {
	const result = await execCommand(command, ["--version"]);
	if (result.exitCode !== 0) {
		throw new ToolkitError(
			`Missing required command: ${command}`,
			ExitCode.TaskFailed,
		);
	}
};
