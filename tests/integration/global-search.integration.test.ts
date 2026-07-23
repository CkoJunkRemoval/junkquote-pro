import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { prisma } from "@/lib/prisma";
import { globalSearch, globalSearchLimits } from "@/lib/globalSearch/search";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";

const now = new Date("2026-07-23T12:00:00");
describe("global search local database gate", () => {
  beforeEach(resetIntegrationDatabase);
  afterAll(async () => { await resetIntegrationDatabase(); });

  it("searches all record identifiers, partial names and addresses, groups bounded results, and routes directly", async () => {
    const { a } = await createTenantFixtures();
    await prisma.customer.update({ where: { id: a.customer.id }, data: { firstName: "John", lastName: "Smith", email: "john@example.test", phone: "(804) 555-1212" } });
    await prisma.property.update({ where: { id: a.property.id }, data: { address: "123 Main Street", city: "Richmond", propertyType: "Residential" } });
    await prisma.estimate.update({ where: { id: a.estimate.id }, data: { displayNumber: "EST-1045" } });
    await prisma.job.update({ where: { id: a.job.id }, data: { jobNumber: "JOB-221" } });
    await prisma.invoice.update({ where: { id: a.invoice.id }, data: { displayNumber: "INV-220" } });
    const customer = await globalSearch({ companyId: a.company.id, userId: a.user.id, role: "Owner" }, "john smi", now);
    const property = await globalSearch({ companyId: a.company.id, userId: a.user.id, role: "Owner" }, "Main Stre", now);
    const estimate = await globalSearch({ companyId: a.company.id, userId: a.user.id, role: "Owner" }, "EST 1045", now);
    const job = await globalSearch({ companyId: a.company.id, userId: a.user.id, role: "Owner" }, "job-221", now);
    const invoice = await globalSearch({ companyId: a.company.id, userId: a.user.id, role: "Owner" }, "INV 220", now);
    const payment = await globalSearch({ companyId: a.company.id, userId: a.user.id, role: "Owner" }, "INV-220", now);
    expect(customer.groups.Customers?.[0]).toMatchObject({ id: a.customer.id, href: `/customers/${a.customer.id}` });
    expect(property.groups.Properties?.[0]).toMatchObject({ id: a.property.id, href: `/properties/${a.property.id}` });
    expect(estimate.groups.Estimates?.[0]).toMatchObject({ id: a.estimate.id, href: `/estimates/${a.estimate.id}` });
    expect(job.groups.Jobs?.[0]).toMatchObject({ id: a.job.id, href: `/jobs/${a.job.id}` });
    expect(invoice.groups.Invoices?.[0]).toMatchObject({ id: a.invoice.id, href: `/invoices/${a.invoice.id}` });
    expect(payment.groups.Payments?.[0]).toMatchObject({ id: a.payment.id, href: `/invoices/${a.invoice.id}#payments` });
    for (const results of Object.values(customer.groups)) expect(results!.length).toBeLessThanOrEqual(globalSearchLimits.perCategory);
  });

  it("matches overdue invoices, scheduled tomorrow, and paid this month", async () => {
    const { a } = await createTenantFixtures();
    await prisma.invoice.update({ where: { id: a.invoice.id }, data: { dueDate: new Date("2026-07-20"), status: "Sent", balanceDue: 75 } });
    await prisma.job.update({ where: { id: a.job.id }, data: { status: "Scheduled", scheduledStart: new Date("2026-07-24T14:00:00") } });
    expect((await globalSearch({ companyId: a.company.id, userId: a.user.id, role: "Owner" }, "overdue invoice", now)).groups.Invoices?.[0]?.id).toBe(a.invoice.id);
    expect((await globalSearch({ companyId: a.company.id, userId: a.user.id, role: "Owner" }, "scheduled tomorrow", now)).groups.Jobs?.[0]?.id).toBe(a.job.id);
    await prisma.invoice.update({ where: { id: a.invoice.id }, data: { status: "Paid", balanceDue: 0, paidDate: new Date("2026-07-10") } });
    await prisma.payment.update({ where: { id: a.payment.id }, data: { paymentDate: new Date("2026-07-10") } });
    const paid = await globalSearch({ companyId: a.company.id, userId: a.user.id, role: "Owner" }, "paid this month", now);
    expect(paid.groups.Invoices?.[0]?.id).toBe(a.invoice.id);
    expect(paid.groups.Payments?.[0]?.id).toBe(a.payment.id);
  });

  it("enforces tenant isolation and equivalent operational role permissions", async () => {
    const { a, b } = await createTenantFixtures();
    await prisma.customer.update({ where: { id: a.customer.id }, data: { firstName: "UniqueAlpha" } });
    await prisma.customer.update({ where: { id: b.customer.id }, data: { firstName: "UniqueAlpha" } });
    for (const role of ["Owner", "Admin", "Manager", "Office"] as const) {
      const result = await globalSearch({ companyId: a.company.id, userId: a.user.id, role }, "UniqueAlpha", now);
      expect(result.groups.Customers?.map((row) => row.id)).toEqual([a.customer.id]);
      expect(JSON.stringify(result.groups)).not.toContain(b.customer.id);
      expect(result.groups.Invoices).toBeDefined();
    }
  });

  it("limits crew to assigned work, field routes, and excludes private notes and finances", async () => {
    const { a } = await createTenantFixtures();
    await prisma.employee.update({ where: { id: a.employee.id }, data: { userId: a.crewMembership.userId } });
    await prisma.jobAssignment.create({ data: { companyId: a.company.id, jobId: a.job.id, employeeId: a.employee.id } });
    await prisma.customer.update({ where: { id: a.customer.id }, data: { notes: "SecretMarginKeyword" } });
    const hiddenCustomer = await prisma.customer.create({ data: { companyId: a.company.id, firstName: "Hidden", lastName: "Customer", phone: "555-0200" } });
    const recent = await globalSearch({ companyId: a.company.id, userId: a.crewMembership.userId, role: "Crew" }, "", now);
    const privateSearch = await globalSearch({ companyId: a.company.id, userId: a.crewMembership.userId, role: "Crew" }, "SecretMarginKeyword", now);
    expect(recent.groups.Customers?.map((row) => row.id)).toContain(a.customer.id);
    expect(recent.groups.Customers?.map((row) => row.id)).not.toContain(hiddenCustomer.id);
    expect(recent.groups.Jobs?.[0]?.href).toBe(`/field/jobs/${a.job.id}`);
    expect(privateSearch.groups.Customers).toBeUndefined();
    for (const category of ["Invoices", "Payments", "Messages", "Crew"] as const) expect(recent.groups[category]).toBeUndefined();
    expect(JSON.stringify(recent)).not.toContain("balanceDue");
  });

  it("routes messages to the closest authorized related record", async () => {
    const { a } = await createTenantFixtures();
    const portal = await prisma.customerPortalAccess.create({ data: { companyId: a.company.id, customerId: a.customer.id, email: "portal@test.invalid" } });
    const base = { companyId: a.company.id, customerId: a.customer.id, portalAccessId: portal.id };
    await prisma.customerMessageThread.createMany({ data: [
      { ...base, subject: "Invoice cleanup", invoiceId: a.invoice.id },
      { ...base, subject: "Job cleanup", jobId: a.job.id },
      { ...base, subject: "Estimate cleanup", estimateId: a.estimate.id },
      { ...base, subject: "Customer cleanup" },
    ] });
    expect((await globalSearch({ companyId: a.company.id, userId: a.user.id, role: "Office" }, "Invoice cleanup", now)).groups.Messages?.[0].href).toBe(`/invoices/${a.invoice.id}`);
    expect((await globalSearch({ companyId: a.company.id, userId: a.user.id, role: "Office" }, "Job cleanup", now)).groups.Messages?.[0].href).toBe(`/jobs/${a.job.id}`);
    expect((await globalSearch({ companyId: a.company.id, userId: a.user.id, role: "Office" }, "Estimate cleanup", now)).groups.Messages?.[0].href).toBe(`/estimates/${a.estimate.id}`);
    expect((await globalSearch({ companyId: a.company.id, userId: a.user.id, role: "Office" }, "Customer cleanup", now)).groups.Messages?.[0].href).toBe(`/customers/${a.customer.id}`);
  });

  it("returns a clean empty response for no matching records", async () => {
    const { a } = await createTenantFixtures();
    const result = await globalSearch({ companyId: a.company.id, userId: a.user.id, role: "Owner" }, "definitely-no-match-xyz", now);
    expect(result).toMatchObject({ total: 0, groups: {}, recent: false });
  });
});
