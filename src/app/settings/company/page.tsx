import Link from "next/link";
import { requireAdminTenant } from "@/lib/auth/tenant";
import { getCompanyHub } from "@/lib/companyHub/service";
import CompanyHubShell, { HubCard } from "@/features/companyHub/CompanyHubShell";

export default async function CompanyOverviewPage() {
  const { companyId } = await requireAdminTenant();
  const company = await getCompanyHub(companyId);
  return (
    <CompanyHubShell title="Company Overview" description="The authoritative company-wide configuration source for JunkQuote Pro.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Locations" value={company.businessLocations.length} />
        <Metric label="Service areas" value={company.serviceAreaRules.length} />
        <Metric label="Documents" value={company.companyDocuments.length} />
        <Metric label="Active seats" value={company.memberships.length} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <HubCard title="Business profile">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Item label="Legal name" value={company.legalName} />
            <Item label="DBA" value={company.dbaName} />
            <Item label="Primary phone" value={company.phone} />
            <Item label="Primary email" value={company.email} />
            <Item label="Timezone" value={company.timezone} />
            <Item label="Currency" value={company.currencyCode} />
            <Item label="Service radius" value={`${company.settings?.serviceRadiusMiles ?? 25} miles`} />
            <Item label="Date format" value={company.settings?.dateFormat ?? "MM/DD/YYYY"} />
          </dl>
          <Link href="/settings" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-cyan-500 px-4 font-bold text-slate-950">
            Edit company profile
          </Link>
        </HubCard>
        <HubCard title="Configuration status">
          <p className="text-sm text-slate-400">
            Module defaults remain owned by their existing Estimate, Dispatch, Fleet, Timekeeping, Finance, and Tax services. The Hub provides one administrative overview without replacing those domain rules.
          </p>
        </HubCard>
      </div>
    </CompanyHubShell>
  );
}

const Metric = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
    <p className="text-sm text-slate-400">{label}</p>
    <p className="mt-1 text-3xl font-black text-cyan-400">{value}</p>
  </div>
);
const Item = ({ label, value }: { label: string; value: string | null }) => (
  <div>
    <dt className="text-slate-500">{label}</dt>
    <dd className="font-bold">{value || "Not configured"}</dd>
  </div>
);
