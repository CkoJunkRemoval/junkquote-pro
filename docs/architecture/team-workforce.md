# Team and Workforce Architecture

## Identity boundary

`Employee` is JunkQuote Pro's tenant-owned workforce record. It represents an employee, contractor, or owner and remains the anchor for crews, job assignments, field activity, future time records, and employment history.

`User` is an authentication identity. `Employee.userId` is optional and uses `ON DELETE SET NULL`. A workforce member can exist without login access, unlinking access does not delete employment history, and termination does not disable or delete the linked user implicitly. User access must be managed explicitly through company membership controls.

The existing `Employee` aggregate was extended rather than adding a parallel workforce identity that would duplicate existing crew and job relationships.

## Data model

- `Employee`: identity, contact, worker type, status, job and department, management/default-crew links, driver eligibility, and optional application-user link.
- `WorkforceCompensation`: effective-dated compensation history in integer cents. It never stores withholding or net-pay calculations.
- `WorkforceEmergencyContact`: ordered, management-only contacts.
- `WorkforceCredential`: licenses, safety training, equipment certifications, and expiration state.
- `WorkforceDocument`: private storage metadata with workforce ownership, uploader, category, dates, and optional credential linkage.
- `WorkforceOnboardingItem`: required/custom checklist history with completion actor and optional private document.

Historical child records restrict employee deletion. Workforce status changes never delete job, crew, field, compensation, or document history.

## Employment lifecycle

New records begin in `Onboarding`. Supported states are `Onboarding`, `Active`, `Leave`, `Suspended`, `Terminated`, and `Inactive`. The centralized transition policy rejects unsupported transitions. Termination records date and reason; reactivation clears termination metadata. Completed onboarding records are updated, not deleted.

The default checklist covers personal details, emergency contact, classification, compensation, policy acknowledgment, driver documents, credentials, and application access. Authorized managers can append custom items.

## Compensation history and privacy

Compensation uses `hourlyRateCents` and `annualSalaryCents`, effective start/end dates, and optional commission configuration. New records are rejected when their effective range overlaps existing history.

Only company `Owner` and `Admin` memberships receive compensation view/manage capabilities. Manager, Office, and Crew roles cannot render or mutate compensation. General audit metadata records the compensation type and effective date, never wage amounts or restricted notes.

The legacy `Employee.hourlyRate` field remains temporarily for backward compatibility with existing employee screens. New Team workflows do not write it. A later compatibility migration can remove it after all legacy consumers move to effective-dated compensation.

## Permissions and tenancy

Workforce capabilities map onto existing membership roles:

- Owner/Admin: all workforce capabilities.
- Manager: operational profiles, onboarding, credentials, and non-sensitive document visibility; no compensation.
- Office: operational management, onboarding, credentials, and non-sensitive document management; no compensation.
- Crew: no directory access in this phase.

Server actions resolve the active tenant and acting user. Clients never submit `companyId`. Every service read and linked-record validation includes company ownership. Payroll and Tax documents additionally require compensation visibility.

Self-service is intentionally not exposed in phase one. A future self-service route must resolve the employee through the authenticated `userId` and expose only an allowlisted subset of that employee's own records.

## Private documents

Workforce files use the existing private object-storage provider under:

`workforce-documents/{companyId}/{employeeId}/{generatedFileName}`

Only generated safe keys are stored. There are no public storage URLs. The authenticated private-asset route rechecks company ownership and capabilities, returns `private, no-store` responses, forces attachment disposition, and audits access without logging document contents.

## Application access

Existing company users can be linked only when they have an active membership in the same company and are not linked to another workforce record. Unlinking only clears the association.

Invitation preparation reuses the existing notification boundary and current employee invitation fields. It rejects duplicate user emails and prevents automatic Owner/Admin grants. The repository does not yet contain a complete employee-account activation token workflow, so preparation records intent and sends a non-activating notice; account activation remains an explicit administrator step rather than a second invitation system.

## Audit behavior

The shared `AuditEvent` infrastructure records creation, profile/status changes, compensation lifecycle, credentials, documents, onboarding completion, and application-access linkage. General audit metadata excludes wage amounts, document contents, and emergency-contact details.

## Future module interfaces

### Time tracking

Future timekeeping should reference `employeeId`, with immutable clock events, break events, optional `jobId`, timesheet periods, approval actor, and approval timestamp. Existing `EmployeeTimeEntry` and `FieldTimeEvent` require reconciliation before expansion.

### Payroll summaries

Payroll exports should consume approved time periods plus effective-dated compensation and produce regular/overtime hours, gross-pay inputs, bonuses, commissions, and reimbursements. Reimbursements must remain separately classified and must not be assumed taxable. This module will not calculate withholding, net pay, direct deposit, or tax filings.

### Fleet and equipment

Driver assignment should require an active workforce member, `authorizedDriver`, and non-expired required credentials. Vehicle and equipment checkout records should reference the workforce member while preserving assignment history.

### Tax and restricted records

Payroll-period and year-to-date summaries should be separate immutable aggregates. Employee tax-document status may reference `WorkforceDocument`, but access must use a dedicated restricted capability and private storage. Sensitive identification numbers must use a purpose-built encrypted/tokenized store, never ordinary plaintext model fields.

