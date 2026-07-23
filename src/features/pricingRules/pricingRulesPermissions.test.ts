import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Pricing Rules permissions and responsive UI",()=>{
  const page=readFileSync("src/app/settings/pricing-rules/page.tsx","utf8");
  const actions=readFileSync("src/app/actions/pricingRules/pricingRules.ts","utf8");
  const component=readFileSync("src/features/pricingRules/PricingRulesManagement.tsx","utf8");
  it("allows owners, admins, and office users to manage while crew remains read only",()=>{
    expect(page).toContain('["Owner","Admin","Office"].includes(context.role)');
    expect(actions).toContain('requireCompanyRole("Owner","Admin","Office")');
    expect(component).toContain("read only for your role");
  });
  it("uses desktop tables, mobile cards, and accessible touch targets",()=>{
    expect(component).toContain("hidden overflow-hidden");
    expect(component).toContain("md:hidden");
    expect(component).toContain("min-h-11");
    expect(component).toContain("aria-label");
  });
  it("exposes estimator controls without granting Crew mutation access",()=>{
    expect(actions).toContain('requireCompanyRole("Owner","Admin","Manager","Office")');
    expect(actions).not.toContain('"Crew"');
  });
});
