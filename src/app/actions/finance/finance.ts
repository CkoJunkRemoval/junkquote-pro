"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  ExpenseAllocationTarget,
  ExpenseSourceType,
  RecurringExpenseCadence,
} from "@/generated/prisma/client";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireFinanceCapability } from "@/lib/finance/permissions";
import {
  allocateExpense,
  approveExpense,
  attachFinanceDocument,
  createDraftExpense,
  createFinancialPeriod,
  createRecurringExpense,
  createVendor,
  exportExpensesCsv,
  lockFinancialPeriod,
  rejectExpense,
  reviseApprovedExpense,
  submitExpense,
  unlockFinancialPeriod,
  voidExpense,
} from "@/lib/finance/service";
import { saveFinanceDocument } from "@/lib/storage/financeDocumentStorage";

const text = (data: FormData, name: string) =>
  String(data.get(name) ?? "").trim();
const optional = (data: FormData, name: string) => text(data, name) || undefined;
const cents = (data: FormData, name: string) =>
  Math.round(Number(data.get(name) ?? 0) * 100);

async function context(capability: Parameters<typeof requireFinanceCapability>[1]) {
  const tenant = await requireTenantContext();
  requireFinanceCapability(tenant.role, capability);
  return tenant;
}

export async function createExpenseAction(formData: FormData) {
  const tenant = await context("finance.expenses.manage");
  const expense = await createDraftExpense(tenant.companyId, tenant.user.id, {
    transactionDate: new Date(text(formData, "transactionDate")),
    postingDate: optional(formData, "postingDate")
      ? new Date(text(formData, "postingDate"))
      : undefined,
    vendorId: optional(formData, "vendorId"),
    categoryId: text(formData, "categoryId"),
    description: text(formData, "description"),
    subtotalCents: cents(formData, "subtotal"),
    taxCents: cents(formData, "tax"),
    tipCents: cents(formData, "tip"),
    feeCents: cents(formData, "fee"),
    totalCents: cents(formData, "total"),
    currencyCode: text(formData, "currencyCode") || "USD",
    paymentMethod: optional(formData, "paymentMethod"),
    transactionReference: optional(formData, "transactionReference"),
    businessUsePercentage: optional(formData, "businessUsePercentage")
      ? Number(text(formData, "businessUsePercentage"))
      : undefined,
    sourceType: (text(formData, "sourceType") || "Manual") as ExpenseSourceType,
    notes: optional(formData, "notes"),
  });
  const file = formData.get("receipt");
  if (file instanceof File && file.size > 0) {
    const documentId = randomUUID();
    const stored = await saveFinanceDocument(
      tenant.companyId,
      documentId,
      file,
    );
    await attachFinanceDocument(tenant.companyId, tenant.user.id, {
      id: documentId,
      category: "Receipt",
      expenseId: expense.id,
      vendorId: expense.vendorId ?? undefined,
      storageKey: stored.storageKey,
      originalFilename: file.name,
      mimeType: file.type,
      sizeBytes: stored.sizeBytes,
      transactionDate: expense.transactionDate,
    });
  }
  if (formData.get("intent") === "submit") {
    await submitExpense(tenant.companyId, tenant.user.id, expense.id);
  }
  revalidatePath("/finance");
  revalidatePath("/finance/expenses");
  redirect(`/finance/expenses/${expense.id}`);
}

export async function expenseTransitionAction(formData: FormData) {
  const intent = text(formData, "intent");
  const capability =
    intent === "approve" || intent === "reject"
      ? "finance.expenses.approve"
      : "finance.expenses.manage";
  const tenant = await context(capability);
  const id = text(formData, "expenseId");
  const reason = text(formData, "reason");
  if (intent === "submit")
    await submitExpense(tenant.companyId, tenant.user.id, id);
  if (intent === "approve")
    await approveExpense(tenant.companyId, tenant.user.id, id);
  if (intent === "reject")
    await rejectExpense(tenant.companyId, tenant.user.id, id, reason);
  if (intent === "void")
    await voidExpense(tenant.companyId, tenant.user.id, id, reason);
  revalidatePath("/finance");
  revalidatePath("/finance/expenses");
  revalidatePath(`/finance/expenses/${id}`);
}

export async function attachReceiptAction(formData: FormData) {
  const tenant = await context("finance.receipts.manage");
  const expenseId = text(formData, "expenseId");
  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0)
    throw new Error("A receipt file is required.");
  const documentId = randomUUID();
  const stored = await saveFinanceDocument(
    tenant.companyId,
    documentId,
    file,
  );
  await attachFinanceDocument(tenant.companyId, tenant.user.id, {
    id: documentId,
    category: "Receipt",
    expenseId,
    storageKey: stored.storageKey,
    originalFilename: file.name,
    mimeType: file.type,
    sizeBytes: stored.sizeBytes,
  });
  revalidatePath(`/finance/expenses/${expenseId}`);
  revalidatePath("/finance/receipts");
}

