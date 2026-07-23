import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { previewItemLibraryCsv } from "./csv";
import { exportItemLibraryCsv } from "./csv";
import { WEIGHT_CLASSES, type BulkItemUpdate, type ItemLibraryInput, type ItemLibraryQuery, type ItemOverrideInput } from "./types";

const text = (value?: string | null) => value?.trim() || null;
export function validateItemLibraryInput(input: ItemLibraryInput) {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push("Item name is required.");
  if (!input.category.trim()) errors.push("Category is required.");
  if (input.name.trim().length > 120) errors.push("Item name must be 120 characters or fewer.");
  if (input.category.trim().length > 80) errors.push("Category must be 80 characters or fewer.");
  if (![input.basePrice, input.disposalFee, input.estimatedVolume].every(Number.isFinite) || input.basePrice < 0 || input.disposalFee < 0 || input.estimatedVolume < 0) errors.push("Pricing and volume must be zero or greater.");
  if (!Number.isFinite(input.laborHours) || input.laborHours <= 0) errors.push("Labor hours must be greater than zero.");
  if (!WEIGHT_CLASSES.includes(input.weightClass)) errors.push("Select a valid weight class.");
  if (!Number.isInteger(input.displayOrder)) errors.push("Display order must be a whole number.");
  if (errors.length) throw new Error(errors.join(" "));
}
function data(input: ItemLibraryInput) {
  validateItemLibraryInput(input);
  return { ...input, name: input.name.trim(), category: input.category.trim(), description: text(input.description), notes: text(input.notes), active: input.active ?? true };
}
async function unique(companyId: string, category: string, name: string, excludeId?: string) {
  const found = await prisma.itemLibrary.findFirst({ where: { companyId, active: true, category: { equals: category.trim(), mode: "insensitive" }, name: { equals: name.trim(), mode: "insensitive" }, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
  if (found) throw new Error("An active item with this name already exists in this category.");
}
export function normalizeItemLibraryQuery(query: ItemLibraryQuery) {
  const pageSize = Math.min(100, Math.max(10, Math.trunc(query.pageSize ?? 25)));
  const page = Math.max(1, Math.trunc(query.page ?? 1));
  return { ...query, search: query.search?.trim().slice(0, 100), category: query.category?.trim(), page, pageSize, skip: (page - 1) * pageSize, sort: query.sort ?? "displayOrder", direction: query.direction ?? "asc" } as const;
}
export async function listItemLibrary(companyId: string, query: ItemLibraryQuery = {}) {
  const value = normalizeItemLibraryQuery(query);
  const where = { companyId, ...(value.active === undefined ? {} : { active: value.active }), ...(value.category ? { category: value.category } : {}), ...(value.search ? { OR: [{ name: { contains: value.search, mode: "insensitive" as const } }, { category: { contains: value.search, mode: "insensitive" as const } }, { description: { contains: value.search, mode: "insensitive" as const } }] } : {}) };
  const orderBy = value.sort === "price" ? { basePrice: value.direction } : value.sort === "name" ? { name: value.direction } : value.sort === "category" ? { category: value.direction } : { displayOrder: value.direction };
  const [items, total, categories] = await prisma.$transaction([
    prisma.itemLibrary.findMany({ where, orderBy: [orderBy, { id: "asc" }], skip: value.skip, take: value.pageSize, include: { _count: { select: { estimateItems: true } } } }),
    prisma.itemLibrary.count({ where }),
    prisma.itemLibrary.findMany({ where: { companyId }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
  ]);
  return { items, total, page: value.page, pageSize: value.pageSize, pageCount: Math.max(1, Math.ceil(total / value.pageSize)), categories: categories.map((item) => item.category) };
}
export async function listEffectiveEstimateItems(companyId: string, pricingProfileId: string) {
  const profile = await prisma.pricingProfile.findFirst({ where: { id: pricingProfileId, companyId }, select: { id: true } });
  if (!profile) throw new Error("Pricing profile not found.");
  const rows = await prisma.itemLibrary.findMany({
    where: { companyId, active: true },
    orderBy: [{ category: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
    include: { profileOverrides: { where: { pricingProfileId } } },
  });
  return rows.map(({ profileOverrides, ...item }) => {
    const override = profileOverrides[0];
    return { ...item, effectiveBasePrice: override?.basePrice ?? item.basePrice, effectiveDisposalFee: override?.disposalFee ?? item.disposalFee, effectiveLaborHours: override?.laborHours ?? item.laborHours, effectiveCrewRequirement: override?.crewRequirement ?? (item.requiresTwoPeople ? 2 : 1), hasOverride: Boolean(override) };
  });
}
export async function createItemLibraryItem(companyId: string, actingUserId: string, input: ItemLibraryInput) {
  const next = data(input); await unique(companyId, next.category, next.name);
  return prisma.$transaction(async (tx) => {
    const item = await tx.itemLibrary.create({ data: { companyId, ...next } });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "Item Library Item Created", entityType: "ItemLibrary", entityId: item.id } });
    return item;
  });
}
export async function updateItemLibraryItem(companyId: string, actingUserId: string, id: string, input: ItemLibraryInput) {
  const current = await prisma.itemLibrary.findFirst({ where: { id, companyId } });
  if (!current) throw new Error("Item not found.");
  const next = data(input); if (current.active || next.active) await unique(companyId, next.category, next.name, id);
  return prisma.$transaction(async (tx) => {
    const item = await tx.itemLibrary.update({ where: { id }, data: next });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "Item Library Item Updated", entityType: "ItemLibrary", entityId: id } });
    return item;
  });
}
export async function duplicateItemLibraryItem(companyId: string, actingUserId: string, id: string) {
  const source = await prisma.itemLibrary.findFirst({ where: { id, companyId } });
  if (!source) throw new Error("Item not found.");
  let name = `${source.name} Copy`, suffix = 2;
  while (await prisma.itemLibrary.findFirst({ where: { companyId, active: true, category: { equals: source.category, mode: "insensitive" }, name: { equals: name, mode: "insensitive" } }, select: { id: true } })) name = `${source.name} Copy ${suffix++}`;
  return createItemLibraryItem(companyId, actingUserId, {
    category: source.category, name, description: source.description, active: true,
    displayOrder: source.displayOrder + 1, basePrice: source.basePrice,
    disposalFee: source.disposalFee, laborHours: source.laborHours,
    weightClass: source.weightClass as ItemLibraryInput["weightClass"],
    estimatedVolume: source.estimatedVolume, recyclable: source.recyclable,
    donationEligible: source.donationEligible, hazardous: source.hazardous,
    refrigerant: source.refrigerant, electronics: source.electronics,
    mattress: source.mattress, tire: source.tire, appliance: source.appliance,
    constructionDebris: source.constructionDebris, yardWaste: source.yardWaste,
    requiresTwoPeople: source.requiresTwoPeople,
    requiresDisassembly: source.requiresDisassembly,
    requiresSpecialEquipment: source.requiresSpecialEquipment, notes: source.notes,
  });
}
export async function setItemLibraryActive(companyId: string, actingUserId: string, ids: string[], active: boolean) {
  const safeIds = [...new Set(ids)].slice(0, 500);
  if (!safeIds.length) throw new Error("Select at least one item.");
  if (active) {
    const rows = await prisma.itemLibrary.findMany({ where: { companyId, id: { in: safeIds } } });
    for (const row of rows) await unique(companyId, row.category, row.name, row.id);
  }
  const result = await prisma.itemLibrary.updateMany({ where: { companyId, id: { in: safeIds } }, data: { active } });
  await prisma.auditEvent.create({ data: { companyId, actingUserId, eventType: active ? "Item Library Items Restored" : "Item Library Items Archived", entityType: "ItemLibrary", metadata: { count: result.count } } });
  return result;
}
export async function bulkUpdateItemLibrary(companyId: string, actingUserId: string, input: BulkItemUpdate) {
  const ids = [...new Set(input.ids ?? [])].slice(0, 500);
  if (!ids.length && !input.category) throw new Error("Select items or a category.");
  const where = { companyId, ...(ids.length ? { id: { in: ids } } : {}), ...(input.category ? { category: input.category } : {}) };
  if (input.pricePercent !== undefined && (!Number.isFinite(input.pricePercent) || input.pricePercent <= -100 || input.pricePercent > 1000)) throw new Error("Price percentage must be greater than -100 and no more than 1000.");
  if (input.laborHours !== undefined && input.laborHours <= 0) throw new Error("Labor hours must be greater than zero.");
  if (input.disposalFee !== undefined && input.disposalFee < 0) throw new Error("Disposal fee must be zero or greater.");
  const rows = await prisma.itemLibrary.findMany({ where, select: { id: true, basePrice: true } });
  await prisma.$transaction(async (tx) => {
    if (input.pricePercent !== undefined) for (const row of rows) await tx.itemLibrary.update({ where: { id: row.id }, data: { basePrice: Math.round(row.basePrice * (1 + input.pricePercent! / 100) * 100) / 100 } });
    const common = { ...(input.active === undefined ? {} : { active: input.active }), ...(input.moveCategory ? { category: input.moveCategory.trim() } : {}), ...(input.laborHours === undefined ? {} : { laborHours: input.laborHours }), ...(input.disposalFee === undefined ? {} : { disposalFee: input.disposalFee }), ...(input.recyclable === undefined ? {} : { recyclable: input.recyclable }) };
    if (Object.keys(common).length) await tx.itemLibrary.updateMany({ where, data: common });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "Item Library Bulk Updated", entityType: "ItemLibrary", metadata: { count: rows.length } } });
  });
  return { count: rows.length };
}
export async function deleteItemLibraryItem(companyId: string, actingUserId: string, id: string) {
  const item = await prisma.itemLibrary.findFirst({ where: { id, companyId }, include: { _count: { select: { estimateItems: true } } } });
  if (!item) throw new Error("Item not found.");
  if (item._count.estimateItems) throw new Error("This item is referenced by an estimate and must be archived instead.");
  if (item.active) throw new Error("Archive the item before deleting it.");
  await prisma.$transaction([prisma.auditEvent.create({ data: { companyId, actingUserId, eventType: "Item Library Item Deleted", entityType: "ItemLibrary", entityId: id } }), prisma.itemLibrary.delete({ where: { id } })]);
}
export function validateItemOverride(input: ItemOverrideInput) {
  if (input.basePrice != null && input.basePrice < 0) throw new Error("Override price must be zero or greater.");
  if (input.disposalFee != null && input.disposalFee < 0) throw new Error("Override disposal fee must be zero or greater.");
  if (input.laborHours != null && input.laborHours <= 0) throw new Error("Override labor must be greater than zero.");
  if (input.crewRequirement != null && (!Number.isInteger(input.crewRequirement) || input.crewRequirement < 1)) throw new Error("Crew requirement must be at least 1.");
}
export async function upsertItemOverride(companyId: string, actingUserId: string, pricingProfileId: string, itemLibraryId: string, input: ItemOverrideInput) {
  validateItemOverride(input);
  const [profile, item] = await Promise.all([prisma.pricingProfile.findFirst({ where: { id: pricingProfileId, companyId } }), prisma.itemLibrary.findFirst({ where: { id: itemLibraryId, companyId } })]);
  if (!profile || !item) throw new Error("Pricing profile or item not found.");
  const blank = Object.values(input).every((value) => value == null);
  const result = blank
    ? await prisma.pricingProfileItemOverride.deleteMany({ where: { pricingProfileId, itemLibraryId } })
    : await prisma.pricingProfileItemOverride.upsert({ where: { pricingProfileId_itemLibraryId: { pricingProfileId, itemLibraryId } }, create: { id: randomUUID(), pricingProfileId, itemLibraryId, ...input }, update: input });
  await prisma.auditEvent.create({ data: { companyId, actingUserId, eventType: "Pricing Profile Item Override Updated", entityType: "PricingProfileItemOverride", entityId: blank ? undefined : "id" in result ? result.id : undefined } });
  return result;
}
export async function previewItemImport(companyId: string, csv: string) {
  const existing = await prisma.itemLibrary.findMany({ where: { companyId, active: true }, select: { category: true, name: true } });
  return previewItemLibraryCsv(csv.slice(0, 2_000_000), existing);
}
export async function importItemLibrary(companyId: string, actingUserId: string, csv: string) {
  const preview = await previewItemImport(companyId, csv);
  if (preview.errors.length) throw new Error(preview.errors.join(" "));
  if (!preview.items.length) throw new Error("No valid items were found.");
  await prisma.$transaction(async (tx) => {
    await tx.itemLibrary.createMany({ data: preview.items.map((item) => ({ companyId, ...data(item) })) });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "Item Library CSV Imported", entityType: "ItemLibrary", metadata: { count: preview.items.length } } });
  });
  return { count: preview.items.length };
}
export async function exportItemLibrary(companyId: string) {
  const rows = await prisma.itemLibrary.findMany({ where: { companyId }, orderBy: [{ category: "asc" }, { displayOrder: "asc" }, { name: "asc" }] });
  return exportItemLibraryCsv(rows.map((row) => ({ ...row, weightClass: row.weightClass as ItemLibraryInput["weightClass"] })));
}
