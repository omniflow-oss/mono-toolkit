import { describe, expect, it, vi } from "vitest";

vi.mock("../src/cli/commands/shared", () => ({
	loadRepoContext: vi.fn(),
}));

vi.mock("../src/cli/select", () => ({
	selectScopes: vi.fn(),
}));

vi.mock("../src/tasks/execute", () => ({
	executePipeline: vi.fn(),
}));

vi.mock("../src/reports/write", () => ({
	writeSummaryReport: vi.fn(),
}));

vi.mock("../src/reports/cache", () => ({
	ensureCacheLayout: vi.fn(),
}));

import { createPipelineCommand } from "../src/cli/commands/pipeline";
import { loadRepoContext } from "../src/cli/commands/shared";
import { selectScopes } from "../src/cli/select";
import { executePipeline } from "../src/tasks/execute";
import { writeSummaryReport } from "../src/reports/write";
import type { ToolkitConfig, ScopeRecord } from "../src/core/config/types";

const createContext = () => {
	const stdout: string[] = [];
	const context = {
		process: {
			stdout: { write: (chunk: string) => stdout.push(chunk) },
			stderr: { write: () => undefined },
			exitCode: undefined as number | undefined,
		},
	};
	return { context, stdout };
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

const scopes: ScopeRecord[] = [
	{
		id: "back:service:alpha",
		type: "service",
		path: "back/services/alpha",
		profile: "default",
		tags: [],
	},
];

describe("pipeline command", () => {
	it("executes pipeline and writes summary", async () => {
		vi.mocked(loadRepoContext).mockResolvedValue({
			repoRoot: "/repo",
			config,
			scopes,
		});
		vi.mocked(selectScopes).mockResolvedValue(scopes);
		vi.mocked(executePipeline).mockResolvedValue([
			{
				scopeId: "back:service:alpha",
				tasks: [
					{
						scopeId: "back:service:alpha",
						taskId: "lint",
						exitCode: 0,
						stdout: "",
						stderr: "",
						command: ["pnpm", "lint"],
						durationMs: 1,
						cached: false,
					},
				],
			},
		]);

		const { context, stdout } = createContext();
		const command = createPipelineCommand("lint", "Lint code");
		const run = await loadCommandFn(command);

		await run.call(context, {
			json: true,
			scope: undefined,
			tag: undefined,
			changed: true,
			all: false,
			since: undefined,
			base: undefined,
			jobs: undefined,
			dryRun: false,
			ci: false,
			verbose: false,
		});

		const payload = JSON.parse(stdout.join("").trim());
		expect(payload.status).toBe("ok");
		expect(writeSummaryReport).toHaveBeenCalled();
	});

	it("writes text output and applies jobs override", async () => {
		const localConfig = { ...config, tasks: { ...config.tasks } };
		vi.mocked(loadRepoContext).mockResolvedValue({
			repoRoot: "/repo",
			config: localConfig,
			scopes,
		});
		vi.mocked(selectScopes).mockResolvedValue(scopes);
		vi.mocked(executePipeline).mockResolvedValue([
			{
				scopeId: "back:service:alpha",
				tasks: [
					{
						scopeId: "back:service:alpha",
						taskId: "lint",
						exitCode: 0,
						stdout: "",
						stderr: "",
						command: ["pnpm", "lint"],
						durationMs: 1,
						cached: false,
					},
				],
			},
		]);

		const { context, stdout } = createContext();
		const command = createPipelineCommand("lint", "Lint code");
		const run = await loadCommandFn(command);

		await run.call(context, {
			json: false,
			scope: undefined,
			tag: undefined,
			changed: true,
			all: false,
			since: undefined,
			base: undefined,
			jobs: 3,
			dryRun: false,
			ci: false,
			verbose: false,
		});

		expect(localConfig.tasks.jobs).toBe(3);
		expect(stdout.join("").trim()).toBe("Pipeline lint completed for 1 scopes");
	});
});
