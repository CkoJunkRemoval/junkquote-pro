"use server";

import { revalidatePath } from "next/cache";
import type {
  PayPeriodFrequency,
  TimeAllocationCategory,
  TimeClockEventType,
  TimeEntrySource,
} from "@/generated/prisma/client";
import { requireTenantContext } from "@/lib/auth/tenant";
import { prisma } from "@/lib/prisma";
import {
  requireTimeCapability,
  type TimeCapability,
} from "@/lib/timekeeping/permissions";
import * as time from "@/lib/timekeeping/service";

async function context(capability: TimeCapability) {
  const c = await requireTenantContext();
  requireTimeCapability(c.role, capability);
  return c;
}
async function employeeForUser(companyId: string, userId: string) {
  const employee = await prisma.employee.findFirst({
    where: { companyId, userId },
    select: { id: true },
  });
  if (!employee) throw new Error("A linked workforce profile is required.");
  return employee;
}
async function timezoneForCompany(companyId: string) {
  return (await time.getTimekeepingSettings(companyId)).timezone;
}
const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
const date = (value: string) => new Date(value);
const refresh = () => {
  revalidatePath("/team/time");
  revalidatePath("/team/timesheets");
  revalidatePath("/team/pay-periods");
  revalidatePath("/team/time-exceptions");
};

export async function clockEventAction(
  eventType: TimeClockEventType,
  form: FormData,
) {
  const c = await context("time.self.clock"),
    employee = await employeeForUser(c.companyId, c.user.id);
  await time.recordClockEvent(c.companyId, c.user.id, {
    employeeId: employee.id,
    eventType,
    eventTimestamp: new Date(),
    timezone: text(form, "timezone") || (await timezoneForCompany(c.companyId)),
    source: "Desktop",
    jobId: text(form, "jobId") || null,
    crewId: text(form, "crewId") || null,
    notes: text(form, "notes"),
  });
  refresh();
}

export async function recordOfflineClockEventAction(input: {
  eventType: TimeClockEventType;
  deviceTimestamp: string;
  timezone: string;
  source: TimeEntrySource;
  idempotencyKey: string;
  jobId?: string;
  crewId?: string;
}) {
  const c = await context("time.self.clock"),
    employee = await employeeForUser(c.companyId, c.user.id);
  return time.recordClockEvent(c.companyId, c.user.id, {
    employeeId: employee.id,
    eventType: input.eventType,
    eventTimestamp: new Date(input.deviceTimestamp),
    deviceTimestamp: new Date(input.deviceTimestamp),
    timezone: input.timezone,
    source: input.source,
    idempotencyKey: input.idempotencyKey,
    jobId: input.jobId,
    crewId: input.crewId,
  });
}

export async function createManualEntryAction(form: FormData) {
  const c = await context("time.team.manage");
  await time.createManualEntry(c.companyId, c.user.id, {
    employeeId: text(form, "employeeId"),
    clockInAt: date(text(form, "clockInAt")),
    clockOutAt: date(text(form, "clockOutAt")),
    timezone: text(form, "timezone") || (await timezoneForCompany(c.companyId)),
    jobId: text(form, "jobId") || null,
    crewId: text(form, "crewId") || null,
    reason: text(form, "reason"),
  });
  refresh();
}

export async function requestCorrectionAction(form: FormData) {
  const c = await context("time.self.requestCorrection"),
    employee = await employeeForUser(c.companyId, c.user.id);
  await time.requestCorrection(c.companyId, c.user.id, {
    employeeId: employee.id,
    eventId: text(form, "eventId") || undefined,
    requestedEventType: (text(form, "eventType") || undefined) as
      | TimeClockEventType
      | undefined,
    requestedTimestamp: text(form, "timestamp")
      ? date(text(form, "timestamp"))
      : undefined,
    requestedJobId: text(form, "jobId") || undefined,
    reason: text(form, "reason"),
  });
  refresh();
}

export async function reviewCorrectionAction(
  requestId: string,
  approved: boolean,
  form: FormData,
) {
  const c = await context("time.team.manage");
  await time.reviewCorrection(
    c.companyId,
    c.user.id,
    requestId,
    approved,
    text(form, "note"),
  );
  refresh();
}

export async function allocateSessionAction(sessionId: string, form: FormData) {
  const c = await context("time.team.manage");
  await time.allocateSessionTime(c.companyId, sessionId, {
    jobId: text(form, "jobId") || null,
    category: text(form, "category") as TimeAllocationCategory,
    allocatedMinutes: Number(text(form, "allocatedMinutes")),
    notes: text(form, "notes"),
  });
  refresh();
}

export async function createPayPeriodAction(form: FormData) {
  const c = await context("time.payPeriod.manage");
  await time.createPayPeriod(c.companyId, {
    frequency: text(form, "frequency") as PayPeriodFrequency,
    anchor: date(text(form, "anchor")),
    startDate: text(form, "startDate")
      ? date(text(form, "startDate"))
      : undefined,
    endDate: text(form, "endDate") ? date(text(form, "endDate")) : undefined,
    timezone: text(form, "timezone") || (await timezoneForCompany(c.companyId)),
  });
  refresh();
}

export async function generateTimesheetAction(
  employeeId: string,
  payPeriodId: string,
) {
  const c = await context("time.team.manage");
  await time.generateTimesheet(c.companyId, employeeId, payPeriodId);
  refresh();
}
export async function submitTimesheetAction(timesheetId: string) {
  const c = await context("time.timesheet.submit");
  await time.submitTimesheet(c.companyId, c.user.id, timesheetId);
  refresh();
}
export async function approveTimesheetAction(
  timesheetId: string,
  form: FormData,
) {
  const c = await context("time.timesheet.approve");
  await time.approveTimesheet(
    c.companyId,
    c.user.id,
    timesheetId,
    text(form, "note"),
  );
  refresh();
}
export async function rejectTimesheetAction(
  timesheetId: string,
  form: FormData,
) {
  const c = await context("time.timesheet.approve");
  await time.rejectTimesheet(
    c.companyId,
    c.user.id,
    timesheetId,
    text(form, "note"),
  );
  refresh();
}
export async function setPayPeriodLockedAction(
  payPeriodId: string,
  locked: boolean,
) {
  const c = await context("time.lock.manage");
  await time.setPayPeriodLocked(c.companyId, c.user.id, payPeriodId, locked);
  refresh();
}
