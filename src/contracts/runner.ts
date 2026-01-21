import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveBaseRef } from "../changed/base";
import type {
	ContractsConfig,
	DockerConfig,
	GitConfig,
	ScopeRecord,
} from "../core/config/types";
import { ExitCode, ToolkitError } from "../core/errors";
import { execCommand } from "../core/exec";
import { assertPathWithinRoot, ensureDir, pathExists } from "../core/fs";
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
		"swagger-cli",
		"bundle",
		input,
		"--type",
		"yaml",
		"--outfile",
		output,
	];
	if (await pathExists(normalizeConfig)) {
		normalizeArgs.push("--config", normalizeConfig);
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
			const diffConfig = path.join(
				options.repoRoot,
				"config",
				"tools",
				"openapi",
				"oasdiff.conf.yaml",
			);
			const diffArgs = ["oasdiff", "diff", paths.designNorm, paths.runtimeNorm];
			if (await pathExists(diffConfig)) {
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
			const diffConfig = path.join(
				options.repoRoot,
				"config",
				"tools",
				"openapi",
				"oasdiff.conf.yaml",
			);
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
			if (await pathExists(diffConfig)) {
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
			const result = await runInDocker({
				repoRoot: options.repoRoot,
				docker: options.docker,
				args: [
					"npx",
					"openapi-typescript",
					paths.designNorm,
					"-o",
					paths.clientOutput,
				],
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
