import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), remove: vi.fn() }));
vi.mock("../prisma", () => ({ prisma: { estimate: { findFirst: mocks.findFirst, delete: mocks.remove } } }));
import { deleteEstimate } from "./deleteEstimate";

describe("deleteEstimate", () => {
  beforeEach(() => vi.clearAllMocks());

  for (const status of ["Draft", "Sent", "Viewed", "Declined", "Expired"]) {
    it(`deletes a non-approved ${status.toLowerCase()} estimate`, async () => {
      mocks.findFirst.mockResolvedValue({ id: "estimate-1", status, signedAt: null });
      mocks.remove.mockResolvedValue({ id: "estimate-1" });
      await deleteEstimate("company-1", "estimate-1");
      expect(mocks.remove).toHaveBeenCalledWith({ where: { id: "estimate-1" } });
    });
  }

  it("blocks approved deletion with a clear message", async () => {
    mocks.findFirst.mockResolvedValue({ id: "estimate-1", status: "Approved", signedAt: new Date() });
    await expect(deleteEstimate("company-1", "estimate-1")).rejects.toThrow("cannot be deleted");
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
