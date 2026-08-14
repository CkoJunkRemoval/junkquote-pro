import { requirePlatformAdminPage } from "@/lib/admin/platformPageAuth";
import { getPlatformUsage } from "@/lib/admin/platformAnalytics";
import PlatformAdminShell, { Bars, MetricCard, Panel, tableClass } from "@/features/platformAdmin/PlatformAdminShell";
export default async function UsagePage({searchParams}:{searchParams:Promise<{includeNonCustomers?:string}>}) {
  await requirePlatformAdminPage("platform_admin.usage_viewed"); const include=(await searchParams).includeNonCustomers==="1",data = await getPlatformUsage(new Date(),include);
  return <PlatformAdminShell active="/platform-admin/usage"><h2 className="text-2xl font-bold">Aggregate usage</h2><form><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="includeNonCustomers" value="1" defaultChecked={include}/>Include Test/Internal</label><button className="min-h-11 rounded-xl bg-orange-500 px-4 text-slate-950">Apply</button></form>
    <p className="mt-2 text-slate-400">Active users and companies are distinct identities with meaningful audited activity. Operational counts reuse privacy-safe daily aggregates.</p>
    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Weekly active users" value={data.weeklyActiveUsers}/><MetricCard label="Monthly active users" value={data.monthlyActiveUsers}/>
      {Object.entries(data.moduleCompanies).map(([label, value]) => <MetricCard key={label} label={`${label} companies`} value={value}/>)}</section>
    <Panel title="Active companies over time"><Bars rows={data.daily.map((x) => ({ label: x.date, value: x.companies }))}/></Panel>
    <Panel title="Company signups over time"><Bars rows={data.daily.map((x) => ({ label: x.date, value: x.signups }))}/></Panel>
    <Panel title="Estimate approval-rate trend"><Bars rows={data.daily.map((x) => ({ label: x.date, value: x.approvalRate }))}/></Panel>
    <Panel title="Usage trend"><div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Date</th><th>Active users</th><th>Active companies</th><th>Signups</th><th>Estimates</th><th>Jobs</th><th>Invoices</th></tr></thead><tbody>{data.daily.map((x) => <tr key={x.date}><td>{x.date}</td><td>{x.activeUsers}</td><td>{x.companies}</td><td>{x.signups}</td><td>{x.estimates}</td><td>{x.jobs}</td><td>{x.invoices}</td></tr>)}</tbody></table></div>{!data.daily.length && <p className="text-slate-400">No daily usage aggregates are available.</p>}</Panel>
  </PlatformAdminShell>;
}
