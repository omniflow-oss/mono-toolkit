import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { PathsConfig, ScopesConfig } from "../src/core/config/types";
import { discoverScopes } from "../src/scopes/discover";

describe("discoverScopes", () => {
	it("discovers scopes and applies overrides", async () => {
		const repoRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), "mono-toolkit-scopes-"),
		);
		const servicesRoot = path.join(repoRoot, "back/services");
		const libsRoot = path.join(repoRoot, "back/libs");
		await fs.mkdir(path.join(servicesRoot, "alpha"), { recursive: true });
		await fs.mkdir(path.join(servicesRoot, "beta"), { recursive: true });
		await fs.mkdir(path.join(libsRoot, "core"), { recursive: true });
		await fs.mkdir(path.join(repoRoot, "docs"), { recursive: true });

		const paths: PathsConfig = {
			backServices: "back/services",
			backLibs: "back/libs",
			frontApps: "front/apps",
			frontPackages: "front/packages",
			contracts: "contracts",
			docs: "docs",
			infra: "infra",
		};

		const scopesConfig: ScopesConfig = {
			overrides: {
				"back:service:alpha": { tags: ["api"], port: 8080 },
				"back:lib:core": { profile: "maven" },
			},
			exclude: ["back:service:beta"],
		};

		const scopes = await discoverScopes(repoRoot, paths, scopesConfig);

		expect(scopes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "back:service:alpha",
					tags: ["api"],
					port: 8080,
				}),
				expect.objectContaining({ id: "back:lib:core", profile: "maven" }),
			]),
		);
		expect(
			scopes.find((scope) => scope.id === "back:service:beta"),
		).toBeUndefined();
		expect(scopes.find((scope) => scope.id === "docs:root")).toBeDefined();
		const alpha = scopes.find((scope) => scope.id === "back:service:alpha");
		expect(alpha?.port).toBe(8080);
		const alphaDefaultPort = scopes.find(
			(scope) => scope.id === "back:service:alpha",
		)?.port;
		expect(alphaDefaultPort).toBe(8080);
	});

	it("assigns deterministic ports when missing", async () => {
		const repoRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), "mono-toolkit-ports-"),
		);
		await fs.mkdir(path.join(repoRoot, "back/services/alpha"), {
			recursive: true,
		});

		const scopes = await discoverScopes(
			repoRoot,
			{
				backServices: "back/services",
				backLibs: "back/libs",
				frontApps: "front/apps",
				frontPackages: "front/packages",
				contracts: "contracts",
				docs: "docs",
				infra: "infra",
			},
			{ overrides: {}, exclude: [] },
		);

		const alpha = scopes.find((scope) => scope.id === "back:service:alpha");
		expect(alpha?.port).toBeTypeOf("number");
	});
});
