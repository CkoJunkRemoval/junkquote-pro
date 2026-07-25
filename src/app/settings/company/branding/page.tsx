import Link from "next/link";
import CompanyHubShell, { HubCard } from "@/features/companyHub/CompanyHubShell";
import { requireAdminTenant } from "@/lib/auth/tenant";

export default async function BrandingPage() {
  await requireAdminTenant();
  return (
    <CompanyHubShell title="Branding" description="Company identity shared by email, PDFs, estimates, invoices, and the customer portal.">
      <HubCard title="Brand assets">
        <p className="text-slate-400">
          Primary logo and colors reuse the existing staged, private-storage branding workflow. Light and dark logo slots and channel-specific branding are reserved in Company Settings.
        </p>
        <Link href="/settings" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-cyan-500 px-4 font-bold text-slate-950">
          Manage logo and brand colors
        </Link>
      </HubCard>
    </CompanyHubShell>
  );
}
