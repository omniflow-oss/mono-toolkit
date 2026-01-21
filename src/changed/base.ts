import { execCommand } from "../core/exec";
import { ExitCode, ToolkitError } from "../core/errors";

const envBaseRefs = [
	"GITHUB_BASE_REF",
	"CI_MERGE_REQUEST_TARGET_BRANCH_NAME",
	"CI_DEFAULT_BRANCH",
	"CHANGE_TARGET",
];

export const resolveBaseRef = async (options: {
	since?: string;
	base?: string;
	defaultBranch: string;
	allowFetchBase: boolean;
	cwd: string;
}): Promise<string> => {
	if (options.since) {
		return options.since;
	}

	const envRef = envBaseRefs
		.map((name) => process.env[name])
		.find((value) => Boolean(value));
	if (envRef) {
		return envRef;
	}

	const base = options.base ?? options.defaultBranch;
	const mergeBase = await execCommand("git", ["merge-base", "HEAD", base], {
		cwd: options.cwd,
	});
	if (mergeBase.exitCode === 0 && mergeBase.stdout.trim()) {
		return mergeBase.stdout.trim();
	}

	if (!options.allowFetchBase) {
		throw new ToolkitError("Unable to resolve git base", ExitCode.GitMissing);
	}

	const fetchResult = await execCommand(
		"git",
		["fetch", "origin", base, "--depth=1"],
		{
			cwd: options.cwd,
		},
	);
	if (fetchResult.exitCode !== 0) {
		throw new ToolkitError("Unable to fetch git base", ExitCode.GitMissing, {
			stderr: fetchResult.stderr,
		});
	}

	const mergeBaseAfterFetch = await execCommand(
		"git",
		["merge-base", "HEAD", base],
		{ cwd: options.cwd },
	);
	if (mergeBaseAfterFetch.exitCode !== 0) {
		throw new ToolkitError(
			"Unable to compute merge-base",
			ExitCode.GitMissing,
			{
				stderr: mergeBaseAfterFetch.stderr,
			},
		);
	}
	return mergeBaseAfterFetch.stdout.trim();
};
