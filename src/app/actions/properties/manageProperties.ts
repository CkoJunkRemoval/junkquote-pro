"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyRole } from "@/lib/auth/tenant";
import {
  createManagedProperty, deleteProperty, findDuplicateProperty, setPropertyArchived,
  updateManagedProperty, type PropertyInput,
} from "@/lib/properties/properties";

async function editor() {
  const context = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return { companyId: context.companyId, userId: context.user.id };
}
export async function checkDuplicatePropertyAction(input: PropertyInput, excludeId?: string) {
  const { companyId } = await editor();
  return findDuplicateProperty(companyId, input, excludeId);
}
export async function createManagedPropertyAction(input: PropertyInput) {
  const context = await editor();
  const result = await createManagedProperty(context.companyId, context.userId, input);
  revalidatePath("/properties");
  return result;
}
export async function updateManagedPropertyAction(propertyId: string, input: PropertyInput) {
  const context = await editor();
  const result = await updateManagedProperty(context.companyId, context.userId, propertyId, input);
  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
  return result;
}
export async function archivePropertyAction(propertyId: string, archived: boolean) {
  const context = await editor();
  const result = await setPropertyArchived(context.companyId, context.userId, propertyId, archived);
  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
  return result;
}
export async function deletePropertyAction(propertyId: string) {
  const context = await editor();
  const result = await deleteProperty(context.companyId, context.userId, propertyId);
  revalidatePath("/properties");
  return result;
}
