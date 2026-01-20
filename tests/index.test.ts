import { describe, expect, it } from "vitest";
import * as toolkit from "../src/index";

describe("index exports", () => {
  it("re-exports core APIs", () => {
    expect(typeof toolkit.loadConfig).toBe("function");
    expect(typeof toolkit.executePipeline).toBe("function");
    expect(typeof toolkit.findRepoRoot).toBe("function");
  });
});
