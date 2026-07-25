import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260810120000_business_finance_foundation/migration.sql",
  ),
  "utf8",
);

describe("finance schema contract", () => {
  it("normalizes the required tenant-scoped records", () => {
    for (const model of [
      "ExpenseCategory",
      "Vendor",
      "BusinessExpense",
      "ExpenseAllocation",
      "FinanceDocument",
      "RecurringExpense",
      "ManualIncomeAdjustment",
      "FinancialPeriod",
      "ExpenseRevision",
    ]) {
      expect(schema).toContain(`model ${model}`);
    }
    expect(schema.match(/companyId\s+String/g)?.length).toBeGreaterThan(20);
  });

  it("prevents duplicate authoritative sources and recurring drafts", () => {
    expect(schema).toContain(
      "@@unique([companyId, sourceType, sourceRecordId])",
    );
    expect(migration).toContain(
      "business_expenses_companyId_sourceType_sourceRecordId_key",
    );
  });

  it("preserves history with restrictive finance foreign keys", () => {
    expect(migration).toContain(
      'REFERENCES "business_expenses"("id") ON DELETE RESTRICT',
    );
    expect(schema).toContain("previousValues");
    expect(schema).toContain("revisedValues");
  });
});
