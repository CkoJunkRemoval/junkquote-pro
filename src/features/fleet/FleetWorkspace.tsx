import Link from "next/link";
import type {
  AssetCategory,
  AssetCondition,
  FleetAssetStatus,
} from "@/generated/prisma/client";
import {
  getAssetDirectory,
  getDueMaintenance,
  getFleetDashboard,
  getFuelSummary,
} from "@/lib/fleet/service";

const cards = [
  ["Active assets", "totalActive"],
  ["Vehicles available", "vehiclesAvailable"],
  ["Trailers available", "trailersAvailable"],
  ["Out of service", "outOfService"],
  ["Maintenance due soon", "maintenanceDueSoon"],
  ["Maintenance overdue", "maintenanceOverdue"],
  ["Registration expiring", "expiringRegistrations"],
  ["Insurance expiring", "expiringInsurance"],
  ["Missing mileage", "missingMileage"],
  ["Unresolved defects", "unresolvedDefects"],
] as const;
const categories: Record<string, AssetCategory[] | undefined> = {
  assets: undefined,
  vehicles: ["Vehicle"],
  trailers: ["Trailer"],
  equipment: [
    "PoweredEquipment",
    "NonPoweredEquipment",
    "Tool",
    "SafetyEquipment",
    "Electronics",
    "Container",
    "Other",
  ],
};

