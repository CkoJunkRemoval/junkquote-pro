import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
}));

vi.mock("../prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

import { createJobFromEstimate } from "./createJobFromEstimate";

describe("createJobFromEstimate", () => {
  it("rejects a duplicate job for the estimate", async () => {
    mocks.transaction.mockImplementation(async (callback) => callback({
      estimate: { findFirst: mocks.findFirst },
      job: { findUnique: mocks.findUnique, create: mocks.create },
    }));
    mocks.findFirst.mockResolvedValue({ id: "estimate-1", companyId: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa", customerId: "customer-1", propertyId: "property-1", status: "Approved" });
    mocks.findUnique.mockResolvedValue({ id: "job-1" });

    await expect(createJobFromEstimate("8306c54b-befc-4f2a-aa2e-42a63d0eccaa", "estimate-1")).rejects.toThrow("A job already exists");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("only creates a job from an approved estimate", async () => {
    mocks.transaction.mockImplementation(async (callback) => callback({
      estimate: { findFirst: mocks.findFirst },
      job: { findUnique: mocks.findUnique, create: mocks.create },
    }));
    mocks.findFirst.mockResolvedValue({ id: "estimate-1", companyId: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa", customerId: "customer-1", propertyId: "property-1", status: "Sent" });

    await expect(createJobFromEstimate("8306c54b-befc-4f2a-aa2e-42a63d0eccaa", "estimate-1")).rejects.toThrow("Only approved estimates");
  });
});
