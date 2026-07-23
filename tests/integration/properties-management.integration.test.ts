import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { prisma } from "@/lib/prisma";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";
import {
  createManagedProperty, deleteProperty, getProperty, listProperties,
  setPropertyArchived, updateManagedProperty,
} from "@/lib/properties/properties";

describe("property management database behavior", () => {
  beforeEach(resetIntegrationDatabase);
  afterAll(async () => { await resetIntegrationDatabase(); });

  it("creates, searches, filters, paginates, edits, archives, and reactivates", async () => {
    const { a } = await createTenantFixtures();
    const property = await createManagedProperty(a.company.id, a.user.id, { customerId: a.customer.id, nickname: "Warehouse", propertyType: "Commercial", address: "22 River Road", city: "Albany", state: "NY", zip: "12207", hazardNotes: "Loading dock", serviceArea: "North" });
    expect((await listProperties(a.company.id, { search: "Warehouse", propertyType: "Commercial", city: "Albany", serviceArea: "North", page: 1, pageSize: 1 })).properties[0].id).toBe(property.id);
    await updateManagedProperty(a.company.id, a.user.id, property.id, { customerId: a.customer.id, nickname: "Main Warehouse", propertyType: "Commercial", address: "22 River Road", city: "Albany", state: "NY", zip: "12207", gateCode: "1234", hazardNotes: "Loading dock" });
    expect((await getProperty(a.company.id, property.id))?.gateCode).toBe("1234");
    await setPropertyArchived(a.company.id, a.user.id, property.id, true);
    expect((await listProperties(a.company.id, { status: "inactive" })).properties.some((row) => row.id === property.id)).toBe(true);
    await setPropertyArchived(a.company.id, a.user.id, property.id, false);
    expect((await getProperty(a.company.id, property.id))?.active).toBe(true);
  });

  it("rejects cross-tenant linkage and duplicate normalized addresses", async () => {
    const { a, b } = await createTenantFixtures();
    const input = { customerId: b.customer.id, propertyType: "Residential", address: "1 Other", city: "Albany", state: "NY", zip: "12207" };
    await expect(createManagedProperty(a.company.id, a.user.id, input)).rejects.toThrow("Customer not found");
    const own = { ...input, customerId: a.customer.id };
    await createManagedProperty(a.company.id, a.user.id, own);
    await expect(createManagedProperty(a.company.id, a.user.id, { ...own, address: " 1   OTHER " })).rejects.toThrow("already exists");
    expect(await getProperty(a.company.id, b.property.id)).toBeNull();
  });

  it("blocks deletion with related business records and deletes unused properties", async () => {
    const { a } = await createTenantFixtures();
    await expect(deleteProperty(a.company.id, a.user.id, a.property.id)).rejects.toThrow("must be archived");
    const customer = await prisma.customer.create({ data: { companyId: a.company.id, firstName: "Clean", lastName: "Customer", phone: "555-0199" } });
    const property = await createManagedProperty(a.company.id, a.user.id, { customerId: customer.id, address: "99 Clean Lane", city: "Albany", state: "NY", zip: "12207" });
    await deleteProperty(a.company.id, a.user.id, property.id);
    expect(await prisma.property.findUnique({ where: { id: property.id } })).toBeNull();
  });
});