export default async function FleetWorkspace({
  companyId,
  view = "dashboard",
  search = "",
  status,
  condition,
  assigned,
}: {
  companyId: string;
  view?: string;
  search?: string;
  status?: FleetAssetStatus;
  condition?: AssetCondition;
  assigned?: boolean;
}) {
  const dashboard = await getFleetDashboard(companyId);
  const assets = await getAssetDirectory(companyId, {
    search,
    categories: categories[view],
    status,
    condition,
    assigned,
  });
  const due = view === "maintenance" ? await getDueMaintenance(companyId) : [];
  const month = new Date();
  month.setDate(1);
  const fuel =
    view === "fuel" ? await getFuelSummary(companyId, month, new Date()) : [];
  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-[var(--brand-orange)]">
            Operations · Fleet & Assets
          </p>
          <h1 className="text-3xl font-bold">Fleet & Assets</h1>
          <p className="mt-2 text-slate-400">
            Operational records for vehicles, trailers, equipment, tools, and
            maintenance.
          </p>
        </div>
        <Link
          href="/fleet/new"
          className="ui-button ui-button--primary inline-flex min-h-11 items-center rounded-xl px-5 font-semibold"
        >
          Add asset
        </Link>
      </div>
      <nav
        aria-label="Fleet sections"
        className="mt-6 flex gap-2 overflow-x-auto pb-2"
      >
        {[
          ["Dashboard", "/fleet"],
          ["All assets", "/fleet/assets"],
          ["Vehicles", "/fleet/vehicles"],
          ["Trailers", "/fleet/trailers"],
          ["Equipment", "/fleet/equipment"],
          ["Fuel", "/fleet/fuel"],
          ["Maintenance", "/fleet/maintenance"],
          ["Inspections", "/fleet/inspections"],
          ["Documents", "/fleet/documents"],
        ].map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="filter-pill inline-flex min-h-11 shrink-0 items-center rounded-full px-4"
          >
            {label}
          </Link>
        ))}
      </nav>
      {view === "dashboard" && (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map(([label, key]) => (
            <article key={key} className="glass-card p-5">
              <span className="text-sm text-slate-400">{label}</span>
              <strong className="mt-2 block text-3xl">{dashboard[key]}</strong>
            </article>
          ))}
          <article className="glass-card p-5 sm:col-span-2">
            <span className="text-sm text-slate-400">Recent fuel cost</span>
            <strong className="mt-2 block text-3xl">
              ${(dashboard.recentFuelCostCents / 100).toFixed(2)}
            </strong>
          </article>
        </section>
      )}
      {["assets", "vehicles", "trailers", "equipment"].includes(view) && (
        <>
          <form className="glass-card mt-6 flex flex-wrap gap-3 p-4">
            <input
              name="search"
              defaultValue={search}
              aria-label="Search assets"
              placeholder="Search asset number, name, VIN, or serial"
              className="min-h-11 min-w-0 flex-1 rounded-xl border px-3"
            />
            <select
              name="status"
              aria-label="Asset status"
              defaultValue={status ?? ""}
              className="min-h-11 rounded-xl border px-3"
            >
              <option value="">All statuses</option>
              {[
                "Active",
                "Available",
                "Assigned",
                "InService",
                "Maintenance",
                "OutOfService",
                "Repair",
                "Retired",
                "Sold",
                "Lost",
                "Stolen",
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <select
              name="condition"
              aria-label="Asset condition"
              defaultValue={condition ?? ""}
              className="min-h-11 rounded-xl border px-3"
            >
              <option value="">All conditions</option>
              {["Excellent", "Good", "Fair", "Poor", "Damaged", "Unknown"].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
            <select
              name="assigned"
              aria-label="Assignment state"
              defaultValue={assigned === undefined ? "" : String(assigned)}
              className="min-h-11 rounded-xl border px-3"
            >
              <option value="">Any assignment</option>
              <option value="true">Assigned</option>
              <option value="false">Available</option>
            </select>
            <button className="ui-button ui-button--secondary rounded-xl px-5 font-semibold">
              Search
            </button>
          </form>
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <Link
                href={`/fleet/${asset.id}`}
                key={asset.id}
                className="glass-card block min-h-11 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs uppercase text-slate-400">
                      {asset.assetNumber ?? "Legacy asset"}
                    </span>
                    <h2 className="text-xl font-bold">{asset.name}</h2>
                  </div>
                  <span className="status-chip rounded-full px-3 py-1 text-xs">
                    {asset.status}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-400">Category</dt>
                    <dd>{asset.category}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Condition</dt>
                    <dd>{asset.condition}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Odometer</dt>
                    <dd>
                      {asset.odometer?.toLocaleString() ?? "Not recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Assignment</dt>
                    <dd>
                      {asset.assignedEmployee
                        ? `${asset.assignedEmployee.firstName} ${asset.assignedEmployee.lastName}`
                        : (asset.assignedCrew?.name ?? "Available")}
                    </dd>
                  </div>
                </dl>
              </Link>
            ))}
          </section>
        </>
      )}
      {view === "maintenance" && (
        <section className="mt-6 grid gap-4">
          {due.map((row) => (
            <Link
              href={`/fleet/${row.assetId}?section=maintenance`}
              key={row.id}
              className="glass-card flex min-h-11 flex-wrap items-center justify-between gap-4 p-5"
            >
              <span>
                <strong>{row.asset.name}</strong>
                <small className="block text-slate-400">
                  {row.serviceType}
                </small>
              </span>
              <span className="status-chip rounded-full px-3 py-1">
                {row.calculatedStatus}
              </span>
            </Link>
          ))}
        </section>
      )}
      {view === "fuel" && (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fuel.map((row) => (
            <article key={row.assetId} className="glass-card p-5">
              <h2 className="font-bold">Asset fuel summary</h2>
              <p className="mt-2 text-2xl font-bold">
                ${((row._sum.totalCostCents ?? 0) / 100).toFixed(2)}
              </p>
              <p className="text-sm text-slate-400">
                {(row._sum.gallons ?? 0).toFixed(2)} gallons · {row._count} logs
              </p>
            </article>
          ))}
        </section>
      )}
      {["inspections", "documents"].includes(view) && (
        <section className="glass-card mt-6 p-8">
          <h2 className="text-xl font-bold">
            {view === "inspections" ? "Inspection records" : "Asset documents"}
          </h2>
          <p className="mt-2 text-slate-400">
            Open an asset to review its tenant-private history and add records.
          </p>
        </section>
      )}
    </main>
  );
}
