import { describe, expect, it } from "vitest";
import { buildCliContext } from "../src/cli/context";

describe("buildCliContext", () => {
	it("includes cwd and process", () => {
		const processRef = {
			stdout: { write: () => undefined },
			stderr: { write: () => undefined },
			exitCode: undefined as number | undefined,
		};

		const context = buildCliContext(processRef);

		expect(context.process).toBe(processRef);
		expect(context.cwd).toBe(process.cwd());
	});
});
