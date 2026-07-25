import { createServiceAreaAction } from "@/app/actions/company/hub";
import { requireAdminTenant } from "@/lib/auth/tenant";
import { getCompanyHub } from "@/lib/companyHub/service";
import CompanyHubShell, { Field, HubCard, Submit } from "@/features/companyHub/CompanyHubShell";

export default async function ServiceAreasPage() {
  const { companyId } = await requireAdminTenant();
  const company = await getCompanyHub(companyId);
  return (
    <CompanyHubShell title="Service Areas" description="Define available ZIP, city, county, and radius coverage. Coverage maps remain future work.">
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <HubCard title="Add coverage rule">
          <form action={createServiceAreaAction} className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-slate-300">Type
              <select name="kind" className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3">
                <option>ZIP</option><option>CITY</option><option>COUNTY</option><option>RADIUS</option>
              </select>
            </label>
            <Field label="Value" name="value" required />
            <Field label="Radius miles" name="radiusMiles" type="number" />
            <Field label="Travel surcharge placeholder" name="distanceCharge" type="number" />
            <Submit>Add service area</Submit>
          </form>
        </HubCard>
        <HubCard title="Coverage">
          <div className="grid gap-3 sm:grid-cols-2">
            {company.serviceAreaRules.map((area) => (
              <article key={area.id} className="rounded-xl border border-slate-700 p-4">
                <p className="text-xs font-bold text-cyan-400">{area.kind}</p>
                <h3 className="text-lg font-black">{area.value}</h3>
                <p className="text-sm text-slate-400">{area.available ? "Available" : "Unavailable"} · Surcharge ${area.distanceCharge.toFixed(2)}</p>
              </article>
            ))}
          </div>
        </HubCard>
      </div>
    </CompanyHubShell>
  );
}
