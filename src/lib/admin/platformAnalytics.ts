import "server-only";
import type { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const sentStatuses = ["Sent", "Viewed", "Approved", "Scheduled", "InProgress", "Completed", "Invoiced", "Paid", "Declined", "Expired"] as const;
const approvedStatuses = ["Approved", "Scheduled", "InProgress", "Completed", "Invoiced", "Paid"] as const;
const invoiceSentStatuses = ["Sent", "Viewed", "Partial", "Paid", "Overdue"] as const;
const meaningfulEvents = { notIn: ["authentication.login_succeeded", "authorization.failed", "authentication.login_locked"] };
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const daysAgo = (days: number, now = new Date()) => new Date(now.getTime() - days * 86_400_000);
const pct = (value: number, denominator: number) => denominator ? Math.round(value / denominator * 1000) / 10 : 0;
const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return Math.round((sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2) / 3_600_000 * 10) / 10;
};

export type PlatformPeriod = "all" | "7d" | "30d" | "month" | "custom";
export function platformRange(period: PlatformPeriod, from?: string, to?: string, now = new Date()) {
  const end = to && !Number.isNaN(Date.parse(to)) ? new Date(`${to}T23:59:59.999`) : now;
  if (period === "all") return { from: undefined, to: end };
  if (period === "custom" && from && !Number.isNaN(Date.parse(from))) return { from: new Date(`${from}T00:00:00`), to: end };
  if (period === "month") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: end };
  return { from: daysAgo(period === "7d" ? 7 : 30, now), to: end };
}

export async function getPlatformOverview(now = new Date()) {
  const today = startOfDay(now), week = daysAgo(7, now), month = new Date(now.getFullYear(), now.getMonth(), 1);
  const activeAt = async (since: Date) => (await prisma.auditEvent.groupBy({ by: ["companyId"], where: { companyId: { not: null }, createdAt: { gte: since }, eventType: meaningfulEvents } })).length;
  const [companies, users, todayCompanies, weekCompanies, monthCompanies, onboarding, trials, activeSubscriptions, cancelled, pastDue, estimates, sent, approved, jobs, completedJobs, invoicesSent, payments, activeToday, active7, active30, errorsToday, failedJobs] = await Promise.all([
    prisma.company.count(), prisma.user.count(), prisma.company.count({ where: { createdAt: { gte: today } } }),
    prisma.company.count({ where: { createdAt: { gte: week } } }), prisma.company.count({ where: { createdAt: { gte: month } } }),
    prisma.companyOnboarding.count({ where: { completedAt: { not: null } } }),
    prisma.companySubscription.count({ where: { status: "Trialing" } }), prisma.companySubscription.count({ where: { status: "Active" } }),
    prisma.companySubscription.count({ where: { status: "Canceled" } }), prisma.companySubscription.count({ where: { status: "PastDue" } }),
    prisma.estimate.count(), prisma.estimate.count({ where: { status: { in: [...sentStatuses] } } }),
    prisma.estimate.count({ where: { status: { in: [...approvedStatuses] } } }), prisma.job.count(),
    prisma.job.count({ where: { status: "Completed" } }), prisma.invoice.count({ where: { status: { in: [...invoiceSentStatuses] } } }),
    prisma.payment.count(), activeAt(today), activeAt(week), activeAt(daysAgo(30, now)),
    prisma.systemErrorEvent.count({ where: { createdAt: { gte: today } } }),
    prisma.backgroundJob.count({ where: { status: "Failed" } }),
  ]);
  const lastActivity = await prisma.auditEvent.groupBy({ by: ["companyId"], where: { companyId: { not: null }, eventType: meaningfulEvents }, _max: { createdAt: true } });
  const inactive = (days: number) => lastActivity.filter((row) => !row._max.createdAt || row._max.createdAt < daysAgo(days, now)).length + Math.max(0, companies - lastActivity.length);
  return {
    registered: companies, activated: onboarding, paying: activeSubscriptions, churned: cancelled,
    users, companiesToday: todayCompanies, companiesWeek: weekCompanies, companiesMonth: monthCompanies,
    activeTrials: trials, activeSubscriptions, cancelledSubscriptions: cancelled, pastDueSubscriptions: pastDue,
    estimates, estimatesSent: sent, estimatesApproved: approved, approvalRate: pct(approved, sent),
    jobs, completedJobs, invoicesSent, payments, activeToday, active7, active30,
    inactive7: inactive(7), inactive14: inactive(14), inactive30: inactive(30),
    health: { errorsToday, failedJobs },
  };
}

