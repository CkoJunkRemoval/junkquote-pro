import { updateHubSettingsAction } from "@/app/actions/company/hub";
import CompanyHubShell, { HubCard, Submit } from "@/features/companyHub/CompanyHubShell";
import { requireAdminTenant } from "@/lib/auth/tenant";

export default async function NotificationsPage() {
  await requireAdminTenant();
  return (
    <CompanyHubShell title="Notification Center" description="Set company-wide channel and module notification preferences. SMS and push are placeholders only.">
      <HubCard title="Company channels">
        <form action={updateHubSettingsAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="group" value="notificationPreferences" />
          {["email","inApp","smsPlaceholder","pushPlaceholder"].map((name) => (
            <label key={name} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-700 p-3 font-bold">
              <input name={name} type="checkbox" className="size-5" />{name}
            </label>
          ))}
          <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Per-module preferences
            <textarea name="modules" placeholder="Estimates, Dispatch, Workforce, Fleet, Finance, Tax" className="min-h-24 rounded-lg border border-slate-700 bg-slate-950 p-3" />
          </label>
          <div className="self-end"><Submit>Save preferences</Submit></div>
        </form>
      </HubCard>
    </CompanyHubShell>
  );
}
