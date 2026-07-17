import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findJob: vi.fn(), findEmployee: vi.fn(), findCrew: vi.fn(), findAssignment: vi.fn(), create: vi.fn(), remove: vi.fn() }));
vi.mock("../prisma", () => ({ prisma: { job: { findFirst: mocks.findJob }, employee: { findFirst: mocks.findEmployee }, crew: { findFirst: mocks.findCrew }, jobAssignment: { findFirst: mocks.findAssignment, create: mocks.create, delete: mocks.remove } } }));
import { assignCrewToJob, assignEmployeeToJob, removeJobAssignment } from "./assignments";

describe("job assignment tenant isolation", () => {
  beforeEach(() => vi.clearAllMocks());
  it("creates an employee assignment with the authenticated tenant", async () => { mocks.findJob.mockResolvedValue({ id: "job-a" }); mocks.findEmployee.mockResolvedValue({ id: "employee-a", status: "Active" }); mocks.create.mockResolvedValue({ id: "assignment-a" }); await assignEmployeeToJob("tenant-a", "job-a", "employee-a", " note "); expect(mocks.create).toHaveBeenCalledWith({ data: { companyId: "tenant-a", jobId: "job-a", employeeId: "employee-a", notes: "note" } }); });
  it("rejects a cross-company employee", async () => { mocks.findJob.mockResolvedValue({ id: "job-a" }); mocks.findEmployee.mockResolvedValue(null); await expect(assignEmployeeToJob("tenant-a", "job-a", "employee-b")).rejects.toThrow("not found"); expect(mocks.create).not.toHaveBeenCalled(); });
  it("rejects a cross-company crew", async () => { mocks.findJob.mockResolvedValue({ id: "job-a" }); mocks.findCrew.mockResolvedValue(null); await expect(assignCrewToJob("tenant-a", "job-a", "crew-b")).rejects.toThrow("not found"); expect(mocks.create).not.toHaveBeenCalled(); });
  it("rejects a cross-company job", async () => { mocks.findJob.mockResolvedValue(null); mocks.findEmployee.mockResolvedValue({ id: "employee-a", status: "Active" }); await expect(assignEmployeeToJob("tenant-a", "job-b", "employee-a")).rejects.toThrow("not found"); expect(mocks.create).not.toHaveBeenCalled(); });
  it("does not remove another tenant's assignment", async () => { mocks.findAssignment.mockResolvedValue(null); await expect(removeJobAssignment("tenant-a", "assignment-b")).rejects.toThrow("Assignment not found"); expect(mocks.remove).not.toHaveBeenCalled(); });
});
