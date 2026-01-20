import { describe, expect, it } from "vitest";
import { mergeObjects } from "../src/core/config/merge";

describe("mergeObjects", () => {
  it("merges objects deeply", () => {
    const result = mergeObjects({ a: { b: 1 }, c: [1] }, { a: { b: 2 }, c: [2] });
    expect(result).toEqual({ a: { b: 2 }, c: [1, 2] });
  });
});
