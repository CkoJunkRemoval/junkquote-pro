# Company Hub and Administration

Company Hub is the administrative entry point for company-wide identity,
locations, coverage, documents, defaults, notifications, permission visibility,
feature availability, and subscription visibility. Every server operation
resolves `companyId` from the authenticated active membership.

## Reused sources of truth

- `Company` and `CompanySettings` own identity, branding, regional preferences,
  communication branding, portal branding, and core defaults.
- `CompanyMembership` and module capability functions supply seats, roles, and
  the read-only permission matrix.
- `CompanySubscription`, `CompanyUsageDaily`, and `FeatureFlag` supply the
  read-only subscription view. The Hub never mutates billing.
- Fleet, Workforce, Timekeeping, Finance, Tax, Dispatch, Estimate, and Customer
  Portal services remain authoritative for their domain rules.
- Existing private object storage backs the document vault.
- Existing audit events record administrative writes.

## Additive records

`BusinessLocation` stores company-scoped operating locations, local contact
information, hours, status, and Fleet/Workforce record references. It does not
duplicate assets or employees.

`ServiceAreaRule` remains the coverage source and adds location, availability,
and radius metadata. `distanceCharge` is the travel-surcharge placeholder.

`CompanyDocument` reserves private-object metadata by category. Upload, listing,
and the server action are intentionally disabled until authenticated,
tenant-authorized delivery exists. No document metadata, object key, or public
URL is rendered.

Additional `CompanySettings` JSON namespaces reserve channel branding,
operational defaults, notifications, and integration configuration. No
third-party integration is activated.

## Security

Hub pages and writes require Owner or Admin membership. Services receive an
explicit trusted company ID; client input never chooses a tenant. Record updates
are constrained by record ID and company ID. Permissions and subscription are
read-only.

## Routes

The responsive dark Hub lives at `/settings/company`, with Branding, Locations,
Service Areas, Documents, Notifications, Operational Defaults, Permissions, and
Subscription pages. `/settings` retains the staged-logo and core profile editor.

## Deferred

- Coverage maps and geocoding.
- Structured weekly hours and assignment pickers.
- Light/dark logo upload and per-channel template editors.
- Authenticated tenant-authorized upload/download, then renewal reminders.
- SMS/push delivery, third-party integrations, payment processing, and billing.
- Permission editing.
