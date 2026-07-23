import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { propertyTypes, type PropertyInput } from "./propertyTypes";

export type PropertySort = "name_asc" | "name_desc" | "customer_asc" | "recent_service" | "created_desc";
export { propertyTypes, type PropertyInput } from "./propertyTypes";
export type PropertyListInput = {
  search?: string; propertyType?: string; status?: "active" | "inactive";
  upcoming?: boolean; openEstimate?: boolean; city?: string; serviceArea?: string;
  recentlyServiced?: boolean; sort?: PropertySort; page?: number; pageSize?: number;
};

const text = (value?: string) => value?.trim() || null;
export function normalizeAddress(input: Pick<PropertyInput, "address" | "addressLine2" | "city" | "state" | "zip" | "country">) {
  return [input.address, input.addressLine2, input.city, input.state, input.zip, input.country || "US"]
    .filter(Boolean).join(" ").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}
function validate(input: PropertyInput) {
  if (!input.customerId || !input.address.trim() || !input.city.trim() || !input.state.trim() || !input.zip.trim()) {
    throw new Error("Customer, street address, city, state, and ZIP are required.");
  }
  if (input.propertyType && !propertyTypes.includes(input.propertyType as typeof propertyTypes[number])) {
    throw new Error("Unsupported property type.");
  }
}
function data(input: PropertyInput) {
  validate(input);
  return {
    customerId: input.customerId, nickname: text(input.nickname), propertyType: text(input.propertyType),
    address: input.address.trim(), addressLine2: text(input.addressLine2), city: input.city.trim(),
    state: input.state.trim().toUpperCase(), zip: input.zip.trim(), country: input.country?.trim().toUpperCase() || "US",
    normalizedAddress: normalizeAddress(input), gateCode: text(input.gateCode), parkingNotes: text(input.parkingNotes),
    accessNotes: text(input.accessNotes), hazardNotes: text(input.hazardNotes), notes: text(input.notes),
    serviceArea: text(input.serviceArea), active: input.active ?? true,
  };
}
async function customerInCompany(companyId: string, customerId: string) {
  return prisma.customer.findFirst({ where: { id: customerId, companyId }, select: { id: true } });
}
export async function findDuplicateProperty(companyId: string, input: PropertyInput, excludeId?: string) {
  return prisma.property.findFirst({
    where: { normalizedAddress: normalizeAddress(input), customer: { companyId }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, nickname: true, address: true, city: true, state: true, zip: true },
  });
}
export async function createManagedProperty(companyId: string, actingUserId: string, input: PropertyInput) {
  if (!(await customerInCompany(companyId, input.customerId))) throw new Error("Customer not found.");
  const duplicate = await findDuplicateProperty(companyId, input);
  if (duplicate) throw new Error("A property with this address already exists.");
  return prisma.$transaction(async (tx) => {
    const property = await tx.property.create({ data: data(input) });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "Property Created", entityType: "Property", entityId: property.id } });
    return property;
  });
}
export async function updateManagedProperty(companyId: string, actingUserId: string, propertyId: string, input: PropertyInput) {
  const existing = await prisma.property.findFirst({ where: { id: propertyId, customer: { companyId } } });
  if (!existing) throw new Error("Property not found.");
  if (!(await customerInCompany(companyId, input.customerId))) throw new Error("Customer not found.");
  if (await findDuplicateProperty(companyId, input, propertyId)) throw new Error("A property with this address already exists.");
  const next = data(input);
  const changes = {
    addressChanged: existing.normalizedAddress !== next.normalizedAddress,
    customerReassigned: existing.customerId !== next.customerId,
    accessCodeChanged: existing.gateCode !== next.gateCode,
    hazardNotesChanged: existing.hazardNotes !== next.hazardNotes,
  };
  return prisma.$transaction(async (tx) => {
    const property = await tx.property.update({ where: { id: existing.id }, data: next });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "Property Updated", entityType: "Property", entityId: property.id, metadata: changes } });
    return property;
  });
}
export async function setPropertyArchived(companyId: string, actingUserId: string, propertyId: string, archived: boolean) {
  const property = await prisma.property.findFirst({ where: { id: propertyId, customer: { companyId } }, select: { id: true } });
  if (!property) throw new Error("Property not found.");
  return prisma.$transaction(async (tx) => {
    const result = await tx.property.update({ where: { id: property.id }, data: { active: !archived, archivedAt: archived ? new Date() : null } });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: archived ? "Property Archived" : "Property Reactivated", entityType: "Property", entityId: property.id } });
    return result;
  });
}
export async function deleteProperty(companyId: string, actingUserId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, customer: { companyId } },
    select: { id: true, _count: { select: { estimates: true, jobs: true, invoices: true, servicePlans: true } } },
  });
  if (!property) throw new Error("Property not found.");
  const related = Object.values(property._count).reduce((sum, count) => sum + count, 0);
  const activity = await prisma.auditEvent.count({ where: { companyId, entityType: "Property", entityId: property.id } });
  if (related || activity > 1) throw new Error("This property has business history and must be archived instead of deleted.");
  return prisma.$transaction(async (tx) => {
    await tx.auditEvent.deleteMany({ where: { companyId, entityType: "Property", entityId: property.id } });
    return tx.property.delete({ where: { id: property.id } });
  });
}

