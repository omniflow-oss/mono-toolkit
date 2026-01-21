import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { DockerConfig } from "../src/core/config/types";
import * as execModule from "../src/core/exec";
import { buildComposeArgs } from "../src/docker/compose";
import { runInDocker } from "../src/docker/runner";

describe("buildComposeArgs", () => {
	it("builds docker compose run args", async () => {
		const repoRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), "mono-toolkit-docker-"),
		);
		const composePath = path.join(repoRoot, "infra", "tools.compose.yaml");
		await fs.mkdir(path.dirname(composePath), { recursive: true });
		await fs.writeFile(
			composePath,
			"services:\n  tools:\n    image: tools\n",
			"utf8",
		);
		const dockerConfig: DockerConfig = {
			composeFile: "infra/tools.compose.yaml",
			service: "tools",
			entry: "toolkit",
			command: "docker",
			infraCompose: "infra/compose.yaml",
		};

		const result = await buildComposeArgs(repoRoot, dockerConfig, [
			"test",
			"--flag",
		]);

		expect(result).toEqual({
			command: "docker",
			args: [
				"compose",
				"-f",
				`${repoRoot}/infra/tools.compose.yaml`,
				"run",
				"--rm",
				"tools",
				"toolkit",
				"test",
				"--flag",
			],
		});
	});

	it("rejects unsupported docker command", async () => {
		const repoRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), "mono-toolkit-docker-"),
		);
		const composePath = path.join(repoRoot, "infra", "tools.compose.yaml");
		await fs.mkdir(path.dirname(composePath), { recursive: true });
		await fs.writeFile(
			composePath,
			"services:\n  tools:\n    image: tools\n",
			"utf8",
		);
		const dockerConfig: DockerConfig = {
			composeFile: "infra/tools.compose.yaml",
			service: "tools",
			entry: "toolkit",
			command: "weird",
			infraCompose: "infra/compose.yaml",
		};

		await expect(
			buildComposeArgs(repoRoot, dockerConfig, ["test"]),
		).rejects.toThrow();
	});

	it("rejects compose volumes outside repo", async () => {
		const repoRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), "mono-toolkit-docker-"),
		);
		const composePath = path.join(repoRoot, "infra", "tools.compose.yaml");
		await fs.mkdir(path.dirname(composePath), { recursive: true });
		await fs.writeFile(
			composePath,
			"services:\n  tools:\n    image: tools\n    volumes:\n      - /tmp:/tmp\n",
			"utf8",
		);
		const dockerConfig: DockerConfig = {
			composeFile: "infra/tools.compose.yaml",
			service: "tools",
			entry: "toolkit",
			command: "docker",
			infraCompose: "infra/compose.yaml",
		};

		await expect(
			buildComposeArgs(repoRoot, dockerConfig, ["test"]),
		).rejects.toThrow();
	});
});

describe("runInDocker", () => {
	it("executes docker compose command", async () => {
		const repoRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), "mono-toolkit-docker-"),
		);
		const composePath = path.join(repoRoot, "infra", "tools.compose.yaml");
		await fs.mkdir(path.dirname(composePath), { recursive: true });
		await fs.writeFile(
			composePath,
			"services:\n  tools:\n    image: tools\n",
			"utf8",
		);
		const dockerConfig: DockerConfig = {
			composeFile: "infra/tools.compose.yaml",
			service: "tools",
			entry: "toolkit",
			command: "docker",
			infraCompose: "infra/compose.yaml",
		};

		const execSpy = vi
			.spyOn(execModule, "execCommand")
			.mockResolvedValue({ exitCode: 0, stdout: "ok", stderr: "" });

		const result = await runInDocker({
			repoRoot,
			docker: dockerConfig,
			args: ["lint"],
		});

		expect(result.stdout).toBe("ok");
		expect(execSpy).toHaveBeenCalledWith(
			"docker",
			[
				"compose",
				"-f",
				`${repoRoot}/infra/tools.compose.yaml`,
				"run",
				"--rm",
				"tools",
				"toolkit",
				"lint",
			],
			{ cwd: repoRoot, env: undefined },
		);
	});
});
