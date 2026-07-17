"use server";

import { requireAdminTenant, requireTenantContext } from "@/lib/auth/tenant";
import { getCompanyBranding as getBranding, removeCompanyLogo, updateCompanyBranding, uploadCompanyLogo, type CompanySettingsInput } from "@/lib/company/branding";

async function readableCompanyId() { return (await requireTenantContext()).companyId; }
async function settingsCompanyId() { return (await requireAdminTenant()).companyId; }

export async function getCompanyBranding() { return getBranding(await readableCompanyId()); }
export async function updateCompanyBrandingAction(input: CompanySettingsInput) { return updateCompanyBranding(await settingsCompanyId(), input); }
export async function uploadCompanyLogoAction(file: File) { return uploadCompanyLogo(await settingsCompanyId(), file); }
export async function removeCompanyLogoAction() { return removeCompanyLogo(await settingsCompanyId()); }