export function normalizePropertyListInput(input: PropertyListInput) {
  const page = Math.max(1, input.page ?? 1), pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  return { ...input, search: text(input.search) ?? undefined, city: text(input.city) ?? undefined, serviceArea: text(input.serviceArea) ?? undefined, page, pageSize, skip: (page - 1) * pageSize, sort: input.sort ?? "name_asc" as PropertySort };
}
export function buildPropertyWhere(companyId: string, input: ReturnType<typeof normalizePropertyListInput>): Prisma.PropertyWhereInput {
  const now = new Date(), recent = new Date(now); recent.setDate(recent.getDate() - 90);
  return {
    customer: { companyId },
    ...(input.status ? { active: input.status === "active" } : {}),
    ...(input.propertyType ? { propertyType: input.propertyType } : {}),
    ...(input.city ? { city: { equals: input.city, mode: "insensitive" } } : {}),
    ...(input.serviceArea ? { serviceArea: { equals: input.serviceArea, mode: "insensitive" } } : {}),
    ...(input.upcoming ? { jobs: { some: { status: "Scheduled", scheduledStart: { gte: now } } } } : {}),
    ...(input.openEstimate ? { estimates: { some: { status: { in: ["Draft", "Sent", "Viewed", "Approved"] } } } } : {}),
    ...(input.recentlyServiced ? { jobs: { some: { status: "Completed", completedAt: { gte: recent } } } } : {}),
    ...(input.search ? { OR: [
      { nickname: { contains: input.search, mode: "insensitive" } }, { address: { contains: input.search, mode: "insensitive" } },
      { city: { contains: input.search, mode: "insensitive" } }, { zip: { contains: input.search, mode: "insensitive" } },
      { customer: { OR: [{ firstName: { contains: input.search, mode: "insensitive" } }, { lastName: { contains: input.search, mode: "insensitive" } }, { phone: { contains: input.search, mode: "insensitive" } }] } },
    ] } : {}),
  };
}
export async function listProperties(companyId: string, input: PropertyListInput = {}) {
  const query = normalizePropertyListInput(input), where = buildPropertyWhere(companyId, query), now = new Date();
  const orderBy: Prisma.PropertyOrderByWithRelationInput | Prisma.PropertyOrderByWithRelationInput[] =
    query.sort === "name_desc" ? { nickname: "desc" } : query.sort === "customer_asc" ? { customer: { lastName: "asc" } } :
    query.sort === "created_desc" ? { createdAt: "desc" } : [{ nickname: "asc" }, { address: "asc" }];
  const [rows, total, facets] = await prisma.$transaction([
    prisma.property.findMany({ where, orderBy, skip: query.skip, take: query.pageSize, select: {
      id: true, nickname: true, propertyType: true, address: true, addressLine2: true, city: true, state: true, zip: true,
      active: true, accessNotes: true, gateCode: true, hazardNotes: true, serviceArea: true,
      customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      estimates: { where: { status: { in: ["Draft", "Sent", "Viewed", "Approved"] } }, select: { id: true } },
      jobs: { where: { OR: [{ status: "Scheduled", scheduledStart: { gte: now } }, { status: "Completed" }] }, orderBy: { completedAt: "desc" }, select: { id: true, status: true, completedAt: true, scheduledStart: true } },
    } }),
    prisma.property.count({ where }),
    prisma.property.findMany({ where: { customer: { companyId } }, distinct: ["city", "serviceArea"], select: { city: true, serviceArea: true } }),
  ]);
  return { properties: rows.map((row) => ({ ...row, activeEstimateCount: row.estimates.length, upcomingJobCount: row.jobs.filter((job) => job.status === "Scheduled").length, lastServiceDate: row.jobs.find((job) => job.status === "Completed")?.completedAt ?? null })), total, page: query.page, pageSize: query.pageSize, cities: [...new Set(facets.map((x) => x.city).filter(Boolean))].sort(), serviceAreas: [...new Set(facets.map((x) => x.serviceArea).filter((x): x is string => Boolean(x)))].sort() };
}

export async function getProperty(companyId: string, propertyId: string) {
  return prisma.property.findFirst({ where: { id: propertyId, customer: { companyId } }, include: {
    customer: true,
    estimates: { orderBy: { updatedAt: "desc" }, take: 20, select: { id: true, displayNumber: true, status: true, pricingTotal: true, updatedAt: true } },
    jobs: { orderBy: { createdAt: "desc" }, take: 20, include: { photos: { where: { customerVisible: true }, take: 12 } } },
    invoices: { orderBy: { createdAt: "desc" }, take: 20 },
  } });
}
