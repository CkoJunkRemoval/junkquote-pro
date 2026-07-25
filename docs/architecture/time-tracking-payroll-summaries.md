# Time Tracking and Payroll-Period Summaries

## Boundary

JunkQuote Pro records tenant-scoped work time and produces advisory,
payroll-ready hour summaries. It is not a payroll processor. This module does
not calculate withholding, FICA, unemployment tax, deductions, garnishments,
benefits, net pay, direct deposits, filings, or tax forms. Overtime summaries
are configurable inputs for review, not legal-compliance guarantees.

## Reused systems

- `Employee` remains the workforce aggregate and supplies status, employee
  number, company membership linkage, and restricted compensation history.
- Existing `CompanyMembership` roles are mapped to explicit time capabilities.
- Existing `Job`, `JobAssignment`, and `Crew` records validate labor links.
- Existing `AuditEvent` and `SystemNotification` records carry operational
  history without copying wage details or sensitive correction notes.
- Existing dark cards, button variants, inputs, application layout, and
  responsive navigation are reused by the four timekeeping screens.
- The offline field-mode convention of client idempotency keys, original device
  timestamps, synchronization timestamps, and explicit failures defines the
  clock synchronization boundary.

The legacy `EmployeeTimeEntry` and `FieldTimeEvent` tables are left intact.
They are not silently migrated because neither contains the complete raw-event
history required by this domain.

## Domain

`TimeClockEvent` is append-oriented source data. Clock-in, clock-out,
break-start, and break-end events retain their original timestamp, timezone,
source, creator, optional job/crew/location, and correction linkage. A
correction voids the original for calculations and appends a replacement;
history is never overwritten.

`WorkSession` is the normalized derivation between a valid clock-in and
clock-out. Absolute instants produce gross duration across midnight and DST
changes. Completed break pairs produce unpaid break minutes. Paid breaks and
automatic deductions are configuration placeholders only. Payable minutes are
gross minutes less recorded unpaid breaks.

`WorkSessionAllocation` divides payable minutes among jobs or non-job
categories. Allocations cannot exceed payable session minutes and never change
job prices or invoices. Future job costing should read approved allocations
through the timekeeping service rather than querying raw events.

## Integrity and corrections

The service validates employee, job, crew, and all state transitions in the
same company. Only active workers may create new events. It rejects duplicate
clock-ins, clock-outs without an active shift, invalid break transitions,
negative duration, manual overlap, allocation overflow, and edits within
locked periods. Historical records use restrictive or nullable relations so a
later workforce-status or assignment change does not erase time.

Employees submit `TimeCorrectionRequest` records. Authorized managers review
them. Manual entries and approved corrections require a reason, record the
actor and timestamp, preserve raw events, and write audit history.

## Pay periods, overtime, and timesheets

`CompanyTimekeepingSettings` stores timezone, workweek start, pay-period
frequency, an overtime-minute threshold, and warning placeholders. Weekly,
biweekly, semimonthly, monthly, and custom periods are supported.

A `Timesheet` summarizes one employee and one pay period. Regular and overtime
minutes remain separate and advisory. Default overtime classification is time
above the configured 40-hour workweek threshold. Exceptions identify missing
clock-outs, unallocated time, and edited entries. Submission, approval,
rejection, lock, and unlock are explicit transitions with approval and audit
history. Locked periods require elevated permission to reopen.

## Permissions

- Workers: clock, view their own history, submit their own timesheet, and
  request corrections.
- Managers: team visibility, corrections, allocations, and approval.
- Office: operational team-time management but no payroll export.
- Owners and admins: pay-period configuration, export, lock, and unlock.

Dispatch access does not imply payroll-summary or compensation access.
Compensation references are included only after a separate workforce
compensation capability check. Every query and mutation includes `companyId`.

## Offline synchronization

The server action accepts a client-generated idempotency key, device timestamp,
timezone, and source. The service stores the device instant as the event
instant, records synchronization separately, rejects conflicting lifecycle
events, and returns an existing event for a duplicate key. The v1 UI does not
enable a new offline queue; existing field-mode infrastructure can call this
boundary in a later release. Sync failures must remain explicit and retryable.

## Export and future adapters

CSV export is limited to approved or locked periods, uses a deterministic
column order and quoted escaping, contains no SSNs, and writes an audit event.
Compensation type/rate references are restricted; the export does not calculate
pay. QuickBooks, Gusto, ADP, and Paychex formats are future adapters layered
over the approved summary service.

## Operational follow-ups

Scheduled notification evaluation can use the configured open-break and missed
clock-out thresholds. Jurisdiction-specific meal-break rules, overtime law,
provider-specific payroll formats, and wage calculations require separate
legal/product review and are deliberately outside this module.
