import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("live pricing summary presentation",()=>{
  const source=readFileSync("src/components/estimate/EstimateSummary.tsx","utf8");
  it("uses a sticky desktop sidebar and collapsible mobile drawer without hiding the total",()=>{
    expect(source).toContain("xl:sticky");
    expect(source).toContain('aria-expanded={mobileOpen}');
    expect(source).toContain("min-h-14");
    expect(source).toContain("Grand Total");
  });
  it("supports keyboard details, reduced motion, warnings, and change highlighting",()=>{
    expect(source).toContain("<details");
    expect(source).toContain("focus-visible:ring-2");
    expect(source).toContain("motion-safe:");
    expect(source).toContain("Pricing warnings");
    expect(source).toContain("Changed from");
  });
});
