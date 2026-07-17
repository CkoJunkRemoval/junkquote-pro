import { describe, expect, it, vi } from "vitest";
vi.mock("../prisma", () => ({ prisma: {} }));
import { buildInvoiceListOrderBy, buildInvoiceListWhere, normalizeInvoiceListInput } from "./listInvoices";

describe("invoice list query", () => {
  it("isolates every list request to the development company", () => {
    expect(buildInvoiceListWhere(normalizeInvoiceListInput({ status: "Sent" }))).toMatchObject({ companyId: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa", status: "Sent" });
  });
  it("supports invoice, customer, and property search", () => {
    const where = buildInvoiceListWhere(normalizeInvoiceListInput({ search: "42" }));
    expect(where.OR).toHaveLength(3);
    expect(where.OR?.[0]).toMatchObject({ invoiceNumber: { equals: 42 } });
  });
  it("maps sorting and bounds pagination", () => {
    expect(buildInvoiceListOrderBy("balance_desc")).toEqual({ balanceDue: "desc" });
    expect(normalizeInvoiceListInput({ page: 2, pageSize: 100 })).toMatchObject({ page: 2, pageSize: 50, skip: 50 });
  });
});