export async function reviseExpenseAction(formData: FormData) {
  const tenant = await context("finance.expenses.approve");
  const expenseId = text(formData, "expenseId");
  await reviseApprovedExpense(
    tenant.companyId,
    tenant.user.id,
    expenseId,
    text(formData, "reason"),
    {
      transactionDate: new Date(text(formData, "transactionDate")),
      vendorId: optional(formData, "vendorId"),
      categoryId: text(formData, "categoryId"),
      description: text(formData, "description"),
      subtotalCents: cents(formData, "subtotal"),
      taxCents: cents(formData, "tax"),
      tipCents: cents(formData, "tip"),
      feeCents: cents(formData, "fee"),
      totalCents: cents(formData, "total"),
      paymentMethod: optional(formData, "paymentMethod"),
      transactionReference: optional(formData, "transactionReference"),
      notes: optional(formData, "notes"),
    },
  );
  revalidatePath("/finance");
  revalidatePath("/finance/expenses");
  revalidatePath(`/finance/expenses/${expenseId}`);
}

export async function allocateExpenseAction(formData: FormData) {
  const tenant = await context("finance.expenses.manage");
  const expenseId = text(formData, "expenseId");
  const targetType = text(formData, "targetType") as ExpenseAllocationTarget;
  const targetId = text(formData, "targetId");
  await allocateExpense(tenant.companyId, tenant.user.id, expenseId, {
    targetType,
    allocatedAmountCents: cents(formData, "amount"),
    jobId: targetType === "Job" ? targetId : undefined,
    customerId: targetType === "Customer" ? targetId : undefined,
    employeeId: targetType === "Employee" ? targetId : undefined,
    crewId: targetType === "Crew" ? targetId : undefined,
    assetId: targetType === "Asset" ? targetId : undefined,
    locationReference: targetType === "Location" ? targetId : undefined,
    departmentReference: targetType === "Department" ? targetId : undefined,
    accountingClass: targetType === "AccountingClass" ? targetId : undefined,
    notes: optional(formData, "notes"),
  });
  revalidatePath(`/finance/expenses/${expenseId}`);
}

export async function createVendorAction(formData: FormData) {
  const tenant = await context("finance.vendors.manage");
  await createVendor(tenant.companyId, tenant.user.id, {
    name: text(formData, "name"),
    type: text(formData, "type"),
    contactName: optional(formData, "contactName"),
    email: optional(formData, "email"),
    phone: optional(formData, "phone"),
    website: optional(formData, "website"),
    address: optional(formData, "address"),
    city: optional(formData, "city"),
    state: optional(formData, "state"),
    postalCode: optional(formData, "postalCode"),
    paymentTerms: optional(formData, "paymentTerms"),
    notes: optional(formData, "notes"),
  });
  revalidatePath("/finance/vendors");
}

export async function createRecurringExpenseAction(formData: FormData) {
  const tenant = await context("finance.recurring.manage");
  await createRecurringExpense(tenant.companyId, tenant.user.id, {
    vendorId: optional(formData, "vendorId"),
    categoryId: text(formData, "categoryId"),
    description: text(formData, "description"),
    cadence: text(formData, "cadence") as RecurringExpenseCadence,
    customCadenceDays: optional(formData, "customCadenceDays")
      ? Number(text(formData, "customCadenceDays"))
      : undefined,
    expectedAmountCents: cents(formData, "expectedAmount"),
    nextDueDate: new Date(text(formData, "nextDueDate")),
    startDate: new Date(text(formData, "startDate")),
    endDate: optional(formData, "endDate")
      ? new Date(text(formData, "endDate"))
      : undefined,
    autoCreateDraft: formData.get("autoCreateDraft") === "on",
    reminderLeadDays: Number(text(formData, "reminderLeadDays") || 7),
    paymentMethod: optional(formData, "paymentMethod"),
    linkedAssetId: optional(formData, "linkedAssetId"),
    notes: optional(formData, "notes"),
  });
  revalidatePath("/finance/recurring");
}

export async function createFinancialPeriodAction(formData: FormData) {
  const tenant = await context("finance.periods.manage");
  await createFinancialPeriod(tenant.companyId, tenant.user.id, {
    name: text(formData, "name"),
    startDate: new Date(text(formData, "startDate")),
    endDate: new Date(text(formData, "endDate")),
  });
  revalidatePath("/finance/periods");
}

export async function periodTransitionAction(formData: FormData) {
  const intent = text(formData, "intent");
  const tenant = await context(
    intent === "unlock" ? "finance.periods.unlock" : "finance.periods.manage",
  );
  const id = text(formData, "periodId");
  if (intent === "lock")
    await lockFinancialPeriod(tenant.companyId, tenant.user.id, id);
  if (intent === "unlock")
    await unlockFinancialPeriod(
      tenant.companyId,
      tenant.user.id,
      id,
      text(formData, "reason"),
    );
  revalidatePath("/finance/periods");
}

export async function exportExpensesAction() {
  const tenant = await context("finance.exports");
  return exportExpensesCsv(tenant.companyId, tenant.user.id);
}
