import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("finance visual and security contracts", () => {
  it("uses the branded dark shell and minimum touch targets", () => {
    const shell = read("src/features/finance/FinanceShell.tsx");
    const expense = read("src/app/finance/expenses/new/page.tsx");
    expect(expense).toContain("glass-card");
    expect(shell).toContain("min-h-11");
    expect(shell).toContain("overflow-x-auto");
    expect(expense).toContain("ui-button--primary");
    expect(expense).toContain("financeField");
  });

  it("exposes every required allocation target and approved revision controls", () => {
    const allocation = read(
      "src/features/finance/ExpenseAllocationForm.tsx",
    );
    const detail = read("src/app/finance/expenses/[id]/page.tsx");
    for (const target of [
      "Job",
      "Employee",
      "Vehicle",
      "Trailer",
      "Equipment",
      "Customer",
      "Crew",
    ])
      expect(allocation + detail).toContain(target);
    expect(detail).toContain("Correct approved expense");
    expect(detail).toContain("Revision history");
    expect(detail).toContain("reviseExpenseAction");
  });

  it("renders all specified dashboard charts and accountant exports", () => {
    const dashboard = read("src/app/finance/page.tsx");
    const exportRoute = read("src/app/api/finance/exports/[kind]/route.ts");
    expect(dashboard).toContain("Income versus expenses");
    expect(dashboard).toContain("Operational profit trend");
    expect(dashboard).toContain("Expense categories");
    expect(dashboard).toContain("Top job-cost drivers");
    for (const kind of [
      "expenses",
      "allocations",
      "vendors",
      "documents",
      "recurring",
      "income",
      "job-costs",
      "periods",
      "revisions",
      "operational-sources",
      "asset-purchases",
    ])
      expect(exportRoute).toContain(`"${kind}"`);
  });

  it("keeps private documents behind authenticated tenant authorization", () => {
    const route = read("src/app/api/finance/documents/[id]/route.ts");
    expect(route).toContain("requireTenantContext");
    expect(route).toContain("finance.receipts.view");
    expect(route).toContain("private, no-store");
    expect(route).not.toContain("storageKey:");
  });

  it("keeps browser-only tooling outside the production graph", () => {
    const tsconfig = read("tsconfig.json");
    expect(tsconfig).toContain('scripts/*browser-review*.ts');
    expect(tsconfig).toContain("offline-browser-release-gate");
  });
});
