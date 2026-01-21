import path from "node:path";
import type { DockerConfig } from "../core/config/types";
import { ExitCode, ToolkitError } from "../core/errors";
import { assertPathWithinRoot } from "../core/fs";

export const buildComposeArgs = (
	repoRoot: string,
	dockerConfig: DockerConfig,
	commandArgs: string[],
): { command: string; args: string[] } => {
	const allowedCommands = new Set(["docker", "podman"]);
	if (!allowedCommands.has(dockerConfig.command)) {
		throw new ToolkitError(
			"Unsupported docker command",
			ExitCode.InvalidConfig,
			{
				command: dockerConfig.command,
			},
		);
	}
	const composeFile = path.join(repoRoot, dockerConfig.composeFile);
	assertPathWithinRoot(repoRoot, composeFile, "compose file");
	const args = [
		"compose",
		"-f",
		composeFile,
		"run",
		"--rm",
		dockerConfig.service,
		dockerConfig.entry,
		...commandArgs,
	];
	return { command: dockerConfig.command, args };
};
