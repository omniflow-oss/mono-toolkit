import { promises as fs } from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
import { resolveBaseRef } from "../changed/base";
import type {
	ContractsConfig,
	DockerConfig,
	GitConfig,
	PathsConfig,
	ScopeRecord,
} from "../core/config/types";
import { ExitCode, ToolkitError } from "../core/errors";
import { execCommand } from "../core/exec";
import {
	assertPathWithinRoot,
	ensureDir,
	listDirectories,
	pathExists,
	readJsonFile,
} from "../core/fs";
import { runInDocker } from "../docker/runner";

const cacheRoot = ".cache/mono-toolkit";

const getServiceName = (scope: ScopeRecord): string => {
	const parts = scope.id.split(":");
	return parts[parts.length - 1] ?? scope.id;
};

const resolveContractPaths = (
	repoRoot: string,
	contracts: ContractsConfig,
	scope: ScopeRecord,
) => {
	const serviceName = getServiceName(scope);
	const designSpec = path.join(
		repoRoot,
		contracts.root,
		serviceName,
		"openapi.yaml",
	);
	const cacheDir = path.join(repoRoot, cacheRoot, "cache", "oas", serviceName);
	const reportDir = path.join(
		repoRoot,
		cacheRoot,
		"reports",
		"openapi",
		serviceName,
	);
	return {
		serviceName,
		designSpec,
		cacheDir,
		reportDir,
		runtimeSpec: path.join(cacheDir, "runtime.json"),
		designNorm: path.join(cacheDir, "design.norm.yaml"),
		runtimeNorm: path.join(cacheDir, "runtime.norm.yaml"),
		breakingReport: path.join(reportDir, "breaking.json"),
		clientOutput: path.join(reportDir, "client.ts"),
		clientRoot: path.join(cacheDir, "client"),
		baseSpec: path.join(cacheDir, "base.yaml"),
	};
};

const ensureContractPaths = async (
	repoRoot: string,
	contracts: ContractsConfig,
	scope: ScopeRecord,
) => {
	const paths = resolveContractPaths(repoRoot, contracts, scope);
	assertPathWithinRoot(repoRoot, paths.designSpec, "contracts spec");
	await ensureDir(paths.cacheDir);
	await ensureDir(paths.reportDir);
	if (!(await pathExists(paths.designSpec))) {
		throw new ToolkitError("Design spec not found", ExitCode.InvalidConfig, {
			path: paths.designSpec,
		});
	}
	if (
		contracts.allowlist.length > 0 &&
		!contracts.allowlist.includes(paths.serviceName)
	) {
		throw new ToolkitError(
			"Service is not in contracts allowlist",
			ExitCode.InvalidConfig,
			{ service: paths.serviceName },
		);
	}
	return paths;
};

const toPascalCase = (value: string): string =>
	value
		.split(/[^a-zA-Z0-9]+/)
		.filter(Boolean)
		.map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
		.join("");

const toCamelCase = (value: string): string => {
	const pascal = toPascalCase(value);
	return pascal.length ? pascal[0].toLowerCase() + pascal.slice(1) : value;
};

const buildOasdiffConfig = async (options: {
	repoRoot: string;
	paths: ReturnType<typeof resolveContractPaths>;
	contracts: ContractsConfig;
}): Promise<string | null> => {
	const configPath = path.join(
		options.repoRoot,
		"config",
		"tools",
		"openapi",
		"oasdiff.conf.yaml",
	);
	const ignore = options.contracts.driftIgnore ?? [];
	if (!(await pathExists(configPath)) && !ignore.length) {
		return null;
	}
	let configDoc: { ignore?: string[] } = {};
	if (await pathExists(configPath)) {
		configDoc = parse(await fs.readFile(configPath, "utf8")) as {
			ignore?: string[];
		};
	}
	const mergedIgnore = Array.from(
		new Set([...(configDoc.ignore ?? []), ...ignore]),
	);
	const merged = { ...configDoc, ignore: mergedIgnore };
	const outputPath = path.join(options.paths.cacheDir, "oasdiff.conf.yaml");
	await fs.writeFile(outputPath, stringify(merged), "utf8");
	return outputPath;
};

