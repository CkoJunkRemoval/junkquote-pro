import AppLayout from "@/components/layout/AppLayout";
import { createAssetAction } from "@/app/actions/fleet/fleet";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireFleetCapability } from "@/lib/fleet/permissions";

const field = "min-h-11 rounded-xl border px-3 py-2";
export default async function NewAssetPage() {
  const tenant = await requireTenantContext();
  requireFleetCapability(tenant.role, "fleet.manage");
  return (
    <AppLayout>
      <main className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-10">
        <p className="text-sm font-semibold uppercase tracking-[.18em] text-[var(--brand-orange)]">
          Fleet & Assets
        </p>
        <h1 className="text-3xl font-bold">Add asset</h1>
        <p className="mt-2 text-slate-400">
          Create the shared operational record. Vehicle, trailer, and equipment
          histories remain attached to this asset.
        </p>
        <form
          action={createAssetAction}
          className="glass-card mt-6 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label>
            <span className="mb-1 block text-sm text-slate-300">
              Asset number
            </span>
            <input name="assetNumber" required className={`${field} w-full`} />
          </label>
          <label>
            <span className="mb-1 block text-sm text-slate-300">
              Display name
            </span>
            <input name="name" required className={`${field} w-full`} />
          </label>
          <label>
            <span className="mb-1 block text-sm text-slate-300">Category</span>
            <select name="category" className={`${field} w-full`}>
              {[
                "Vehicle",
                "Trailer",
                "PoweredEquipment",
                "NonPoweredEquipment",
                "Tool",
                "SafetyEquipment",
                "Electronics",
                "Container",
                "Other",
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          {[
            "subtype",
            "make",
            "model",
            "serialNumber",
            "vin",
            "licensePlate",
          ].map((name) => (
            <label key={name}>
              <span className="mb-1 block text-sm capitalize text-slate-300">
                {name.replace(/([A-Z])/g, " $1")}
              </span>
              <input name={name} className={`${field} w-full`} />
            </label>
          ))}
          <label>
            <span className="mb-1 block text-sm text-slate-300">
              Model year
            </span>
            <input
              name="modelYear"
              type="number"
              min="1900"
              className={`${field} w-full`}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm text-slate-300">Ownership</span>
            <select name="ownershipType" className={`${field} w-full`}>
              {["Owned", "Financed", "Leased", "Rented"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm text-slate-300">Condition</span>
            <select name="condition" className={`${field} w-full`}>
              {["Excellent", "Good", "Fair", "Poor", "Damaged", "Unknown"].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm text-slate-300">
              Purchase date
            </span>
            <input
              name="purchaseDate"
              type="date"
              className={`${field} w-full`}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm text-slate-300">
              Purchase price
            </span>
            <input
              name="purchasePrice"
              type="number"
              min="0"
              step=".01"
              className={`${field} w-full`}
            />
          </label>
          <label className="sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block text-sm text-slate-300">Notes</span>
            <textarea name="notes" className={`${field} min-h-24 w-full`} />
          </label>
          <button className="ui-button ui-button--primary rounded-xl px-5 font-semibold">
            Create asset
          </button>
        </form>
      </main>
    </AppLayout>
  );
}
