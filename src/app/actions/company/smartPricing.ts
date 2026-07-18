"use server";
import { requireAdminTenant } from "@/lib/auth/tenant";
import { updateSmartPricingSettings, type SmartPricingSettingsInput } from "@/lib/smartPricing/settings";
export async function updateSmartPricingSettingsAction(input: SmartPricingSettingsInput) { return updateSmartPricingSettings((await requireAdminTenant()).companyId, input); }
