import { describe, expect, it, vi } from "vitest";

vi.mock("../src/core/exec", () => ({
	execCommand: vi.fn(),
}));

vi.mock("../src/cli/commands/shared", () => ({
	loadRepoContext: vi.fn(),
}));

vi.mock("../src/core/root", () => ({
	findRepoRootOrThrow: vi.fn(),
}));

vi.mock("../src/reports/cache", () => ({
	ensureCacheLayout: vi.fn(),
}));

import { doctorCommand } from "../src/cli/commands/doctor";
import { infraUpCommand } from "../src/cli/commands/infra";
import { loadRepoContext } from "../src/cli/commands/shared";
import type { ToolkitConfig } from "../src/core/config/types";
import { execCommand } from "../src/core/exec";
import { findRepoRootOrThrow } from "../src/core/root";
import { ensureCacheLayout } from "../src/reports/cache";

const createContext = () => {
	const stdout: string[] = [];
	const stderr: string[] = [];
	const context = {
		process: {
			stdout: { write: (chunk: string) => stdout.push(chunk) },
			stderr: { write: (chunk: string) => stderr.push(chunk) },
			exitCode: undefined as number | undefined,
		},
	};
	return { context, stdout, stderr };
};

const loadCommandFn = async (command: { loader: () => Promise<unknown> }) => {
	const loaded = await command.loader();
	return typeof loaded === "function"
		? loaded
		: (loaded as { default: (...args: unknown[]) => unknown }).default;
};

const config: ToolkitConfig = {
	paths: {
		backServices: "back/services",
		backLibs: "back/libs",
		frontApps: "front/apps",
		frontPackages: "front/packages",
		contracts: "contracts",
		docs: "docs",
		infra: "infra",
	},
	changed: {
		toolingPrefixes: ["config/"],
		contractsPrefix: "contracts/",
		docsPrefix: "docs/",
		defaultBaseBranch: "main",
	},
	git: { defaultBranch: "main", allowFetchBase: false },
	docker: {
		composeFile: "infra/tools.compose.yaml",
		service: "tools",
		entry: "toolkit",
		command: "docker",
		infraCompose: "infra/compose.yaml",
	},
	tools: { nodeVersion: "24", pnpmVersion: "10" },
	tasks: { jobs: 1, pipelines: {}, profiles: {}, taskGraph: {} },
	contracts: {
		authoritative: "design",
		root: "contracts",
		runtimePath: "",
		allowlist: [],
	},
	docs: { root: "docs" },
	policies: { sanitizePattern: "[a-z0-9-]", maxNameLength: 64 },
	scopes: { overrides: {}, exclude: [] },
	arch: { enabled: false, templatePath: "" },
};

describe("infra and doctor commands", () => {
	it("runs infra command and outputs JSON", async () => {
		vi.mocked(loadRepoContext).mockResolvedValue({
			repoRoot: "/repo",
			config,
			scopes: [],
		});
		vi.mocked(execCommand).mockResolvedValue({
			exitCode: 0,
			stdout: "ok",
			stderr: "",
		});

		const { context, stdout } = createContext();
		const run = await loadCommandFn(infraUpCommand);
		await run.call(context, { json: true });

		const payload = JSON.parse(stdout.join("").trim());
		expect(payload).toEqual({ exitCode: 0, stdout: "ok", stderr: "" });
	});

	it("runs doctor checks", async () => {
		vi.mocked(findRepoRootOrThrow).mockResolvedValue("/repo");
		vi.mocked(execCommand).mockResolvedValue({
			exitCode: 0,
			stdout: "ok",
			stderr: "",
		});
		vi.mocked(ensureCacheLayout).mockResolvedValue();

		const { context, stdout } = createContext();
		const run = await loadCommandFn(doctorCommand);
		await run.call(context, { json: true, fix: false });

		const payload = JSON.parse(stdout.join("").trim());
		expect(payload.status).toBe("ok");
	});
});
