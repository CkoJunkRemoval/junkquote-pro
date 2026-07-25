import { createLocationAction, setLocationActiveAction } from "@/app/actions/company/hub";
import { requireAdminTenant } from "@/lib/auth/tenant";
import { getCompanyHub } from "@/lib/companyHub/service";
import CompanyHubShell, { Field, HubCard, Submit } from "@/features/companyHub/CompanyHubShell";

export default async function LocationsPage() {
  const { companyId } = await requireAdminTenant();
  const company = await getCompanyHub(companyId);
  return (
    <CompanyHubShell title="Business Locations" description="Manage operating locations and their local contact, staffing, fleet, hours, and coverage context.">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <HubCard title="Add location">
          <form action={createLocationAction} className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" name="name" required />
            <Field label="Address" name="addressLine1" required />
            <Field label="City" name="city" required />
            <Field label="State" name="state" required />
            <Field label="ZIP code" name="postalCode" required />
            <Field label="Phone" name="phone" />
            <Field label="Email" name="email" type="email" />
            <Field label="Hours summary" name="hours" />
            <div className="sm:col-span-2"><Submit>Add location</Submit></div>
          </form>
        </HubCard>
        <HubCard title="Locations">
          <div className="space-y-3">
            {company.businessLocations.map((location) => (
              <article key={location.id} className="rounded-xl border border-slate-700 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{location.name}</h3>
                    <p className="text-sm text-slate-400">{location.addressLine1}, {location.city}, {location.state} {location.postalCode}</p>
                    <p className="mt-1 text-xs text-slate-500">Fleet and workforce assignments: configured by IDs without duplicating their source records.</p>
                  </div>
                  <form action={setLocationActiveAction}>
                    <input type="hidden" name="id" value={location.id} />
                    <input type="hidden" name="active" value={String(!location.active)} />
                    <button className="min-h-11 rounded-lg border border-slate-600 px-3 font-bold">
                      {location.active ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </div>
              </article>
            ))}
            {!company.businessLocations.length && <p className="text-slate-400">No locations configured.</p>}
          </div>
        </HubCard>
      </div>
    </CompanyHubShell>
  );
}
