import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  customerFind: vi.fn(), propertyFind: vi.fn(), propertyCreate: vi.fn(), propertyUpdate: vi.fn(),
  propertyDelete: vi.fn(), auditCreate: vi.fn(), auditCount: vi.fn(), auditDeleteMany: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  customer: { findFirst: mocks.customerFind },
  property: { findFirst: mocks.propertyFind },
  auditEvent: { count: mocks.auditCount },
  $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback({
    property: { create: mocks.propertyCreate, update: mocks.propertyUpdate, delete: mocks.propertyDelete },
    auditEvent: { create: mocks.auditCreate, deleteMany: mocks.auditDeleteMany },
  })),
} }));

import {
  buildPropertyWhere, createManagedProperty, deleteProperty, normalizeAddress,
  normalizePropertyListInput, setPropertyArchived, updateManagedProperty,
} from "./properties";

const input = { customerId: "customer-1", nickname: "Home", propertyType: "Residential", address: " 1 MAIN St ", city: " Albany ", state: "ny", zip: "12207", country: "US" };
describe("property management", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.customerFind.mockResolvedValue({ id: "customer-1" }); mocks.auditCount.mockResolvedValue(1); });
  it("normalizes equivalent addresses", () => expect(normalizeAddress({ ...input, address: " 1   MAIN St " })).toBe("1 main st albany ny 12207 us"));
  it("builds tenant-scoped search, filters, and pagination", () => {
    const query = normalizePropertyListInput({ search: "Jamie", status: "active", propertyType: "Residential", upcoming: true, openEstimate: true, page: 2, pageSize: 100 });
    expect(query).toMatchObject({ page: 2, pageSize: 50, skip: 50 });
    expect(buildPropertyWhere("company-a", query)).toMatchObject({ customer: { companyId: "company-a" }, active: true, propertyType: "Residential", jobs: { some: { status: "Scheduled" } }, estimates: { some: {} } });
  });
  it("creates a tenant-linked property and audit event", async () => {
    mocks.propertyFind.mockResolvedValue(null); mocks.propertyCreate.mockResolvedValue({ id: "property-1" });
    await createManagedProperty("company-a", "user-1", input);
    expect(mocks.customerFind).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "customer-1", companyId: "company-a" } }));
    expect(mocks.propertyCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ normalizedAddress: "1 main st albany ny 12207 us", state: "NY" }) });
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: "Property Created", entityId: "property-1" }) });
  });
  it("rejects a duplicate address before create", async () => {
    mocks.propertyFind.mockResolvedValue({ id: "existing" });
    await expect(createManagedProperty("company-a", "user-1", input)).rejects.toThrow("already exists");
    expect(mocks.propertyCreate).not.toHaveBeenCalled();
  });
  it("rejects a customer from another tenant", async () => {
    mocks.customerFind.mockResolvedValue(null);
    await expect(createManagedProperty("company-a", "user-1", input)).rejects.toThrow("Customer not found");
  });
  it("audits sensitive edit changes", async () => {
    mocks.propertyFind.mockResolvedValueOnce({ id: "property-1", customerId: "customer-1", normalizedAddress: "old", gateCode: "1", hazardNotes: null }).mockResolvedValueOnce(null);
    mocks.propertyUpdate.mockResolvedValue({ id: "property-1" });
    await updateManagedProperty("company-a", "user-1", "property-1", { ...input, gateCode: "2", hazardNotes: "Steps" });
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ metadata: { addressChanged: true, customerReassigned: false, accessCodeChanged: true, hazardNotesChanged: true } }) });
  });
  it("archives and reactivates without deleting history", async () => {
    mocks.propertyFind.mockResolvedValue({ id: "property-1" }); mocks.propertyUpdate.mockResolvedValue({ id: "property-1" });
    await setPropertyArchived("company-a", "user-1", "property-1", true);
    expect(mocks.propertyUpdate).toHaveBeenCalledWith({ where: { id: "property-1" }, data: { active: false, archivedAt: expect.any(Date) } });
    await setPropertyArchived("company-a", "user-1", "property-1", false);
    expect(mocks.auditCreate).toHaveBeenLastCalledWith({ data: expect.objectContaining({ eventType: "Property Reactivated" }) });
  });
  it("blocks deletion when related records or activity exist", async () => {
    mocks.propertyFind.mockResolvedValue({ id: "property-1", _count: { estimates: 1, jobs: 0, invoices: 0, servicePlans: 0 } });
    await expect(deleteProperty("company-a", "user-1", "property-1")).rejects.toThrow("must be archived");
  });
  it("allows confirmed service-layer deletion only without history", async () => {
    mocks.propertyFind.mockResolvedValue({ id: "property-1", _count: { estimates: 0, jobs: 0, invoices: 0, servicePlans: 0 } }); mocks.propertyDelete.mockResolvedValue({ id: "property-1" });
    await deleteProperty("company-a", "user-1", "property-1");
    expect(mocks.propertyDelete).toHaveBeenCalledWith({ where: { id: "property-1" } });
  });
});
