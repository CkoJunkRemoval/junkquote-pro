# Platform analytics privacy and retention

Platform Administration uses existing company, membership, onboarding, lifecycle, subscription, audit, and daily usage records. It does not create a raw page-view or request-body event stream.

Meaningful activity excludes authentication success/failure noise and uses authenticated audit actors or existing portal audit events. Daily usage rows contain counts only.

The dashboard and CSV exports must not query or emit customer notes, request bodies, passwords, tokens, document keys or contents, payment credentials, employee compensation, workforce private documents, tax documents, or card data.

Audit-event and daily-usage retention follows the platform database retention policy. If a shorter analytics window is introduced, aggregate or delete expired rows through a separately reviewed background job. Metadata added to analytics events must remain restricted to nonsensitive identifiers and categorical state.

Support impersonation is outside this analytics surface. Platform Administration is read-only except for creation of access/export audit events.
