import { promises as fs } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import type { DockerConfig } from "../core/config/types";
import { ExitCode, ToolkitError } from "../core/errors";
import { assertPathWithinRoot } from "../core/fs";

export const validateComposeFile = async (options: {
	repoRoot: string;
	composeFile: string;
	service?: string;
}): Promise<void> => {
	const content = await fs.readFile(options.composeFile, "utf8");
	const doc = parse(content) as {
		services?: Record<
			string,
			{ volumes?: Array<string | { type?: string; source?: string }> }
		>;
	};
	if (!doc?.services) {
		throw new ToolkitError("Invalid compose file", ExitCode.InvalidConfig, {
			composeFile: options.composeFile,
		});
	}
	if (options.service && !doc.services[options.service]) {
		throw new ToolkitError(
			"Compose service not found",
			ExitCode.InvalidConfig,
			{
				service: options.service,
			},
		);
	}
	const baseDir = path.dirname(options.composeFile);
	for (const service of Object.values(doc.services)) {
		for (const volume of service.volumes ?? []) {
			const source =
				typeof volume === "string"
					? volume.split(":")[0]
					: volume.type === "bind"
						? volume.source
						: undefined;
			if (!source || source.startsWith("${") || !source.trim()) {
				continue;
			}
			const resolved = path.isAbsolute(source)
				? source
				: path.resolve(baseDir, source);
			assertPathWithinRoot(options.repoRoot, resolved, "compose volume");
		}
	}
};

export const buildComposeArgs = async (
	repoRoot: string,
	dockerConfig: DockerConfig,
	commandArgs: string[],
): Promise<{ command: string; args: string[] }> => {
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
	await validateComposeFile({
		repoRoot,
		composeFile,
		service: dockerConfig.service,
	});
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
