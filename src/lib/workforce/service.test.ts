import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    employee: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    crew: { findFirst: vi.fn(), findMany: vi.fn() },
    companyMembership: { findFirst: vi.fn() },
    workforceOnboardingItem: { createMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    workforceDocument: { findFirst: vi.fn() },
    workforceCompensation: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    workforceCredential: { create: vi.fn() },
    auditEvent: { create: vi.fn(), findMany: vi.fn() },
  };
  return {
    tx,
    prisma: {
      $transaction: vi.fn((callback: (value: typeof tx) => unknown) => callback(tx)),
      employee: { findFirst: vi.fn(), findMany: vi.fn() },
      workforceEmergencyContact: { create: vi.fn() },
      workforceOnboardingItem: { create: vi.fn(), findMany: vi.fn() },
      workforceCredential: { findMany: vi.fn() },
      auditEvent: { findMany: vi.fn() },
      user: { findMany: vi.fn() },
      crew: { findMany: vi.fn() },
    },
  };
});
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import {
  addCompensationRecord,
  completeOnboardingItem,
  createWorkforceMember,
  credentialStatus,
  linkApplicationUser,
  listWorkforceDirectory,
  terminateWorkforceMember,
} from "./service";

const profile = {
  firstName: "Avery",
  lastName: "Driver",
  workerType: "Employee" as const,
  role: "CrewMember" as const,
};

describe("workforce service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.employee.findFirst.mockResolvedValue(null);
    mocks.tx.crew.findFirst.mockResolvedValue(null);
    mocks.tx.auditEvent.create.mockResolvedValue({});
  });

  it("creates a tenant-owned workforce member, checklist, and audit event", async () => {
    mocks.tx.employee.create.mockResolvedValue({ id: "e1", workerType: "Employee", status: "Onboarding" });
    mocks.tx.workforceOnboardingItem.createMany.mockResolvedValue({ count: 8 });
    await createWorkforceMember("company-a", "user-a", profile);
    expect(mocks.tx.employee.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ companyId: "company-a", status: "Onboarding" }) }));
    expect(mocks.tx.workforceOnboardingItem.createMany).toHaveBeenCalledWith({ data: expect.arrayContaining([expect.objectContaining({ companyId: "company-a", employeeId: "e1" })]) });
    expect(mocks.tx.auditEvent.create).toHaveBeenCalled();
  });

  it("rejects a duplicate application-user link", async () => {
    mocks.tx.employee.findFirst
      .mockResolvedValueOnce({ id: "e1" })
      .mockResolvedValueOnce({ id: "e2" });
    mocks.tx.companyMembership.findFirst.mockResolvedValue({ id: "m1" });
    await expect(linkApplicationUser("company-a", "actor", "e1", "u1")).rejects.toThrow("already linked");
    expect(mocks.tx.employee.update).not.toHaveBeenCalled();
  });

  it("links only an active user membership from the same company", async () => {
    mocks.tx.employee.findFirst.mockResolvedValueOnce({ id: "e1" }).mockResolvedValueOnce(null);
    mocks.tx.companyMembership.findFirst.mockResolvedValue({ id: "m1" });
    mocks.tx.employee.update.mockResolvedValue({ id: "e1", userId: "u1" });
    await linkApplicationUser("company-a", "actor", "e1", "u1");
    expect(mocks.tx.companyMembership.findFirst).toHaveBeenCalledWith({ where: { companyId: "company-a", userId: "u1", status: "Active" } });
  });

  it("terminates without deleting assignments or history", async () => {
    mocks.tx.employee.findFirst.mockResolvedValue({ id: "e1", status: "Active" });
    mocks.tx.employee.update.mockResolvedValue({ id: "e1", status: "Terminated" });
    await terminateWorkforceMember("company-a", "actor", "e1", "Documented reason");
    expect(mocks.tx.employee.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "Terminated", terminationReason: "Documented reason" }) }));
    expect("delete" in mocks.tx.employee).toBe(false);
  });

  it("prevents overlapping compensation history", async () => {
    mocks.tx.employee.findFirst.mockResolvedValue({ id: "e1" });
    mocks.tx.workforceCompensation.findFirst.mockResolvedValue({ id: "existing" });
    await expect(addCompensationRecord("company-a", "actor", "e1", { compensationType: "Hourly", hourlyRateCents: 2500, effectiveStartDate: new Date("2026-01-01") })).rejects.toThrow("overlap");
    expect(mocks.tx.workforceCompensation.create).not.toHaveBeenCalled();
  });

  it("completes onboarding within the tenant and records an audit event", async () => {
    mocks.tx.workforceOnboardingItem.findFirst.mockResolvedValue({ id: "i1", employeeId: "e1" });
    mocks.tx.workforceOnboardingItem.update.mockResolvedValue({ id: "i1", employeeId: "e1", status: "Completed" });
    await completeOnboardingItem("company-a", "actor", "i1");
    expect(mocks.tx.workforceOnboardingItem.findFirst).toHaveBeenCalledWith({ where: { id: "i1", companyId: "company-a" } });
    expect(mocks.tx.auditEvent.create).toHaveBeenCalled();
  });

  it("scopes directory reads to the company", async () => {
    mocks.prisma.employee.findMany.mockResolvedValue([]);
    await listWorkforceDirectory("company-a", { search: "Avery" });
    expect(mocks.prisma.employee.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: "company-a" }) }));
  });

  it("classifies credential expiration deterministically", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(credentialStatus(new Date("2025-12-31"), now)).toBe("Expired");
    expect(credentialStatus(new Date("2026-01-20"), now)).toBe("ExpiringSoon");
    expect(credentialStatus(new Date("2026-03-01"), now)).toBe("Valid");
  });
});

