import { describe, expect, it, vi } from "vitest";

vi.mock("../src/cli/commands/shared", () => ({
	loadRepoContext: vi.fn(),
}));

vi.mock("../src/changed/changed", () => ({
	getChangedScopes: vi.fn(),
}));

import { getChangedScopes } from "../src/changed/changed";
import {
	listChangedCommand,
	listPortsCommand,
	listScopesCommand,
} from "../src/cli/commands/list";
import { loadRepoContext } from "../src/cli/commands/shared";
import type { ScopeRecord, ToolkitConfig } from "../src/core/config/types";

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
		port: 8080,
	},
	{
		id: "back:service:beta",
		type: "service",
		path: "back/services/beta",
		profile: "default",
		tags: [],
	},
];

describe("list commands", () => {
	it("lists scopes in JSON", async () => {
		vi.mocked(loadRepoContext).mockResolvedValue({
			repoRoot: "/repo",
			config,
			scopes,
		});
		const { context, stdout } = createContext();

		const run = await loadCommandFn(listScopesCommand);
		await run.call(context, { json: true });

		const payload = JSON.parse(stdout.join("").trim());
		expect(payload.scopes).toHaveLength(2);
	});

	it("lists scopes in text", async () => {
		vi.mocked(loadRepoContext).mockResolvedValue({
			repoRoot: "/repo",
			config,
			scopes,
		});
		const { context, stdout } = createContext();
		const run = await loadCommandFn(listScopesCommand);

		await run.call(context, { json: false });

		const lines = stdout.join("").trim().split("\n");
		expect(lines).toContain("back:service:alpha service back/services/alpha");
	});

	it("lists ports in JSON", async () => {
		vi.mocked(loadRepoContext).mockResolvedValue({
			repoRoot: "/repo",
			config,
			scopes,
		});
		const { context, stdout } = createContext();

		const run = await loadCommandFn(listPortsCommand);
		await run.call(context, { json: true });

		const payload = JSON.parse(stdout.join("").trim());
		expect(payload.ports).toEqual([scopes[0]]);
	});

	it("lists ports in text", async () => {
		vi.mocked(loadRepoContext).mockResolvedValue({
			repoRoot: "/repo",
			config,
			scopes,
		});
		const { context, stdout } = createContext();
		const run = await loadCommandFn(listPortsCommand);

		await run.call(context, { json: false });

		expect(stdout.join("").trim()).toBe("back:service:alpha 8080");
	});

	it("lists changed scopes", async () => {
		vi.mocked(loadRepoContext).mockResolvedValue({
			repoRoot: "/repo",
			config,
			scopes,
		});
		vi.mocked(getChangedScopes).mockResolvedValue(["back:service:beta"]);
		const { context, stdout } = createContext();

		const run = await loadCommandFn(listChangedCommand);
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
		expect(payload.scopes).toEqual(["back:service:beta"]);
	});

	it("lists changed scopes in text", async () => {
		vi.mocked(loadRepoContext).mockResolvedValue({
			repoRoot: "/repo",
			config,
			scopes,
		});
		vi.mocked(getChangedScopes).mockResolvedValue(["back:service:beta"]);
		const { context, stdout } = createContext();
		const run = await loadCommandFn(listChangedCommand);

		await run.call(context, {
			json: false,
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

		expect(stdout.join("").trim()).toBe("back:service:beta");
	});
});
