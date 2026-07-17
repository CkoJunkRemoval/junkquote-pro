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
});
