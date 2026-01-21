import { describe, expect, it, vi } from "vitest";
import type { DockerConfig, DocsConfig } from "../src/core/config/types";
import { runDocsTask } from "../src/docs/runner";

vi.mock("../src/docker/runner", () => ({
	runInDocker: vi.fn(),
}));

import { runInDocker } from "../src/docker/runner";

const docker: DockerConfig = {
	composeFile: "infra/tools.compose.yaml",
	service: "tools",
	entry: "toolkit",
	command: "docker",
	infraCompose: "infra/compose.yaml",
};

const docs: DocsConfig = { root: "docs" };

describe("runDocsTask", () => {
	it("runs docs build", async () => {
		vi.mocked(runInDocker).mockResolvedValue({
			exitCode: 0,
			stdout: "ok",
			stderr: "",
		});

		const result = await runDocsTask({
			repoRoot: "/repo",
			docker,
			docs,
			taskId: "docs:build",
		});

		expect(result.exitCode).toBe(0);
		expect(vi.mocked(runInDocker)).toHaveBeenCalledWith({
			repoRoot: "/repo",
			docker,
			args: ["pnpm", "-C", "/repo/docs", "build"],
		});
	});

	it("runs docs lint from repo root", async () => {
		vi.mocked(runInDocker).mockResolvedValue({
			exitCode: 0,
			stdout: "ok",
			stderr: "",
		});

		const result = await runDocsTask({
			repoRoot: "/repo",
			docker,
			docs,
			taskId: "docs:lint",
		});

		expect(result.exitCode).toBe(0);
		expect(vi.mocked(runInDocker)).toHaveBeenCalledWith({
			repoRoot: "/repo",
			docker,
			args: ["pnpm", "-C", "/repo", "docs:lint"],
		});
	});
});
