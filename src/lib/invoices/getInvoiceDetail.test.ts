import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("../prisma", () => ({
  prisma: { invoice: { findFirst: mocks.findFirst } },
}));

import { getInvoiceDetail } from "./getInvoiceDetail";

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("invoice detail customer identity", () => {
  it("keeps the invoice lookup tenant-scoped and projects the customer ID", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "invoice-1",
      customer: {
        id: "customer-1",
        firstName: "Jane",
        lastName: "Customer",
        phone: "555-0100",
        email: "jane@example.com",
      },
    });

    const detail = await getInvoiceDetail("company-1", "invoice-1");

    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "invoice-1",
          companyId: "company-1",
          customer: { companyId: "company-1" },
          estimate: { companyId: "company-1" },
        }),
        select: expect.objectContaining({
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
        }),
      }),
    );
    if (!detail) throw new Error("Expected invoice detail.");
    const customerId: string = detail.customer.id;
    expect(customerId).toBe("customer-1");
  });

  it("builds the invoice communication link from the projected customer ID", () => {
    const page = read("../../app/invoices/[id]/page.tsx");

    expect(page).toContain("sourceType=Invoice");
    expect(page).toContain("customerId=${invoice.customer.id}");
    expect(page).toContain(">Email customer</Link>");
  });

  it("keeps every recent customer communication link backed by a projected ID", () => {
    const contracts = [
      [
        read("../../app/jobs/[id]/page.tsx") +
          read("../../features/jobs/JobDetail.tsx"),
        read("../jobs/getJobDetail.ts"),
        "customerId=${job.customer.id}",
        "customer: { select: { id: true",
      ],
      [
        read("../../app/customers/[id]/page.tsx"),
        read("../customers/getCustomerDetail.ts"),
        "customerId=${customer.id}",
        "id: true",
      ],
      [
        read("../../app/estimates/[id]/page.tsx"),
        read("../estimates/getEstimateManagementDetail.ts"),
        "customerId=${estimate.customer.id}",
        "customer: { select: { id: true",
      ],
      [
        read("../../app/invoices/[id]/page.tsx"),
        read("./getInvoiceDetail.ts"),
        "customerId=${invoice.customer.id}",
        "customer: { select: { id: true",
      ],
    ] as const;

    for (const [consumer, loader, link, projection] of contracts) {
      expect(consumer).toContain(link);
      expect(loader).toContain(projection);
    }
  });
});
