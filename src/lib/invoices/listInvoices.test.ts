import { describe, expect, it, vi } from "vitest";
vi.mock("../prisma", () => ({ prisma: {} }));
import { buildInvoiceListOrderBy, buildInvoiceListWhere, normalizeInvoiceListInput } from "./listInvoices";

describe("invoice list query", () => {
  it("isolates every list request to the authenticated company", () => {
    expect(buildInvoiceListWhere("tenant-a", normalizeInvoiceListInput({ status: "Sent" }))).toMatchObject({ companyId: "tenant-a", status: "Sent" });
  });
  it("supports invoice, customer, and property search", () => {
    const where = buildInvoiceListWhere("tenant-a", normalizeInvoiceListInput({ search: "42" }));
    expect(where.OR).toHaveLength(3);
    expect(where.OR?.[0]).toMatchObject({ invoiceNumber: { equals: 42 } });
  });
  it("maps sorting and bounds pagination", () => {
    expect(buildInvoiceListOrderBy("balance_desc")).toEqual({ balanceDue: "desc" });
    expect(normalizeInvoiceListInput({ page: 2, pageSize: 100 })).toMatchObject({ page: 2, pageSize: 50, skip: 50 });
  });
  it("maps outstanding and paid-this-month KPI filters", () => {
    expect(buildInvoiceListWhere("tenant-a",normalizeInvoiceListInput({status:"Outstanding"}))).toMatchObject({companyId:"tenant-a",balanceDue:{gt:0},status:{notIn:["Paid","Cancelled"]}});
    const query=normalizeInvoiceListInput({status:"Paid",period:"ThisMonth"},new Date("2026-07-23T12:00:00"));
    expect(buildInvoiceListWhere("tenant-a",query)).toMatchObject({companyId:"tenant-a",status:"Paid",paidDate:{gte:new Date("2026-07-01T00:00:00")}});
  });
});
