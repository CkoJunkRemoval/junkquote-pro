import { requireAdminTenant } from "@/lib/auth/tenant";
import { getCompanyHub } from "@/lib/companyHub/service";
import CompanyHubShell, { HubCard } from "@/features/companyHub/CompanyHubShell";

export default async function SubscriptionPage() {
  const { companyId } = await requireAdminTenant();
  const company = await getCompanyHub(companyId);
  const usage = company.usageMetrics[0];
  return (
    <CompanyHubShell title="Subscription" description="Read-only plan, seat, usage, feature, and billing-period overview.">
      <div className="grid gap-4 lg:grid-cols-3">
        <HubCard title="Plan"><p className="text-3xl font-black text-cyan-400">{company.subscription?.plan ?? "Starter"}</p><p className="mt-2 text-slate-400">{company.subscription?.status ?? "Not provisioned"}</p></HubCard>
        <HubCard title="Seats"><p className="text-3xl font-black">{company.memberships.length}</p><p className="mt-2 text-slate-400">Active memberships</p></HubCard>
        <HubCard title="Billing period"><p className="font-bold">{company.subscription?.currentPeriodStart?.toLocaleDateString() ?? "—"} – {company.subscription?.currentPeriodEnd?.toLocaleDateString() ?? "—"}</p></HubCard>
        <HubCard title="Latest usage"><p className="text-sm text-slate-300">Estimates {usage?.estimates ?? 0} · Jobs {usage?.jobs ?? 0} · Emails {usage?.emails ?? 0} · Storage {usage ? `${Number(usage.storageBytes) / 1_000_000} MB` : "0 MB"}</p></HubCard>
        <HubCard title="Feature availability"><p className="text-sm text-slate-300">{company.featureFlags.map((flag) => flag.key).join(", ") || "Plan defaults"}</p></HubCard>
      </div>
    </CompanyHubShell>
  );
}
