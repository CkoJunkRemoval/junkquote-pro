import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("pricing profile permissions", () => {
  const actions = readFileSync("src/app/actions/pricingProfiles/pricingProfiles.ts", "utf8");
  const page = readFileSync("src/app/settings/pricing-profiles/page.tsx", "utf8");

  it("limits profile management to owner, admin and office", () => {
    expect(actions).toContain('requireCompanyRole("Owner", "Admin", "Office")');
    expect(actions).not.toContain('requireCompanyRole("Crew"');
    expect(page).toContain('["Owner", "Admin", "Office"].includes(context.role)');
  });

  it("allows operational roles to change an editable estimate profile", () => {
    expect(actions).toContain('requireCompanyRole("Owner", "Admin", "Manager", "Office")');
  });

  it("uses tenant context for reads, excluding unauthenticated customer portal access", () => {
    expect(actions).toContain("requireTenantContext()");
    expect(page).toContain("requireTenantContext()");
  });
});
