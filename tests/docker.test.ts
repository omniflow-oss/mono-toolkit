import { describe, expect, it, vi } from "vitest";
import { buildComposeArgs } from "../src/docker/compose";
import { runInDocker } from "../src/docker/runner";
import type { DockerConfig } from "../src/core/config/types";
import * as execModule from "../src/core/exec";

describe("buildComposeArgs", () => {
	it("builds docker compose run args", () => {
		const dockerConfig: DockerConfig = {
			composeFile: "infra/tools.compose.yaml",
			service: "tools",
			entry: "toolkit",
			command: "docker",
			infraCompose: "infra/compose.yaml",
		};

		const result = buildComposeArgs("/repo", dockerConfig, ["test", "--flag"]);

		expect(result).toEqual({
			command: "docker",
			args: [
				"compose",
				"-f",
				"/repo/infra/tools.compose.yaml",
				"run",
				"--rm",
				"tools",
				"toolkit",
				"test",
				"--flag",
			],
		});
	});

	it("rejects unsupported docker command", () => {
		const dockerConfig: DockerConfig = {
			composeFile: "infra/tools.compose.yaml",
			service: "tools",
			entry: "toolkit",
			command: "weird",
			infraCompose: "infra/compose.yaml",
		};

		expect(() => buildComposeArgs("/repo", dockerConfig, ["test"])).toThrow();
	});
});

describe("runInDocker", () => {
	it("executes docker compose command", async () => {
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
			repoRoot: "/repo",
			docker: dockerConfig,
			args: ["lint"],
		});

		expect(result.stdout).toBe("ok");
		expect(execSpy).toHaveBeenCalledWith(
			"docker",
			[
				"compose",
				"-f",
				"/repo/infra/tools.compose.yaml",
				"run",
				"--rm",
				"tools",
				"toolkit",
				"lint",
			],
			{ cwd: "/repo", env: undefined },
		);
	});
});
