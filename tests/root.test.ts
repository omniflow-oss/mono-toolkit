import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findRepoRoot } from "../src/core/root";

describe("findRepoRoot", () => {
	it("finds root by private package.json", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mono-toolkit-"));
		await fs.writeFile(
			path.join(dir, "package.json"),
			JSON.stringify({ private: true }),
		);
		const nested = path.join(dir, "a", "b");
		await fs.mkdir(nested, { recursive: true });
		const root = await findRepoRoot(nested);
		expect(root).toBe(dir);
	});
});
