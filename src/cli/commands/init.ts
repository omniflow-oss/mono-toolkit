import path from "node:path";
import type { CommandContext } from "@stricli/core";
import { buildCommand } from "@stricli/core";
import { configFiles } from "../../core/config/types";
import {
	copyDirIfMissing,
	copyFileIfMissing,
	ensureDir,
	pathExists,
	writeJsonFile,
} from "../../core/fs";
import { getPackageRoot } from "../../core/package-root";
import { ensureCacheLayout } from "../../reports/cache";
import { writeJson, writeText } from "../output";

export const initCommand = buildCommand<{ json: boolean }, [], CommandContext>({
	parameters: {
		flags: {
			json: { kind: "boolean", brief: "Output JSON", default: false },
		},
	},
	docs: {
		brief: "Initialize a repo with mono-toolkit defaults",
	},
	func: async function (flags) {
		const context = this as CommandContext;
		const repoRoot = process.cwd();
		const packageRoot = getPackageRoot();
		const configDir = path.join(repoRoot, "config");
		const toolsDir = path.join(repoRoot, "config", "tools");
		const defaultsDir = path.join(packageRoot, "config", "defaults");
		const toolsSource = path.join(packageRoot, "config", "tools");

		await ensureDir(configDir);
		await copyDirIfMissing(toolsSource, toolsDir);

		const defaults = await Promise.all(
			configFiles.map(async (name) => {
				const source = path.join(defaultsDir, `${name}.json`);
				const target = path.join(configDir, `${name}.json`);
				const created = await copyFileIfMissing(source, target);
				return { name, created };
			}),
		);

		await ensureCacheLayout(repoRoot);

		const contractsDir = path.join(repoRoot, "contracts");
		const docsDir = path.join(repoRoot, "docs");
		await ensureDir(contractsDir);
		await ensureDir(docsDir);

		const infraDir = path.join(repoRoot, "infra");
		await ensureDir(infraDir);
		await copyFileIfMissing(
			path.join(packageRoot, "templates", "infra", "tools.compose.yaml"),
			path.join(infraDir, "tools.compose.yaml"),
		);
		await copyFileIfMissing(
			path.join(packageRoot, "templates", "infra", "compose.yaml"),
			path.join(infraDir, "compose.yaml"),
		);
		await copyFileIfMissing(
			path.join(packageRoot, "templates", "infra", "Dockerfile.tools"),
			path.join(infraDir, "Dockerfile.tools"),
		);

		await copyFileIfMissing(
			path.join(packageRoot, "config", "tools", "spectral", ".spectral.yaml"),
			path.join(contractsDir, ".spectral.yaml"),
		);
		const exampleDir = path.join(contractsDir, "example");
		await ensureDir(exampleDir);
		await copyFileIfMissing(
			path.join(packageRoot, "templates", "contracts", "openapi.yaml"),
			path.join(exampleDir, "openapi.yaml"),
		);
		await copyFileIfMissing(
			path.join(packageRoot, "templates", "contracts", "README.md"),
			path.join(contractsDir, "README.md"),
		);

		const biomeRouter = path.join(repoRoot, "biome.jsonc");
		if (!(await pathExists(biomeRouter))) {
			await writeJsonFile(biomeRouter, {
				$schema: "https://biomejs.dev/schemas/1.8.3/schema.json",
				extends: ["./config/tools/biome/biome.base.jsonc"],
			});
		}

		if (flags.json) {
			writeJson(context, { status: "ok", defaults });
		} else {
			writeText(context, "Initialized mono-toolkit configuration");
		}
	},
});
