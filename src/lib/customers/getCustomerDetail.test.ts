import { describe, expect, it, vi } from "vitest";

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("../prisma", () => ({ prisma: { customer: { findFirst } } }));

import { getCustomerDetail } from "./getCustomerDetail";

describe("customer detail query", () => {
  it("loads detail only for the development company without heavy signature data", async () => {
    findFirst.mockResolvedValue(null);

    await getCustomerDetail("8306c54b-befc-4f2a-aa2e-42a63d0eccaa", "customer-1");

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "customer-1", companyId: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa" },
      select: expect.objectContaining({
        properties: expect.any(Object),
        estimates: expect.objectContaining({
          select: expect.not.objectContaining({ signatureData: expect.anything() }),
        }),
      }),
    }));
  });
});
