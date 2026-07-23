import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  employeeFindFirst: vi.fn(), employeeFindMany: vi.fn(), jobFindMany: vi.fn(), customerFindMany: vi.fn(),
  propertyFindMany: vi.fn(), estimateFindMany: vi.fn(), invoiceFindMany: vi.fn(), paymentFindMany: vi.fn(), messageFindMany: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  employee: { findFirst: mocks.employeeFindFirst, findMany: mocks.employeeFindMany },
  job: { findMany: mocks.jobFindMany }, customer: { findMany: mocks.customerFindMany },
  property: { findMany: mocks.propertyFindMany }, estimate: { findMany: mocks.estimateFindMany },
  invoice: { findMany: mocks.invoiceFindMany }, payment: { findMany: mocks.paymentFindMany },
  customerMessageThread: { findMany: mocks.messageFindMany },
} }));
vi.mock("server-only", () => ({}));
import { globalSearch, globalSearchLimits } from "./search";

const owner = { companyId: "company-a", userId: "user-a", role: "Owner" as const };
describe("global search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.customerFindMany.mockResolvedValue([]); mocks.propertyFindMany.mockResolvedValue([]); mocks.estimateFindMany.mockResolvedValue([]);
    mocks.jobFindMany.mockResolvedValue([]); mocks.invoiceFindMany.mockResolvedValue([]); mocks.paymentFindMany.mockResolvedValue([]);
    mocks.employeeFindMany.mockResolvedValue([]); mocks.messageFindMany.mockResolvedValue([]);
  });
  it("groups customer, property, estimate, job, invoice, payment, crew, and message results with direct routes", async () => {
    mocks.customerFindMany.mockResolvedValue([{ id: "c1", firstName: "John", lastName: "Smith", phone: "804", email: null }]);
    mocks.propertyFindMany.mockResolvedValue([{ id: "p1", address: "123 Main", city: "Richmond", state: "VA", propertyType: "Residential", customer: { firstName: "John", lastName: "Smith" } }]);
    mocks.estimateFindMany.mockResolvedValue([{ id: "e1", displayNumber: "EST-1045", status: "Sent", customer: { firstName: "John", lastName: "Smith" } }]);
    mocks.jobFindMany.mockResolvedValue([{ id: "j1", jobNumber: "JOB-221", status: "Scheduled", scheduledStart: null, property: { address: "123 Main" } }]);
    mocks.invoiceFindMany.mockResolvedValue([{ id: "i1", displayNumber: "INV-220", invoiceNumber: 220, status: "Sent", balanceDue: 640, dueDate: null, customer: { firstName: "John", lastName: "Smith" } }]);
    mocks.paymentFindMany.mockResolvedValue([{ id: "pay1", amount: 100, paymentDate: new Date(), method: "Cash", invoice: { id: "i1", displayNumber: "INV-220", invoiceNumber: 220 } }]);
    mocks.employeeFindMany.mockResolvedValue([{ id: "emp1", firstName: "Jane", lastName: "Crew", role: "CrewMember", phone: "555" }]);
    mocks.messageFindMany.mockResolvedValue([{ id: "m1", subject: "Garage cleanup", customerId: "c1", estimateId: "e1", jobId: null, invoiceId: null }]);
    const result = await globalSearch(owner, "John");
    expect(Object.keys(result.groups)).toEqual(["Customers", "Properties", "Estimates", "Jobs", "Invoices", "Payments", "Crew", "Messages"]);
    expect(result.groups.Customers?.[0]).toMatchObject({ title: "John Smith", href: "/customers/c1" });
    expect(result.groups.Properties?.[0].href).toBe("/properties/p1");
    expect(result.groups.Estimates?.[0].href).toBe("/estimates/e1");
    expect(result.groups.Jobs?.[0].href).toBe("/jobs/j1");
    expect(result.groups.Invoices?.[0].href).toBe("/invoices/i1");
    expect(result.groups.Payments?.[0].href).toBe("/invoices/i1#payments");
  });
  it.each([
    ["John Smith", "customerFindMany", "firstName"],
    ["123 Main Street", "propertyFindMany", "address"],
    ["EST-1045", "estimateFindMany", "displayNumber"],
    ["JOB-221", "jobFindMany", "jobNumber"],
    ["INV-220", "invoiceFindMany", "displayNumber"],
  ])("builds partial case-insensitive %s search", async (term, mockName, field) => {
    await globalSearch(owner, term);
    const call = mocks[mockName as keyof typeof mocks].mock.calls[0][0];
    expect(JSON.stringify(call.where)).toContain(field);
    expect(JSON.stringify(call.where)).toContain('"mode":"insensitive"');
  });
  it("maps natural overdue and scheduled-tomorrow phrases to bounded filters", async () => {
    const now = new Date("2026-07-23T12:00:00");
    await globalSearch(owner, "overdue invoice", now);
    expect(mocks.invoiceFindMany.mock.calls[0][0].where).toMatchObject({ companyId: "company-a", balanceDue: { gt: 0 }, dueDate: { lt: now } });
    await globalSearch(owner, "scheduled tomorrow", now);
    expect(mocks.jobFindMany.mock.calls[1][0].where).toMatchObject({ companyId: "company-a", status: "Scheduled", scheduledStart: { gte: new Date("2026-07-24T00:00:00"), lt: new Date("2026-07-25T00:00:00") } });
  });
  it("tenant-scopes every privileged category and bounds results", async () => {
    await globalSearch(owner, "smith");
    for (const mock of [mocks.customerFindMany, mocks.propertyFindMany, mocks.estimateFindMany, mocks.jobFindMany, mocks.invoiceFindMany, mocks.paymentFindMany, mocks.employeeFindMany, mocks.messageFindMany]) {
      expect(JSON.stringify(mock.mock.calls[0][0].where)).toContain("company-a");
      expect(mock.mock.calls[0][0].take).toBe(globalSearchLimits.perCategory);
    }
  });
  it("restricts crew to assigned records and excludes financial, crew, and message queries", async () => {
    mocks.employeeFindFirst.mockResolvedValue({ id: "emp-a", crewMembers: [{ crewId: "crew-a" }] });
    mocks.jobFindMany.mockResolvedValueOnce([{ id: "assigned-job", customerId: "c1", propertyId: "p1", estimateId: "e1" }]).mockResolvedValueOnce([]);
    const result = await globalSearch({ ...owner, role: "Crew" }, "main");
    expect(mocks.customerFindMany.mock.calls[0][0].where.id).toEqual({ in: ["c1"] });
    expect(JSON.stringify(mocks.customerFindMany.mock.calls[0][0].where)).not.toContain('"notes"');
    expect(mocks.propertyFindMany.mock.calls[0][0].where.id).toEqual({ in: ["p1"] });
    expect(mocks.estimateFindMany.mock.calls[0][0].where.id).toEqual({ in: ["e1"] });
    expect(mocks.invoiceFindMany).not.toHaveBeenCalled();
    expect(result.groups.Invoices).toBeUndefined();
  });
  it("returns bounded recent items before typing", async () => {
    const result = await globalSearch(owner, "");
    expect(result.recent).toBe(true);
    expect(mocks.customerFindMany.mock.calls[0][0].orderBy).toEqual({ updatedAt: "desc" });
  });
  it("isolates a failed category without exposing its error or corrupting other results", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.propertyFindMany.mockRejectedValue(new Error("database details"));
    mocks.customerFindMany.mockResolvedValue([{ id: "c1", firstName: "John", lastName: "Smith", phone: "804", email: null }]);
    const result = await globalSearch(owner, "John");
    expect(result.groups.Properties).toBeUndefined();
    expect(result.groups.Customers?.[0]).toMatchObject({ id: "c1", href: "/customers/c1" });
    expect(JSON.stringify(result)).not.toContain("database details");
  });
});
