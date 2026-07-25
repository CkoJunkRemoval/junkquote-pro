import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("tax center schema contract", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  it("stores only vault metadata and checklist state", () => {
    expect(schema).toContain("model TaxDocument");
    expect(schema).toContain("model TaxChecklistItem");
    expect(schema).not.toContain("model TaxCalculation");
    expect(schema).not.toContain("model TaxFiling");
  });
  it("indexes tenant and tax-year boundaries", () => {
    expect(schema).toContain("@@index([companyId, taxYear, category])");
    expect(schema).toContain("@@unique([companyId, taxYear, key])");
  });
});
