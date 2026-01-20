import { describe, expect, it, vi } from "vitest";

vi.mock("@stricli/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stricli/core")>();
  return {
    ...actual,
    buildRouteMap: vi.fn(),
    buildApplication: vi.fn()
  };
});

vi.mock("../src/core/version", () => ({
  getPackageVersion: vi.fn()
}));

import { buildApplication, buildRouteMap } from "@stricli/core";
import { getPackageVersion } from "../src/core/version";
import { createApp } from "../src/cli/app";

describe("createApp", () => {
  it("builds the application with routes and version", async () => {
    const routeMap = { kind: "route-map" } as unknown as ReturnType<typeof buildRouteMap>;
    const appMock = { app: "ok" } as unknown as ReturnType<typeof buildApplication>;
    vi.mocked(buildRouteMap).mockReturnValue(routeMap);
    vi.mocked(buildApplication).mockReturnValue(appMock);
    vi.mocked(getPackageVersion).mockResolvedValue("9.9.9");

    const app = await createApp();

    expect(app).toEqual({ app: "ok" });
    const routesArg = vi.mocked(buildRouteMap).mock.calls[0]?.[0];
    expect(Object.keys(routesArg.routes)).toContain("init");
    expect(Object.keys(routesArg.routes)).toContain("docs:build");

    expect(vi.mocked(buildApplication)).toHaveBeenCalledWith(
      routeMap,
      expect.objectContaining({
        name: "mono-toolkit",
        versionInfo: { currentVersion: "9.9.9" }
      })
    );
  });
});
