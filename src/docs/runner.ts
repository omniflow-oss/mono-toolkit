import path from "node:path";
import type { DockerConfig, DocsConfig } from "../core/config/types";
import { ExitCode, ToolkitError } from "../core/errors";
import { assertPathWithinRoot } from "../core/fs";
import { runInDocker } from "../docker/runner";

const taskMap: Record<string, string> = {
	"docs:lint": "lint",
	"docs:build": "build",
	"docs:serve": "serve",
};

export const runDocsTask = async (options: {
	repoRoot: string;
	docker: DockerConfig;
	docs: DocsConfig;
	taskId: string;
}): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
	const command = taskMap[options.taskId];
	if (!command) {
		throw new ToolkitError("Unsupported docs task", ExitCode.InvalidConfig, {
			task: options.taskId,
		});
	}
	const docsRoot = path.join(options.repoRoot, options.docs.root);
	assertPathWithinRoot(options.repoRoot, docsRoot, "docs root");
	const commandArgs =
		options.taskId === "docs:lint"
			? ["pnpm", "-C", options.repoRoot, "docs:lint"]
			: ["pnpm", "-C", docsRoot, command];
	return runInDocker({
		repoRoot: options.repoRoot,
		docker: options.docker,
		args: commandArgs,
	});
};
