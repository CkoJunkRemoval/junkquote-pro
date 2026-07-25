import "server-only";
import type { Prisma, TaxDocumentCategory } from "@/generated/prisma/client";
import { createCsv } from "@/lib/finance/exports";
import { prisma } from "@/lib/prisma";
import { createZip } from "./zip";

export const standardChecklist = [
  ["receipts-complete", "Receipts complete"],
  ["expenses-reviewed", "Expenses reviewed"],
  ["periods-locked", "Reporting periods locked"],
  ["payroll-reviewed", "Payroll reviewed"],
  ["mileage-reviewed", "Mileage reviewed"],
  ["assets-reviewed", "Asset purchases reviewed"],
  ["vendors-reviewed", "Vendor records reviewed"],
  ["accountant-package", "Accountant package generated"],
] as const;

export function taxYearRange(year: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2200) throw new Error("Invalid tax year.");
  return { from: new Date(Date.UTC(year, 0, 1)), to: new Date(Date.UTC(year + 1, 0, 1)) };
}

async function mileageSummary(companyId: string, year: number) {
  const { from, to } = taxYearRange(year);
  const assets = await prisma.fleetAsset.findMany({
    where: { companyId, category: "Vehicle" },
    select: {
      id: true, name: true,
      mileageEntries: {
        where: { recordedAt: { lt: to }, voidedAt: null },
        orderBy: [{ recordedAt: "asc" }, { createdAt: "asc" }],
        select: { odometerMiles: true, recordedAt: true, source: true, jobId: true, maintenanceRecordId: true },
      },
    },
  });
  return assets.map((asset) => {
    let previous: number | undefined;
    let jobMiles = 0, maintenanceMiles = 0, unknownMiles = 0;
    for (const entry of asset.mileageEntries) {
      const delta = previous == null ? 0 : Math.max(0, entry.odometerMiles - previous);
      previous = entry.odometerMiles;
      if (entry.recordedAt < from) continue;
      if (entry.jobId || entry.source === "Job") jobMiles += delta;
      else if (entry.maintenanceRecordId || entry.source === "Service") maintenanceMiles += delta;
      else unknownMiles += delta;
    }
    return { assetId: asset.id, asset: asset.name, jobMiles, maintenanceMiles, dumpRunMiles: 0, personalUseMiles: 0, unknownMiles, totalBusinessMiles: jobMiles + maintenanceMiles + unknownMiles };
  });
}