type MilestoneCompany = {
  id: string; createdAt: Date; onboarding: { completedAt: Date | null } | null;
  memberships: { createdAt: Date }[]; customers: { createdAt: Date; properties: { createdAt: Date }[] }[]; estimates: { createdAt: Date; sentAt: Date | null; signedAt: Date | null; status: string }[];
  jobs: { createdAt: Date }[]; invoices: { createdAt: Date; status: string }[]; payments: { createdAt: Date }[];
};
const first = (dates: Array<Date | null | undefined>) => dates.filter((x): x is Date => Boolean(x)).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
function milestones(company: MilestoneCompany) {
  const firstCustomer = first(company.customers.map((x) => x.createdAt));
  const firstProperty = first(company.customers.flatMap((x) => x.properties.map((property) => property.createdAt)));
  const firstEstimate = first(company.estimates.map((x) => x.createdAt));
  const firstSent = first(company.estimates.map((x) => x.sentAt));
  const firstApproved = first(company.estimates.filter((x) => approvedStatuses.includes(x.status as never)).map((x) => x.signedAt ?? x.sentAt ?? x.createdAt));
  return [
    company.createdAt, company.onboarding?.completedAt ?? null,
    company.memberships.length > 1 ? company.memberships[1].createdAt : null,
    firstCustomer, firstProperty, firstEstimate, firstSent, firstApproved,
    first(company.jobs.map((x) => x.createdAt)),
    first(company.invoices.filter((x) => invoiceSentStatuses.includes(x.status as never)).map((x) => x.createdAt)),
    first(company.payments.map((x) => x.createdAt)),
  ];
}
export async function getActivationFunnel() {
  const companies = await prisma.company.findMany({ select: {
    id: true, createdAt: true, onboarding: { select: { completedAt: true } },
    memberships: { orderBy: { createdAt: "asc" }, select: { createdAt: true } },
    customers: { orderBy: { createdAt: "asc" }, select: { createdAt: true, properties: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } } } },
    estimates: { orderBy: { createdAt: "asc" }, select: { createdAt: true, sentAt: true, signedAt: true, status: true } },
    jobs: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } },
    invoices: { orderBy: { createdAt: "asc" }, select: { createdAt: true, status: true } },
    payments: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } },
  } });
  const labels = ["Company registered", "Onboarding completed", "First team member added", "First customer added", "First property added", "First estimate created", "First estimate sent", "First estimate approved", "First job created", "First invoice sent", "First payment recorded"];
  const rows = companies.map((company) => ({ company, dates: milestones(company) }));
  return labels.map((label, index) => {
    const reached = rows.filter((row) => row.dates[index]);
    const durations = reached.map((row) => row.dates[index]!.getTime() - row.company.createdAt.getTime()).filter((x) => x >= 0);
    const previous = index ? rows.filter((row) => row.dates[index - 1]).length : companies.length;
    return { label, companies: reached.length, previousConversion: pct(reached.length, previous), overallConversion: pct(reached.length, companies.length), medianHours: median(durations) };
  });
}

