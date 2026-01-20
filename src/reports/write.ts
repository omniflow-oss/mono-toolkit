import { writeReportFile } from "./cache";

export interface ReportSummary {
  pipeline: string;
  status: "success" | "failed";
  scopes: Array<{
    id: string;
    tasks: Array<{
      id: string;
      exitCode: number;
    }>;
  }>;
}

export const writeSummaryReport = async (repoRoot: string, summary: ReportSummary): Promise<void> => {
  const content = JSON.stringify(summary, null, 2) + "\n";
  await writeReportFile(repoRoot, "reports/summary.json", content);
};
