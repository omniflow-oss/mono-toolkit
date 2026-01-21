import { describe, expect, it, vi } from "vitest";

vi.mock("../src/changed/changed", () => ({
	getChangedScopes: vi.fn(),
}));

import { getChangedScopes } from "../src/changed/changed";
import { selectScopes } from "../src/cli/select";
import type { ScopeRecord, ToolkitConfig } from "../src/core/config/types";

const baseConfig: ToolkitConfig = {
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
	git: {
		defaultBranch: "main",
		allowFetchBase: false,
	},
	docker: {
		composeFile: "infra/tools.compose.yaml",
		service: "tools",
		entry: "toolkit",
		command: "docker",
		infraCompose: "infra/compose.yaml",
	},
	tools: { nodeVersion: "24", pnpmVersion: "10" },
	tasks: {
		jobs: 1,
		pipelines: {},
		profiles: {},
		taskGraph: {},
	},
	contracts: {
		authoritative: "design",
		root: "contracts",
		runtimePath: "",
		allowlist: [],
		driftIgnore: [],
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
		tags: ["api"],
	},
	{
		id: "back:service:beta",
		type: "service",
		path: "back/services/beta",
		profile: "default",
		tags: [],
	},
	{ id: "docs:root", type: "docs", path: "docs", profile: "default", tags: [] },
];

describe("selectScopes", () => {
	it("selects by scope id", async () => {
		const result = await selectScopes({
			repoRoot: "/repo",
			config: baseConfig,
			scopes,
			selection: {
				scope: "back:service:beta",
				tag: undefined,
				changed: true,
				all: false,
			},
		});

		expect(result).toEqual([scopes[1]]);
	});

	it("selects by tag", async () => {
		const result = await selectScopes({
			repoRoot: "/repo",
			config: baseConfig,
			scopes,
			selection: { tag: "api", changed: true, all: false },
		});

		expect(result).toEqual([scopes[0]]);
	});

	it("returns all scopes when not changed", async () => {
		const result = await selectScopes({
			repoRoot: "/repo",
			config: baseConfig,
			scopes,
			selection: { changed: false, all: false },
		});

		expect(result).toEqual(scopes);
	});

	it("filters changed scopes", async () => {
		vi.mocked(getChangedScopes).mockResolvedValue(["back:service:alpha"]);

		const result = await selectScopes({
			repoRoot: "/repo",
			config: baseConfig,
			scopes,
			selection: { changed: true, all: false },
		});

		expect(result).toEqual([scopes[0]]);
	});

	it("returns all scopes when __ALL__ is present", async () => {
		vi.mocked(getChangedScopes).mockResolvedValue(["__ALL__"]);

		const result = await selectScopes({
			repoRoot: "/repo",
			config: baseConfig,
			scopes,
			selection: { changed: true, all: false },
		});

		expect(result).toEqual(scopes);
	});

	it("expands __CONTRACTS__ to services", async () => {
		vi.mocked(getChangedScopes).mockResolvedValue(["__CONTRACTS__"]);

		const result = await selectScopes({
			repoRoot: "/repo",
			config: baseConfig,
			scopes,
			selection: { changed: true, all: false },
		});

		expect(result).toEqual([scopes[0], scopes[1]]);
	});

	it("adds docs scope when __DOCS__ is present", async () => {
		vi.mocked(getChangedScopes).mockResolvedValue(["__DOCS__"]);

		const result = await selectScopes({
			repoRoot: "/repo",
			config: baseConfig,
			scopes,
			selection: { changed: true, all: false },
		});

		expect(result).toEqual([scopes[2]]);
	});
});
