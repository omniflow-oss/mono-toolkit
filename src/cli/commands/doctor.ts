import type { CommandContext } from "@stricli/core";
import { buildCommand } from "@stricli/core";
import { execCommand } from "../../core/exec";
import { ExitCode, ToolkitError } from "../../core/errors";
import { findRepoRootOrThrow } from "../../core/root";
import { ensureCacheLayout } from "../../reports/cache";
import { setExitCode, writeError, writeJson, writeText } from "../output";

export const doctorCommand = buildCommand({
	parameters: {
		flags: {
			fix: { kind: "boolean", brief: "Attempt to fix issues", default: false },
			json: { kind: "boolean", brief: "Output JSON", default: false },
		},
	},
	docs: {
		brief: "Diagnose mono-toolkit prerequisites",
	},
	func: async function (flags) {
		const context = this as CommandContext;
		try {
			const repoRoot = await findRepoRootOrThrow(process.cwd());
			const checks: Array<{ name: string; ok: boolean; details?: string }> = [];

			const gitCheck = await execCommand("git", ["--version"], {
				cwd: repoRoot,
			});
			checks.push({
				name: "git",
				ok: gitCheck.exitCode === 0,
				details: gitCheck.stderr || gitCheck.stdout,
			});

			const dockerCheck = await execCommand("docker", ["--version"], {
				cwd: repoRoot,
			});
			checks.push({
				name: "docker",
				ok: dockerCheck.exitCode === 0,
				details: dockerCheck.stderr || dockerCheck.stdout,
			});

			const composeCheck = await execCommand("docker", ["compose", "version"], {
				cwd: repoRoot,
			});
			checks.push({
				name: "docker-compose",
				ok: composeCheck.exitCode === 0,
				details: composeCheck.stderr || composeCheck.stdout,
			});

			try {
				await ensureCacheLayout(repoRoot);
				checks.push({ name: "cache", ok: true });
			} catch (error) {
				checks.push({ name: "cache", ok: false, details: String(error) });
				if (!flags.fix) {
					throw new ToolkitError(
						"Cache directories not writable",
						ExitCode.TaskFailed,
					);
				}
			}

			const ok = checks.every((check) => check.ok);
			if (flags.json) {
				writeJson(context, { status: ok ? "ok" : "error", checks });
			} else {
				for (const check of checks) {
					const line = `${check.ok ? "OK" : "FAIL"} ${check.name}`;
					writeText(context, line);
				}
			}
			if (!ok) {
				setExitCode(context, ExitCode.TaskFailed);
			}
		} catch (error) {
			setExitCode(context, writeError(context, error as Error, flags.json));
		}
	},
});
