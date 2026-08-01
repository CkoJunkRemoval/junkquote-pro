import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("security headers", () => {
  it("configures CSP and browser protections in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { default: config } = await import("../next.config");
    const groups = await config.headers!();
    const headers = groups[0].headers;
    const names = headers.map((header) => header.key);
    expect(names).toEqual(
      expect.arrayContaining([
        "Content-Security-Policy",
        "X-Frame-Options",
        "Referrer-Policy",
        "Permissions-Policy",
        "Strict-Transport-Security",
        "X-Content-Type-Options",
      ]),
    );
    expect(headers.find((header) => header.key === "Content-Security-Policy")?.value)
      .not.toContain("'unsafe-eval'");
  });

  it("permits the evaluator required by the Next.js development runtime only in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { default: config } = await import("../next.config");
    const groups = await config.headers!();
    const headers = groups[0].headers;
    expect(headers.find((header) => header.key === "Content-Security-Policy")?.value)
      .toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(headers.some((header) => header.key === "Strict-Transport-Security"))
      .toBe(false);
  });
});
