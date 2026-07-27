import { describe, expect, it } from "vitest";
import { hasCompanyModuleAccess, visibleCompanyModules } from "./companyCapabilities";

describe("company module capability matrix", () => {
  it.each(["Owner", "Admin"] as const)("gives %s access to every company module", (role) => {
    expect(visibleCompanyModules({ role })).toEqual(expect.arrayContaining([
      "dispatch", "communications", "pricingIntelligence", "companyHub",
      "billing", "finance", "tax", "fleet", "workforce",
    ]));
  });

  it("permits Manager operations without sensitive modules", () => {
    const subject = { role: "Manager" as const, billingAdmin: false };
    expect(hasCompanyModuleAccess(subject, "dispatch")).toBe(true);
    expect(hasCompanyModuleAccess(subject, "communications")).toBe(true);
    for (const feature of ["tax", "billing", "finance", "pricingIntelligence", "companyHub"] as const)
      expect(hasCompanyModuleAccess(subject, feature)).toBe(false);
  });

  it("keeps an explicit billing administrator out of Finance and Tax", () => {
    const subject = { role: "Office" as const, billingAdmin: true };
    expect(hasCompanyModuleAccess(subject, "billing")).toBe(true);
    expect(hasCompanyModuleAccess(subject, "finance")).toBe(false);
    expect(hasCompanyModuleAccess(subject, "tax")).toBe(false);
  });

  it("limits Crew to worker and assigned-fleet entry points", () => {
    const modules = visibleCompanyModules({ role: "Crew" });
    expect(modules).toEqual(expect.arrayContaining(["dashboard", "myTime", "field", "fleet"]));
    for (const feature of ["customers", "workforce", "finance", "tax", "billing", "pricingIntelligence", "communications"] as const)
      expect(modules).not.toContain(feature);
  });
});
