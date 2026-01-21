import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { deleteCommand } from "../src/cli/commands/delete";
import { newCommand } from "../src/cli/commands/new";

const createContext = (cwd: string) => {
	const stdout: string[] = [];
	const stderr: string[] = [];
	const context = {
		cwd,
		process: {
			stdout: { write: (chunk: string) => stdout.push(chunk) },
			stderr: { write: (chunk: string) => stderr.push(chunk) },
			exitCode: undefined as number | undefined,
		},
	};
	return { context, stdout, stderr };
};

const loadCommandFn = async (command: { loader: () => Promise<unknown> }) => {
	const loaded = await command.loader();
	return typeof loaded === "function"
		? loaded
		: (loaded as { default: (...args: unknown[]) => unknown }).default;
};

describe("newCommand/deleteCommand", () => {
	it("creates and deletes a service scaffold", async () => {
		const repoRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), "mono-toolkit-new-"),
		);
		await fs.writeFile(
			path.join(repoRoot, "package.json"),
			JSON.stringify({ private: true }),
		);

		const { context, stdout } = createContext(repoRoot);
		const runNew = await loadCommandFn(newCommand);
		await runNew.call(context, { json: true }, "service", "alpha");

		const response = JSON.parse(stdout.join("").trim());
		expect(response).toMatchObject({
			status: "ok",
			type: "service",
			name: "alpha",
		});

		const serviceDir = path.join(repoRoot, "back", "services", "alpha");
		const readmePath = path.join(serviceDir, "README.md");
		await expect(fs.stat(readmePath)).resolves.toBeDefined();

		const { context: deleteContext } = createContext(repoRoot);
		const runDelete = await loadCommandFn(deleteCommand);
		await runDelete.call(deleteContext, { json: true }, "service", "alpha");

		await expect(fs.stat(serviceDir)).rejects.toThrow();
	});

	it("writes text output for delete", async () => {
		const repoRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), "mono-toolkit-delete-"),
		);
		await fs.writeFile(
			path.join(repoRoot, "package.json"),
			JSON.stringify({ private: true }),
		);

		const { context } = createContext(repoRoot);
		const runNew = await loadCommandFn(newCommand);
		await runNew.call(context, { json: true }, "service", "alpha");

		const { context: deleteContext, stdout } = createContext(repoRoot);
		const runDelete = await loadCommandFn(deleteCommand);
		await runDelete.call(deleteContext, { json: false }, "service", "alpha");

		expect(stdout.join("").trim()).toContain("Deleted service at");
	});

	it("creates a feature scaffold", async () => {
		const repoRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), "mono-toolkit-feature-"),
		);
		await fs.writeFile(
			path.join(repoRoot, "package.json"),
			JSON.stringify({ private: true }),
		);
		const serviceDir = path.join(
			repoRoot,
			"back",
			"services",
			"alpha",
			"src",
			"main",
			"java",
			"features",
		);
		await fs.mkdir(serviceDir, { recursive: true });

		const { context, stdout } = createContext(repoRoot);
		const runNew = await loadCommandFn(newCommand);
		await runNew.call(
			context,
			{ json: true, in: "back/services/alpha" },
			"feature",
			"orders",
		);

		const response = JSON.parse(stdout.join("").trim());
		expect(response).toMatchObject({ status: "ok", type: "feature" });

		const featureDir = path.join(serviceDir, "orders");
		const apiFile = path.join(featureDir, "api", "ordersResource.java");
		await expect(fs.stat(apiFile)).resolves.toBeDefined();
	});
});
