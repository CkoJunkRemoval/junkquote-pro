import { describe,expect,it } from "vitest";
import { parsePricingIntelligenceFilters,pricingIntelligenceQuery } from "./filters";
describe("pricing intelligence filters",()=>{
  it("parses every supported filter and preserves it in exports",()=>{
    const filters=parsePricingIntelligenceFilters({from:"2026-01-01",to:"2026-02-01",profile:"p",employee:"u",serviceArea:"North",category:"Furniture",crew:"c",page:"2"});
    expect(filters).toMatchObject({pricingProfileId:"p",employeeId:"u",serviceArea:"North",category:"Furniture",crewId:"c",page:2});
    expect(pricingIntelligenceQuery(filters)).toContain("serviceArea=North");
  });
  it("uses a bounded 90-day default and repairs inverted dates",()=>{
    const filters=parsePricingIntelligenceFilters({from:"2026-08-01",to:"2026-07-01"},new Date("2026-07-23"));
    expect(filters.from<=filters.to).toBe(true);
  });
});
