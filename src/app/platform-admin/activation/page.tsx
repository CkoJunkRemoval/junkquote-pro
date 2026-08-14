import { requirePlatformAdminPage } from "@/lib/admin/platformPageAuth";
import { getActivationFunnel } from "@/lib/admin/platformAnalytics";
import PlatformAdminShell, { Bars, Panel, tableClass } from "@/features/platformAdmin/PlatformAdminShell";
export default async function ActivationPage({searchParams}:{searchParams:Promise<{includeNonCustomers?:string}>}) {
  await requirePlatformAdminPage("platform_admin.activation_viewed"); const include=(await searchParams).includeNonCustomers==="1", rows = await getActivationFunnel(include);
  return <PlatformAdminShell active="/platform-admin/activation"><h2 className="text-2xl font-bold">Company activation funnel</h2><form><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="includeNonCustomers" value="1" defaultChecked={include}/>Include Test/Internal</label><button className="min-h-11 rounded-xl bg-orange-500 px-4 text-slate-950">Apply</button></form>
    <p className="mt-2 text-slate-400">Milestones use authoritative timestamps only. Missing events remain unreached.</p>
    <Panel title="Companies reaching each stage"><Bars rows={rows.map((x) => ({ label: x.label, value: x.companies }))} /></Panel>
    <Panel title="Funnel details"><div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Stage</th><th>Companies</th><th>From previous</th><th>From signup</th><th>Median hours from signup</th></tr></thead>
      <tbody>{rows.map((x) => <tr key={x.label}><td>{x.label}</td><td>{x.companies}</td><td>{x.previousConversion}%</td><td>{x.overallConversion}%</td><td>{x.medianHours ?? "Insufficient data"}</td></tr>)}</tbody></table></div></Panel>
  </PlatformAdminShell>;
}
