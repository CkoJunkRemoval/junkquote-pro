import "server-only";
import type {
  PayPeriodFrequency,
  Prisma,
  TimeAllocationCategory,
  TimeClockEventType,
  TimeEntrySource,
  TimesheetStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  csvCell,
  deriveSessionMinutes,
  payPeriodRange,
  reduceClockState,
  splitRegularOvertime,
  workweekStart,
} from "./calculations";

type Db = Prisma.TransactionClient;
export type ClockInput = {
  employeeId: string;
  eventType: TimeClockEventType;
  eventTimestamp: Date;
  timezone: string;
  source: TimeEntrySource;
  jobId?: string | null;
  crewId?: string | null;
  latitude?: number;
  longitude?: number;
  locationAccuracyMeters?: number;
  notes?: string;
  idempotencyKey?: string;
  deviceTimestamp?: Date;
};

async function validateReferences(
  tx: Db,
  companyId: string,
  input: ClockInput,
) {
  const employee = await tx.employee.findFirst({
    where: { id: input.employeeId, companyId },
    select: { id: true, status: true },
  });
  if (!employee) throw new Error("Workforce member not found.");
  if (employee.status !== "Active")
    throw new Error(
      "Only active workforce members may create new clock events.",
    );
  if (
    input.jobId &&
    !(await tx.job.findFirst({
      where: { id: input.jobId, companyId },
      select: { id: true },
    }))
  )
    throw new Error("Job not found.");
  if (
    input.crewId &&
    !(await tx.crew.findFirst({
      where: { id: input.crewId, companyId },
      select: { id: true },
    }))
  )
    throw new Error("Crew not found.");
}

async function assertTimeIsUnlocked(
  tx: Db,
  companyId: string,
  timestamp: Date,
) {
  const locked = await tx.payPeriod.findFirst({
    where: {
      companyId,
      status: "Locked",
      startDate: { lte: timestamp },
      endDate: { gte: timestamp },
    },
    select: { id: true },
  });
  if (locked) throw new Error("Locked pay-period time cannot be changed.");
}

async function notifyOnce(
  tx: Db,
  input: {
    companyId: string;
    userId?: string | null;
    title: string;
    body: string;
    since?: Date;
  },
) {
  if (!input.userId) return;
  const existing = await tx.systemNotification.findFirst({
    where: {
      companyId: input.companyId,
      userId: input.userId,
      title: input.title,
      body: input.body,
      createdAt: {
        gte: input.since ?? new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    select: { id: true },
  });
  if (!existing)
    await tx.systemNotification.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        channel: "in-app",
        title: input.title,
        body: input.body,
      },
    });
}

