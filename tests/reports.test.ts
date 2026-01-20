import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { cacheRoot, ensureCacheLayout, writeReportFile } from "../src/reports/cache";
import { writeSummaryReport } from "../src/reports/write";

describe("reports", () => {
  it("creates cache layout and writes report files", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mono-toolkit-reports-"));

    await ensureCacheLayout(repoRoot);

    const cacheDir = path.join(repoRoot, cacheRoot, "cache/oas");
    const stat = await fs.stat(cacheDir);
    expect(stat.isDirectory()).toBe(true);

    await writeReportFile(repoRoot, "reports/lint/result.json", "ok\n");
    const reportPath = path.join(repoRoot, cacheRoot, "reports/lint/result.json");
    const reportContent = await fs.readFile(reportPath, "utf8");
    expect(reportContent).toBe("ok\n");
  });

  it("writes summary report", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mono-toolkit-summary-"));

    await writeSummaryReport(repoRoot, {
      pipeline: "check",
      status: "success",
      scopes: [{ id: "back:service:alpha", tasks: [{ id: "lint", exitCode: 0 }] }]
    });

    const summaryPath = path.join(repoRoot, cacheRoot, "reports/summary.json");
    const content = await fs.readFile(summaryPath, "utf8");
    expect(content).toContain("\"pipeline\": \"check\"");
  });
});