export async function getTaxCenterData(companyId: string, year: number) {
  const { from, to } = taxYearRange(year);
  const [payments, expenses, fuel, payroll, assets, vendors, documents, periods, mileage, checklist] = await Promise.all([
    prisma.payment.aggregate({ where: { companyId, providerStatus: "Captured", paymentDate: { gte: from, lt: to } }, _sum: { amount: true } }),
    prisma.businessExpense.findMany({
      where: { companyId, transactionDate: { gte: from, lt: to } },
      select: { id: true, totalCents: true, reviewStatus: true, vendorId: true, category: { select: { name: true } }, documents: { where: { category: "Receipt" }, select: { id: true } } },
    }),
    prisma.fuelEntry.aggregate({ where: { companyId, transactionAt: { gte: from, lt: to } }, _sum: { totalCostCents: true, gallons: true } }),
    prisma.payPeriod.findMany({
      where: { companyId, startDate: { gte: from, lt: to } },
      orderBy: { startDate: "asc" },
      include: { timesheets: { include: { employee: { select: { firstName: true, lastName: true } } } } },
    }),
    prisma.fleetAsset.findMany({
      where: { companyId, purchaseDate: { gte: from, lt: to }, purchasePriceCents: { not: null } },
      orderBy: { purchaseDate: "asc" },
      select: { id: true, name: true, type: true, purchaseDate: true, purchasePriceCents: true, status: true, documents: { take: 1, select: { id: true } }, financeDocuments: { where: { category: "Receipt" }, take: 1, select: { id: true } } },
    }),
    prisma.vendor.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, expenses: { where: { transactionDate: { gte: from, lt: to }, reviewStatus: "Approved" }, select: { totalCents: true, category: { select: { name: true } }, documents: { where: { category: "Receipt" }, select: { id: true } } } } },
    }),
    prisma.taxDocument.findMany({ where: { companyId, taxYear: year }, orderBy: { createdAt: "desc" } }),
    prisma.financialPeriod.findMany({ where: { companyId, startDate: { gte: from, lt: to } }, orderBy: { startDate: "asc" } }),
    mileageSummary(companyId, year),
    ensureChecklist(companyId, year, "system"),
  ]);
  const approved = expenses.filter((expense) => expense.reviewStatus === "Approved");
  const vendorSummary = vendors.map((vendor) => ({
    id: vendor.id, name: vendor.name,
    totalCents: vendor.expenses.reduce((sum, expense) => sum + expense.totalCents, 0),
    transactionCount: vendor.expenses.length,
    missingReceipts: vendor.expenses.filter((expense) => !expense.documents.length).length,
    categories: [...new Set(vendor.expenses.map((expense) => expense.category.name))].join(", "),
  })).filter((vendor) => vendor.transactionCount > 0);
  return {
    year,
    summary: {
      revenueCents: Math.round((payments._sum?.amount ?? 0) * 100),
      approvedExpenseCents: approved.reduce((sum, expense) => sum + expense.totalCents, 0),
      fuelCents: fuel._sum.totalCostCents ?? 0,
      fuelGallons: fuel._sum.gallons ?? 0,
      missingReceipts: approved.filter((expense) => !expense.documents.length).length,
      uncategorizedExpenses: expenses.filter((expense) => expense.category.name.toLowerCase().includes("uncategor")).length,
      awaitingDocuments: documents.filter((document) => document.reviewStatus === "AwaitingReview").length,
      assetPurchaseCents: assets.reduce((sum, asset) => sum + (asset.purchasePriceCents ?? 0), 0),
      payrollPeriods: payroll.length,
      totalBusinessMiles: mileage.reduce((sum, row) => sum + row.totalBusinessMiles, 0),
      periodsLocked: periods.length > 0 && periods.every((period) => period.status === "Locked"),
    },
    expenses, payroll, assets, vendors: vendorSummary, documents, periods, mileage, checklist,
  };
}

export async function ensureChecklist(companyId: string, taxYear: number, userId: string) {
  await prisma.taxChecklistItem.createMany({
    data: standardChecklist.map(([key, label]) => ({ companyId, taxYear, key, label, createdById: userId })),
    skipDuplicates: true,
  });
  return prisma.taxChecklistItem.findMany({ where: { companyId, taxYear }, orderBy: [{ isCustom: "asc" }, { createdAt: "asc" }] });
}

export async function addChecklistItem(companyId: string, userId: string, taxYear: number, label: string) {
  if (!label.trim()) throw new Error("Checklist label is required.");
  const item = await prisma.taxChecklistItem.create({ data: { companyId, taxYear, key: `custom-${crypto.randomUUID()}`, label: label.trim(), isCustom: true, createdById: userId } });
  await audit(companyId, userId, "tax.checklist.created", "TaxChecklistItem", item.id);
  return item;
}

export async function toggleChecklistItem(companyId: string, userId: string, id: string, completed: boolean) {
  const existing = await prisma.taxChecklistItem.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!existing) throw new Error("Checklist item not found.");
  const item = await prisma.taxChecklistItem.update({ where: { id }, data: { completed, completedAt: completed ? new Date() : null, completedById: completed ? userId : null } });
  await audit(companyId, userId, "tax.checklist.updated", "TaxChecklistItem", id, { completed });
  return item;
}

