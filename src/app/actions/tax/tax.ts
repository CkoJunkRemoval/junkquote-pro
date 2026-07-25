"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { TaxDocumentCategory } from "@/generated/prisma/client";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireFinanceCapability } from "@/lib/finance/permissions";
import { lockFinancialPeriod, unlockFinancialPeriod } from "@/lib/finance/service";
import { requireTaxCapability } from "@/lib/tax/permissions";
import { addChecklistItem, createTaxDocument, reviewTaxDocument, toggleChecklistItem } from "@/lib/tax/service";
import { saveTaxDocument } from "@/lib/storage/taxDocumentStorage";

const text = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

async function context(capability: Parameters<typeof requireTaxCapability>[1]) {
  const tenant = await requireTenantContext();
  requireTaxCapability(tenant.role, capability);
  return tenant;
}

export async function uploadTaxDocumentAction(formData: FormData) {
  const tenant = await context("tax.documents.manage");
  const file = formData.get("document");
  if (!(file instanceof File) || !file.size) throw new Error("A document is required.");
  const id = randomUUID();
  const stored = await saveTaxDocument(tenant.companyId, id, file);
  await createTaxDocument(tenant.companyId, tenant.user.id, {
    id, taxYear: Number(text(formData, "taxYear")), category: text(formData, "category") as TaxDocumentCategory,
    title: text(formData, "title"), storageKey: stored.storageKey, originalFilename: file.name,
    mimeType: file.type, sizeBytes: stored.sizeBytes, notes: text(formData, "notes") || undefined,
  });
  revalidatePath("/tax");
  revalidatePath("/tax/documents");
}

export async function reviewTaxDocumentAction(formData: FormData) {
  const tenant = await context("tax.documents.manage");
  await reviewTaxDocument(tenant.companyId, tenant.user.id, text(formData, "documentId"));
  revalidatePath("/tax/documents");
}

export async function addTaxChecklistItemAction(formData: FormData) {
  const tenant = await context("tax.checklist.manage");
  await addChecklistItem(tenant.companyId, tenant.user.id, Number(text(formData, "taxYear")), text(formData, "label"));
  revalidatePath("/tax/checklist");
}

export async function toggleTaxChecklistItemAction(formData: FormData) {
  const tenant = await context("tax.checklist.manage");
  await toggleChecklistItem(tenant.companyId, tenant.user.id, text(formData, "itemId"), text(formData, "completed") === "true");
  revalidatePath("/tax/checklist");
}

export async function taxPeriodAction(formData: FormData) {
  const tenant = await context("tax.periods.manage");
  requireFinanceCapability(tenant.role, text(formData, "intent") === "unlock" ? "finance.periods.unlock" : "finance.periods.manage");
  const id = text(formData, "periodId");
  if (text(formData, "intent") === "lock") await lockFinancialPeriod(tenant.companyId, tenant.user.id, id);
  else await unlockFinancialPeriod(tenant.companyId, tenant.user.id, id, text(formData, "reason"));
  revalidatePath("/tax");
}
