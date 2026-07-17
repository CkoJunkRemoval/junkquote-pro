import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireOperationalTenant: vi.fn(), listJobPhotos: vi.fn() }));
vi.mock("@/lib/auth/tenant", () => ({ requireOperationalTenant: mocks.requireOperationalTenant }));
vi.mock("@/lib/jobPhotos/jobPhotos", () => ({ listJobPhotos: mocks.listJobPhotos }));
import { listJobPhotosAction } from "./jobPhotos";

describe("job photo actions", () => {
  beforeEach(() => vi.clearAllMocks());
  it("resolves the authenticated company for photo lists", async () => { mocks.requireOperationalTenant.mockResolvedValue({ companyId: "tenant-a", role: "Office" }); mocks.listJobPhotos.mockResolvedValue([]); await listJobPhotosAction("job-a"); expect(mocks.listJobPhotos).toHaveBeenCalledWith("tenant-a", "job-a"); });
  it("rejects suspended memberships", async () => { mocks.requireOperationalTenant.mockRejectedValue(new Error("An active company membership is required.")); await expect(listJobPhotosAction("job-a")).rejects.toThrow("active company membership"); expect(mocks.listJobPhotos).not.toHaveBeenCalled(); });
  it("rejects Crew rather than granting broad photo access", async () => { mocks.requireOperationalTenant.mockRejectedValue(new Error("Your company role cannot perform this action.")); await expect(listJobPhotosAction("job-a")).rejects.toThrow("company role"); expect(mocks.listJobPhotos).not.toHaveBeenCalled(); });
});