export async function createTaxDocument(companyId: string, userId: string, input: { id: string; taxYear: number; category: TaxDocumentCategory; title: string; storageKey: string; originalFilename: string; mimeType: string; sizeBytes: number; notes?: string }) {
  const document = await prisma.taxDocument.create({ data: { ...input, companyId, uploadedById: userId } });
  await audit(companyId, userId, "tax.document.uploaded", "TaxDocument", document.id, { category: document.category, taxYear: document.taxYear });
  return document;
}

export async function reviewTaxDocument(companyId: string, userId: string, id: string) {
  const found = await prisma.taxDocument.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!found) throw new Error("Tax document not found.");
  const document = await prisma.taxDocument.update({ where: { id }, data: { reviewStatus: "Reviewed", reviewedAt: new Date(), reviewedById: userId } });
  await audit(companyId, userId, "tax.document.reviewed", "TaxDocument", id);
  return document;
}

export async function getTaxDocument(companyId: string, id: string) {
  return prisma.taxDocument.findFirst({ where: { id, companyId } });
}

export async function createAccountantPackage(companyId: string, userId: string, year: number) {
  const data = await getTaxCenterData(companyId, year);
  const csv = (columns: string[], rows: Record<string, unknown>[]) => createCsv(columns, rows);
  const files = [
    { name: "income.csv", content: csv(["year", "collectedRevenueCents"], [{ year, collectedRevenueCents: data.summary.revenueCents }]) },
    { name: "expenses.csv", content: csv(["id", "totalCents", "reviewStatus", "category", "receiptComplete"], data.expenses.map((x) => ({ id: x.id, totalCents: x.totalCents, reviewStatus: x.reviewStatus, category: x.category.name, receiptComplete: x.documents.length > 0 }))) },
    { name: "mileage.csv", content: csv(["assetId", "asset", "totalBusinessMiles", "jobMiles", "maintenanceMiles", "dumpRunMiles", "personalUseMiles", "unknownMiles"], data.mileage) },
    { name: "payroll-summary.csv", content: csv(["periodId", "startDate", "endDate", "status", "regularMinutes", "overtimeMinutes"], data.payroll.map((p) => ({ periodId: p.id, startDate: p.startDate, endDate: p.endDate, status: p.status, regularMinutes: p.timesheets.reduce((s, t) => s + t.regularMinutes, 0), overtimeMinutes: p.timesheets.reduce((s, t) => s + t.overtimeMinutes, 0) }))) },
    { name: "vendor-summary.csv", content: csv(["id", "name", "totalCents", "transactionCount", "missingReceipts", "categories"], data.vendors) },
    { name: "asset-purchases.csv", content: csv(["id", "name", "type", "purchaseDate", "purchasePriceCents", "status", "receiptComplete"], data.assets.map((x) => ({ ...x, receiptComplete: x.documents.length + x.financeDocuments.length > 0 }))) },
    { name: "receipt-index.csv", content: csv(["expenseId", "receiptComplete"], data.expenses.map((x) => ({ expenseId: x.id, receiptComplete: x.documents.length > 0 }))) },
    { name: "document-manifest.csv", content: csv(["id", "taxYear", "category", "title", "filename", "reviewStatus", "createdAt"], data.documents.map((x) => ({ id: x.id, taxYear: x.taxYear, category: x.category, title: x.title, filename: x.originalFilename, reviewStatus: x.reviewStatus, createdAt: x.createdAt }))) },
  ];
  await audit(companyId, userId, "tax.accountant_package.exported", "TaxYear", String(year), { files: files.map((file) => file.name) });
  return createZip(files);
}

async function audit(companyId: string, userId: string, eventType: string, entityType: string, entityId: string, metadata?: Record<string, unknown>) {
  await prisma.auditEvent.create({ data: { companyId, actingUserId: userId, eventType, entityType, entityId, metadata: metadata as Prisma.InputJsonValue | undefined } });
}
