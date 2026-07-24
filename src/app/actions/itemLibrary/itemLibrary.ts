"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyRole, requireTenantContext } from "@/lib/auth/tenant";
import {
  bulkUpdateItemLibrary, createItemLibraryItem, deleteItemLibraryItem, duplicateItemLibraryItem,
  exportItemLibrary, importItemLibrary, listEffectiveEstimateItems, listItemLibrary,
  previewItemImport, setItemLibraryActive, updateItemLibraryItem, upsertItemOverride,
} from "@/lib/itemLibrary/itemLibrary";
import { applyStandardLibrary, previewStandardLibrary } from "@/lib/itemLibrary/standardLibrary";
import type { BulkItemUpdate, ItemLibraryInput, ItemLibraryQuery, ItemOverrideInput } from "@/lib/itemLibrary/types";

async function manager() {
  const context = await requireCompanyRole("Owner", "Admin", "Office");
  return { companyId: context.companyId, userId: context.user.id };
}
const refresh = () => revalidatePath("/settings/item-library");

export async function listItemLibraryAction(query: ItemLibraryQuery) {
  const { companyId } = await requireTenantContext();
  return listItemLibrary(companyId, query);
}
export async function listEffectiveEstimateItemsAction(pricingProfileId: string) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return listEffectiveEstimateItems(companyId, pricingProfileId);
}
export async function createItemLibraryItemAction(input: ItemLibraryInput) {
  const context = await manager(); const result = await createItemLibraryItem(context.companyId, context.userId, input); refresh(); return result;
}
export async function updateItemLibraryItemAction(id: string, input: ItemLibraryInput) {
  const context = await manager(); const result = await updateItemLibraryItem(context.companyId, context.userId, id, input); refresh(); return result;
}
export async function duplicateItemLibraryItemAction(id: string) {
  const context = await manager(); const result = await duplicateItemLibraryItem(context.companyId, context.userId, id); refresh(); return result;
}
export async function setItemLibraryActiveAction(ids: string[], active: boolean) {
  const context = await manager(); const result = await setItemLibraryActive(context.companyId, context.userId, ids, active); refresh(); return result;
}
export async function bulkUpdateItemLibraryAction(input: BulkItemUpdate) {
  const context = await manager(); const result = await bulkUpdateItemLibrary(context.companyId, context.userId, input); refresh(); return result;
}
export async function deleteItemLibraryItemAction(id: string) {
  const context = await manager(); const result = await deleteItemLibraryItem(context.companyId, context.userId, id); refresh(); return result;
}
export async function upsertItemOverrideAction(pricingProfileId: string, itemLibraryId: string, input: ItemOverrideInput) {
  const context = await manager(); const result = await upsertItemOverride(context.companyId, context.userId, pricingProfileId, itemLibraryId, input); refresh(); return result;
}
export async function previewItemImportAction(csv: string) {
  const { companyId } = await manager(); return previewItemImport(companyId, csv);
}
export async function importItemLibraryAction(csv: string) {
  const context = await manager(); const result = await importItemLibrary(context.companyId, context.userId, csv); refresh(); return result;
}
export async function exportItemLibraryAction() {
  const { companyId } = await requireTenantContext(); return exportItemLibrary(companyId);
}
export async function previewStandardLibraryAction() {
  const context = await manager();
  return previewStandardLibrary(context.companyId);
}
export async function applyStandardLibraryAction(clearOverrides: boolean) {
  const context = await manager();
  const result = await applyStandardLibrary(context.companyId, context.userId, { clearOverrides });
  refresh();
  return result;
}
