import { describe, expect, it, vi } from "vitest";

vi.mock("../src/changed/base", () => ({
	resolveBaseRef: vi.fn(),
}));

vi.mock("../src/core/exec", () => ({
	execCommand: vi.fn(),
}));

import { resolveBaseRef } from "../src/changed/base";
import {
	getChangedFiles,
	mapChangedFilesToScopes,
} from "../src/changed/changed";
import type { ChangedConfig, ScopeRecord } from "../src/core/config/types";
import { ExitCode, ToolkitError } from "../src/core/errors";
import { execCommand } from "../src/core/exec";

describe("getChangedFiles", () => {
	it("normalizes changed file paths", async () => {
		vi.mocked(resolveBaseRef).mockResolvedValue("base");
		vi.mocked(execCommand).mockResolvedValue({
			exitCode: 0,
			stdout: "back\\services\\alpha\\src\\index.ts\nconfig\\tools\\file\n",
			stderr: "",
		});

		const files = await getChangedFiles({
			defaultBranch: "main",
			allowFetchBase: false,
			cwd: "/repo",
		});

		expect(files).toEqual([
			"back/services/alpha/src/index.ts",
			"config/tools/file",
		]);
	});

	it("throws when git diff fails", async () => {
		vi.mocked(resolveBaseRef).mockResolvedValue("base");
		vi.mocked(execCommand).mockResolvedValue({
			exitCode: 1,
			stdout: "",
			stderr: "bad",
		});

		await expect(
			getChangedFiles({
				defaultBranch: "main",
				allowFetchBase: false,
				cwd: "/repo",
			}),
		).rejects.toBeInstanceOf(ToolkitError);
		await expect(
			getChangedFiles({
				defaultBranch: "main",
				allowFetchBase: false,
				cwd: "/repo",
			}),
		).rejects.toMatchObject({ code: ExitCode.GitMissing });
	});
});

describe("mapChangedFilesToScopes", () => {
	it("handles special prefixes and scope matches", () => {
		const scopes: ScopeRecord[] = [
			{
				id: "back:service:alpha",
				type: "service",
				path: "back/services/alpha",
				profile: "default",
				tags: [],
			},
		];
		const config: ChangedConfig = {
			toolingPrefixes: ["config/"],
			contractsPrefix: "contracts/",
			docsPrefix: "docs/",
			defaultBaseBranch: "main",
		};

		const result = mapChangedFilesToScopes(
			[
				"contracts/spec.yaml",
				"docs/readme.md",
				"back/services/alpha/src/index.ts",
			],
			scopes,
			config,
		);

		expect(result).toEqual(["back:service:alpha", "__CONTRACTS__", "__DOCS__"]);
	});

	it("returns __ALL__ when tooling changes are present", () => {
		const result = mapChangedFilesToScopes(
			["config/tools/biome/biome.base.jsonc"],
			[],
			{
				toolingPrefixes: ["config/"],
				contractsPrefix: "contracts/",
				docsPrefix: "docs/",
				defaultBaseBranch: "main",
			},
		);

		expect(result).toEqual(["__ALL__"]);
	});
});
