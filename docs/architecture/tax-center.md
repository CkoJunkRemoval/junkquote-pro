# Tax Center and Year-End Records

## Boundaries

Tax Center is an organization and retrieval layer. It reads authoritative revenue and payments from Accounts Receivable, approved expenses and receipts from Finance, payroll-period summaries from Timekeeping, and mileage, fuel, and purchases from Fleet. It stores only tax-vault document metadata and year-end checklist state. It does not calculate tax, withholding, deductions, depreciation, generate tax forms, file returns, or provide legal or tax advice.

## Security and tenancy

Every query includes `companyId` from the authenticated server-side tenant context. Client input never supplies a company identifier. Vault bytes use private object storage keys under `tax-documents/{companyId}/{documentId}/`; no public URL is created. Document metadata is resolved under the active tenant before storage access. Upload, review, download, checklist changes, period changes, and exports create tenant-scoped audit records.

## Permissions

The capabilities are `tax.view`, `tax.documents.view`, `tax.documents.manage`, `tax.exports`, `tax.periods.manage`, and `tax.checklist.manage`. Owner and Admin receive them by default. Manager, Office, and Crew receive none. Reporting-period mutations also pass the existing Finance period permission boundary and use the centralized Finance period service.

## Reporting periods

Tax Center reuses `FinancialPeriod` instead of introducing a second lock model. Annual, quarterly, and monthly date ranges may be created in Finance. Lock and unlock operations retain the existing audit trail and unlock-reason requirement.

## Export behavior

The accountant export is a generated ZIP containing expense, income, mileage, payroll-summary, vendor-summary, asset-purchase, receipt-index, and document-manifest CSV files. Generation is deterministic for the current records and audited. The ZIP is returned with private, no-store headers and is not persisted. Private source documents are not embedded.

## Limitations and future integrations

Mileage categories reflect available operational links; unclassified odometer deltas are explicitly reported as unknown, while dump-run and personal-use columns remain zero-value placeholders until authoritative classifications exist. Gross-pay, bonus, and reimbursement summaries remain placeholders because Timekeeping currently records time rather than payroll dollars. Future integrations may add payroll-provider imports, accountant handoff destinations, richer mileage-purpose capture, document retention policies, and tax-form metadata without changing the no-calculation/no-filing boundary.