export async function recordClockEvent(
  companyId: string,
  createdById: string,
  input: ClockInput,
) {
  if (!Number.isFinite(input.eventTimestamp.getTime()))
    throw new Error("A valid event timestamp is required.");
  return prisma.$transaction(
    async (tx) => {
      if (input.idempotencyKey) {
        const duplicate = await tx.timeClockEvent.findUnique({
          where: {
            companyId_idempotencyKey: {
              companyId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (duplicate) return duplicate;
      }
      await validateReferences(tx, companyId, input);
      await assertTimeIsUnlocked(tx, companyId, input.eventTimestamp);
      const recent = await tx.timeClockEvent.findMany({
        where: {
          companyId,
          employeeId: input.employeeId,
          eventTimestamp: { lte: input.eventTimestamp },
        },
        orderBy: { eventTimestamp: "asc" },
        take: 200,
      });
      const state = reduceClockState(recent);
      if (!state.nextEvents.includes(input.eventType))
        throw new Error(
          `Invalid clock event ${input.eventType} for the current clock state.`,
        );
      const event = await tx.timeClockEvent.create({
        data: {
          companyId,
          createdById,
          ...input,
          jobId: input.jobId ?? null,
          crewId: input.crewId ?? null,
          notes: input.notes?.trim() || null,
          syncedAt: input.idempotencyKey ? new Date() : null,
        },
      });
      if (input.eventType === "ClockIn")
        await tx.workSession.create({
          data: {
            companyId,
            employeeId: input.employeeId,
            clockInEventId: event.id,
            clockInAt: event.eventTimestamp,
            timezone: event.timezone,
            source: event.source,
            crewId: event.crewId,
          },
        });
      if (input.eventType === "ClockOut") {
        const session = await tx.workSession.findFirst({
          where: { companyId, employeeId: input.employeeId, clockOutAt: null },
          orderBy: { clockInAt: "desc" },
        });
        if (!session) throw new Error("Active work session not found.");
        const sessionEvents = await tx.timeClockEvent.findMany({
          where: {
            companyId,
            employeeId: input.employeeId,
            eventTimestamp: {
              gte: session.clockInAt,
              lte: event.eventTimestamp,
            },
          },
          orderBy: { eventTimestamp: "asc" },
        });
        const totals = deriveSessionMinutes(sessionEvents);
        await tx.workSession.update({
          where: { id: session.id },
          data: {
            clockOutEventId: event.id,
            clockInAt: totals.clockInAt,
            clockOutAt: totals.clockOutAt,
            grossMinutes: totals.grossMinutes,
            unpaidBreakMinutes: totals.unpaidBreakMinutes,
            payableMinutes: totals.payableMinutes,
          },
        });
      }
      return event;
    },
    { isolationLevel: "Serializable" },
  );
}

export const clockIn = (
  companyId: string,
  userId: string,
  input: Omit<ClockInput, "eventType">,
) => recordClockEvent(companyId, userId, { ...input, eventType: "ClockIn" });
export const clockOut = (
  companyId: string,
  userId: string,
  input: Omit<ClockInput, "eventType">,
) => recordClockEvent(companyId, userId, { ...input, eventType: "ClockOut" });
export const startBreak = (
  companyId: string,
  userId: string,
  input: Omit<ClockInput, "eventType">,
) => recordClockEvent(companyId, userId, { ...input, eventType: "BreakStart" });
export const endBreak = (
  companyId: string,
  userId: string,
  input: Omit<ClockInput, "eventType">,
) => recordClockEvent(companyId, userId, { ...input, eventType: "BreakEnd" });

export async function getActiveClockState(
  companyId: string,
  employeeId: string,
) {
  const events = await prisma.timeClockEvent.findMany({
    where: { companyId, employeeId },
    orderBy: { eventTimestamp: "asc" },
    take: 200,
  });
  const state = reduceClockState(events);
  const session = state.clockedIn
    ? await prisma.workSession.findFirst({
        where: { companyId, employeeId, clockOutAt: null },
        orderBy: { clockInAt: "desc" },
        include: { allocations: true },
      })
    : null;
  return { ...state, session };
}

export async function evaluateOpenTimeAlerts(
  companyId: string,
  now = new Date(),
) {
  const settings = await getTimekeepingSettings(companyId);
  const sessions = await prisma.workSession.findMany({
    where: { companyId, clockOutAt: null },
    include: {
      employee: { select: { userId: true } },
    },
  });
  let created = 0;
  await prisma.$transaction(async (tx) => {
    for (const session of sessions) {
      const events = await tx.timeClockEvent.findMany({
        where: {
          companyId,
          employeeId: session.employeeId,
          eventTimestamp: { gte: session.clockInAt, lte: now },
        },
        orderBy: { eventTimestamp: "asc" },
      });
      const state = reduceClockState(events);
      const elapsedMinutes = Math.floor(
        (now.getTime() - session.clockInAt.getTime()) / 60000,
      );
      const before = await tx.systemNotification.count({
        where: { companyId, userId: session.employee.userId },
      });
      if (state.onBreak) {
        const breakStart = [...events]
          .reverse()
          .find((event) => event.eventType === "BreakStart");
        if (
          breakStart &&
          now.getTime() - breakStart.eventTimestamp.getTime() >=
            settings.openBreakWarningMinutes * 60000
        )
          await notifyOnce(tx, {
            companyId,
            userId: session.employee.userId,
            title: "Break still open",
            body: "Your break is still running. End it when you return to work.",
          });
      } else if (elapsedMinutes >= 16 * 60) {
        await notifyOnce(tx, {
          companyId,
          userId: session.employee.userId,
          title: "Missing clock-out",
          body: "A long-running shift may be missing a clock-out.",
        });
      }
      const after = await tx.systemNotification.count({
        where: { companyId, userId: session.employee.userId },
      });
      created += after - before;
    }
  });
  return { inspected: sessions.length, created };
}

export async function getEmployeeTimeHistory(
  companyId: string,
  employeeId: string,
  from?: Date,
  to?: Date,
) {
  return prisma.workSession.findMany({
    where: { companyId, employeeId, clockInAt: { gte: from, lte: to } },
    orderBy: { clockInAt: "desc" },
    include: { allocations: true },
  });
}

export async function createManualEntry(
  companyId: string,
  actingUserId: string,
  input: {
    employeeId: string;
    clockInAt: Date;
    clockOutAt: Date;
    timezone: string;
    jobId?: string | null;
    crewId?: string | null;
    reason: string;
  },
) {
  if (!input.reason.trim()) throw new Error("A correction reason is required.");
  if (input.clockOutAt <= input.clockInAt)
    throw new Error("Clock-out must be after clock-in.");
  return prisma.$transaction(
    async (tx) => {
      await validateReferences(tx, companyId, {
        ...input,
        eventType: "ClockIn",
        eventTimestamp: input.clockInAt,
        source: "Manual",
      });
      await assertTimeIsUnlocked(tx, companyId, input.clockInAt);
      const overlap = await tx.workSession.findFirst({
        where: {
          companyId,
          employeeId: input.employeeId,
          clockInAt: { lt: input.clockOutAt },
          OR: [{ clockOutAt: null }, { clockOutAt: { gt: input.clockInAt } }],
        },
      });
      if (overlap)
        throw new Error("Manual time entry overlaps an existing work session.");
      const clockInEvent = await tx.timeClockEvent.create({
        data: {
          companyId,
          employeeId: input.employeeId,
          eventType: "ClockIn",
          eventTimestamp: input.clockInAt,
          timezone: input.timezone,
          source: "Manual",
          jobId: input.jobId ?? null,
          crewId: input.crewId ?? null,
          createdById: actingUserId,
          correctionReason: input.reason,
          correctedById: actingUserId,
          correctedAt: new Date(),
        },
      });
      const clockOutEvent = await tx.timeClockEvent.create({
        data: {
          companyId,
          employeeId: input.employeeId,
          eventType: "ClockOut",
          eventTimestamp: input.clockOutAt,
          timezone: input.timezone,
          source: "Manual",
          jobId: input.jobId ?? null,
          crewId: input.crewId ?? null,
          createdById: actingUserId,
          correctionReason: input.reason,
          correctedById: actingUserId,
          correctedAt: new Date(),
        },
      });
      const totals = deriveSessionMinutes([clockInEvent, clockOutEvent]);
      const session = await tx.workSession.create({
        data: {
          companyId,
          employeeId: input.employeeId,
          clockInEventId: clockInEvent.id,
          clockOutEventId: clockOutEvent.id,
          timezone: input.timezone,
          source: "Manual",
          crewId: input.crewId ?? null,
          manuallyAdjusted: true,
          notes: input.reason,
          clockInAt: totals.clockInAt,
          clockOutAt: totals.clockOutAt,
          grossMinutes: totals.grossMinutes,
          unpaidBreakMinutes: totals.unpaidBreakMinutes,
          payableMinutes: totals.payableMinutes,
        },
      });
      await tx.auditEvent.create({
        data: {
          companyId,
          actingUserId,
          eventType: "time.manual_entry_created",
          entityType: "WorkSession",
          entityId: session.id,
          metadata: { employeeId: input.employeeId },
        },
      });
      return session;
    },
    { isolationLevel: "Serializable" },
  );
}

export async function requestCorrection(
  companyId: string,
  requestedById: string,
  input: {
    employeeId: string;
    eventId?: string;
    requestedEventType?: TimeClockEventType;
    requestedTimestamp?: Date;
    requestedJobId?: string;
    reason: string;
  },
) {
  if (!input.reason.trim()) throw new Error("A correction reason is required.");
  if (
    !(await prisma.employee.findFirst({
      where: { id: input.employeeId, companyId },
      select: { id: true },
    }))
  )
    throw new Error("Workforce member not found.");
  if (
    input.eventId &&
    !(await prisma.timeClockEvent.findFirst({
      where: { id: input.eventId, companyId, employeeId: input.employeeId },
    }))
  )
    throw new Error("Clock event not found.");
  return prisma.$transaction(async (tx) => {
    const request = await tx.timeCorrectionRequest.create({
      data: { companyId, requestedById, ...input, reason: input.reason.trim() },
    });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId: requestedById,
        eventType: "time.correction_requested",
        entityType: "TimeCorrectionRequest",
        entityId: request.id,
        metadata: { employeeId: input.employeeId },
      },
    });
    return request;
  });
}

export async function reviewCorrection(
  companyId: string,
  reviewedById: string,
  requestId: string,
  approved: boolean,
  note: string,
) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.timeCorrectionRequest.findFirst({
      where: { id: requestId, companyId, status: "Pending" },
    });
    if (!request) throw new Error("Pending correction request not found.");
    if (request.requestedTimestamp)
      await assertTimeIsUnlocked(tx, companyId, request.requestedTimestamp);
    if (!approved) {
      const rejected = await tx.timeCorrectionRequest.update({
        where: { id: request.id },
        data: {
          status: "Rejected",
          reviewedById,
          reviewedAt: new Date(),
          reviewNote: note.trim() || null,
        },
      });
      await tx.auditEvent.create({
        data: {
          companyId,
          actingUserId: reviewedById,
          eventType: "time.correction_rejected",
          entityType: "TimeCorrectionRequest",
          entityId: request.id,
        },
      });
      return rejected;
    }
    if (!request.requestedEventType || !request.requestedTimestamp)
      throw new Error(
        "Approved corrections require an event type and timestamp.",
      );
    const original = request.eventId
      ? await tx.timeClockEvent.findFirst({
          where: { id: request.eventId, companyId },
        })
      : null;
    const corrected = await tx.timeClockEvent.create({
      data: {
        companyId,
        employeeId: request.employeeId,
        eventType: request.requestedEventType,
        eventTimestamp: request.requestedTimestamp,
        timezone: original?.timezone ?? "UTC",
        source: "Manual",
        jobId: request.requestedJobId ?? original?.jobId,
        crewId: original?.crewId,
        createdById: reviewedById,
        correctionReason: request.reason,
        originalEventId: original?.id,
        correctedById: reviewedById,
        correctedAt: new Date(),
      },
    });
    if (original)
      await tx.timeClockEvent.update({
        where: { id: original.id },
        data: { voidedAt: new Date() },
      });
    const applied = await tx.timeCorrectionRequest.update({
      where: { id: request.id },
      data: {
        status: "Applied",
        reviewedById,
        reviewedAt: new Date(),
        reviewNote: note.trim() || null,
      },
    });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId: reviewedById,
        eventType: "time.correction_applied",
        entityType: "TimeCorrectionRequest",
        entityId: request.id,
        metadata: { correctedEventId: corrected.id },
      },
    });
    return applied;
  });
}

