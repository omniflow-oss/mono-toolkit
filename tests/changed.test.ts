import { describe, expect, it } from "vitest";
import { mapChangedFilesToScopes } from "../src/changed/changed";
import type { ChangedConfig, ScopeRecord } from "../src/core/config/types";

describe("mapChangedFilesToScopes", () => {
	it("maps files to scopes", () => {
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
			["back/services/alpha/src/index.ts"],
			scopes,
			config,
		);
		expect(result).toEqual(["back:service:alpha"]);
	});
});
