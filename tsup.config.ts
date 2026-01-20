import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    cli: "src/bin/cli.ts",
    index: "src/index.ts"
  },
  format: ["cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  target: "node24"
});
