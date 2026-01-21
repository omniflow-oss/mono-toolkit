import { writeReportFile } from "./cache";

export interface ReportSummary {
	pipeline: string;
	status: "success" | "failed";
	scopes: Array<{
		id: string;
		tasks: Array<{
			id: string;
			exitCode: number;
			command?: string[];
			durationMs?: number;
			cached?: boolean;
			errorExcerpt?: string;
		}>;
	}>;
}

export interface ScopeReport {
	id: string;
	tasks: ReportSummary["scopes"][number]["tasks"];
}

const sanitizePathSegment = (value: string): string =>
	value.replace(/[^a-zA-Z0-9_-]/g, "_");

export const writeSummaryReport = async (
	repoRoot: string,
	summary: ReportSummary,
): Promise<void> => {
	const content = `${JSON.stringify(summary, null, 2)}\n`;
	await writeReportFile(repoRoot, "reports/summary.json", content);
};

export const writeScopeReport = async (
	repoRoot: string,
	scope: ScopeReport,
): Promise<void> => {
	const safeId = scope.id.replace(/[^a-zA-Z0-9_-]/g, "_");
	const content = `${JSON.stringify(scope, null, 2)}\n`;
	await writeReportFile(repoRoot, `reports/scopes/${safeId}.json`, content);
};

export const writeTaskLogs = async (options: {
	repoRoot: string;
	scopeId: string;
	taskId: string;
	stdout: string;
	stderr: string;
}): Promise<void> => {
	const scopeSegment = sanitizePathSegment(options.scopeId);
	const taskSegment = sanitizePathSegment(options.taskId);
	await writeReportFile(
		options.repoRoot,
		`reports/logs/${scopeSegment}/${taskSegment}.stdout.log`,
		options.stdout,
	);
	await writeReportFile(
		options.repoRoot,
		`reports/logs/${scopeSegment}/${taskSegment}.stderr.log`,
		options.stderr,
	);
};