export async function allocateSessionTime(
  companyId: string,
  sessionId: string,
  input: {
    jobId?: string | null;
    category: TimeAllocationCategory;
    allocatedMinutes: number;
    notes?: string;
  },
) {
  if (!Number.isInteger(input.allocatedMinutes) || input.allocatedMinutes <= 0)
    throw new Error("Allocated minutes must be a positive whole number.");
  return prisma.$transaction(async (tx) => {
    const session = await tx.workSession.findFirst({
      where: { id: sessionId, companyId },
      include: { allocations: true },
    });
    if (!session) throw new Error("Work session not found.");
    await assertTimeIsUnlocked(tx, companyId, session.clockInAt);
    if (
      input.jobId &&
      !(await tx.job.findFirst({
        where: { id: input.jobId, companyId },
        select: { id: true },
      }))
    )
      throw new Error("Job not found.");
    if (input.category === "Job" && !input.jobId)
      throw new Error("Job allocations require a job.");
    const allocated = session.allocations.reduce(
      (sum, row) => sum + row.allocatedMinutes,
      0,
    );
    if (allocated + input.allocatedMinutes > session.payableMinutes)
      throw new Error("Allocations cannot exceed payable session minutes.");
    return tx.workSessionAllocation.create({
      data: {
        companyId,
        employeeId: session.employeeId,
        workSessionId: session.id,
        jobId: input.jobId ?? null,
        category: input.category,
        allocatedMinutes: input.allocatedMinutes,
        notes: input.notes?.trim() || null,
      },
    });
  });
}

