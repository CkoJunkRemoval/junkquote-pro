"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyRole, requireTenantContext } from "@/lib/auth/tenant";
import {
  changeEstimatePricingProfile, createPricingProfile, deletePricingProfile, duplicatePricingProfile, getActivePricingProfiles,
  listPricingProfiles, setDefaultPricingProfile, setPricingProfileArchived, updatePricingProfile,
} from "@/lib/pricingProfiles/pricingProfiles";
import type { PricingProfileInput } from "@/lib/pricingProfiles/types";

async function manager() {
  const context = await requireCompanyRole("Owner", "Admin", "Office");
  return { companyId: context.companyId, userId: context.user.id };
}
const refresh = () => revalidatePath("/settings/pricing-profiles");

export async function listPricingProfilesAction() {
  const { companyId } = await requireTenantContext();
  return listPricingProfiles(companyId);
}
export async function listActivePricingProfilesAction() {
  const { companyId } = await requireTenantContext();
  return getActivePricingProfiles(companyId);
}
export async function createPricingProfileAction(input: PricingProfileInput) {
  const context = await manager(); const result = await createPricingProfile(context.companyId, context.userId, input); refresh(); return result;
}
export async function updatePricingProfileAction(profileId: string, input: PricingProfileInput) {
  const context = await manager(); const result = await updatePricingProfile(context.companyId, context.userId, profileId, input); refresh(); return result;
}
export async function duplicatePricingProfileAction(profileId: string) {
  const context = await manager(); const result = await duplicatePricingProfile(context.companyId, context.userId, profileId); refresh(); return result;
}
export async function setDefaultPricingProfileAction(profileId: string) {
  const context = await manager(); const result = await setDefaultPricingProfile(context.companyId, context.userId, profileId); refresh(); return result;
}
export async function setPricingProfileArchivedAction(profileId: string, archived: boolean) {
  const context = await manager(); const result = await setPricingProfileArchived(context.companyId, context.userId, profileId, archived); refresh(); return result;
}
export async function deletePricingProfileAction(profileId: string) {
  const context = await manager(); const result = await deletePricingProfile(context.companyId, context.userId, profileId); refresh(); return result;
}
export async function changeEstimatePricingProfileAction(estimateId: string, profileId: string, replaceManualItemPricing = false) {
  const context = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return changeEstimatePricingProfile(context.companyId, context.user.id, estimateId, profileId, replaceManualItemPricing);
}
