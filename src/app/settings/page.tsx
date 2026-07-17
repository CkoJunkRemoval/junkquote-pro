import AppLayout from "@/components/layout/AppLayout";
import CompanySettings from "@/features/company/CompanySettings";
import { getCompanyBranding } from "@/lib/company/branding";

export default async function SettingsPage() {
  return <AppLayout><CompanySettings initialCompany={await getCompanyBranding()} /></AppLayout>;
}