export async function getTimekeepingSettings(companyId: string) {
  return prisma.companyTimekeepingSettings.upsert({
    where: { companyId },
    create: { companyId },
    update: {},
  });
}

export async function createPayPeriod(
  companyId: string,
  input: {
    frequency: PayPeriodFrequency;
    anchor: Date;
    startDate?: Date;
    endDate?: Date;
    timezone: string;
  },
) {
  const range =
    input.frequency === "Custom"
      ? input.startDate && input.endDate
        ? { startDate: input.startDate, endDate: input.endDate }
        : (() => {
            throw new Error("Custom periods require start and end dates.");
          })()
      : payPeriodRange(input.frequency, input.anchor);
  if (range.endDate <= range.startDate)
    throw new Error("Pay period end must follow its start.");
  return prisma.payPeriod.upsert({
    where: {
      companyId_startDate_endDate: {
        companyId,
        startDate: range.startDate,
        endDate: range.endDate,
      },
    },
    create: { companyId, ...range, timezone: input.timezone },
    update: {},
  });
}

export async function getCurrentPayPeriod(companyId: string, now = new Date()) {
  return prisma.payPeriod.findFirst({
    where: { companyId, startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { startDate: "desc" },
  });
}

export async function generateTimesheet(
  companyId: string,
  employeeId: string,
  payPeriodId: string,
) {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findFirst({
      where: { id: employeeId, companyId },
      select: { id: true, userId: true },
    });
    if (!employee) throw new Error("Workforce member not found.");
    const period = await tx.payPeriod.findFirst({
      where: { id: payPeriodId, companyId },
    });
    if (!period) throw new Error("Pay period not found.");
    if (period.status === "Locked")
      throw new Error("Locked pay periods cannot be recalculated.");
    const settings = await tx.companyTimekeepingSettings.findUnique({
      where: { companyId },
    });
    const sessions = await tx.workSession.findMany({
      where: {
        companyId,
        employeeId,
        clockInAt: { gte: period.startDate, lte: period.endDate },
      },
      include: { allocations: true },
      orderBy: { clockInAt: "asc" },
    });
    const minutesByWorkweek = new Map<number, number>();
    let regularMinutes = 0,
      overtimeMinutes = 0,
      unpaidBreakMinutes = 0,
      jobLaborMinutes = 0,
      nonJobLaborMinutes = 0;
    const exceptions: string[] = [];
    for (const session of sessions) {
      if (!session.clockOutAt) {
        exceptions.push("MISSING_CLOCK_OUT");
        continue;
      }
      const week = workweekStart(
        session.clockInAt,
        settings?.workweekStartDay ?? 0,
      ).getTime();
      const prior = minutesByWorkweek.get(week) ?? 0;
      const split = splitRegularOvertime(
        session.payableMinutes,
        prior,
        settings?.overtimeThresholdMinutes ?? 2400,
      );
      minutesByWorkweek.set(week, prior + session.payableMinutes);
      regularMinutes += split.regularMinutes;
      overtimeMinutes += split.overtimeMinutes;
      unpaidBreakMinutes += session.unpaidBreakMinutes;
      const allocated = session.allocations.reduce(
        (sum, row) => sum + row.allocatedMinutes,
        0,
      );
      if (allocated < session.payableMinutes)
        exceptions.push("UNALLOCATED_TIME");
      jobLaborMinutes += session.allocations
        .filter((x) => x.jobId)
        .reduce((sum, row) => sum + row.allocatedMinutes, 0);
      nonJobLaborMinutes += session.allocations
        .filter((x) => !x.jobId)
        .reduce((sum, row) => sum + row.allocatedMinutes, 0);
      if (session.manuallyAdjusted) exceptions.push("EDITED_ENTRY");
      await tx.workSession.update({ where: { id: session.id }, data: split });
    }
    const timesheet = await tx.timesheet.upsert({
      where: { employeeId_payPeriodId: { employeeId, payPeriodId } },
      create: {
        companyId,
        employeeId,
        payPeriodId,
        regularMinutes,
        overtimeMinutes,
        unpaidBreakMinutes,
        jobLaborMinutes,
        nonJobLaborMinutes,
        exceptionFlags: [...new Set(exceptions)],
      },
      update: {
        regularMinutes,
        overtimeMinutes,
        unpaidBreakMinutes,
        jobLaborMinutes,
        nonJobLaborMinutes,
        exceptionFlags: [...new Set(exceptions)],
      },
    });
    await notifyOnce(tx, {
      companyId,
      userId: employee.userId,
      title: "Timesheet ready",
      body: "Your current timesheet is ready for review and submission.",
      since: period.startDate,
    });
    return timesheet;
  });
}

