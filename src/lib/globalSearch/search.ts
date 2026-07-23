import "server-only";
import { createHash } from "node:crypto";
import type { MembershipRole, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { GlobalSearchResponse, GlobalSearchResult } from "./types";

export type SearchIdentity = { companyId: string; userId: string; role: MembershipRole };
const LIMIT = 5;
const activeEstimateStatuses = ["Draft", "Sent", "Viewed", "Approved"] as const;
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const words = (query: string) => query.trim().replace(/[.,#]/g, " ").replace(/\s+/g, " ");
const contains = (query: string) => ({ contains: query, mode: "insensitive" as const });
const personWhere = (query: string) => {
  const terms = words(query).split(" ").filter(Boolean);
  return { AND: terms.map((term) => ({ OR: [{ firstName: contains(term) }, { lastName: contains(term) }] })) };
};
function historyScope(identity: SearchIdentity) {
  return createHash("sha256").update(`${identity.companyId}:${identity.userId}`).digest("hex").slice(0, 16);
}
function naturalIntent(raw: string, now: Date) {
  const query = words(raw), lower = query.toLowerCase();
  const identifier = lower.match(/\b(est|inv|job)\s*-?\s*(\d+)\b/i);
  const tomorrowStart = new Date(now); tomorrowStart.setDate(tomorrowStart.getDate() + 1); tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart); tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    query,
    overdueInvoice: lower.includes("overdue") && lower.includes("invoice"),
    scheduledTomorrow: lower.includes("scheduled") && lower.includes("tomorrow"),
    paidThisMonth: lower.includes("paid") && lower.includes("this month"),
    identifier: identifier ? `${identifier[1].toUpperCase()}-${identifier[2]}` : query,
    estimateStatuses: lower.includes("awaiting approval") ? ["Sent", "Viewed"] as const : lower === "approved" ? ["Approved"] as const : lower === "draft" ? ["Draft"] as const : null,
    jobStatus: lower === "scheduled" ? "Scheduled" as const : lower === "in progress" ? "InProgress" as const : lower === "completed" ? "Completed" as const : null,
    invoiceStatus: lower === "paid" ? "Paid" as const : lower === "partial" ? "Partial" as const : lower === "sent" ? "Sent" as const : null,
    tomorrowStart, tomorrowEnd, monthStart,
  };
}
const group = (rows: GlobalSearchResult[]) => rows.reduce<GlobalSearchResponse["groups"]>((result, row) => {
  (result[row.category] ??= []).push(row);
  return result;
}, {});
async function runCategory<T>(category: string, query: () => Promise<T[]>): Promise<T[]> {
  try { return await query(); }
  catch (error) {
    console.error("GLOBAL_SEARCH_CATEGORY_FAILED", { category, error: error instanceof Error ? error.name : "UnknownError" });
    return [];
  }
}

async function assignedScope(identity: SearchIdentity) {
  if (identity.role !== "Crew") return null;
  const employee = await prisma.employee.findFirst({ where: { companyId: identity.companyId, userId: identity.userId, status: "Active" }, select: { id: true, crewMembers: { select: { crewId: true } } } });
  if (!employee) return { jobIds: [], customerIds: [], propertyIds: [], estimateIds: [] };
  const jobs = await prisma.job.findMany({ where: { companyId: identity.companyId, assignments: { some: { OR: [{ employeeId: employee.id }, { crewId: { in: employee.crewMembers.map((row) => row.crewId) } }] } } }, select: { id: true, customerId: true, propertyId: true, estimateId: true }, take: 250 });
  return { jobIds: jobs.map((row) => row.id), customerIds: [...new Set(jobs.map((row) => row.customerId))], propertyIds: [...new Set(jobs.map((row) => row.propertyId))], estimateIds: [...new Set(jobs.map((row) => row.estimateId))] };
}

export async function globalSearch(identity: SearchIdentity, rawQuery: string, now = new Date()): Promise<GlobalSearchResponse> {
  const intent = naturalIntent(rawQuery, now), recent = intent.query.length < 2, assigned = await assignedScope(identity);
  const companyId = identity.companyId;
  const customerScope: Prisma.CustomerWhereInput = { companyId, ...(assigned ? { id: { in: assigned.customerIds } } : {}) };
  const propertyScope: Prisma.PropertyWhereInput = { customer: { companyId }, ...(assigned ? { id: { in: assigned.propertyIds } } : {}) };
  const estimateScope: Prisma.EstimateWhereInput = { companyId, ...(assigned ? { id: { in: assigned.estimateIds } } : {}) };
  const jobScope: Prisma.JobWhereInput = { companyId, ...(assigned ? { id: { in: assigned.jobIds } } : {}) };
  const search = intent.query;
  const [customers, properties, estimates, jobs] = await Promise.all([
    runCategory("Customers", () => prisma.customer.findMany({ where: { ...customerScope, ...(recent ? {} : { OR: [personWhere(search), { email: contains(search) }, { phone: contains(search) }, ...(!assigned ? [{ notes: contains(search) }] : [])] }) }, orderBy: { updatedAt: "desc" }, take: LIMIT, select: { id: true, firstName: true, lastName: true, phone: true, email: true } })),
    runCategory("Properties", () => prisma.property.findMany({ where: { ...propertyScope, ...(recent ? {} : { OR: [{ nickname: contains(search) }, { address: contains(search) }, { city: contains(search) }, { zip: contains(search) }, { propertyType: contains(search) }, { accessNotes: contains(search) }, { customer: personWhere(search) }] }) }, orderBy: { updatedAt: "desc" }, take: LIMIT, select: { id: true, address: true, city: true, state: true, propertyType: true, customer: { select: { firstName: true, lastName: true } } } })),
    runCategory("Estimates", () => prisma.estimate.findMany({ where: { ...estimateScope, ...(recent ? {} : { OR: [{ displayNumber: contains(intent.identifier) }, ...(intent.estimateStatuses ? [{ status: { in: [...intent.estimateStatuses] } }] : []), { customer: personWhere(search) }, { property: { address: contains(search) } }, { jobSites: { some: { OR: [{ name: contains(search) }, { customerNotes: contains(search) }] } } }] }) }, orderBy: { updatedAt: "desc" }, take: LIMIT, select: { id: true, displayNumber: true, status: true, customer: { select: { firstName: true, lastName: true } } } })),
    runCategory("Jobs", () => prisma.job.findMany({ where: { ...jobScope, ...(intent.scheduledTomorrow ? { status: "Scheduled", scheduledStart: { gte: intent.tomorrowStart, lt: intent.tomorrowEnd } } : recent ? {} : { OR: [{ jobNumber: contains(intent.identifier) }, ...(intent.jobStatus ? [{ status: intent.jobStatus }] : []), { customer: personWhere(search) }, { property: { address: contains(search) } }, { crewNotes: contains(search) }, { customerNotes: contains(search) }] }) }, orderBy: { updatedAt: "desc" }, take: LIMIT, select: { id: true, jobNumber: true, status: true, scheduledStart: true, property: { select: { address: true } } } })),
  ]);
  const privileged = identity.role !== "Crew";
  const [invoices, payments, crew, messages] = privileged ? await Promise.all([
    runCategory("Invoices", () => prisma.invoice.findMany({ where: { companyId, ...(intent.overdueInvoice ? { balanceDue: { gt: 0 }, dueDate: { lt: now }, status: { notIn: ["Paid", "Cancelled"] } } : intent.paidThisMonth ? { status: "Paid", paidDate: { gte: intent.monthStart } } : recent ? {} : { OR: [{ displayNumber: contains(intent.identifier) }, ...(intent.invoiceStatus ? [{ status: intent.invoiceStatus }] : []), { customer: personWhere(search) }, { property: { address: contains(search) } }, { notes: contains(search) }] }) }, orderBy: { updatedAt: "desc" }, take: LIMIT, select: { id: true, displayNumber: true, invoiceNumber: true, status: true, balanceDue: true, dueDate: true, customer: { select: { firstName: true, lastName: true } } } })),
    runCategory("Payments", () => prisma.payment.findMany({ where: { companyId, ...(intent.paidThisMonth ? { paymentDate: { gte: intent.monthStart } } : recent ? {} : { OR: [{ referenceNumber: contains(search) }, { notes: contains(search) }, { invoice: { OR: [{ displayNumber: contains(search) }, { customer: personWhere(search) }] } }] }) }, orderBy: { paymentDate: "desc" }, take: LIMIT, select: { id: true, amount: true, paymentDate: true, method: true, invoice: { select: { id: true, displayNumber: true, invoiceNumber: true } } } })),
    runCategory("Crew", () => prisma.employee.findMany({ where: { companyId, status: "Active", ...(recent ? {} : { OR: [personWhere(search), { email: contains(search) }, { phone: contains(search) }] }) }, orderBy: { updatedAt: "desc" }, take: LIMIT, select: { id: true, firstName: true, lastName: true, role: true, phone: true } })),
    runCategory("Messages", () => prisma.customerMessageThread.findMany({ where: { companyId, ...(recent ? {} : { OR: [{ subject: contains(search) }, { messages: { some: { body: contains(search) } } }] }) }, orderBy: { updatedAt: "desc" }, take: LIMIT, select: { id: true, subject: true, customerId: true, estimateId: true, jobId: true, invoiceId: true } })),
  ]) : [[], [], [], []];
  const rows: GlobalSearchResult[] = [
    ...customers.map((row) => ({ id: row.id, category: "Customers" as const, title: `${row.firstName} ${row.lastName}`, context: row.phone || row.email || "Customer", href: `/customers/${row.id}` })),
    ...properties.map((row) => ({ id: row.id, category: "Properties" as const, title: `${row.address}, ${row.city}`, context: `${row.customer.firstName} ${row.customer.lastName} · ${row.propertyType || "Property"}`, href: `/properties/${row.id}` })),
    ...estimates.map((row) => ({ id: row.id, category: "Estimates" as const, title: row.displayNumber || "Estimate", context: `${row.status} · ${row.customer.firstName} ${row.customer.lastName}`, href: `/estimates/${row.id}` })),
    ...jobs.map((row) => ({ id: row.id, category: "Jobs" as const, title: row.jobNumber || "Job", context: `${row.status}${row.scheduledStart ? ` ${date.format(row.scheduledStart)}` : ""} · ${row.property.address}`, href: assigned ? `/field/jobs/${row.id}` : `/jobs/${row.id}` })),
    ...invoices.map((row) => ({ id: row.id, category: "Invoices" as const, title: row.displayNumber || `INV-${row.invoiceNumber}`, context: `${money.format(row.balanceDue)} due · ${row.status}`, href: `/invoices/${row.id}` })),
    ...payments.map((row) => ({ id: row.id, category: "Payments" as const, title: `${money.format(row.amount)} payment`, context: `${row.method} · ${row.invoice.displayNumber || `INV-${row.invoice.invoiceNumber}`}`, href: `/invoices/${row.invoice.id}#payments` })),
    ...crew.map((row) => ({ id: row.id, category: "Crew" as const, title: `${row.firstName} ${row.lastName}`, context: `${row.role}${row.phone ? ` · ${row.phone}` : ""}`, href: `/employees/${row.id}` })),
    ...messages.map((row) => ({ id: row.id, category: "Messages" as const, title: row.subject, context: "Customer message", href: row.invoiceId ? `/invoices/${row.invoiceId}` : row.jobId ? `/jobs/${row.jobId}` : row.estimateId ? `/estimates/${row.estimateId}` : `/customers/${row.customerId}` })),
  ];
  return { query: intent.query, groups: group(rows), total: rows.length, historyScope: historyScope(identity), recent };
}

export const globalSearchLimits = { minimumLength: 2, perCategory: LIMIT, crewAssignmentCap: 250 };
export const searchableEstimateStatuses = activeEstimateStatuses;
