import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  employee: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  companyMembership: { findFirst: vi.fn() },
  job: { findFirst: vi.fn() },
  crew: { findFirst: vi.fn() },
  payPeriod: { findFirst: vi.fn() },
  companyTimekeepingSettings: { findUnique: vi.fn() },
  timeClockEvent: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  workSession: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  auditEvent: { create: vi.fn() },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    ...db,
    $transaction: vi.fn(async (operation: unknown) =>
      typeof operation === "function"
        ? operation(db)
        : Promise.all(operation as Promise<unknown>[]),
    ),
  },
}));

import {
  allocateSessionTime,
  recordClockEvent,
  recoverTimekeepingEmployeeForUser,
  updateActiveWorkforceLocation,
} from "./service";

const input = {
  employeeId: "employee-1",
  eventType: "ClockIn" as const,
  eventTimestamp: new Date("2026-08-03T13:00:00Z"),
  timezone: "America/New_York",
  source: "Mobile" as const,
};

describe("tenant-scoped timekeeping service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.employee.findFirst.mockResolvedValue({
      id: "employee-1",
      status: "Active",
    });
    db.payPeriod.findFirst.mockResolvedValue(null);
    db.timeClockEvent.findMany.mockResolvedValue([]);
    db.timeClockEvent.create.mockResolvedValue({
      id: "event-1",
      ...input,
      jobId: null,
      crewId: null,
    });
    db.workSession.create.mockResolvedValue({ id: "session-1" });
  });

  it("suppresses duplicate offline events by tenant idempotency key", async () => {
    const duplicate = { id: "existing-event" };
    db.timeClockEvent.findUnique.mockResolvedValue(duplicate);
    await expect(
      recordClockEvent("company-1", "user-1", {
        ...input,
        idempotencyKey: "device-event-1",
        deviceTimestamp: input.eventTimestamp,
      }),
    ).resolves.toBe(duplicate);
    expect(db.employee.findFirst).not.toHaveBeenCalled();
    expect(db.timeClockEvent.create).not.toHaveBeenCalled();
  });

  it("rejects inactive workers without creating an event", async () => {
    db.timeClockEvent.findUnique.mockResolvedValue(null);
    db.employee.findFirst.mockResolvedValue({
      id: "employee-1",
      status: "Terminated",
    });
    await expect(
      recordClockEvent("company-1", "user-1", input),
    ).rejects.toThrow("active workforce");
    expect(db.timeClockEvent.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate active clock-ins", async () => {
    db.timeClockEvent.findUnique.mockResolvedValue(null);
    db.timeClockEvent.findMany.mockResolvedValue([{ eventType: "ClockIn" }]);
    await expect(
      recordClockEvent("company-1", "user-1", input),
    ).rejects.toThrow("Invalid clock event");
  });

  it("scopes employee validation to the supplied company", async () => {
    db.timeClockEvent.findUnique.mockResolvedValue(null);
    await recordClockEvent("company-1", "user-1", input);
    expect(db.employee.findFirst).toHaveBeenCalledWith({
      where: { id: "employee-1", companyId: "company-1" },
      select: { id: true, status: true },
    });
  });

  it("rejects allocation overflow before writing", async () => {
    db.workSession.findFirst.mockResolvedValue({
      id: "session-1",
      employeeId: "employee-1",
      clockInAt: input.eventTimestamp,
      payableMinutes: 60,
      allocations: [{ allocatedMinutes: 45 }],
    });
    await expect(
      allocateSessionTime("company-1", "session-1", {
        category: "Admin",
        allocatedMinutes: 30,
      }),
    ).rejects.toThrow("cannot exceed");
  });

  it("enforces locked periods for new clock events", async () => {
    db.timeClockEvent.findUnique.mockResolvedValue(null);
    db.payPeriod.findFirst.mockResolvedValue({ id: "period-1" });
    await expect(
      recordClockEvent("company-1", "user-1", input),
    ).rejects.toThrow("Locked pay-period");
  });

  it("links one matching unlinked workforce profile without creating a duplicate", async () => {
    db.employee.findFirst.mockResolvedValueOnce(null);
    db.companyMembership.findFirst.mockResolvedValue({
      role: "Owner",
      user: { firstName: "Ada", lastName: "Owner", email: "ada@example.com" },
    });
    db.employee.findMany.mockResolvedValue([{ id: "employee-existing" }]);
    db.employee.update.mockResolvedValue({
      id: "employee-existing",
      userId: "user-1",
    });
    await recoverTimekeepingEmployeeForUser("company-1", "user-1");
    expect(db.employee.update).toHaveBeenCalledWith({
      where: { id: "employee-existing" },
      data: { userId: "user-1", invitationStatus: "Accepted" },
    });
    expect(db.employee.create).not.toHaveBeenCalled();
  });

  it("creates one active owner workforce profile from an authenticated membership", async () => {
    db.employee.findFirst.mockResolvedValueOnce(null);
    db.companyMembership.findFirst.mockResolvedValue({
      role: "Owner",
      user: { firstName: "Ada", lastName: "Owner", email: "ada@example.com" },
    });
    db.employee.findMany.mockResolvedValue([]);
    db.employee.create.mockResolvedValue({ id: "employee-new" });
    await recoverTimekeepingEmployeeForUser("company-1", "user-1");
    expect(db.employee.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: "company-1",
        userId: "user-1",
        role: "Owner",
        workerType: "Owner",
        status: "Active",
      }),
    });
  });

  it("accepts location only for the authenticated tenant worker's active session", async () => {
    db.employee.findFirst.mockResolvedValue({ id: "employee-1" });
    db.workSession.findFirst.mockResolvedValue({
      id: "session-1",
      clockInEventId: "event-1",
    });
    db.timeClockEvent.updateMany.mockResolvedValue({ count: 1 });
    await updateActiveWorkforceLocation("company-1", "user-1", {
      latitude: 40,
      longitude: -73,
      accuracy: 25,
    });
    expect(db.employee.findFirst).toHaveBeenCalledWith({
      where: { companyId: "company-1", userId: "user-1", status: "Active" },
      select: { id: true },
    });
    expect(db.timeClockEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "event-1",
          companyId: "company-1",
          employeeId: "employee-1",
        },
      }),
    );
  });

  it("rejects location after clock-out or without an active session", async () => {
    db.employee.findFirst.mockResolvedValue({ id: "employee-1" });
    db.workSession.findFirst.mockResolvedValue(null);
    await expect(
      updateActiveWorkforceLocation("company-1", "user-1", {
        latitude: 40,
        longitude: -73,
        accuracy: 25,
      }),
    ).rejects.toThrow("active shift");
    expect(db.timeClockEvent.updateMany).not.toHaveBeenCalled();
  });
});