async function changeTimesheet(
  companyId: string,
  actorUserId: string,
  timesheetId: string,
  status: TimesheetStatus,
  action: "Submitted" | "Approved" | "Rejected",
  note?: string,
) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.timesheet.findFirst({
      where: { id: timesheetId, companyId },
      include: {
        payPeriod: true,
        employee: { select: { userId: true } },
      },
    });
    if (!row) throw new Error("Timesheet not found.");
    if (row.payPeriod.status === "Locked" || row.status === "Locked")
      throw new Error("Locked time cannot be changed.");
    if (status === "Rejected" && !note?.trim())
      throw new Error("A rejection reason is required.");
    const updated = await tx.timesheet.update({
      where: { id: row.id },
      data: {
        status,
        managerNotes: status === "Rejected" ? note?.trim() : row.managerNotes,
        submittedAt: status === "Submitted" ? new Date() : row.submittedAt,
        approvedAt: status === "Approved" ? new Date() : null,
        rejectedAt: status === "Rejected" ? new Date() : null,
      },
    });
    await tx.timesheetApprovalEvent.create({
      data: {
        companyId,
        timesheetId: row.id,
        actorUserId,
        action,
        note: note?.trim() || null,
      },
    });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId: actorUserId,
        eventType: `time.timesheet_${status.toLowerCase()}`,
        entityType: "Timesheet",
        entityId: row.id,
      },
    });
    if (status === "Approved" || status === "Rejected")
      await notifyOnce(tx, {
        companyId,
        userId: row.employee.userId,
        title:
          status === "Approved" ? "Timesheet approved" : "Timesheet rejected",
        body:
          status === "Approved"
            ? "Your timesheet was approved."
            : "Your timesheet needs changes before it can be approved.",
      });
    return updated;
  });
}
export const submitTimesheet = (
  companyId: string,
  userId: string,
  id: string,
  note?: string,
) => changeTimesheet(companyId, userId, id, "Submitted", "Submitted", note);
export const approveTimesheet = (
  companyId: string,
  userId: string,
  id: string,
  note?: string,
) => changeTimesheet(companyId, userId, id, "Approved", "Approved", note);
export const rejectTimesheet = (
  companyId: string,
  userId: string,
  id: string,
  note: string,
) => changeTimesheet(companyId, userId, id, "Rejected", "Rejected", note);

