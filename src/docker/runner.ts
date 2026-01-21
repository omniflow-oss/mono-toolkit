import type { DockerConfig } from "../core/config/types";
import { execCommand } from "../core/exec";
import { buildComposeArgs } from "./compose";

export const runInDocker = async (options: {
	repoRoot: string;
	docker: DockerConfig;
	args: string[];
	env?: NodeJS.ProcessEnv;
}): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
	const { command, args } = await buildComposeArgs(
		options.repoRoot,
		options.docker,
		options.args,
	);
	return execCommand(command, args, {
		cwd: options.repoRoot,
		env: options.env,
	});
};
