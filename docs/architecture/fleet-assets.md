# Fleet and Asset Management

## Scope and boundaries

Fleet & Assets is a tenant-scoped operational system for vehicles, trailers,
equipment, tools, assignments, mileage, fuel, maintenance, inspections,
documents, and history. It deliberately does not calculate depreciation,
perform tax reporting, underwrite insurance, connect to telematics, or post to
accounting providers.

## Reused foundations

- The existing `FleetAsset` aggregate remains the dispatch-compatible asset
  identity. Legacy `type`, `name`, capacity, odometer, status, job assignment,
  and maintenance fields remain available to Operations, Dispatch, Route
  Intelligence, onboarding, billing limits, and job detail.
- `Employee.authorizedDriver`, license class, restrictions, and license
  expiration enforce driver eligibility. Workforce credentials remain the
  authoritative document source for people.
- Existing crews, jobs, `JobVehicleAssignment`, and dispatch availability are
  preserved. The new historical `AssetAssignment` supports employee, crew,
  parent-asset, and job assignments without rewriting dispatch scheduling.
- Existing private object storage, tenant authentication, `AuditEvent`,
  `SystemNotification`, dark UI primitives, and capability conventions are
  reused.
- Time Tracking provides a future approved labor input. This sprint does not
  automatically alter time, job pricing, invoices, or customer charges.

## Shared asset model

`FleetAsset` now supports a company-unique asset number, category, subtype,
make/model/year, serial/VIN/plate identifiers, ownership, condition, purchase
and replacement values in cents, current assignment pointers, and parent-child
storage relationships. Categories cover vehicles, trailers, powered and
non-powered equipment, tools, safety equipment, electronics, containers, and
other assets.

Current pointers optimize operational availability; immutable assignment and
timeline rows remain the source of history. Retired, sold, lost, and stolen
assets cannot receive new assignments.

`VehicleProfile` and `TrailerProfile` hold category-specific specifications.
The general asset record continues to expose dispatch capacity and current
odometer for compatibility.

## Assignments and relationships

`AssetAssignment` records exactly one target: employee, crew, parent asset, or
job. Assignment and return timestamps, actors, conditions, odometers, and notes
are retained. Transfer closes the existing assignment before opening another.
Server transactions reject conflicting active assignments, cross-tenant
targets, blocked statuses, unauthorized drivers, and recursive parent chains.

Existing `JobVehicleAssignment` remains the live dispatch schedule record. The
fleet service boundary can later mirror approved job assignments into historical
asset assignments without changing dispatch behavior in this release.

## Mileage integrity

`AssetMileageEntry` is append-oriented. Normal entries cannot decrease the
current odometer or use a future timestamp without explicit authorization.
Corrections append a linked replacement, void the original for calculations,
record the reason and correcting actor, and recompute the current approved
odometer. Raw history is never silently overwritten.

Fuel and maintenance entries may create authoritative mileage rows within the
same transaction. Company settings provide the future missing-mileage cadence.

## Fuel

`FuelEntry` stores gallons and cent-denominated total/unit costs, optional
employee/job/vendor/payment metadata, odometer, and full-tank state. The service
checks total versus gallons times unit price with rounding tolerance. MPG and
cost-per-mile are produced only between sufficient full-tank odometer readings;
insufficient data returns no estimate.

Fuel summaries are operational/job-costing inputs. They do not automatically
bill a customer or alter an invoice.

## Maintenance

Reusable asset schedules support mileage, date, combined, engine-hours
placeholder, and usage-count placeholder triggers. Due state is derived from
the asset odometer and current date. Completing a service creates an immutable
record, advances only its linked schedule baseline, optionally records mileage,
and may explicitly restore availability. A schedule is never silently reset.

Legacy `FleetMaintenance` remains readable for existing Operations screens.
New workflows use `MaintenanceSchedule` and `AssetMaintenanceRecord`.

## Inspections and defects

Templates store versionable section/checklist definitions as structured JSON.
Inspection records preserve results, inspector, odometer, checklist results,
notes, documents, and defects. A critical defect may place an asset out of
service only inside the explicit inspection transaction, with timeline, audit,
and deduplicated notification records. Resolving a defect requires notes and
may link completed maintenance.

## Private documents

Asset documents use the existing private object-storage provider under
`asset-documents/<company>/<asset>/...`. Reads require a staff session, matching
tenant, `fleet.documents.view`, a matching database record, and an audit event.
Customer portal identities cannot access fleet documents. Records may link
fuel, maintenance, or inspection sources and store category/effective/expiration
dates.

## Timeline and alerts

`AssetTimelineEvent` references an authoritative source type and ID, with a
unique source/event constraint. It avoids uncontrolled duplicate narrative
text. Assignment, mileage, fuel, service, inspection, defect, document, and
status workflows append timeline events.

Alert evaluation covers service due/overdue, expiring registration/insurance,
missing mileage, critical failures, out-of-service transitions, and unresolved
defects. Notifications deduplicate by company, source, title, and daily window.
Warranty and unusual-efficiency notifications are extension points.

## Permissions

- Owner/Admin: complete fleet, cost, document, and report access.
- Manager: operational management and reporting, but not purchase/full cost
  visibility by default.
- Office: availability, assignments, mileage/fuel entry, inspections, and
  document viewing.
- Crew: assigned operational visibility plus authorized mileage, fuel, and
  inspection entry; no asset administration or cost reporting.

Every service and query includes `companyId`. Cost and document tabs are
capability-gated independently from general operational availability.

## Future integrations

Approved mileage, fuel, maintenance, downtime, assignment, and cost summaries
are clean inputs for future job costing, utilization analytics, tax-ready
exports, telematics adapters, and accounting-provider adapters. Those adapters
must retain tenant scope and must not make derived provider data authoritative
over raw JunkQuote Pro records.
