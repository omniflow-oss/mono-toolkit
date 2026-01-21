import { promises as fs } from "node:fs";
import path from "node:path";
import type { CommandContext } from "@stricli/core";
import { buildCommand } from "@stricli/core";
import { assertPathWithinRoot } from "../../core/fs";
import { sanitizeName } from "../../scaffold/sanitize";
import { setExitCode, writeError, writeJson, writeText } from "../output";
import { loadRepoContext } from "./shared";

const typeOptions = ["service", "lib", "app", "package", "feature"] as const;
type DeleteType = (typeof typeOptions)[number];

const typeRoots = (paths: {
	backServices: string;
	backLibs: string;
	frontApps: string;
	frontPackages: string;
}) => ({
	service: paths.backServices,
	lib: paths.backLibs,
	app: paths.frontApps,
	package: paths.frontPackages,
});

export const deleteCommand = buildCommand<
	{ in?: string; json: boolean },
	[string, string],
	CommandContext
>({
	parameters: {
		positional: {
			kind: "tuple",
			parameters: [
				{ brief: "Type", parse: String },
				{ brief: "Name", parse: String },
			],
		},
		flags: {
			in: {
				kind: "parsed",
				brief: "Target service scope for feature",
				parse: String,
				optional: true,
			},
			json: { kind: "boolean", brief: "Output JSON", default: false },
		},
	},
	docs: { brief: "Delete a scope or feature" },
	func: async function (flags, type: string, name: string) {
		const context = this as CommandContext;
		try {
			if (!typeOptions.includes(type as DeleteType)) {
				throw new Error(`Unknown type: ${type}`);
			}
			const { repoRoot, config, scopes } = await loadRepoContext(
				context as { cwd?: string },
			);
			const sanitized = sanitizeName(name, config.policies);
			const roots = typeRoots(config.paths);
			let targetDir = "";
			if (type === "feature") {
				if (!flags.in) {
					throw new Error("--in is required for feature deletion");
				}
				const scope = scopes.find(
					(entry) => entry.id === flags.in || entry.path === flags.in,
				);
				if (!scope) {
					throw new Error(`Scope not found: ${flags.in}`);
				}
				targetDir = path.join(
					repoRoot,
					scope.path,
					"src",
					"main",
					"java",
					"features",
					sanitized,
				);
			} else {
				targetDir = path.join(
					repoRoot,
					roots[type as Exclude<DeleteType, "feature">],
					sanitized,
				);
			}

			assertPathWithinRoot(repoRoot, targetDir, "target");

			await fs.rm(targetDir, { recursive: true, force: true });

			if (flags.json) {
				writeJson(context, {
					status: "ok",
					type,
					name: sanitized,
					path: targetDir,
				});
			} else {
				writeText(context, `Deleted ${type} at ${targetDir}`);
			}
		} catch (error) {
			setExitCode(context, writeError(context, error as Error, flags.json));
		}
	},
});
