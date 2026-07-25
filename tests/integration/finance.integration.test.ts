import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  allocateExpense,
  approveExpense,
  createDraftExpense,
  createFinancialPeriod,
  createRecurringExpense,
  createVendor,
  generateRecurringDrafts,
  getIncomeSummary,
  exportFinanceCsv,
  listExpenseCategories,
  lockFinancialPeriod,
  rejectExpense,
  submitExpense,
  reviseApprovedExpense,
  voidExpense,
} from "@/lib/finance/service";
import { prisma } from "@/lib/prisma";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";

describe("business finance integration", () => {
  beforeEach(resetIntegrationDatabase);
  afterAll(async () => {
    await resetIntegrationDatabase();
  });

  it("creates tenant-scoped vendors and cents-based expenses", async () => {
    const { a, b } = await createTenantFixtures();
    const [category] = await listExpenseCategories(a.company.id);
    const vendor = await createVendor(a.company.id, a.user.id, {
      name: "North Transfer",
      type: "TRANSFER_STATION",
    });
    const expense = await createDraftExpense(a.company.id, a.user.id, {
      transactionDate: new Date("2026-07-01T12:00:00Z"),
      vendorId: vendor.id,
      categoryId: category.id,
      description: "Disposal run",
      subtotalCents: 10_00,
      taxCents: 80,
      totalCents: 10_80,
    });
    expect(expense).toMatchObject({
      companyId: a.company.id,
      vendorId: vendor.id,
      totalCents: 10_80,
      reviewStatus: "Draft",
    });
    await expect(
      createDraftExpense(b.company.id, b.user.id, {
        transactionDate: new Date(),
        vendorId: vendor.id,
        categoryId: category.id,
        description: "Cross tenant",
        subtotalCents: 100,
        totalCents: 100,
      }),
    ).rejects.toThrow();
  });

  it("enforces lifecycle, allocations, and locked periods", async () => {
    const { a, b } = await createTenantFixtures();
    const [category] = await listExpenseCategories(a.company.id);
    const expense = await createDraftExpense(a.company.id, a.user.id, {
      transactionDate: new Date("2026-07-10T12:00:00Z"),
      categoryId: category.id,
      description: "Job fuel",
      subtotalCents: 50_00,
      totalCents: 50_00,
    });
    await expect(
      allocateExpense(a.company.id, a.user.id, expense.id, {
        targetType: "Job",
        jobId: b.job.id,
        allocatedAmountCents: 10_00,
      }),
    ).rejects.toThrow("target not found");
    await allocateExpense(a.company.id, a.user.id, expense.id, {
      targetType: "Job",
      jobId: a.job.id,
      allocatedAmountCents: 30_00,
    });
    await expect(
      allocateExpense(a.company.id, a.user.id, expense.id, {
        targetType: "Job",
        jobId: a.job.id,
        allocatedAmountCents: 30_00,
      }),
    ).rejects.toThrow("cannot exceed");
    await submitExpense(a.company.id, a.user.id, expense.id);
    await approveExpense(a.company.id, a.user.id, expense.id);
    await reviseApprovedExpense(
      a.company.id,
      a.user.id,
      expense.id,
      "Corrected receipt total",
      {
        subtotalCents: 49_00,
        totalCents: 49_00,
      },
    );
    expect(
      await prisma.expenseRevision.findFirst({
        where: { companyId: a.company.id, expenseId: expense.id },
      }),
    ).toMatchObject({
      revisionNumber: 1,
      reason: "Corrected receipt total",
    });
    const rejected = await createDraftExpense(a.company.id, a.user.id, {
      transactionDate: new Date("2026-07-11T12:00:00Z"),
      categoryId: category.id,
      description: "Needs correction",
      subtotalCents: 10_00,
      totalCents: 10_00,
    });
    await submitExpense(a.company.id, a.user.id, rejected.id);
    await rejectExpense(
      a.company.id,
      a.user.id,
      rejected.id,
      "Missing receipt",
    );
    await voidExpense(
      a.company.id,
      a.user.id,
      rejected.id,
      "Duplicate entry",
    );
    const period = await createFinancialPeriod(a.company.id, a.user.id, {
      name: "July 2026",
      startDate: new Date("2026-07-01T00:00:00Z"),
      endDate: new Date("2026-07-31T23:59:59Z"),
    });
    await lockFinancialPeriod(a.company.id, a.user.id, period.id);
    await expect(
      createDraftExpense(a.company.id, a.user.id, {
        transactionDate: new Date("2026-07-20T12:00:00Z"),
        categoryId: category.id,
        description: "Locked",
        subtotalCents: 100,
        totalCents: 100,
      }),
    ).rejects.toThrow("locked");
  });

  it("exports every implemented accountant record set with deterministic headers", async () => {
    const { a } = await createTenantFixtures();
    await listExpenseCategories(a.company.id);
    const kinds = [
      "expenses",
      "allocations",
      "vendors",
      "categories",
      "documents",
      "recurring",
      "income",
      "job-costs",
      "periods",
      "revisions",
      "operational-sources",
      "asset-purchases",
    ] as const;
    for (const kind of kinds) {
      const csv = await exportFinanceCsv(a.company.id, a.user.id, kind);
      expect(csv.split("\r\n")[0].length).toBeGreaterThan(0);
    }
    expect(
      await prisma.auditEvent.count({
        where: {
          companyId: a.company.id,
          eventType: { startsWith: "finance.export." },
        },
      }),
    ).toBe(kinds.length);
  });

  it("generates recurring drafts idempotently and keeps invoice revenue authoritative", async () => {
    const { a } = await createTenantFixtures();
    const [category] = await listExpenseCategories(a.company.id);
    await createRecurringExpense(a.company.id, a.user.id, {
      categoryId: category.id,
      description: "Monthly software",
      cadence: "Monthly",
      expectedAmountCents: 49_00,
      startDate: new Date("2026-07-01T00:00:00Z"),
      nextDueDate: new Date("2026-07-01T00:00:00Z"),
      autoCreateDraft: true,
    });
    const through = new Date("2026-07-31T23:59:59Z");
    expect(await generateRecurringDrafts(a.company.id, a.user.id, through)).toHaveLength(1);
    expect(await generateRecurringDrafts(a.company.id, a.user.id, through)).toHaveLength(0);
    expect(
      await prisma.businessExpense.count({
        where: { companyId: a.company.id, sourceType: "Subscription" },
      }),
    ).toBe(1);
    const income = await getIncomeSummary(
      a.company.id,
      new Date("2020-01-01T00:00:00Z"),
      new Date("2030-01-01T00:00:00Z"),
    );
    expect(income.invoicedRevenueCents).toBe(10_000);
    expect(income.collectedRevenueCents).toBe(2_500);
    expect(income.outstandingRevenueCents).toBe(7_500);
  });
});
