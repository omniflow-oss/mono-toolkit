import path from "node:path";
import { promises as fs } from "node:fs";
import type { CommandContext } from "@stricli/core";
import { buildCommand } from "@stricli/core";
import { loadRepoContext } from "./shared";
import { getPackageRoot } from "../../core/package-root";
import { sanitizeName } from "../../scaffold/sanitize";
import { renderTemplateDir } from "../../scaffold/template";
import { assertPathWithinRoot } from "../../core/fs";
import { setExitCode, writeError, writeJson, writeText } from "../output";

const typeOptions = ["service", "lib", "app", "package", "feature"] as const;
type CreateType = (typeof typeOptions)[number];

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

export const newCommand = buildCommand<
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
	docs: { brief: "Scaffold a new scope or feature" },
	func: async function (flags, type: string, name: string) {
		const context = this as CommandContext;
		try {
			if (!typeOptions.includes(type as CreateType)) {
				throw new Error(`Unknown type: ${type}`);
			}
			const { repoRoot, config, scopes } = await loadRepoContext(
				context as { cwd?: string },
			);
			const sanitized = sanitizeName(name, config.policies);
			const packageRoot = getPackageRoot();
			const roots = typeRoots(config.paths);
			let targetDir = "";
			if (type === "feature") {
				if (!flags.in) {
					throw new Error("--in is required for feature scaffolding");
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
					roots[type as Exclude<CreateType, "feature">],
					sanitized,
				);
			}

			assertPathWithinRoot(repoRoot, targetDir, "target");

			if (
				await fs
					.stat(targetDir)
					.then(() => true)
					.catch(() => false)
			) {
				throw new Error(`Target already exists: ${targetDir}`);
			}

			const templateDir = path.join(packageRoot, "templates", type);
			await renderTemplateDir(templateDir, targetDir, sanitized);

			if (flags.json) {
				writeJson(context, {
					status: "ok",
					type,
					name: sanitized,
					path: targetDir,
				});
			} else {
				writeText(context, `Created ${type} at ${targetDir}`);
			}
		} catch (error) {
			setExitCode(context, writeError(context, error as Error, flags.json));
		}
	},
});
