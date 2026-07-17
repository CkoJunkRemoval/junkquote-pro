import { DEVELOPMENT_COMPANY_ID } from "@/lib/config";
import { localCompanyLogoStorage } from "@/lib/storage/companyLogoStorage";
import { prisma } from "@/lib/prisma";

export const supportedTimezones = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "UTC"] as const;
export const supportedCurrencies = ["USD", "CAD"] as const;
type NullableText = string | null | undefined;

export type CompanySettingsInput = {
  legalName?: NullableText; displayName?: NullableText; email?: NullableText; phone?: NullableText; website?: NullableText;
  addressLine1?: NullableText; addressLine2?: NullableText; city?: NullableText; state?: NullableText; postalCode?: NullableText;
  primaryColor?: NullableText; secondaryColor?: NullableText; invoicePrefix?: NullableText; estimatePrefix?: NullableText;
  defaultTaxRate?: number; defaultPaymentTermsDays?: number; defaultEstimateExpirationDays?: number; defaultMinimumCharge?: number;
  timezone?: string; currencyCode?: string;
};

const text = (value: NullableText) => value?.trim() || null;
const color = (value: NullableText, label: string) => { const result = text(value); if (result && !/^#[0-9a-fA-F]{6}$/.test(result)) throw new Error(`${label} must be a six-digit hex color.`); return result; };
const prefix = (value: NullableText, label: string) => { const result = value?.trim().toUpperCase(); if (!result || !/^[A-Z0-9-]{1,12}$/.test(result)) throw new Error(`${label} must contain 1–12 letters, numbers, or hyphens.`); return result; };

export async function getCompanyBranding() {
  const company = await prisma.company.findFirst({ where: { id: DEVELOPMENT_COMPANY_ID }, select: { id: true, name: true, legalName: true, displayName: true, email: true, phone: true, website: true, addressLine1: true, addressLine2: true, city: true, state: true, postalCode: true, logoUrl: true, primaryColor: true, secondaryColor: true, invoicePrefix: true, estimatePrefix: true, defaultTaxRate: true, defaultPaymentTermsDays: true, defaultEstimateExpirationDays: true, defaultMinimumCharge: true, timezone: true, currencyCode: true, createdAt: true, updatedAt: true } });
  if (!company) throw new Error("Development company not found.");
  return company;
}

export async function updateCompanyBranding(input: CompanySettingsInput) {
  await getCompanyBranding();
  if (input.email !== undefined && text(input.email) && !/^\S+@\S+\.\S+$/.test(text(input.email)!)) throw new Error("Enter a valid email address.");
  if (input.website !== undefined && text(input.website) && !/^https?:\/\/\S+$/i.test(text(input.website)!)) throw new Error("Website must begin with http:// or https://.");
  if (input.defaultTaxRate !== undefined && (!Number.isFinite(input.defaultTaxRate) || input.defaultTaxRate < 0 || input.defaultTaxRate > 100)) throw new Error("Tax rate must be between 0 and 100.");
  if (input.defaultMinimumCharge !== undefined && (!Number.isFinite(input.defaultMinimumCharge) || input.defaultMinimumCharge < 0)) throw new Error("Minimum charge cannot be negative.");
  for (const [key, value] of [["Payment terms", input.defaultPaymentTermsDays], ["Estimate expiration", input.defaultEstimateExpirationDays]] as const) if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > 365)) throw new Error(`${key} must be a whole number from 0 to 365.`);
  if (input.timezone !== undefined && !supportedTimezones.includes(input.timezone as typeof supportedTimezones[number])) throw new Error("Unsupported timezone.");
  if (input.currencyCode !== undefined && !supportedCurrencies.includes(input.currencyCode as typeof supportedCurrencies[number])) throw new Error("Unsupported currency.");
  const data = {
    ...(input.legalName !== undefined ? { legalName: text(input.legalName) || "JunkQuote Pro" } : {}), ...(input.displayName !== undefined ? { displayName: text(input.displayName) || "JunkQuote Pro" } : {}), ...(input.email !== undefined ? { email: text(input.email) } : {}), ...(input.phone !== undefined ? { phone: text(input.phone) } : {}), ...(input.website !== undefined ? { website: text(input.website) } : {}), ...(input.addressLine1 !== undefined ? { addressLine1: text(input.addressLine1) } : {}), ...(input.addressLine2 !== undefined ? { addressLine2: text(input.addressLine2) } : {}), ...(input.city !== undefined ? { city: text(input.city) } : {}), ...(input.state !== undefined ? { state: text(input.state) } : {}), ...(input.postalCode !== undefined ? { postalCode: text(input.postalCode) } : {}), ...(input.primaryColor !== undefined ? { primaryColor: color(input.primaryColor, "Primary color") } : {}), ...(input.secondaryColor !== undefined ? { secondaryColor: color(input.secondaryColor, "Secondary color") } : {}), ...(input.invoicePrefix !== undefined ? { invoicePrefix: prefix(input.invoicePrefix, "Invoice prefix") } : {}), ...(input.estimatePrefix !== undefined ? { estimatePrefix: prefix(input.estimatePrefix, "Estimate prefix") } : {}), ...(input.defaultTaxRate !== undefined ? { defaultTaxRate: input.defaultTaxRate } : {}), ...(input.defaultPaymentTermsDays !== undefined ? { defaultPaymentTermsDays: input.defaultPaymentTermsDays } : {}), ...(input.defaultEstimateExpirationDays !== undefined ? { defaultEstimateExpirationDays: input.defaultEstimateExpirationDays } : {}), ...(input.defaultMinimumCharge !== undefined ? { defaultMinimumCharge: input.defaultMinimumCharge } : {}), ...(input.timezone !== undefined ? { timezone: input.timezone } : {}), ...(input.currencyCode !== undefined ? { currencyCode: input.currencyCode } : {}),
  };
  return prisma.company.update({ where: { id: DEVELOPMENT_COMPANY_ID }, data, select: { id: true, name: true, legalName: true, displayName: true, email: true, phone: true, website: true, addressLine1: true, addressLine2: true, city: true, state: true, postalCode: true, logoUrl: true, primaryColor: true, secondaryColor: true, invoicePrefix: true, estimatePrefix: true, defaultTaxRate: true, defaultPaymentTermsDays: true, defaultEstimateExpirationDays: true, defaultMinimumCharge: true, timezone: true, currencyCode: true, createdAt: true, updatedAt: true } });
}

export async function uploadCompanyLogo(file: File) {
  const company = await getCompanyBranding();
  const logoUrl = await localCompanyLogoStorage.save(file);
  try { const updated = await prisma.company.update({ where: { id: DEVELOPMENT_COMPANY_ID }, data: { logoUrl } }); await localCompanyLogoStorage.remove(company.logoUrl); return updated; } catch (error) { await localCompanyLogoStorage.remove(logoUrl); throw error; }
}

export async function removeCompanyLogo() {
  const company = await getCompanyBranding();
  await prisma.company.update({ where: { id: DEVELOPMENT_COMPANY_ID }, data: { logoUrl: null } });
  await localCompanyLogoStorage.remove(company.logoUrl);
}
