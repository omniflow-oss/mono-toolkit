import { describe, expect, it } from "vitest";
import { asError, ExitCode, ToolkitError } from "../src/core/errors";

describe("ToolkitError", () => {
	it("stores error code and details", () => {
		const error = new ToolkitError("Boom", ExitCode.InvalidConfig, {
			reason: "bad",
		});

		expect(error.message).toBe("Boom");
		expect(error.code).toBe(ExitCode.InvalidConfig);
		expect(error.details).toEqual({ reason: "bad" });
	});
});

describe("asError", () => {
	it("returns the same error instance", () => {
		const error = new Error("oops");
		expect(asError(error)).toBe(error);
	});

	it("wraps non-error values", () => {
		const result = asError("oops");
		expect(result).toBeInstanceOf(Error);
		expect(result.message).toBe("oops");
	});
});
