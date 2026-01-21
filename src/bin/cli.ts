#!/usr/bin/env node
import { run } from "@stricli/core";
import { createApp } from "../cli/app";
import { buildCliContext } from "../cli/context";

const main = async () => {
	const app = await createApp();
	await run(app, process.argv.slice(2), buildCliContext(process));
};

main().catch((error) => {
	process.stderr.write(
		`${error instanceof Error ? error.message : String(error)}\n`,
	);
	process.exitCode = 1;
});