export async function setPayPeriodLocked(
  companyId: string,
  userId: string,
  payPeriodId: string,
  locked: boolean,
) {
  return prisma.$transaction(async (tx) => {
    const period = await tx.payPeriod.findFirst({
      where: { id: payPeriodId, companyId },
    });
    if (!period) throw new Error("Pay period not found.");
    if ((period.status === "Locked") === locked)
      throw new Error(
        `Pay period is already ${locked ? "locked" : "unlocked"}.`,
      );
    const updated = await tx.payPeriod.update({
      where: { id: period.id },
      data: {
        status: locked ? "Locked" : "Approved",
        lockedAt: locked ? new Date() : null,
        lockedById: locked ? userId : null,
      },
    });
    await tx.timesheet.updateMany({
      where: { companyId, payPeriodId },
      data: {
        status: locked ? "Locked" : "Approved",
        lockedAt: locked ? new Date() : null,
      },
    });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId: userId,
        eventType: locked
          ? "time.pay_period_locked"
          : "time.pay_period_unlocked",
        entityType: "PayPeriod",
        entityId: period.id,
      },
    });
    if (locked) {
      const workers = await tx.employee.findMany({
        where: {
          companyId,
          userId: { not: null },
          timesheets: { some: { payPeriodId } },
        },
        select: { userId: true },
      });
      for (const worker of workers)
        await notifyOnce(tx, {
          companyId,
          userId: worker.userId,
          title: "Pay period locked",
          body: "Your approved pay period has been locked.",
          since: period.startDate,
        });
    }
    return updated;
  });
}

