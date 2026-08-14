import { requirePlatformAdminPage } from "@/lib/admin/platformPageAuth";
import { getPlatformConversions, platformRange, type PlatformPeriod } from "@/lib/admin/platformAnalytics";
import PlatformAdminShell, { MetricCard, Panel } from "@/features/platformAdmin/PlatformAdminShell";
export default async function ConversionsPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string; includeNonCustomers?:string }> }) {
  await requirePlatformAdminPage("platform_admin.conversions_viewed"); const query = await searchParams;
  const period = (["all", "7d", "30d", "month", "custom"].includes(query.period ?? "") ? query.period : "30d") as PlatformPeriod;
  const include=query.includeNonCustomers==="1",data = await getPlatformConversions(platformRange(period, query.from, query.to),include);
  return <PlatformAdminShell active="/platform-admin/conversions"><h2 className="text-2xl font-bold">Approval and conversion metrics</h2>
    <form className="mt-5 flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="includeNonCustomers" value="1" defaultChecked={include}/>Include Test/Internal</label>
      <select name="period" defaultValue={period} className="min-h-11 rounded-xl border border-white/15 bg-slate-900 px-3"><option value="all">All time</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="month">Current month</option><option value="custom">Custom</option></select>
      <input type="date" name="from" defaultValue={query.from} className="min-h-11 rounded-xl border border-white/15 bg-slate-900 px-3"/><input type="date" name="to" defaultValue={query.to} className="min-h-11 rounded-xl border border-white/15 bg-slate-900 px-3"/><button className="min-h-11 rounded-xl bg-orange-500 px-5 font-bold text-slate-950">Apply</button>
    </form>
    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
      ["Estimates created", data.created], ["Sent", data.sent], ["Viewed now", data.viewed], ["Approved", data.approved], ["Rejected", data.rejected],
      ["Approval rate", `${data.approvalRate}%`], ["Median sent → approved", data.medianSentToApprovedHours == null ? "Insufficient data" : `${data.medianSentToApprovedHours} hours`],
      ["Estimate → job", `${data.estimateToJobRate}%`], ["Invoice → payment", `${data.invoiceToPaymentRate}%`],
    ].map(([label, value]) => <MetricCard key={label} label={String(label)} value={value}/>)}</section>
    <Panel title="Denominators"><ul className="space-y-2 text-sm text-slate-300">{Object.entries(data.denominators).map(([key, value]) => <li key={key}><strong className="capitalize">{key}:</strong> {value}</li>)}</ul></Panel>
  </PlatformAdminShell>;
}
