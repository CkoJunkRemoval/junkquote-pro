import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  payment: vi.fn(),
  user: vi.fn(),
  aggregate: vi.fn(),
  create: vi.fn(),
  invoiceUpdate: vi.fn(),
  sync: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("@/lib/smartPricing/outcomes", () => ({
  syncPricingOutcomeForInvoice: mocks.sync,
}));
import { recordRefund } from "./refunds";
function setup(existingRefund = 0) {
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
        payment: { findFirst: mocks.payment, aggregate: mocks.aggregate },
      user: { findFirst: mocks.user },
      refund: { aggregate: mocks.aggregate, create: mocks.create },
      invoice: { update: mocks.invoiceUpdate },
    }),
  );
  mocks.payment.mockResolvedValue({
    id: "pay-1",
    companyId: "a",
    invoiceId: "inv-1",
    amount: 100,
    invoice: { id: "inv-1", total: 200, dueDate: null, status: "Partial" },
  });
  mocks.user.mockResolvedValue({ id: "user-1" });
  mocks.aggregate
    .mockResolvedValueOnce({ _sum: { amount: existingRefund } })
    .mockResolvedValueOnce({ _sum: { amount: 100 } })
    .mockResolvedValueOnce({ _sum: { amount: existingRefund + 25 } });
  mocks.create.mockResolvedValue({
    id: "refund-1",
    invoiceId: "inv-1",
    amount: 25,
  });
}
describe("durable refunds", () => {
  beforeEach(() => vi.clearAllMocks());
  it("records a partial refund and refreshes the outcome", async () => {
    setup();
    const result = await recordRefund("a", "pay-1", {
      amount: 25,
      refundedAt: new Date(),
      createdByUserId: "user-1",
    });
    expect(result.invoiceState.balanceDue).toBe(125);
    expect(mocks.sync).toHaveBeenCalledWith("a", "inv-1");
  });
  it("supports multiple refunds while cumulative total is valid", async () => {
    setup(25);
    await expect(
      recordRefund("a", "pay-1", {
        amount: 25,
        refundedAt: new Date(),
        createdByUserId: "user-1",
      }),
    ).resolves.toBeDefined();
  });
  it("rejects cumulative refunds above the payment", async () => {
    setup(90);
    await expect(
      recordRefund("a", "pay-1", {
        amount: 25,
        refundedAt: new Date(),
        createdByUserId: "user-1",
      }),
    ).rejects.toThrow("cannot exceed");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects missing cross-tenant payments", async () => {
    setup();
    mocks.payment.mockResolvedValue(null);
    await expect(
      recordRefund("a", "pay-b", {
        amount: 5,
        refundedAt: new Date(),
        createdByUserId: "user-1",
      }),
    ).rejects.toThrow("Payment not found");
  });
  it("requires a positive amount", async () => {
    await expect(
      recordRefund("a", "pay-1", {
        amount: 0,
        refundedAt: new Date(),
        createdByUserId: "user-1",
      }),
    ).rejects.toThrow("positive");
  });
});
