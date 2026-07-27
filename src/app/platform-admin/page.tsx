import { requirePlatformAdminPage } from "@/lib/admin/platformPageAuth";
import { getPlatformOverview } from "@/lib/admin/platformAnalytics";
import PlatformAdminShell, { ExportLinks, MetricCard, Panel } from "@/features/platformAdmin/PlatformAdminShell";

export default async function PlatformOverviewPage() {
  await requirePlatformAdminPage("platform_admin.overview_viewed");
  const data = await getPlatformOverview();
  const metrics = [
    ["Registered companies", data.registered], ["User accounts", data.users], ["Created today", data.companiesToday],
    ["Created this week", data.companiesWeek], ["Created this month", data.companiesMonth], ["Activated", data.activated],
    ["Active trials", data.activeTrials], ["Paying", data.paying], ["Churned", data.churned], ["Past due", data.pastDueSubscriptions],
    ["Estimates created", data.estimates], ["Estimates sent", data.estimatesSent], ["Estimates approved", data.estimatesApproved],
    ["Approval rate", `${data.approvalRate}%`], ["Jobs created", data.jobs], ["Jobs completed", data.completedJobs],
    ["Invoices sent", data.invoicesSent], ["Payments recorded", data.payments],
  ] as const;
  return <PlatformAdminShell active="/platform-admin">
    <p className="max-w-3xl text-slate-300">Privacy-safe platform activation, adoption, subscription, conversion, retention, and application-health signals. No customer notes, private files, compensation, tax documents, credentials, or payment-card data are queried.</p>
    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label, value]) => <MetricCard key={label} label={label} value={value} />)}</section>
    <Panel title="Activity and retention signals"><div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {[["Active today", data.activeToday], ["Active 7 days", data.active7], ["Active 30 days", data.active30], ["Inactive 7 days", data.inactive7], ["Inactive 14 days", data.inactive14], ["Inactive 30 days", data.inactive30]].map(([label, value]) => <MetricCard key={label} label={String(label)} value={value} />)}
    </div></Panel>
    <Panel title="Application health"><div className="grid gap-4 sm:grid-cols-2"><MetricCard label="System errors today" value={data.health.errorsToday}/><MetricCard label="Failed background jobs" value={data.health.failedJobs}/></div></Panel>
    <Panel title="Definitions"><dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="font-bold">Registered</dt><dd className="text-slate-400">A company record exists.</dd></div>
      <div><dt className="font-bold">Activated</dt><dd className="text-slate-400">Company onboarding has a completion timestamp.</dd></div>
      <div><dt className="font-bold">Active</dt><dd className="text-slate-400">Meaningful audited activity occurred in the selected period.</dd></div>
      <div><dt className="font-bold">Paying</dt><dd className="text-slate-400">Subscription status is Active.</dd></div>
      <div><dt className="font-bold">Churned</dt><dd className="text-slate-400">Subscription status is Canceled.</dd></div>
      <div><dt className="font-bold">Inactive</dt><dd className="text-slate-400">No meaningful audited activity in the threshold period.</dd></div>
    </dl></Panel>
    <Panel title="Privacy-safe exports"><ExportLinks /></Panel>
  </PlatformAdminShell>;
}
