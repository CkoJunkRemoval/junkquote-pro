import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, create } = vi.hoisted(() => ({ findFirst: vi.fn(), create: vi.fn() }));
vi.mock("../prisma", () => ({ prisma: { customer: { findFirst }, property: { create } } }));

import { createProperty } from "./createProperty";

describe("tenant-scoped property creation", () => {
  beforeEach(() => vi.clearAllMocks());
  it("creates a property only after the customer is found in the supplied company", async () => {
    findFirst.mockResolvedValue({ id: "customer-1" }); create.mockResolvedValue({ id: "property-1" });
    await createProperty("company-a", { customerId: "customer-1", address: " 1 Main ", city: " Town ", state: " NY ", zip: "10001" });
    expect(findFirst).toHaveBeenCalledWith({ where: { id: "customer-1", companyId: "company-a" }, select: { id: true } });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ customerId: "customer-1", address: "1 Main" }) }));
  });

  it("rejects a customer from another company", async () => {
    findFirst.mockResolvedValue(null);
    await expect(createProperty("company-a", { customerId: "customer-b", address: "1 Main", city: "Town", state: "NY", zip: "10001" })).rejects.toThrow("Customer not found.");
    expect(create).not.toHaveBeenCalled();
  });
});
