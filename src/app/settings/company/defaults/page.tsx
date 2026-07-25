import { updateHubSettingsAction } from "@/app/actions/company/hub";
import CompanyHubShell, { HubCard, Submit } from "@/features/companyHub/CompanyHubShell";
import { requireAdminTenant } from "@/lib/auth/tenant";

const modules = ["Estimate", "Pricing", "Dispatch", "Fleet", "Timekeeping", "Finance", "Tax"];
export default async function DefaultsPage() {
  await requireAdminTenant();
  return (
    <CompanyHubShell title="Operational Defaults" description="A central directory for defaults while each module remains responsible for enforcing its domain rules.">
      <HubCard title="Module defaults">
        <form action={updateHubSettingsAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="group" value="operationalDefaults" />
          {modules.map((module) => (
            <label key={module} className="grid gap-1 text-sm font-semibold">{module}
              <input name={module.toLowerCase()} placeholder={`${module} defaults or policy reference`} className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3" />
            </label>
          ))}
          <div className="sm:col-span-2"><Submit>Save operational defaults</Submit></div>
        </form>
      </HubCard>
    </CompanyHubShell>
  );
}