const ensureClientLayout = async (options: {
	repoRoot: string;
	paths: PathsConfig;
	serviceName: string;
}): Promise<{
	apiRoot: string;
	serviceRoot: string;
	serviceIndex: string;
	rootIndex: string;
}> => {
	const apiRoot = path.join(
		options.repoRoot,
		options.paths.frontPackages,
		"api",
	);
	const serviceRoot = path.join(
		apiRoot,
		"src",
		"services",
		options.serviceName,
	);
	await ensureDir(serviceRoot);
	return {
		apiRoot,
		serviceRoot,
		serviceIndex: path.join(serviceRoot, "index.ts"),
		rootIndex: path.join(apiRoot, "src", "index.ts"),
	};
};

const writeServiceIndex = async (options: {
	serviceIndex: string;
	serviceName: string;
}): Promise<void> => {
	const clientName = `create${toPascalCase(options.serviceName)}Client`;
	const content = `export type { paths } from "./schema";\nexport { ${clientName} } from "./client";\n`;
	await fs.writeFile(options.serviceIndex, content, "utf8");
};

const updateRootIndex = async (options: {
	rootIndex: string;
	serviceName: string;
}): Promise<void> => {
	const exportName = toCamelCase(options.serviceName);
	const exportLine = `export * as ${exportName} from "./services/${options.serviceName}";`;
	let content = "";
	try {
		content = await fs.readFile(options.rootIndex, "utf8");
	} catch {
		// ignore
	}
	const lines = content.split(/\r?\n/).filter(Boolean);
	if (!lines.includes(exportLine)) {
		lines.push(exportLine);
	}
	await fs.writeFile(options.rootIndex, `${lines.join("\n")}\n`, "utf8");
};

const updateNuxtPlugins = async (options: {
	repoRoot: string;
	paths: PathsConfig;
}): Promise<void> => {
	const appsRoot = path.join(options.repoRoot, options.paths.frontApps);
	if (!(await pathExists(appsRoot))) {
		return;
	}
	const apiServicesRoot = path.join(
		options.repoRoot,
		options.paths.frontPackages,
		"api",
		"src",
		"services",
	);
	if (!(await pathExists(apiServicesRoot))) {
		return;
	}
	const services = await listDirectories(apiServicesRoot);
	if (!services.length) {
		return;
	}
	const apps = await listDirectories(appsRoot);
	const imports = services
		.map(
			(service) =>
				`import { create${toPascalCase(service)}Client } from "../../packages/api/src/services/${service}/client";`,
		)
		.join("\n");
	const clients = services
		.map((service) => {
			const camel = toCamelCase(service);
			const pascal = toPascalCase(service);
			return `\t${camel}: create${pascal}Client(runtimeConfig.public.api.${camel}.baseURL),`;
		})
		.join("\n");
	const content = `// @mono-toolkit\nimport { defineNuxtPlugin, useRuntimeConfig } from \"#app\";\n${imports}\n\nexport default defineNuxtPlugin(() => {\n\tconst runtimeConfig = useRuntimeConfig();\n\tconst api = {\n${clients}\n\t};\n\treturn { provide: { api } };\n});\n`;
	for (const app of apps) {
		const pluginDir = path.join(appsRoot, app, "plugins");
		await ensureDir(pluginDir);
		const pluginPath = path.join(pluginDir, "api.ts");
		let existing = "";
		try {
			existing = await fs.readFile(pluginPath, "utf8");
		} catch {
			// ignore
		}
		if (existing && !existing.includes("@mono-toolkit")) {
			continue;
		}
		await fs.writeFile(pluginPath, content, "utf8");
	}
};

