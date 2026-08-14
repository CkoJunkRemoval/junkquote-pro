import { requirePlatformAdminPage } from "@/lib/admin/platformPageAuth";
import { getPlatformSubscriptions } from "@/lib/admin/platformAnalytics";
import PlatformAdminShell, { Bars, Panel } from "@/features/platformAdmin/PlatformAdminShell";
export default async function SubscriptionsPage({searchParams}:{searchParams:Promise<{includeNonCustomers?:string}>}) {
  await requirePlatformAdminPage("platform_admin.subscriptions_viewed"); const include=(await searchParams).includeNonCustomers==="1",data = await getPlatformSubscriptions(include);
  return <PlatformAdminShell active="/platform-admin/subscriptions"><h2 className="text-2xl font-bold">Subscriptions</h2><form><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="includeNonCustomers" value="1" defaultChecked={include}/>Include Test/Internal</label><button className="min-h-11 rounded-xl bg-orange-500 px-4 text-slate-950">Apply</button></form>
    <div className="grid gap-5 lg:grid-cols-2"><Panel title="Status breakdown"><Bars rows={data.statuses}/></Panel><Panel title="Plan breakdown"><Bars rows={data.plans}/></Panel></div>
  </PlatformAdminShell>;
}
