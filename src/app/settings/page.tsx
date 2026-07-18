import AppLayout from "@/components/layout/AppLayout";
import CompanySettings from "@/features/company/CompanySettings";
import { getCompanyBranding } from "@/lib/company/branding";
import { requireAdminTenant } from "@/lib/auth/tenant";
import { getSmartPricingSettings } from "@/lib/smartPricing/settings";
import SmartPricingSettings from "@/features/company/SmartPricingSettings";

export default async function SettingsPage() {
  const { companyId } = await requireAdminTenant();
  const [company, smartPricing] = await Promise.all([getCompanyBranding(companyId), getSmartPricingSettings(companyId)]);
  return <AppLayout><CompanySettings initialCompany={company} /><SmartPricingSettings initial={smartPricing} /></AppLayout>;
}
