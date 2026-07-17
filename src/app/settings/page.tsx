import AppLayout from "@/components/layout/AppLayout";
import CompanySettings from "@/features/company/CompanySettings";
import { getCompanyBranding } from "@/lib/company/branding";
import { requireAdminTenant } from "@/lib/auth/tenant";

export default async function SettingsPage() {
  const { companyId } = await requireAdminTenant();
  return <AppLayout><CompanySettings initialCompany={await getCompanyBranding(companyId)} /></AppLayout>;
}
