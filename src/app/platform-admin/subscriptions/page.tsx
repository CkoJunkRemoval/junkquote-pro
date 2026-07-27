import { requirePlatformAdminPage } from "@/lib/admin/platformPageAuth";
import { getPlatformSubscriptions } from "@/lib/admin/platformAnalytics";
import PlatformAdminShell, { Bars, Panel } from "@/features/platformAdmin/PlatformAdminShell";
export default async function SubscriptionsPage() {
  await requirePlatformAdminPage("platform_admin.subscriptions_viewed"); const data = await getPlatformSubscriptions();
  return <PlatformAdminShell active="/platform-admin/subscriptions"><h2 className="text-2xl font-bold">Subscriptions</h2>
    <div className="grid gap-5 lg:grid-cols-2"><Panel title="Status breakdown"><Bars rows={data.statuses}/></Panel><Panel title="Plan breakdown"><Bars rows={data.plans}/></Panel></div>
  </PlatformAdminShell>;
}
