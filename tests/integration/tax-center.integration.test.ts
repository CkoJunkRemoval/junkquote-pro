import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { prisma } from "@/lib/prisma";
import {
  addChecklistItem,
  createAccountantPackage,
  createTaxDocument,
  ensureChecklist,
  getTaxDocument,
  toggleChecklistItem,
} from "@/lib/tax/service";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";

describe("tax center integration", () => {
  beforeEach(resetIntegrationDatabase);
  afterAll(resetIntegrationDatabase);

  it("keeps vault metadata and checklist records tenant scoped", async () => {
    const { a, b } = await createTenantFixtures();
    const document = await createTaxDocument(a.company.id, a.user.id, {
      id: crypto.randomUUID(),
      taxYear: 2026,
      category: "TaxReturn",
      title: "Prepared return",
      storageKey: `tax-documents/${a.company.id}/doc/return.pdf`,
      originalFilename: "return.pdf",
      mimeType: "application/pdf",
      sizeBytes: 42,
    });
    expect(await getTaxDocument(a.company.id, document.id)).toBeTruthy();
    expect(await getTaxDocument(b.company.id, document.id)).toBeNull();

    const standard = await ensureChecklist(a.company.id, 2026, a.user.id);
    expect(standard).toHaveLength(8);
    const custom = await addChecklistItem(a.company.id, a.user.id, 2026, "Confirm CPA appointment");
    await toggleChecklistItem(a.company.id, a.user.id, custom.id, true);
    expect(await prisma.taxChecklistItem.findFirst({ where: { id: custom.id, companyId: a.company.id } })).toMatchObject({ completed: true, isCustom: true });
    await expect(toggleChecklistItem(b.company.id, b.user.id, custom.id, true)).rejects.toThrow("not found");
  });

  it("builds and audits the complete accountant package", async () => {
    const { a } = await createTenantFixtures();
    const archive = await createAccountantPackage(a.company.id, a.user.id, 2026);
    const text = new TextDecoder().decode(archive);
    for (const name of ["income.csv", "expenses.csv", "mileage.csv", "payroll-summary.csv", "vendor-summary.csv", "asset-purchases.csv", "receipt-index.csv", "document-manifest.csv"])
      expect(text).toContain(name);
    expect(await prisma.auditEvent.findFirst({ where: { companyId: a.company.id, eventType: "tax.accountant_package.exported" } })).toBeTruthy();
  });
});
