import { describe, expect, it, vi } from "vitest";
const findMany = vi.hoisted(() => vi.fn());
vi.mock("../prisma", () => ({ prisma: { payment: { findMany } } }));
import { listInvoicePayments } from "./listInvoicePayments";

describe("invoice payment list", () => {
  it("keeps payment listing tenant scoped", async () => { findMany.mockResolvedValue([]); await listInvoicePayments("invoice-1"); expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { invoiceId: "invoice-1", companyId: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa" } })); });
});
