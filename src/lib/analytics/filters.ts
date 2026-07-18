export type AnalyticsFilters = {
  from: Date;
  to: Date;
  estimatorId?: string;
  crewId?: string;
  customerId?: string;
  category?: string;
  recurringOnly: boolean;
  completedOnly: boolean;
};
export function parseAnalyticsFilters(
  raw: Record<string, string | string[] | undefined>,
  now = new Date(),
): AnalyticsFilters {
  const end = parseDate(raw.to, now);
  const fallback = new Date(end);
  fallback.setUTCDate(fallback.getUTCDate() - 29);
  const from = parseDate(raw.from, fallback);
  const safeFrom = from <= end ? from : fallback;
  safeFrom.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);
  return {
    from: safeFrom,
    to: end,
    estimatorId: value(raw.estimator),
    crewId: value(raw.crew),
    customerId: value(raw.customer),
    category: value(raw.category),
    recurringOnly: value(raw.recurring) === "1",
    completedOnly: value(raw.completed) === "1",
  };
}
function value(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v || undefined;
}
function parseDate(v: string | string[] | undefined, fallback: Date) {
  const raw = value(v);
  if (!raw) return new Date(fallback);
  const parsed = new Date(`${raw}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? new Date(fallback) : parsed;
}
export function filtersToQuery(f: AnalyticsFilters) {
  const p = new URLSearchParams({ from: iso(f.from), to: iso(f.to) });
  if (f.estimatorId) p.set("estimator", f.estimatorId);
  if (f.crewId) p.set("crew", f.crewId);
  if (f.customerId) p.set("customer", f.customerId);
  if (f.category) p.set("category", f.category);
  if (f.recurringOnly) p.set("recurring", "1");
  if (f.completedOnly) p.set("completed", "1");
  return p.toString();
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
