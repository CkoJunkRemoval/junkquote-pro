import { describe, expect, it, vi } from "vitest";

const tx = {
  estimate: { findFirst: vi.fn(), aggregate: vi.fn(), create: vi.fn(), update: vi.fn() },
  jobSite: { create: vi.fn() },
  estimatePhoto: { createMany: vi.fn() },
};
vi.mock("../prisma", () => ({ prisma: { $transaction: vi.fn((callback) => callback(tx)) } }));
vi.mock("./estimateEvents",()=>({recordEstimateEventInTransaction:vi.fn()}));
import { createEstimateRevision } from "./createEstimateRevision";

describe("createEstimateRevision", () => {
  it("copies an approved estimate into an independent draft revision", async () => {
    tx.estimate.findFirst.mockResolvedValue({ id: "original", companyId: "company", displayNumber: "EST-104", revisionRootId: null, revisionNumber: 0, status: "Approved", signedAt: new Date(), customerId: "customer", propertyId: "property", pricingSubtotal: 100, pricingLabor: 20, pricingDisposal: 10, pricingDiscount: 5, pricingTotal: 125, estimatedLaborHours: 2, estimatedLaborCost: 20, currentStep: 6, jobSites: [{ id: "site-1", name: "Garage", status: "completed", customerNotes: "Customer", crewNotes: "Crew", internalNotes: "Internal", sortOrder: 0, items: [{ itemId: "chair", name: "Chair", category: "Furniture", quantity: 2, notes: "Careful", priceOverride: 50, sortOrder: 0 }] }], job: { photos: [{ jobSiteId: "site-1", category: "Before", fileUrl: "/photo.jpg", thumbnailUrl: null, fileName: "photo.jpg", mimeType: "image/jpeg", fileSize: 10, caption: "Photo", customerVisible: true, sortOrder: 0, takenAt: null }] }, revisionPhotos: [] });
    tx.estimate.aggregate.mockResolvedValue({ _max: { revisionNumber: 0 } });
    tx.estimate.create.mockResolvedValue({ id: "revision-1", revisionNumber: 1, status: "Draft" });
    tx.jobSite.create.mockResolvedValue({ id: "new-site" });
    const revision = await createEstimateRevision("company", "original");
    expect(revision).toMatchObject({ id: "revision-1", revisionNumber: 1, status: "Draft" });
    expect(tx.estimate.create).toHaveBeenCalledWith({ data: expect.objectContaining({ displayNumber: "EST-104-R1", revisionRootId: "original", revisionNumber: 1, status: "Draft", customerId: "customer", propertyId: "property", pricingTotal: 125 }) });
    expect(tx.jobSite.create).toHaveBeenCalledWith({ data: expect.objectContaining({ customerNotes: "Customer", crewNotes: "Crew", internalNotes: "Internal", items: { create: [expect.objectContaining({ notes: "Careful", priceOverride: 50 })] } }) });
    expect(tx.estimatePhoto.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ estimateId: "revision-1", jobSiteId: "new-site", fileUrl: "/photo.jpg" })] });
    expect(tx.estimate.update).not.toHaveBeenCalled();
  });

  it("rejects revisions of mutable estimates", async () => {
    tx.estimate.findFirst.mockResolvedValue({ id: "draft", status: "Draft", signedAt: null, jobSites: [], job: null, revisionPhotos: [] });
    await expect(createEstimateRevision("company", "draft")).rejects.toThrow("Only an approved estimate");
  });
});
