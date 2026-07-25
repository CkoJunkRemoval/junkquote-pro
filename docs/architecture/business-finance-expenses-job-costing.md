# Business Finance, Expenses, Receipts, and Job Costing

## Scope and boundary

JunkQuote Pro finance is an operational reporting module. It is not a general
ledger, tax-preparation product, payroll-tax calculator, bill-payment service,
or source of legal or tax advice.

The authoritative operational records remain:

- invoices, payments, refunds, and invoice adjustments for revenue;
- approved work sessions and job allocations for labor time;
- effective workforce compensation history for authorized hourly-rate inputs;
- fuel entries, asset maintenance, disposal records, mileage, and asset purchase
  fields for fleet and disposal activity.

Finance records categorize, review, document, and allocate those costs. A
`BusinessExpense` can point to an authoritative source with its source type,
source record ID, and typed fuel or maintenance relation. The unique
company/source constraint prevents duplicate source imports. Finance never
silently updates an invoice, payment, time record, compensation record, fuel
entry, maintenance record, or asset.

## Tenant model and permissions

Every finance query and mutation receives an explicit `companyId` resolved from
the authenticated membership. UI components do not call Prisma.

- Owner and Admin have the complete finance capability set.
- Manager can view and enter expenses, receipts, vendors, recurring costs, and
  job-cost summaries, but does not receive hidden aggregate cost values by
  default.
- Office can enter expenses and receipts and view vendors, but cannot approve
  expenses, see compensation, or view profitability.
- Crew receives no finance capability.
- Customer portal routes never expose finance records.

Job-cost pages require both `finance.jobCosting.view` and
`finance.costs.view`. Individual wage rates are never returned to those pages;
only aggregate advisory labor cost is returned.

## Categories and vendors

Each company receives its own protected system category rows. This keeps unique
constraints and historical relationships simple while allowing custom
subcategories. System names cannot be changed through the service. Any category
can be made inactive without deleting historical expense links.

Vendors are tenant-scoped and have a normalized-name unique constraint.
Duplicate detection is advisory. There is no destructive automatic merge.
Ordinary vendor fields must not contain full tax identifiers, payment cards, or
banking credentials; reference-only fields exist for a future secure provider.

## Expense lifecycle and corrections

The lifecycle is:

`Draft → NeedsReview → Approved`

Reviewers may reject a submitted expense with a reason. Authorized users may
void an expense with a reason. Approved history is not hard-deleted. Material
corrections use `ExpenseRevision`, preserving both the prior and revised
financial values, the reason, actor ID, sequence, and timestamp. Every lifecycle
transition is transactional and audited.

Amounts use integer cents. Subtotal, tax, tip, and fee must be non-negative and
sum exactly to total. Credits and refunds must use explicit source records or
income adjustments rather than negative expense rows.

## Allocations

`ExpenseAllocation` is a normalized partial allocation to a job, customer,
employee, crew, asset, location, future department, or future accounting class.
Services verify relational targets belong to the same company and prevent total
allocations from exceeding the expense. Inactive targets remain referenced.

Approved values and allocations inside a locked reporting period cannot be
changed through ordinary service operations.

## Receipts and private documents

Finance documents use the existing private object-storage abstraction under:

`finance-documents/{companyId}/{documentId}/{opaque filename}`

Allowed v1 files are PDF, JPEG, PNG, and WebP up to 10 MB. Storage keys are
never sent through list/detail projections. Downloads use an authenticated
tenant-authorized route, `private, no-store` responses, and an access audit.
Finance documents never appear in the customer portal. OCR and automatic
receipt extraction are future work.

## Recurring obligations

Recurring rows track reminders and expected costs. They never initiate payment
or mark an expense paid. When draft generation is enabled, a transaction uses a
deterministic source ID formed from the recurring record and due-date occurrence.
The company/source unique constraint makes retries idempotent. The next due date
advances only with successful draft creation.

## Revenue summaries

Finance summary services read invoices, captured payments, refunds, discounts,
and processing fees directly. Manual income adjustments are explicit,
permission-restricted, separately labeled, and audited. No duplicate revenue
ledger is maintained.

## Advisory job costing

Job costing reports both invoiced and collected profitability:

- invoice total, captured payments, invoice discounts, and refunds;
- aggregate labor cost from approved job allocations and the effective hourly
  compensation rate;
- configurable overtime is a future setting; v1 uses a clearly advisory 1.5
  multiplier for overtime-eligible hourly records;
- direct job-linked fuel not already represented by an approved finance expense;
- disposal records and approved job allocations for fuel, disposal,
  maintenance, equipment, subcontractors, direct purchases, and other costs.

The result includes direct cost, operational gross profit and margin,
revenue/cost per labor hour, missing-data labels, a completeness score, and an
unallocated-cost warning. Missing salary allocation, hourly rates, invoices, or
approved labor are reported rather than fabricated. These values are not GAAP
net income and never modify invoices or payroll records.

Full vehicle cost-per-mile allocation, automatic maintenance spreading, salary
allocation, commission allocation, and payroll burden remain future service
boundaries.

## Reporting periods, notifications, and audit

Periods support open, review, and locked states for calendar or custom ranges.
Locks are operational edit controls, not accounting closes. Elevated unlock
requires a reason and an audit record.

The module reuses in-app notifications with a one-day source/title
deduplication window for expense review/rejection and period locking. Recurring
reminder scheduling and failed-generation delivery can be added to the existing
background queue without changing finance records.

Audit events cover categories, vendors, expense lifecycle, revisions,
allocations, receipt upload/access, recurring generation, manual income
adjustments, periods, and exports. Metadata excludes wage details, document
contents, banking credentials, and full tax identifiers.

## Exports and integrations

CSV creation uses deterministic columns and RFC-style escaping. Export services
are tenant-scoped, capability-protected by their action boundary, and audited.
The output is accountant-ready operational data, not a filing-ready tax return.

Provider adapters for QuickBooks, Xero, Gusto, ADP, Paychex, banking, and bill
payment remain future work.

## Future Tax Center interface

A future Tax Center may consume read-only projections of approved expenses,
private receipt availability, income summaries, mileage/fuel/maintenance,
asset purchases, payroll-period summaries, tax-document status, and period
exports. It must add its own authorization and compliance review. Tax
calculations, depreciation, W-2/1099 generation, and filing are explicitly
outside this foundation.
