import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("../prisma", () => ({
  prisma: { estimate: { findFirst: mocks.findFirst } },
}));

import { getEstimateManagementDetail } from "./getEstimateManagementDetail";

describe("estimate management detail customer identity", () => {
  it("keeps the estimate lookup tenant-scoped and projects the customer ID", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "estimate-1",
      customer: {
        id: "customer-1",
        firstName: "Jane",
        lastName: "Customer",
      },
    });

    const detail = await getEstimateManagementDetail(
      "company-1",
      "estimate-1",
    );

    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "estimate-1", companyId: "company-1" },
        select: expect.objectContaining({
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
        }),
      }),
    );
    if (!detail) throw new Error("Expected estimate detail.");
    const customerId: string = detail.customer.id;
    expect(customerId).toBe("customer-1");
  });

  it("builds the customer communication link from the projected customer ID", () => {
    const page = readFileSync(
      new URL("../../app/estimates/[id]/page.tsx", import.meta.url),
      "utf8",
    );

    expect(page).toContain("sourceType=Estimate");
    expect(page).toContain("customerId=${estimate.customer.id}");
    expect(page).toContain(">Email customer</Link>");
  });
});
