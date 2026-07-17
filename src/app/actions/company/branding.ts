"use server";

import { getCompanyBranding, removeCompanyLogo, updateCompanyBranding, uploadCompanyLogo, type CompanySettingsInput } from "@/lib/company/branding";

export { getCompanyBranding };
export async function updateCompanyBrandingAction(input: CompanySettingsInput) { return updateCompanyBranding(input); }
export async function uploadCompanyLogoAction(file: File) { return uploadCompanyLogo(file); }
export async function removeCompanyLogoAction() { return removeCompanyLogo(); }
