import { describe,expect,it } from "vitest";
import { pricingIntelligenceRows,renderPricingIntelligenceCsv,renderPricingIntelligencePdf } from "./export";
import { calculatePricingIntelligence } from "./calculations";
describe("pricing intelligence exports",()=>{
  it("renders complete CSV and PDF reports",()=>{
    const data=calculatePricingIntelligence([],[]);
    const rows=pricingIntelligenceRows(data),csv=renderPricingIntelligenceCsv(rows),pdf=renderPricingIntelligencePdf(rows);
    expect(csv).toContain("Pricing Intelligence Report");
    expect(csv).toContain("Pricing Health");
    expect(pdf.subarray(0,4).toString()).toBe("%PDF");
  });
});
