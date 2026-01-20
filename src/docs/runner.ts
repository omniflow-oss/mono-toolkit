import path from "node:path";
import { assertPathWithinRoot } from "../core/fs";
import { ExitCode, ToolkitError } from "../core/errors";
import { runInDocker } from "../docker/runner";
import type { DocsConfig, DockerConfig } from "../core/config/types";

const taskMap: Record<string, string> = {
  "docs:lint": "lint",
  "docs:build": "build",
  "docs:serve": "serve"
};

export const runDocsTask = async (options: {
  repoRoot: string;
  docker: DockerConfig;
  docs: DocsConfig;
  taskId: string;
}): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
  const command = taskMap[options.taskId];
  if (!command) {
    throw new ToolkitError("Unsupported docs task", ExitCode.InvalidConfig, { task: options.taskId });
  }
  const docsRoot = path.join(options.repoRoot, options.docs.root);
  assertPathWithinRoot(options.repoRoot, docsRoot, "docs root");
  return runInDocker({
    repoRoot: options.repoRoot,
    docker: options.docker,
    args: ["pnpm", "-C", docsRoot, command]
  });
};