export async function getPayrollPeriodSummary(
  companyId: string,
  payPeriodId: string,
  includeCompensation: boolean,
) {
  const period = await prisma.payPeriod.findFirst({
    where: { id: payPeriodId, companyId },
    include: {
      timesheets: {
        include: {
          employee: {
            include: {
              compensationHistory: includeCompensation
                ? {
                    where: { effectiveStartDate: { lte: new Date() } },
                    orderBy: { effectiveStartDate: "desc" },
                    take: 1,
                  }
                : false,
            },
          },
        },
      },
    },
  });
  if (!period) throw new Error("Pay period not found.");
  return period;
}

export async function exportApprovedTimeCsv(
  companyId: string,
  userId: string,
  payPeriodId: string,
  includeCompensation: boolean,
) {
  const period = await getPayrollPeriodSummary(
    companyId,
    payPeriodId,
    includeCompensation,
  );
  if (!["Approved", "Exported", "Locked"].includes(period.status))
    throw new Error("Only approved or locked pay periods may be exported.");
  const header = [
    "employee_identifier",
    "employee_name",
    "period_start",
    "period_end",
    "regular_hours",
    "overtime_hours",
    "unpaid_break_hours",
    "job_labor_hours",
    "non_job_labor_hours",
    "compensation_reference",
    "notes",
  ];
  const rows = period.timesheets
    .filter((x) => ["Approved", "Locked"].includes(x.status))
    .map((row) => {
      const comp = includeCompensation
        ? row.employee.compensationHistory[0]
        : undefined;
      const reference = comp
        ? `${comp.compensationType}:${comp.hourlyRateCents ?? comp.annualSalaryCents ?? ""}`
        : "RESTRICTED";
      return [
        row.employee.employeeNumber ?? row.employee.id,
        `${row.employee.firstName} ${row.employee.lastName}`,
        period.startDate.toISOString(),
        period.endDate.toISOString(),
        row.regularMinutes / 60,
        row.overtimeMinutes / 60,
        row.unpaidBreakMinutes / 60,
        row.jobLaborMinutes / 60,
        row.nonJobLaborMinutes / 60,
        reference,
        row.managerNotes ?? "",
      ];
    });
  await prisma.$transaction([
    prisma.payPeriod.update({
      where: { id: period.id },
      data: {
        status: period.status === "Locked" ? "Locked" : "Exported",
        exportedAt: new Date(),
      },
    }),
    prisma.auditEvent.create({
      data: {
        companyId,
        actingUserId: userId,
        eventType: "time.pay_period_exported",
        entityType: "PayPeriod",
        entityId: period.id,
        metadata: { rowCount: rows.length },
      },
    }),
  ]);
  return [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

export async function listTeamTimesheets(
  companyId: string,
  payPeriodId?: string,
) {
  return prisma.timesheet.findMany({
    where: { companyId, payPeriodId },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
        },
      },
      payPeriod: true,
    },
    orderBy: { employee: { firstName: "asc" } },
  });
}
export async function listPayPeriods(companyId: string) {
  return prisma.payPeriod.findMany({
    where: { companyId },
    include: { timesheets: true },
    orderBy: { startDate: "desc" },
  });
}
export async function listTimeExceptions(companyId: string) {
  return prisma.timesheet.findMany({
    where: {
      companyId,
      OR: [{ exceptionFlags: { isEmpty: false } }, { status: "Rejected" }],
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
      payPeriod: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}
export async function listCorrectionRequests(companyId: string) {
  return prisma.timeCorrectionRequest.findMany({
    where: { companyId },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
export async function getTimekeepingEmployeeForUser(
  companyId: string,
  userId: string,
) {
  return prisma.employee.findFirst({
    where: { companyId, userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      employeeNumber: true,
    },
  });
}

const workforceRoleForMembership = (role: string) =>
  role === "Owner"
    ? "Owner"
    : role === "Manager" || role === "Admin"
      ? "Manager"
      : role === "Office"
        ? "Office"
        : "CrewMember";

export async function recoverTimekeepingEmployeeForUser(
  companyId: string,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.employee.findFirst({
      where: { companyId, userId },
    });
    if (existing) return existing;
    const membership = await tx.companyMembership.findFirst({
      where: { companyId, userId, status: "Active" },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!membership) throw new Error("Active company membership is required.");
    const matches = await tx.employee.findMany({
      where: {
        companyId,
        userId: null,
        email: { equals: membership.user.email, mode: "insensitive" },
      },
      take: 2,
    });
    if (matches.length > 1)
      throw new Error(
        "Multiple workforce profiles match your email. Ask an administrator to link the correct profile.",
      );
    const employee = matches[0]
      ? await tx.employee.update({
          where: { id: matches[0].id },
          data: { userId, invitationStatus: "Accepted" },
        })
      : await tx.employee.create({
          data: {
            companyId,
            userId,
            firstName: membership.user.firstName?.trim() || "Team",
            lastName: membership.user.lastName?.trim() || "Member",
            email: membership.user.email.toLowerCase(),
            role: workforceRoleForMembership(membership.role),
            workerType: membership.role === "Owner" ? "Owner" : "Employee",
            status: "Active",
            invitationStatus: "Accepted",
            certifications: [],
          },
        });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId: userId,
        eventType: matches[0]
          ? "workforce.application_access_linked"
          : "workforce.self_profile_created",
        entityType: "Employee",
        entityId: employee.id,
      },
    });
    return employee;
  });
}

export async function updateActiveWorkforceLocation(
  companyId: string,
  userId: string,
  input: { latitude: number; longitude: number; accuracy: number },
) {
  for (const value of [input.latitude, input.longitude, input.accuracy])
    if (!Number.isFinite(value))
      throw new Error("Valid location coordinates are required.");
  if (
    Math.abs(input.latitude) > 90 ||
    Math.abs(input.longitude) > 180 ||
    input.accuracy < 0
  )
    throw new Error("Valid location coordinates are required.");
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findFirst({
      where: { companyId, userId, status: "Active" },
      select: { id: true },
    });
    if (!employee)
      throw new Error("A linked active workforce profile is required.");
    const session = await tx.workSession.findFirst({
      where: { companyId, employeeId: employee.id, clockOutAt: null },
      orderBy: { clockInAt: "desc" },
      select: { id: true, clockInEventId: true },
    });
    if (!session)
      throw new Error("Location is accepted only during an active shift.");
    return tx.timeClockEvent.updateMany({
      where: { id: session.clockInEventId, companyId, employeeId: employee.id },
      data: {
        latitude: input.latitude,
        longitude: input.longitude,
        locationAccuracyMeters: input.accuracy,
      },
    });
  });
}
export async function getTimeClockOptions(
  companyId: string,
  employeeId: string,
) {
  const [jobs, crews] = await Promise.all([
    prisma.job.findMany({
      where: {
        companyId,
        assignments: {
          some: {
            OR: [
              { employeeId },
              { crew: { members: { some: { employeeId } } } },
            ],
          },
        },
      },
      select: {
        id: true,
        jobNumber: true,
        property: { select: { address: true } },
      },
      orderBy: { scheduledStart: "desc" },
      take: 50,
    }),
    prisma.crew.findMany({
      where: { companyId, members: { some: { employeeId } }, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { jobs, crews };
}
