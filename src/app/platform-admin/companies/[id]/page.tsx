import { notFound } from "next/navigation";
import { requirePlatformAdminPage } from "@/lib/admin/platformPageAuth";
import { getPlatformCompanySummary } from "@/lib/admin/platformAnalytics";
import PlatformAdminShell, { MetricCard, Panel, tableClass } from "@/features/platformAdmin/PlatformAdminShell";
import { plans } from "@/lib/billing/config";
export default async function CompanySummaryPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdminPage("platform_admin.company_summary_viewed"); const company = await getPlatformCompanySummary((await params).id); if (!company) notFound();
  const integrations = company.settings?.integrationSettings && typeof company.settings.integrationSettings === "object" ? Object.keys(company.settings.integrationSettings as object).length : 0;
  const limits = company.subscription ? plans[company.subscription.plan] : null;
  return <PlatformAdminShell active="/platform-admin/companies"><h2 className="text-2xl font-bold">{company.name}</h2><p className="mt-2 text-slate-400">High-level account summary only. Support impersonation and private content access are intentionally unavailable.</p>
    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(company._count).map(([label, value]) => <MetricCard key={label} label={label} value={value}/>)}</section>
    <div className="grid gap-5 lg:grid-cols-2"><Panel title="Account and subscription"><dl className="space-y-2 text-sm">
      <p>Created <strong className="float-right">{company.createdAt.toLocaleString()}</strong></p><p>Account <strong className="float-right">{company.active ? "Active" : "Suspended"}</strong></p>
      <p>Plan <strong className="float-right">{company.subscription?.plan ?? "None"}</strong></p><p>Subscription <strong className="float-right">{company.subscription?.status ?? "None"}</strong></p>
      <p>Trial expiration <strong className="float-right">{company.subscription?.trialEnd?.toLocaleDateString() ?? "—"}</strong></p>
    </dl></Panel><Panel title="Features and configuration"><p>Onboarding: {company.onboarding?.completedAt ? "Completed" : "Incomplete"}</p><p>Last meaningful activity: {company.lastActivity?.toLocaleString() ?? "None"}</p><p>Smart Pricing: {company.settings?.smartPricingEnabled ? "Enabled" : "Disabled"}</p><p>Portal branding: {company.settings?.portalBrandingEnabled ? "Enabled" : "Disabled"}</p><p>Configured integration groups: {integrations}</p><p>Enabled feature flags: {company.featureFlags.filter((x) => x.enabled).map((x) => x.key).join(", ") || "None"}</p></Panel></div>
    <div className="grid gap-5 lg:grid-cols-2"><Panel title="Plan limits and usage"><p>Seats: {company._count.users} / {limits?.userLimit ?? "Not configured"}</p><p>Monthly estimate limit: {limits?.monthlyEstimateLimit === Number.MAX_SAFE_INTEGER ? "Unlimited" : limits?.monthlyEstimateLimit ?? "Not configured"}</p><p>Storage allowance: {limits ? `${Math.round(limits.storageBytes / 1e9)} GB` : "Not configured"}</p><p>Latest usage snapshots: {company.usageMetrics.length}</p></Panel><Panel title="Health and configuration warnings">{company.warnings.length ? <ul className="list-disc space-y-2 pl-5 text-amber-200">{company.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p className="text-emerald-300">No account-level warnings detected.</p>}</Panel></div>
    <Panel title="Recent high-level activity"><div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Time</th><th>Event</th><th>Entity type</th></tr></thead><tbody>{company.recent.map((event, index) => <tr key={`${event.createdAt.toISOString()}-${index}`}><td>{event.createdAt.toLocaleString()}</td><td>{event.eventType}</td><td>{event.entityType ?? "—"}</td></tr>)}</tbody></table></div>{!company.recent.length && <p className="text-slate-400">No meaningful audited activity.</p>}</Panel>
  </PlatformAdminShell>;
}
