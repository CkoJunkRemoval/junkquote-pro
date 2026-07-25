import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import {
  assignAssetAction,
  createMaintenanceScheduleAction,
  recordFuelAction,
  recordMileageAction,
  returnAssetAction,
  uploadAssetDocumentAction,
} from "@/app/actions/fleet/fleet";
import { requireTenantContext } from "@/lib/auth/tenant";
import {
  hasFleetCapability,
  requireFleetCapability,
} from "@/lib/fleet/permissions";
import { getAssetDetail, getFleetAssignmentOptions } from "@/lib/fleet/service";

const field = "min-h-11 rounded-xl border px-3 py-2";
const sections = [
  "overview",
  "specifications",
  "assignments",
  "mileage",
  "fuel",
  "maintenance",
  "inspections",
  "documents",
  "costs",
  "timeline",
];
export default async function AssetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const tenant = await requireTenantContext();
  requireFleetCapability(tenant.role, "fleet.view");
  const { id } = await params;
  const requested = (await searchParams).section;
  const section = sections.includes(requested ?? "") ? requested! : "overview";
  if (section === "costs")
    requireFleetCapability(tenant.role, "fleet.costs.view");
  const [asset, options] = await Promise.all([
    getAssetDetail(tenant.companyId, id),
    getFleetAssignmentOptions(tenant.companyId),
  ]);
  if (!asset)
    return (
      <AppLayout>
        <main className="p-10">Asset not found.</main>
      </AppLayout>
    );
  const canAssign = hasFleetCapability(tenant.role, "fleet.assign");
  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
        <Link
          href="/fleet/assets"
          className="inline-flex min-h-11 items-center text-blue-300"
        >
          ← All assets
        </Link>
        <section className="glass-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[.18em] text-[var(--brand-orange)]">
                {asset.assetNumber ?? "Legacy asset"} · {asset.category}
              </p>
              <h1 className="text-3xl font-bold">{asset.name}</h1>
              <p className="mt-2 text-slate-400">
                {[asset.make, asset.model, asset.modelYear]
                  .filter(Boolean)
                  .join(" ") || "Specifications not recorded"}
              </p>
            </div>
            <span className="status-chip rounded-full px-4 py-2">
              {asset.status}
            </span>
          </div>
        </section>
        <nav
          aria-label="Asset sections"
          className="mt-5 flex gap-2 overflow-x-auto pb-2"
        >
          {sections
            .filter(
              (value) =>
                value !== "costs" ||
                hasFleetCapability(tenant.role, "fleet.costs.view"),
            )
            .map((value) => (
              <Link
                key={value}
                href={`/fleet/${id}?section=${value}`}
                aria-current={section === value ? "page" : undefined}
                className={`filter-pill inline-flex min-h-11 shrink-0 items-center rounded-full px-4 capitalize ${section === value ? "filter-pill--active" : ""}`}
              >
                {value}
              </Link>
            ))}
        </nav>
        {section === "overview" && (
          <Grid>
            <Metric label="Status" value={asset.status} />
            <Metric label="Condition" value={asset.condition} />
            <Metric label="Ownership" value={asset.ownershipType} />
            <Metric
              label="Odometer"
              value={asset.odometer?.toLocaleString() ?? "Not recorded"}
            />
            <Metric
              label="Assigned employee"
              value={
                asset.assignedEmployee
                  ? `${asset.assignedEmployee.firstName} ${asset.assignedEmployee.lastName}`
                  : "None"
              }
            />
            <Metric
              label="Assigned crew"
              value={asset.assignedCrew?.name ?? "None"}
            />
          </Grid>
        )}
        {section === "specifications" && (
          <Grid>
            <Metric label="VIN" value={asset.vin ?? "—"} />
            <Metric label="Serial number" value={asset.serialNumber ?? "—"} />
            <Metric label="Plate" value={asset.licensePlate ?? "—"} />
            <Metric label="Subtype" value={asset.subtype ?? "—"} />
            <Metric
              label="Capacity"
              value={
                asset.capacityCubicYards
                  ? `${asset.capacityCubicYards} yd³`
                  : "—"
              }
            />
            <Metric label="Notes" value={asset.notes || "—"} />
          </Grid>
        )}
        {section === "assignments" && (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <section className="glass-card p-5">
              <h2 className="text-xl font-bold">Assignment history</h2>
              <div className="mt-4 space-y-3">
                {asset.assignments.map((row) => (
                  <div key={row.id} className="rounded-xl border p-4">
                    <strong>{row.assigneeType}</strong>
                    <p className="text-sm text-slate-400">
                      {row.assignedAt.toLocaleString()} –{" "}
                      {row.returnedAt?.toLocaleString() ?? "Active"}
                    </p>
                    {!row.returnedAt && canAssign && (
                      <form
                        action={returnAssetAction.bind(null, id, row.id)}
                        className="mt-3 flex flex-wrap gap-2"
                      >
                        <select name="returnCondition" className={field}>
                          {[
                            "Excellent",
                            "Good",
                            "Fair",
                            "Poor",
                            "Damaged",
                            "Unknown",
                          ].map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                        <button className="ui-button ui-button--secondary rounded-xl px-4 font-semibold">
                          Return asset
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </section>
            {canAssign && (
              <section className="glass-card p-5">
                <h2 className="text-xl font-bold">Assign asset</h2>
                <form
                  action={assignAssetAction.bind(null, id)}
                  className="mt-4 grid gap-3"
                >
                  <select name="assigneeType" className={field}>
                    {["Employee", "Crew", "ParentAsset", "Job"].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <select name="employeeId" className={field}>
                    <option value="">Employee</option>
                    {options.employees.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.firstName} {row.lastName}
                        {row.authorizedDriver ? " · Driver" : ""}
                      </option>
                    ))}
                  </select>
                  <select name="crewId" className={field}>
                    <option value="">Crew</option>
                    {options.crews.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                  <select name="parentAssetId" className={field}>
                    <option value="">Parent asset</option>
                    {options.assets
                      .filter((row) => row.id !== id)
                      .map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.assetNumber} · {row.name}
                        </option>
                      ))}
                  </select>
                  <select name="jobId" className={field}>
                    <option value="">Job</option>
                    {options.jobs.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.jobNumber ?? row.id}
                      </option>
                    ))}
                  </select>
                  <select name="startingCondition" className={field}>
                    {[
                      "Excellent",
                      "Good",
                      "Fair",
                      "Poor",
                      "Damaged",
                      "Unknown",
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <button className="ui-button ui-button--primary rounded-xl px-4 font-semibold">
                    Assign
                  </button>
                </form>
              </section>
            )}
          </div>
        )}
        {section === "mileage" && (
          <RecordSection title="Mileage history">
            {asset.mileageEntries.map((row) => (
              <Record
                key={row.id}
                title={`${row.odometerMiles.toLocaleString()} miles`}
                detail={`${row.recordedAt.toLocaleString()} · ${row.source}${row.voidedAt ? " · Corrected" : ""}`}
              />
            ))}
            {hasFleetCapability(tenant.role, "fleet.mileage.log") && (
              <form
                action={recordMileageAction.bind(null, id)}
                className="mt-5 grid gap-3 sm:grid-cols-3"
              >
                <input
                  name="odometerMiles"
                  type="number"
                  min="0"
                  required
                  placeholder="Odometer miles"
                  className={field}
                />
                <input
                  name="recordedAt"
                  type="datetime-local"
                  className={field}
                />
                <select name="source" className={field}>
                  {["Daily", "Weekly", "Job", "Manual", "Import"].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
                <button className="ui-button ui-button--primary rounded-xl px-4 font-semibold">
                  Record mileage
                </button>
              </form>
            )}
          </RecordSection>
        )}
        {section === "fuel" && (
          <RecordSection title="Fuel history">
            {asset.fuelEntries.map((row) => (
              <Record
                key={row.id}
                title={`${row.gallons.toFixed(2)} gal · $${(row.totalCostCents / 100).toFixed(2)}`}
                detail={`${row.transactionAt.toLocaleString()} · ${row.vendor ?? "Vendor not recorded"}`}
              />
            ))}
            {hasFleetCapability(tenant.role, "fleet.fuel.log") && (
              <form
                action={recordFuelAction.bind(null, id)}
                className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <input
                  name="gallons"
                  type="number"
                  step=".001"
                  min=".001"
                  required
                  placeholder="Gallons"
                  className={field}
                />
                <input
                  name="totalCost"
                  type="number"
                  step=".01"
                  min="0"
                  required
                  placeholder="Total cost"
                  className={field}
                />
                <input
                  name="pricePerGallon"
                  type="number"
                  step=".01"
                  min="0"
                  required
                  placeholder="Price per gallon"
                  className={field}
                />
                <input
                  name="odometerMiles"
                  type="number"
                  min="0"
                  placeholder="Odometer"
                  className={field}
                />
                <input name="vendor" placeholder="Vendor" className={field} />
                <label className="flex min-h-11 items-center gap-2">
                  <input name="fullTank" type="checkbox" /> Full tank
                </label>
                <button className="ui-button ui-button--primary rounded-xl px-4 font-semibold">
                  Add fuel log
                </button>
              </form>
            )}
          </RecordSection>
        )}
        {section === "maintenance" && (
          <RecordSection title="Maintenance">
            {asset.maintenanceRecords.map((row) => (
              <Record
                key={row.id}
                title={row.serviceType}
                detail={`${row.serviceDate.toLocaleDateString()} · $${(row.totalCostCents / 100).toFixed(2)}`}
              />
            ))}
            {asset.maintenanceSchedules.map((row) => (
              <Record
                key={row.id}
                title={`${row.serviceType} schedule`}
                detail={
                  row.dueDate?.toLocaleDateString() ??
                  (row.dueOdometerMiles
                    ? `${row.dueOdometerMiles} miles`
                    : "No due trigger")
                }
              />
            ))}
            {hasFleetCapability(tenant.role, "fleet.maintenance.manage") && (
              <form
                action={createMaintenanceScheduleAction.bind(null, id)}
                className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <input
                  name="serviceType"
                  required
                  placeholder="Service type"
                  className={field}
                />
                <select name="triggerType" className={field}>
                  {[
                    "Mileage",
                    "Date",
                    "CombinedMileageOrDate",
                    "EngineHours",
                    "UsageCount",
                  ].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
                <input
                  name="intervalMiles"
                  type="number"
                  min="1"
                  placeholder="Interval miles"
                  className={field}
                />
                <input
                  name="intervalDays"
                  type="number"
                  min="1"
                  placeholder="Interval days"
                  className={field}
                />
                <input
                  name="dueOdometerMiles"
                  type="number"
                  min="0"
                  placeholder="Due odometer"
                  className={field}
                />
                <input name="dueDate" type="date" className={field} />
                <button className="ui-button ui-button--primary rounded-xl px-4 font-semibold">
                  Create schedule
                </button>
              </form>
            )}
          </RecordSection>
        )}
        {section === "inspections" && (
          <RecordSection title="Inspections">
            {asset.inspectionRecords.map((row) => (
              <Record
                key={row.id}
                title={row.result}
                detail={`${row.inspectedAt.toLocaleString()} · ${row.defects.length} defects`}
              />
            ))}
          </RecordSection>
        )}
        {section === "documents" && (
          <RecordSection title="Private documents">
            {asset.documents.map((row) => (
              <a
                key={row.id}
                href={`/api/private/assets/${row.storageKey}`}
                className="block min-h-11 rounded-xl border p-4 text-blue-300"
              >
                {row.category} · {row.displayFilename}
              </a>
            ))}
            {hasFleetCapability(tenant.role, "fleet.documents.manage") && (
              <form
                action={uploadAssetDocumentAction.bind(null, id)}
                className="mt-5 grid gap-3 sm:grid-cols-2"
              >
                <select name="category" className={field}>
                  {[
                    "PurchaseReceipt",
                    "Title",
                    "Registration",
                    "Insurance",
                    "Inspection",
                    "ServiceInvoice",
                    "FuelReceipt",
                    "Warranty",
                    "Financing",
                    "Lease",
                    "RentalAgreement",
                    "AccidentReport",
                    "Photo",
                    "Other",
                  ].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
                <input
                  name="file"
                  type="file"
                  required
                  className={`${field} file:text-white`}
                />
                <input name="expirationDate" type="date" className={field} />
                <button className="ui-button ui-button--primary rounded-xl px-4 font-semibold">
                  Upload document
                </button>
              </form>
            )}
          </RecordSection>
        )}
        {section === "costs" && (
          <Grid>
            <Metric
              label="Purchase price"
              value={
                asset.purchasePriceCents == null
                  ? "—"
                  : `$${(asset.purchasePriceCents / 100).toFixed(2)}`
              }
            />
            <Metric
              label="Fuel cost"
              value={`$${(asset.fuelEntries.reduce((sum, row) => sum + row.totalCostCents, 0) / 100).toFixed(2)}`}
            />
            <Metric
              label="Maintenance cost"
              value={`$${(asset.maintenanceRecords.reduce((sum, row) => sum + row.totalCostCents, 0) / 100).toFixed(2)}`}
            />
          </Grid>
        )}
        {section === "timeline" && (
          <RecordSection title="Asset timeline">
            {asset.timelineEvents.map((row) => (
              <Record
                key={row.id}
                title={row.eventType}
                detail={`${row.occurredAt.toLocaleString()} · ${row.sourceType}`}
              />
            ))}
          </RecordSection>
        )}
      </main>
    </AppLayout>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </section>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-5">
      <span className="text-sm text-slate-400">{label}</span>
      <strong className="mt-2 block">{value}</strong>
    </div>
  );
}
function RecordSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-card mt-6 p-5">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}
function Record({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border p-4">
      <strong>{title}</strong>
      <p className="text-sm text-slate-400">{detail}</p>
    </div>
  );
}
