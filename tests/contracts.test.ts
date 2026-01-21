import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runContractsTask } from "../src/contracts/runner";
import type {
	ContractsConfig,
	DockerConfig,
	GitConfig,
	PathsConfig,
	ScopeRecord,
} from "../src/core/config/types";

vi.mock("../src/docker/runner", () => ({
	runInDocker: vi.fn(),
}));

vi.mock("../src/core/exec", () => ({
	execCommand: vi.fn(),
}));

vi.mock("../src/changed/base", () => ({
	resolveBaseRef: vi.fn(),
}));

import { resolveBaseRef } from "../src/changed/base";
import { execCommand } from "../src/core/exec";
import { runInDocker } from "../src/docker/runner";

const docker: DockerConfig = {
	composeFile: "infra/tools.compose.yaml",
	service: "tools",
	entry: "toolkit",
	command: "docker",
	infraCompose: "infra/compose.yaml",
};

const contracts: ContractsConfig = {
	authoritative: "design",
	root: "contracts",
	runtimePath: "/q/openapi?format=json",
	allowlist: [],
	driftIgnore: [],
};

const git: GitConfig = { defaultBranch: "main", allowFetchBase: false };
const paths: PathsConfig = {
	backServices: "back/services",
	backLibs: "back/libs",
	frontApps: "front/apps",
	frontPackages: "front/packages",
	contracts: "contracts",
	docs: "docs",
	infra: "infra",
};

const serviceScope: ScopeRecord = {
	id: "back:service:alpha",
	type: "service",
	path: "back/services/alpha",
	profile: "default",
	tags: [],
	port: 8080,
};

describe("runContractsTask", () => {
	it("runs spectral lint for contracts", async () => {
		const repoRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), "mono-toolkit-contracts-"),
		);
		const specPath = path.join(repoRoot, "contracts", "alpha", "openapi.yaml");
		await fs.mkdir(path.dirname(specPath), { recursive: true });
		await fs.writeFile(specPath, "openapi: 3.0.0", "utf8");
		vi.mocked(runInDocker).mockResolvedValue({
			exitCode: 0,
			stdout: "ok",
			stderr: "",
		});

		const result = await runContractsTask({
			repoRoot,
			docker,
			contracts,
			git,
			paths,
			scope: serviceScope,
			taskId: "contracts:lint",
		});

		expect(result.exitCode).toBe(0);
		expect(vi.mocked(runInDocker)).toHaveBeenCalled();
	});

	it("runs drift checks", async () => {
		const repoRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), "mono-toolkit-drift-"),
		);
		const specPath = path.join(repoRoot, "contracts", "alpha", "openapi.yaml");
		await fs.mkdir(path.dirname(specPath), { recursive: true });
		await fs.writeFile(specPath, "openapi: 3.0.0", "utf8");
		vi.mocked(runInDocker)
			.mockResolvedValueOnce({ exitCode: 0, stdout: "{}", stderr: "" })
			.mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
			.mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
			.mockResolvedValueOnce({ exitCode: 0, stdout: "diff", stderr: "" });

		const result = await runContractsTask({
			repoRoot,
			docker,
			contracts,
			git,
			paths,
			scope: serviceScope,
			taskId: "contracts:drift",
		});

		expect(result.exitCode).toBe(0);
	});

	it("runs breaking change checks", async () => {
		const repoRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), "mono-toolkit-breaking-"),
		);
		const specPath = path.join(repoRoot, "contracts", "alpha", "openapi.yaml");
		await fs.mkdir(path.dirname(specPath), { recursive: true });
		await fs.writeFile(specPath, "openapi: 3.0.0", "utf8");
		vi.mocked(resolveBaseRef).mockResolvedValue("main");
		vi.mocked(execCommand).mockResolvedValue({
			exitCode: 0,
			stdout: "openapi: 3.0.0",
			stderr: "",
		});
		vi.mocked(runInDocker)
			.mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
			.mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
			.mockResolvedValueOnce({ exitCode: 0, stdout: "ok", stderr: "" });

		const result = await runContractsTask({
			repoRoot,
			docker,
			contracts,
			git,
			paths,
			scope: serviceScope,
			taskId: "contracts:breaking",
		});

		expect(result.exitCode).toBe(0);
	});

	it("generates a client", async () => {
		const repoRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), "mono-toolkit-client-"),
		);
		const specPath = path.join(repoRoot, "contracts", "alpha", "openapi.yaml");
		await fs.mkdir(path.dirname(specPath), { recursive: true });
		await fs.writeFile(specPath, "openapi: 3.0.0", "utf8");
		await fs.mkdir(path.join(repoRoot, "front", "apps", "web"), {
			recursive: true,
		});
		vi.mocked(runInDocker)
			.mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
			.mockResolvedValueOnce({ exitCode: 0, stdout: "client", stderr: "" });

		const result = await runContractsTask({
			repoRoot,
			docker,
			contracts,
			git,
			paths,
			scope: serviceScope,
			taskId: "contracts:client",
		});

		expect(result.exitCode).toBe(0);
		const clientPath = path.join(
			repoRoot,
			"front",
			"packages",
			"api",
			"src",
			"services",
			"alpha",
			"client.ts",
		);
		const pluginPath = path.join(
			repoRoot,
			"front",
			"apps",
			"web",
			"plugins",
			"api.ts",
		);
		await expect(fs.stat(clientPath)).resolves.toBeDefined();
		await expect(fs.stat(pluginPath)).resolves.toBeDefined();
	});

	it("rejects non-allowlisted services", async () => {
		const repoRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), "mono-toolkit-allowlist-"),
		);
		const specPath = path.join(repoRoot, "contracts", "alpha", "openapi.yaml");
		await fs.mkdir(path.dirname(specPath), { recursive: true });
		await fs.writeFile(specPath, "openapi: 3.0.0", "utf8");

		await expect(
			runContractsTask({
				repoRoot,
				docker,
				contracts: { ...contracts, allowlist: ["beta"] },
				git,
				paths,
				scope: serviceScope,
				taskId: "contracts:lint",
			}),
		).rejects.toThrow();
	});
});
