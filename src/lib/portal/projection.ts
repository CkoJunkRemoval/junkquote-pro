export function portalBranding(company: { displayName: string; logoUrl: string | null; primaryColor: string | null; secondaryColor: string | null; phone: string | null; email: string | null; timezone: string; currencyCode: string }) {
  return { displayName: company.displayName, logoUrl: company.logoUrl, primaryColor: company.primaryColor ?? "#2563eb", secondaryColor: company.secondaryColor ?? "#0f172a", phone: company.phone, email: company.email, timezone: company.timezone, currencyCode: company.currencyCode };
}
export function publicJobStatus(status: string) { return status === "InProgress" ? "In progress" : status === "Unscheduled" ? "Scheduling pending" : status; }
export function safePortalJob<T extends { crewNotes?: unknown; completionNotes?: unknown; actualLaborCost?: unknown; profit?: unknown }>(job: T) {
  const safe: Omit<T, "crewNotes" | "completionNotes" | "actualLaborCost" | "profit"> & Partial<T> = { ...job };
  delete safe.crewNotes; delete safe.completionNotes; delete safe.actualLaborCost; delete safe.profit;
  return safe;
}
