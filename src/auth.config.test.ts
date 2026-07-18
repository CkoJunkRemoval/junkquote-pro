import { describe, expect, it } from "vitest";
import { authConfig } from "./auth.config";
const allowed = (path: string, authenticated = false) =>
  authConfig.callbacks!.authorized!({
    auth: authenticated ? { user: { id: "u" } } : null,
    request: { nextUrl: new URL(`https://app.test${path}`) },
  } as never);
describe("production route protection", () => {
  it("keeps health, approval, portal, and private asset authorization public", () => {
    for (const path of [
      "/api/health/live",
      "/approve/token",
      "/portal",
      "/api/private/assets/x",
    ])
      expect(allowed(path)).toBe(true);
  });
  it("protects staff routes", () => {
    expect(allowed("/analytics")).toBe(false);
    expect(allowed("/analytics", true)).toBe(true);
  });
});
