import { describe, expect, it } from "vitest";
import {
  buildProductionContentSecurityPolicy,
  productionContentSecurityPolicy,
} from "./security-policy";

describe("production image CSP", () => {
  it("allows same-origin private logos without opening arbitrary HTTPS image hosts", () => {
    expect(productionContentSecurityPolicy).toContain(
      "img-src 'self' data: blob:",
    );
    expect(productionContentSecurityPolicy).not.toContain(
      "img-src 'self' data: blob: https:",
    );
  });
  it("allows only the configured HTTPS storage origin for signed logo redirects", () => {
    const policy = buildProductionContentSecurityPolicy(
      "https://tenant.supabase.co/storage/v1",
    );
    expect(policy).toContain(
      "img-src 'self' data: blob: https://tenant.supabase.co",
    );
    const imageDirective = policy
      .split("; ")
      .find((value) => value.startsWith("img-src"));
    expect(imageDirective).toBe(
      "img-src 'self' data: blob: https://tenant.supabase.co",
    );
    expect(
      buildProductionContentSecurityPolicy("http://unsafe.example"),
    ).toContain("img-src 'self' data: blob:");
  });
});
