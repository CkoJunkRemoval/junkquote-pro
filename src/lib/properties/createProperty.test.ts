import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, create, propertyFind, update } = vi.hoisted(() => ({ findFirst: vi.fn(), create: vi.fn(), propertyFind: vi.fn(), update: vi.fn() }));
vi.mock("../prisma", () => ({ prisma: { customer: { findFirst }, property: { create, findFirst: propertyFind, update } } }));

import { createProperty, updatePropertyType } from "./createProperty";

describe("tenant-scoped property creation", () => {
  beforeEach(() => vi.clearAllMocks());
  it("creates a property only after the customer is found in the supplied company", async () => {
    findFirst.mockResolvedValue({ id: "customer-1" }); propertyFind.mockResolvedValue(null); create.mockResolvedValue({ id: "property-1" });
    await createProperty("company-a", { customerId: "customer-1", address: " 1 Main ", city: " Town ", state: " NY ", zip: "10001" });
    expect(findFirst).toHaveBeenCalledWith({ where: { id: "customer-1", companyId: "company-a" }, select: { id: true } });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ customerId: "customer-1", address: "1 Main", normalizedAddress: "1 main town ny 10001 us" }) }));
  });
  it("persists and tenant-scopes property type", async () => { propertyFind.mockResolvedValue({ id: "property-1" }); update.mockResolvedValue({ id: "property-1", propertyType: "Commercial" }); await updatePropertyType("company-a", "property-1", "commercial"); expect(propertyFind).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "property-1", customer: { companyId: "company-a" } } })); expect(update).toHaveBeenCalledWith({ where: { id: "property-1" }, data: { propertyType: "Commercial" } }); });

  it("rejects a customer from another company", async () => {
    findFirst.mockResolvedValue(null);
    await expect(createProperty("company-a", { customerId: "customer-b", address: "1 Main", city: "Town", state: "NY", zip: "10001" })).rejects.toThrow("Customer not found.");
    expect(create).not.toHaveBeenCalled();
  });
});
