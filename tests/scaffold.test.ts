import { describe, expect, it } from "vitest";
import { ExitCode, ToolkitError } from "../src/core/errors";
import { sanitizeName } from "../src/scaffold/sanitize";

describe("sanitizeName", () => {
	const policies = { sanitizePattern: "[a-z0-9-]", maxNameLength: 12 };

	it("returns valid names unchanged", () => {
		expect(sanitizeName("good-name", policies)).toBe("good-name");
	});

	it("rejects invalid names", () => {
		expect(() => sanitizeName("BadName", policies)).toThrow(ToolkitError);
		expect(() => sanitizeName("BadName", policies)).toThrow(/Invalid name/);
	});

	it("rejects overly long names", () => {
		expect(() => sanitizeName("name-that-is-way-too-long", policies)).toThrow(
			ToolkitError,
		);
		expect(() =>
			sanitizeName("name-that-is-way-too-long", policies),
		).toThrowError(expect.objectContaining({ code: ExitCode.InvalidConfig }));
	});
});