const ensureRuntimePath = (runtimePath: string): void => {
	if (!runtimePath.startsWith("/")) {
		throw new ToolkitError(
			"contracts.runtimePath must start with '/'",
			ExitCode.InvalidConfig,
			{ runtimePath },
		);
	}
	if (runtimePath.includes("://") || runtimePath.includes("..")) {
		throw new ToolkitError(
			"contracts.runtimePath must be a relative HTTP path",
			ExitCode.InvalidConfig,
			{ runtimePath },
		);
	}
};

const normalizeSpec = async (
	repoRoot: string,
	docker: DockerConfig,
	input: string,
	output: string,
): Promise<void> => {
	assertPathWithinRoot(repoRoot, input, "contracts spec");
	assertPathWithinRoot(repoRoot, output, "contracts output");
	const normalizeConfig = path.join(
		repoRoot,
		"config",
		"tools",
		"openapi",
		"normalize.json",
	);
	const normalizeArgs = [
		"redocly",
		"bundle",
		input,
		"--output",
		output,
		"--ext",
		"yaml",
	];
	if (await pathExists(normalizeConfig)) {
		const normalizeOptions = await readJsonFile<{
			dereference?: boolean;
		}>(normalizeConfig);
		if (normalizeOptions.dereference) {
			normalizeArgs.push("--dereferenced");
		}
	}
	const result = await runInDocker({
		repoRoot,
		docker,
		args: normalizeArgs,
	});
	if (result.exitCode !== 0) {
		throw new ToolkitError(
			"OpenAPI normalization failed",
			ExitCode.TaskFailed,
			{ stderr: result.stderr },
		);
	}
};

const fetchRuntimeSpec = async (
	repoRoot: string,
	docker: DockerConfig,
	url: string,
	output: string,
): Promise<void> => {
	const result = await runInDocker({
		repoRoot,
		docker,
		args: ["curl", "-s", url],
	});
	if (result.exitCode !== 0) {
		throw new ToolkitError(
			"Failed to fetch runtime OpenAPI",
			ExitCode.TaskFailed,
			{ stderr: result.stderr },
		);
	}
	await fs.writeFile(output, result.stdout, "utf8");
};

