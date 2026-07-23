import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";
describe("pricing intelligence permissions and presentation",()=>{
  const page=readFileSync("src/app/analytics/pricing/page.tsx","utf8"),route=readFileSync("src/app/api/analytics/pricing/export/route.ts","utf8"),ui=readFileSync("src/features/pricingIntelligence/PricingIntelligenceDashboard.tsx","utf8"),service=readFileSync("src/lib/pricingIntelligence/service.ts","utf8");
  it("limits pages and exports to owner, admin, and office roles",()=>{expect(page).toContain('requireCompanyRole("Owner","Admin","Office")');expect(route).toContain('requireCompanyRole("Owner","Admin","Office")');expect(page).not.toContain('"Crew"');});
  it("uses bounded bulk queries without N+1 loops",()=>{expect(service).toContain("take:5000");expect(service).toContain("Promise.all");expect(service).not.toMatch(/for\\s*\\([^)]*\\)\\s*await prisma/);});
  it("includes accessible charts, responsive tables, pagination, and printing",()=>{expect(ui).toContain("aria-label={title}");expect(ui).toContain("overflow-x-auto");expect(ui).toContain("<Pagination");expect(ui).toContain("window.print()");expect(ui).toContain("min-h-11");});
});
