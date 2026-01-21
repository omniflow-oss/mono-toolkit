import path from "node:path";
import type { CommandContext } from "@stricli/core";
import { buildCommand } from "@stricli/core";
import {
	ensureDir,
	copyDirIfMissing,
	copyFileIfMissing,
	pathExists,
	writeJsonFile,
} from "../../core/fs";
import { getPackageRoot } from "../../core/package-root";
import { ensureCacheLayout } from "../../reports/cache";
import { writeJson, writeText } from "../output";
import { configFiles } from "../../core/config/types";

export const initCommand = buildCommand({
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
