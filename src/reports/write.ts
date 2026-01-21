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
		}>;
	}>;
}

export interface ScopeReport {
	id: string;
	tasks: ReportSummary["scopes"][number]["tasks"];
}

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