export type CompanyDirectoryFilters = { search?: string; plan?: SubscriptionPlan; status?: SubscriptionStatus; from?: Date; to?: Date; stage?: string; inactiveDays?: number };
export async function getPlatformCompanies(filters: CompanyDirectoryFilters = {}) {
  const activity = await prisma.auditEvent.groupBy({ by: ["companyId"], where: { companyId: { not: null }, eventType: meaningfulEvents }, _max: { createdAt: true } });
  const lastByCompany = new Map(activity.map((x) => [x.companyId, x._max.createdAt]));
  const companies = await prisma.company.findMany({
    where: {
      name: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
      createdAt: filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined,
      subscription: filters.plan || filters.status ? { is: { plan: filters.plan, status: filters.status } } : undefined,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 500,
    select: {
      id: true, name: true, createdAt: true, active: true, onboarding: { select: { completedAt: true } },
      subscription: { select: { plan: true, status: true, trialEnd: true } },
      memberships: { select: { id: true } }, estimates: { select: { id: true, sentAt: true, signedAt: true, status: true } },
      _count: { select: { users: true, estimates: true, jobs: true, invoices: true, customers: true } },
    },
  });
  return companies.map((company) => {
    const stage = company._count.invoices ? "Invoice" : company._count.jobs ? "Job" : company.estimates.some((x) => approvedStatuses.includes(x.status as never)) ? "Approved" : company.estimates.some((x) => x.sentAt) ? "Sent" : company._count.estimates ? "Estimate" : company._count.customers ? "Customer" : company.onboarding?.completedAt ? "Onboarded" : "Registered";
    return { ...company, activationStage: stage, lastActivity: lastByCompany.get(company.id) ?? null, seatUsage: company.memberships.length, approvals: company.estimates.filter((x) => approvedStatuses.includes(x.status as never)).length };
  }).filter((company) => (!filters.stage || company.activationStage === filters.stage) && (!filters.inactiveDays || !company.lastActivity || company.lastActivity < daysAgo(filters.inactiveDays)));
}

export async function getPlatformCompanySummary(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: {
    id: true, name: true, createdAt: true, active: true, subscription: true,
    settings: { select: { smartPricingEnabled: true, portalBrandingEnabled: true, integrationSettings: true } },
    featureFlags: { select: { key: true, enabled: true } }, usageMetrics: { orderBy: { date: "desc" }, take: 30 },
    onboarding: { select: { completedAt: true, completedSections: true } },
    _count: { select: { users: true, estimates: true, jobs: true, invoices: true, payments: true, fleetAssets: true, timeClockEvents: true } },
  } });
  if (!company) return null;
  const recent = await prisma.auditEvent.findMany({ where: { companyId, eventType: meaningfulEvents }, orderBy: { createdAt: "desc" }, take: 25, select: { createdAt: true, eventType: true, entityType: true } });
  const lastActivity = recent[0]?.createdAt ?? null;
  return { ...company, recent, lastActivity, warnings: [
    ...(!company.onboarding?.completedAt ? ["Onboarding is incomplete."] : []),
    ...(!company.subscription ? ["No subscription record is configured."] : []),
    ...(!company.active ? ["The company account is inactive."] : []),
    ...(company.subscription?.status === "PastDue" ? ["The subscription is past due."] : []),
  ] };
}

export async function getPlatformUsage(now = new Date()) {
  const since = daysAgo(30, now);
  const [daily, activity, timeCompanies, fleetCompanies, financeCompanies, taxCompanies, portalCompanies, signups, invoices, estimateEvents] = await Promise.all([
    prisma.companyUsageDaily.findMany({ where: { date: { gte: daysAgo(30, now) } }, orderBy: { date: "asc" } }),
    prisma.auditEvent.findMany({ where: { createdAt: { gte: since }, eventType: meaningfulEvents }, select: { createdAt: true, actingUserId: true, companyId: true } }),
    prisma.timeClockEvent.groupBy({ by: ["companyId"] }), prisma.fleetAsset.groupBy({ by: ["companyId"] }),
    prisma.businessExpense.groupBy({ by: ["companyId"] }), prisma.taxChecklistItem.groupBy({ by: ["companyId"] }),
    prisma.auditEvent.groupBy({ by: ["companyId"], where: { portalAccessId: { not: null } } }),
    prisma.company.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.invoice.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.estimate.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, status: true, sentAt: true } }),
  ]);
  const byDay = new Map<string, { date: string; activeUsers: number; estimates: number; jobs: number; invoices: number; signups: number; companies: number; estimatesSent: number; estimatesApproved: number; approvalRate: number }>();
  const emptyDay = (date: string) => ({ date, activeUsers: 0, estimates: 0, jobs: 0, invoices: 0, signups: 0, companies: 0, estimatesSent: 0, estimatesApproved: 0, approvalRate: 0 });
  for (const row of daily) {
    const key = row.date.toISOString().slice(0, 10), value = byDay.get(key) ?? emptyDay(key);
    value.estimates += row.estimates; value.jobs += row.jobs; byDay.set(key, value);
  }
  const actorsByDay = new Map<string, Set<string>>(), companiesByDay = new Map<string, Set<string>>();
  for (const event of activity) {
    const key = event.createdAt.toISOString().slice(0, 10);
    if (event.actingUserId) (actorsByDay.get(key) ?? actorsByDay.set(key, new Set()).get(key)!).add(event.actingUserId);
    if (event.companyId) (companiesByDay.get(key) ?? companiesByDay.set(key, new Set()).get(key)!).add(event.companyId);
  }
  const add = (date: Date, field: "invoices" | "signups") => {
    const key = date.toISOString().slice(0, 10), value = byDay.get(key) ?? emptyDay(key);
    value[field] += 1; byDay.set(key, value);
  };
  signups.forEach((x) => add(x.createdAt, "signups")); invoices.forEach((x) => add(x.createdAt, "invoices"));
  for (const estimate of estimateEvents) {
    const key = estimate.createdAt.toISOString().slice(0, 10), value = byDay.get(key) ?? emptyDay(key);
    if (estimate.sentAt || sentStatuses.includes(estimate.status as never)) value.estimatesSent += 1;
    if (approvedStatuses.includes(estimate.status as never)) value.estimatesApproved += 1;
    byDay.set(key, value);
  }
  for (const [key, actors] of actorsByDay) {
    const value = byDay.get(key) ?? emptyDay(key);
    value.activeUsers = actors.size; value.companies = companiesByDay.get(key)?.size ?? 0; byDay.set(key, value);
  }
  const monthlyActors = new Set(activity.flatMap((x) => x.actingUserId ? [x.actingUserId] : []));
  const weeklyActors = new Set(activity.filter((x) => x.createdAt >= daysAgo(7, now)).flatMap((x) => x.actingUserId ? [x.actingUserId] : []));
  for (const value of byDay.values()) value.approvalRate = pct(value.estimatesApproved, value.estimatesSent);
  return { daily: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)), weeklyActiveUsers: weeklyActors.size, monthlyActiveUsers: monthlyActors.size, moduleCompanies: { time: timeCompanies.length, fleet: fleetCompanies.length, finance: financeCompanies.length, tax: taxCompanies.length, portal: portalCompanies.length } };
}

