import { describe, expect, it, vi } from "vitest";

vi.mock("../src/core/fs", () => ({
	readJsonFile: vi.fn(),
}));

import { getPackageVersion } from "../src/core/version";
import { readJsonFile } from "../src/core/fs";

describe("getPackageVersion", () => {
	it("returns version from package.json", async () => {
		vi.mocked(readJsonFile).mockResolvedValue({ version: "1.2.3" });

		const version = await getPackageVersion();

		expect(version).toBe("1.2.3");
	});

	it("defaults when version is missing", async () => {
		vi.mocked(readJsonFile).mockResolvedValue({});

		const version = await getPackageVersion();

		expect(version).toBe("0.0.0");
	});
});
