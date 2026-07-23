import AppLayout from "@/components/layout/AppLayout";
import CompanySettings from "@/features/company/CompanySettings";
import { getCompanyBranding } from "@/lib/company/branding";
import { requireAdminTenant } from "@/lib/auth/tenant";
import { getSmartPricingSettings } from "@/lib/smartPricing/settings";
import SmartPricingSettings from "@/features/company/SmartPricingSettings";
import Link from "next/link";
import { Library, SlidersHorizontal } from "lucide-react";

export default async function SettingsPage() {
  const { companyId } = await requireAdminTenant();
  const [company, smartPricing] = await Promise.all([getCompanyBranding(companyId), getSmartPricingSettings(companyId)]);
  return <AppLayout>
    <div className="mx-auto mb-6 flex max-w-5xl flex-wrap gap-3 px-4 sm:px-6">
      <Link href="/settings/pricing-profiles" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
        <SlidersHorizontal size={18} aria-hidden="true" />
        Manage Pricing Profiles
      </Link>
      <Link href="/settings/item-library" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
        <Library size={18} aria-hidden="true" />
        Manage Item Library
      </Link>
    </div>
    <CompanySettings initialCompany={company} />
    <SmartPricingSettings initial={smartPricing} />
  </AppLayout>;
}