export async function getPlatformSubscriptions() {
  const rows = await prisma.companySubscription.groupBy({ by: ["status"], _count: true });
  const plans = await prisma.companySubscription.groupBy({ by: ["plan"], _count: true });
  return { statuses: rows.map((x) => ({ label: x.status, value: x._count })), plans: plans.map((x) => ({ label: x.plan, value: x._count })) };
}

export async function getPlatformConversions(range: { from?: Date; to: Date }) {
  const createdAt = { gte: range.from, lte: range.to };
  const estimates = await prisma.estimate.findMany({ where: { createdAt }, select: { status: true, createdAt: true, sentAt: true, signedAt: true, job: { select: { id: true } } } });
  const invoices = await prisma.invoice.findMany({ where: { createdAt }, select: { status: true, payments: { select: { id: true } } } });
  return calculateConversionMetrics(estimates, invoices);
}
export function calculateConversionMetrics(
  estimates: Array<{ status: string; sentAt: Date | null; signedAt: Date | null; job: { id: string } | null }>,
  invoices: Array<{ status: string; payments: Array<{ id: string }> }>,
) {
  const sent = estimates.filter((x) => sentStatuses.includes(x.status as never) || x.sentAt), approved = estimates.filter((x) => approvedStatuses.includes(x.status as never));
  const viewed = estimates.filter((x) => x.status === "Viewed"), rejected = estimates.filter((x) => x.status === "Declined");
  const approvalHours = approved.filter((x) => x.sentAt && x.signedAt).map((x) => x.signedAt!.getTime() - x.sentAt!.getTime());
  const sentInvoices = invoices.filter((x) => invoiceSentStatuses.includes(x.status as never));
  return {
    created: estimates.length, sent: sent.length, viewed: viewed.length, approved: approved.length, rejected: rejected.length,
    approvalRate: pct(approved.length, sent.length), medianSentToApprovedHours: median(approvalHours),
    estimateToJobRate: pct(estimates.filter((x) => x.job).length, estimates.length),
    invoiceToPaymentRate: pct(sentInvoices.filter((x) => x.payments.length).length, sentInvoices.length),
    denominators: { approval: "approved estimates / estimates sent", estimateToJob: "estimates with jobs / estimates created", invoiceToPayment: "sent invoices with a payment / invoices sent" },
  };
}

export function csv(rows: Array<Record<string, string | number | boolean | null | undefined>>) {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    const safe = typeof value === "string" && /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return `${columns.map(escape).join(",")}\r\n${rows.map((row) => columns.map((column) => escape(row[column])).join(",")).join("\r\n")}\r\n`;
}