export const runContractsTask = async (options: {
	repoRoot: string;
	docker: DockerConfig;
	contracts: ContractsConfig;
	git: GitConfig;
	paths: PathsConfig;
	scope: ScopeRecord;
	taskId: string;
}): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
	if (options.scope.type !== "service") {
		throw new ToolkitError(
			"Contracts tasks must target service scopes",
			ExitCode.InvalidConfig,
			{
				scope: options.scope.id,
			},
		);
	}

	const paths = await ensureContractPaths(
		options.repoRoot,
		options.contracts,
		options.scope,
	);

	switch (options.taskId) {
		case "contracts:lint": {
			const spectralConfig = path.join(
				options.repoRoot,
				"config",
				"tools",
				"spectral",
				".spectral.yaml",
			);
			const result = await runInDocker({
				repoRoot: options.repoRoot,
				docker: options.docker,
				args: ["spectral", "lint", "-r", spectralConfig, paths.designSpec],
			});
			return result;
		}
		case "contracts:build": {
			await normalizeSpec(
				options.repoRoot,
				options.docker,
				paths.designSpec,
				paths.designNorm,
			);
			return { exitCode: 0, stdout: "contracts:build completed", stderr: "" };
		}
		case "contracts:drift": {
			if (!options.scope.port) {
				throw new ToolkitError(
					"Missing port for contracts drift",
					ExitCode.InvalidConfig,
					{
						scope: options.scope.id,
					},
				);
			}
			ensureRuntimePath(options.contracts.runtimePath);
			const runtimeUrl = `http://localhost:${options.scope.port}${options.contracts.runtimePath}`;
			await fetchRuntimeSpec(
				options.repoRoot,
				options.docker,
				runtimeUrl,
				paths.runtimeSpec,
			);
			await normalizeSpec(
				options.repoRoot,
				options.docker,
				paths.designSpec,
				paths.designNorm,
			);
			await normalizeSpec(
				options.repoRoot,
				options.docker,
				paths.runtimeSpec,
				paths.runtimeNorm,
			);
			const diffConfig = await buildOasdiffConfig({
				repoRoot: options.repoRoot,
				paths,
				contracts: options.contracts,
			});
			const source =
				options.contracts.authoritative === "design"
					? paths.designNorm
					: paths.runtimeNorm;
			const target =
				options.contracts.authoritative === "design"
					? paths.runtimeNorm
					: paths.designNorm;
			const diffArgs = ["oasdiff", "diff", source, target];
			if (diffConfig) {
				diffArgs.push("--config", diffConfig);
			}
			const diff = await runInDocker({
				repoRoot: options.repoRoot,
				docker: options.docker,
				args: diffArgs,
			});
			return diff;
		}
		case "contracts:breaking": {
			const baseRef = await resolveBaseRef({
				base: options.git.defaultBranch,
				defaultBranch: options.git.defaultBranch,
				allowFetchBase: options.git.allowFetchBase,
				cwd: options.repoRoot,
			});
			const relativeDesign = path.relative(options.repoRoot, paths.designSpec);
			const baseResult = await execCommand(
				"git",
				["show", `${baseRef}:${relativeDesign}`],
				{
					cwd: options.repoRoot,
				},
			);
			if (baseResult.exitCode !== 0) {
				throw new ToolkitError(
					"Unable to read base OpenAPI spec",
					ExitCode.GitMissing,
					{
						stderr: baseResult.stderr,
					},
				);
			}
			await fs.writeFile(paths.baseSpec, baseResult.stdout, "utf8");
			await normalizeSpec(
				options.repoRoot,
				options.docker,
				paths.designSpec,
				paths.designNorm,
			);
			await normalizeSpec(
				options.repoRoot,
				options.docker,
				paths.baseSpec,
				paths.runtimeNorm,
			);
			const diffConfig = await buildOasdiffConfig({
				repoRoot: options.repoRoot,
				paths,
				contracts: options.contracts,
			});
			const diffArgs = [
				"oasdiff",
				"diff",
				"-f",
				"json",
				"-o",
				paths.breakingReport,
				paths.runtimeNorm,
				paths.designNorm,
			];
			if (diffConfig) {
				diffArgs.push("--config", diffConfig);
			}
			const diff = await runInDocker({
				repoRoot: options.repoRoot,
				docker: options.docker,
				args: diffArgs,
			});
			return diff;
		}
		case "contracts:client": {
			await normalizeSpec(
				options.repoRoot,
				options.docker,
				paths.designSpec,
				paths.designNorm,
			);
			const clientPaths = await ensureClientLayout({
				repoRoot: options.repoRoot,
				paths: options.paths,
				serviceName: paths.serviceName,
			});
			const schemaPath = path.join(clientPaths.serviceRoot, "schema.ts");
			const result = await runInDocker({
				repoRoot: options.repoRoot,
				docker: options.docker,
				args: ["npx", "openapi-typescript", paths.designNorm, "-o", schemaPath],
			});
			const clientName = `create${toPascalCase(paths.serviceName)}Client`;
			const clientContent = `import createClient from "openapi-fetch";\nimport type { paths } from "./schema";\n\nexport const ${clientName} = (baseURL: string) => createClient<paths>({ baseUrl: baseURL });\nexport type { paths };\n`;
			await fs.writeFile(
				path.join(clientPaths.serviceRoot, "client.ts"),
				clientContent,
				"utf8",
			);
			await writeServiceIndex({
				serviceIndex: clientPaths.serviceIndex,
				serviceName: paths.serviceName,
			});
			await updateRootIndex({
				rootIndex: clientPaths.rootIndex,
				serviceName: paths.serviceName,
			});
			await updateNuxtPlugins({
				repoRoot: options.repoRoot,
				paths: options.paths,
			});
			return result;
		}
		default:
			throw new ToolkitError(
				"Unsupported contracts task",
				ExitCode.InvalidConfig,
				{ task: options.taskId },
			);
	}
};
