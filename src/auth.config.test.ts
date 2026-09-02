import { describe, expect, it } from "vitest";
import { authConfig, isPublicAuthPath } from "./auth.config";
const allowed = (path: string, authenticated = false) =>
  authConfig.callbacks!.authorized!({
    auth: authenticated ? { user: { id: "u" } } : null,
    request: { nextUrl: new URL(`https://app.test${path}`) },
  } as never);
describe("production route protection", () => {
  it("keeps health, approval, portal, and private asset authorization public", () => {
    for (const path of [
      "/api/health/live",
      "/api/webhooks/stripe",
      "/api/webhooks/resend",
      "/approve/token",
      "/portal",
      "/api/private/assets/x",
    ])
      expect(allowed(path)).toBe(true);
  });
  it("protects staff routes", () => {
    expect(allowed("/dashboard")).toBe(false);
    expect(allowed("/dashboard", true)).toBe(true);
    expect(allowed("/customers")).toBe(false);
    expect(allowed("/customers/customer-id")).toBe(false);
    expect(allowed("/customers", true)).toBe(true);
  });
  it("keeps the middleware and Auth.js public-route decisions aligned", () => {
    expect(isPublicAuthPath("/sign-in")).toBe(true);
    expect(isPublicAuthPath("/reset-password/token")).toBe(true);
    expect(isPublicAuthPath("/customer-stories")).toBe(true);
    expect(isPublicAuthPath("/customers")).toBe(false);
    expect(isPublicAuthPath("/customers/customer-id")).toBe(false);
    expect(isPublicAuthPath("/dashboard")).toBe(false);
  });
});
