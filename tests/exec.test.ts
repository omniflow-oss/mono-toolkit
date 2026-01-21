import { describe, expect, it } from "vitest";
import { execCommand } from "../src/core/exec";

describe("execCommand", () => {
	it("redacts secret environment values", async () => {
		const result = await execCommand(
			process.execPath,
			["-e", "console.log(process.env.SECRET_TOKEN)"],
			{ env: { ...process.env, SECRET_TOKEN: "super-secret" } },
		);

		expect(result.stdout.trim()).toBe("[REDACTED]");
	});
});
