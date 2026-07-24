import "server-only";
import type {
  JobAssignmentRole,
  MembershipRole,
  SchedulingStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  overlaps,
  parseBusinessHours,
  validateScheduleWindow,
  type ScheduleConflict,
} from "./conflicts";
import {
  cancelPendingCommunicationForSource,
  emitCommunicationEventForSource,
} from "@/lib/communications/engine";

export type ScheduleJobInput = {
  scheduledStart: Date;
  scheduledEnd: Date;
  arrivalWindowStart?: Date | null;
  arrivalWindowEnd?: Date | null;
  estimatedDurationMinutes: number;
  schedulingStatus: Extract<
    SchedulingStatus,
    "Tentative" | "Scheduled" | "Confirmed"
  >;
  employeeAssignments: Array<{
    employeeId: string;
    role: JobAssignmentRole;
    lead: boolean;
  }>;
  vehicleIds: string[];
  dispatchNotes?: string;
  internalAccessNotes?: string;
  customerInstructions?: string;
  allDay?: boolean;
  timeZone: string;
  expectedVersion: number;
  overrideReason?: string;
};

const activeScheduleStatuses: SchedulingStatus[] = [
  "Tentative",
  "Scheduled",
  "Confirmed",
  "EnRoute",
  "Arrived",
  "InProgress",
  "Delayed",
];

export async function inspectScheduleConflicts(
  companyId: string,
  jobId: string,
  input: ScheduleJobInput,
) {
  const employeeIds = input.employeeAssignments.map((row) => row.employeeId);
  const vehicleIds = input.vehicleIds;
  if (new Set(employeeIds).size !== employeeIds.length)
    throw new Error("An employee cannot be assigned twice.");
  if (new Set(vehicleIds).size !== vehicleIds.length)
    throw new Error("A vehicle cannot be assigned twice.");
  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId },
    select: {
      id: true,
      scheduleVersion: true,
      estimate: {
        select: {
          jobSites: {
            select: { items: { select: { crewRequirement: true } } },
          },
        },
      },
    },
  });
  if (!job) throw new Error("Job not found.");
  const [employees, vehicles, settings, overlappingJobs, availability] =
    await Promise.all([
      prisma.employee.findMany({
        where: { companyId, id: { in: employeeIds }, status: "Active" },
        select: { id: true },
      }),
      prisma.fleetAsset.findMany({
        where: { companyId, id: { in: vehicleIds }, status: "Active" },
        select: { id: true },
      }),
      prisma.companySettings.findUnique({
        where: { companyId },
        select: { businessHours: true },
      }),
      prisma.job.findMany({
        where: {
          companyId,
          id: { not: jobId },
          schedulingStatus: { in: activeScheduleStatuses },
          scheduledStart: { lt: input.scheduledEnd },
          scheduledEnd: { gt: input.scheduledStart },
          OR: [
            {
              assignments: {
                some: {
                  employeeId: { in: employeeIds },
                  status: { not: "Removed" },
                },
              },
            },
            {
              vehicleAssignments: {
                some: { fleetAssetId: { in: vehicleIds } },
              },
            },
          ],
        },
        select: {
          id: true,
          jobNumber: true,
          assignments: { select: { employeeId: true } },
          vehicleAssignments: { select: { fleetAssetId: true } },
        },
      }),
      prisma.employeeAvailability.findMany({
        where: {
          companyId,
          employeeId: { in: employeeIds },
          type: { in: ["Unavailable", "TimeOff"] },
          startsAt: { lt: input.scheduledEnd },
          endsAt: { gt: input.scheduledStart },
        },
        select: { employeeId: true, type: true, startsAt: true, endsAt: true },
      }),
    ]);
  if (
    employees.length !== employeeIds.length ||
    vehicles.length !== vehicleIds.length
  )
    throw new Error("An employee or vehicle does not belong to this company.");
  const requiredCrewSize = Math.max(
    1,
    ...job.estimate.jobSites.flatMap((site) =>
      site.items.map((item) => item.crewRequirement),
    ),
  );
  const conflicts: ScheduleConflict[] = validateScheduleWindow({
    start: input.scheduledStart,
    end: input.scheduledEnd,
    arrivalStart: input.arrivalWindowStart,
    arrivalEnd: input.arrivalWindowEnd,
    employeeIds,
    vehicleIds,
    requiredCrewSize,
    businessHours: parseBusinessHours(settings?.businessHours),
  });
  for (const other of overlappingJobs) {
    if (
      other.assignments.some(
        (row) => row.employeeId && employeeIds.includes(row.employeeId),
      )
    )
      conflicts.push({
        code: "EMPLOYEE_OVERLAP",
        severity: "blocking",
        message: `Employee overlaps ${other.jobNumber ?? "another job"}.`,
      });
    if (
      other.vehicleAssignments.some((row) =>
        vehicleIds.includes(row.fleetAssetId),
      )
    )
      conflicts.push({
        code: "VEHICLE_OVERLAP",
        severity: "blocking",
        message: `Vehicle overlaps ${other.jobNumber ?? "another job"}.`,
      });
  }
  for (const row of availability) {
    if (
      overlaps(
        input.scheduledStart,
        input.scheduledEnd,
        row.startsAt,
        row.endsAt,
      )
    )
      conflicts.push({
        code: "EMPLOYEE_UNAVAILABLE",
        severity: "warning",
        message: `An assigned employee is marked ${row.type === "TimeOff" ? "off" : "unavailable"}.`,
      });
  }
  return { conflicts, requiredCrewSize, scheduleVersion: job.scheduleVersion };
}

export async function scheduleJob(
  companyId: string,
  actingUserId: string,
  role: MembershipRole,
  jobId: string,
  input: ScheduleJobInput,
) {
  if (
    !Number.isInteger(input.estimatedDurationMinutes) ||
    input.estimatedDurationMinutes < 1 ||
    input.estimatedDurationMinutes > 1440
  )
    throw new Error("Expected duration must be between 1 and 1,440 minutes.");
  if (!input.timeZone.trim()) throw new Error("Time zone is required.");
  const inspection = await inspectScheduleConflicts(companyId, jobId, input);
  const blocking = inspection.conflicts.filter(
    (item) => item.severity === "blocking",
  );
  if (blocking.length)
    throw new Error(blocking.map((item) => item.message).join(" "));
  const warnings = inspection.conflicts.filter(
    (item) => item.severity === "warning",
  );
  if (warnings.length) {
    if (!["Owner", "Admin"].includes(role) || !input.overrideReason?.trim())
      throw new Error(
        `${warnings.map((item) => item.message).join(" ")} An Owner or Admin may override with a reason.`,
      );
  }
  if (inspection.scheduleVersion !== input.expectedVersion)
    throw new Error(
      "This schedule changed while you were editing. Reload and try again.",
    );
  const previous = await prisma.job.findFirstOrThrow({
    where: { id: jobId, companyId },
    select: {
      scheduledStart: true,
      scheduledEnd: true,
      schedulingStatus: true,
      assignments: {
        where: { employeeId: { not: null }, status: { not: "Removed" } },
        select: { employeeId: true },
      },
      vehicleAssignments: { select: { fleetAssetId: true } },
    },
  });
  const rescheduled = Boolean(previous.scheduledStart);
  const previousEmployees = previous.assignments
    .flatMap((row) => (row.employeeId ? [row.employeeId] : []))
    .sort();
  const nextEmployees = input.employeeAssignments
    .map((row) => row.employeeId)
    .sort();
  const previousVehicles = previous.vehicleAssignments
    .map((row) => row.fleetAssetId)
    .sort();
  const nextVehicles = [...input.vehicleIds].sort();
  const assignmentChanged =
    previousEmployees.join("|") !== nextEmployees.join("|") ||
    previousVehicles.join("|") !== nextVehicles.join("|");
  const moved =
    rescheduled &&
    (previous.scheduledStart?.getTime() !== input.scheduledStart.getTime() ||
      previous.scheduledEnd?.getTime() !== input.scheduledEnd.getTime());
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.job.update({
      where: { id: jobId },
      data: {
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        arrivalWindowStart: input.arrivalWindowStart ?? null,
        arrivalWindowEnd: input.arrivalWindowEnd ?? null,
        estimatedDurationMinutes: input.estimatedDurationMinutes,
        schedulingStatus: input.schedulingStatus,
        status: "Scheduled",
        dispatchNotes: input.dispatchNotes?.trim() ?? "",
        internalAccessNotes: input.internalAccessNotes?.trim() ?? "",
        customerInstructions: input.customerInstructions?.trim() ?? "",
        allDay: input.allDay ?? false,
        timeZone: input.timeZone,
        scheduleVersion: { increment: 1 },
        lastScheduledAt: new Date(),
        lastScheduledById: actingUserId,
      },
    });
    await tx.jobAssignment.deleteMany({
      where: { jobId, employeeId: { not: null } },
    });
    if (input.employeeAssignments.length)
      await tx.jobAssignment.createMany({
        data: input.employeeAssignments.map((row) => ({
          companyId,
          jobId,
          assignedById: actingUserId,
          ...row,
        })),
      });
    await tx.jobVehicleAssignment.deleteMany({ where: { jobId } });
    if (input.vehicleIds.length)
      await tx.jobVehicleAssignment.createMany({
        data: input.vehicleIds.map((fleetAssetId) => ({
          companyId,
          jobId,
          fleetAssetId,
          assignedById: actingUserId,
        })),
      });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId,
        entityType: "Job",
        entityId: jobId,
        eventType: rescheduled
          ? "JOB_RESCHEDULED"
          : input.schedulingStatus === "Confirmed"
            ? "JOB_CONFIRMED"
            : "JOB_SCHEDULED",
        metadata: {
          previous,
          next: {
            start: input.scheduledStart,
            end: input.scheduledEnd,
            status: input.schedulingStatus,
          },
          employeeIds: input.employeeAssignments.map((row) => row.employeeId),
          vehicleIds: input.vehicleIds,
          warnings: warnings.map((item) => item.code),
          overrideReason: input.overrideReason?.trim() || null,
        },
      },
    });
    if (input.employeeAssignments.length)
      await tx.auditEvent.create({
        data: {
          companyId,
          actingUserId,
          entityType: "Job",
          entityId: jobId,
          eventType: "CREW_ASSIGNED",
          metadata: {
            employeeIds: input.employeeAssignments.map((row) => row.employeeId),
          },
        },
      });
    if (moved)
      await tx.auditEvent.create({
        data: {
          companyId,
          actingUserId,
          entityType: "Job",
          entityId: jobId,
          eventType: "JOB_MOVED",
          metadata: {
            previous: {
              start: previous.scheduledStart,
              end: previous.scheduledEnd,
            },
            next: { start: input.scheduledStart, end: input.scheduledEnd },
          },
        },
      });
    if (assignmentChanged)
      await tx.auditEvent.create({
        data: {
          companyId,
          actingUserId,
          entityType: "Job",
          entityId: jobId,
          eventType: "DISPATCH_ASSIGNMENT_CHANGED",
          metadata: {
            previousEmployeeIds: previousEmployees,
            employeeIds: nextEmployees,
            previousVehicleIds: previousVehicles,
            vehicleIds: nextVehicles,
          },
        },
      });
    return { job: updated, conflicts: inspection.conflicts };
  });
  const eventType = rescheduled
    ? "JOB_RESCHEDULED"
    : input.schedulingStatus === "Confirmed"
      ? "JOB_CONFIRMED"
      : "JOB_SCHEDULED";
  if (rescheduled)
    await cancelPendingCommunicationForSource(companyId, "Job", jobId, [
      "JOB_SCHEDULED",
      "JOB_CONFIRMED",
    ]);
  await emitCommunicationEventForSource({
    companyId,
    eventType,
    sourceType: "Job",
    sourceId: jobId,
    dedupeKey: `${eventType}:${jobId}:v${result.job.scheduleVersion}`,
  });
  if (assignmentChanged)
    await emitCommunicationEventForSource({
      companyId,
      eventType: "CREW_ASSIGNED",
      sourceType: "Job",
      sourceId: jobId,
      dedupeKey: `CREW_ASSIGNED:${jobId}:v${result.job.scheduleVersion}`,
    });
  return result;
}

export async function applyRouteOrderSwap(
  companyId: string,
  actingUserId: string,
  role: MembershipRole,
  jobIds: string[],
  suggestion: {
    id: string;
    estimatedBenefit: string;
    confidence: string;
    proposedJobIds?: string[];
    overrideReason?: string;
  },
) {
  if (jobIds.length < 2 || jobIds.length > 12)
    throw new Error("Route order changes require between 2 and 12 jobs.");
  if (new Set(jobIds).size !== jobIds.length)
    throw new Error("Route order jobs must be unique.");
  const jobs = await prisma.job.findMany({
    where: {
      companyId,
      id: { in: jobIds },
      scheduledStart: { not: null },
      scheduledEnd: { not: null },
    },
    include: {
      assignments: {
        where: { employeeId: { not: null }, status: { not: "Removed" } },
        select: { employeeId: true },
      },
      vehicleAssignments: { select: { fleetAssetId: true } },
      estimate: {
        select: {
          jobSites: {
            select: { items: { select: { crewRequirement: true } } },
          },
        },
      },
    },
  });
  if (jobs.length !== jobIds.length)
    throw new Error("Route jobs were not found.");
  const byId = new Map(jobs.map((job) => [job.id, job]));
  const current = jobIds.map((id) => byId.get(id)!);
  const proposedJobIds = suggestion.proposedJobIds ?? [...jobIds].reverse();
  if (
    proposedJobIds.length !== jobIds.length ||
    new Set(proposedJobIds).size !== jobIds.length ||
    proposedJobIds.some((id) => !byId.has(id))
  )
    throw new Error("The proposed route order is invalid.");
  const timeSlots = current.map((job) => ({
    start: job.scheduledStart!,
    end: job.scheduledEnd!,
  }));
  const final = proposedJobIds.map((id, index) => ({
    job: byId.get(id)!,
    ...timeSlots[index],
  }));
  const warnings: ScheduleConflict[] = [];
  for (const target of final) {
    const employeeIds = target.job.assignments.flatMap((row) =>
      row.employeeId ? [row.employeeId] : [],
    );
    const vehicleIds = target.job.vehicleAssignments.map(
      (row) => row.fleetAssetId,
    );
    warnings.push(
      ...validateScheduleWindow({
        start: target.start,
        end: target.end,
        employeeIds,
        vehicleIds,
        requiredCrewSize: Math.max(
          1,
          ...target.job.estimate.jobSites.flatMap((site) =>
            site.items.map((item) => item.crewRequirement),
          ),
        ),
      }),
    );
    const overlap = await prisma.job.findFirst({
      where: {
        companyId,
        id: { notIn: jobIds },
        schedulingStatus: { in: activeScheduleStatuses },
        scheduledStart: { lt: target.end },
        scheduledEnd: { gt: target.start },
        OR: [
          {
            assignments: {
              some: {
                employeeId: { in: employeeIds },
                status: { not: "Removed" },
              },
            },
          },
          {
            vehicleAssignments: {
              some: { fleetAssetId: { in: vehicleIds } },
            },
          },
        ],
      },
      select: { id: true },
    });
    if (overlap)
      throw new Error(
        "The suggested order creates a blocking scheduling conflict.",
      );
  }
  const advisory = warnings.filter((item) => item.severity === "warning");
  if (
    advisory.length &&
    (!["Owner", "Admin"].includes(role) || !suggestion.overrideReason?.trim())
  ) {
    throw new Error(
      `${advisory.map((item) => item.message).join(" ")} An Owner or Admin may override with a reason.`,
    );
  }
  await prisma.$transaction(async (tx) => {
    for (const target of final) {
      await tx.job.update({
        where: { id: target.job.id },
        data: {
          scheduledStart: target.start,
          scheduledEnd: target.end,
          scheduleVersion: { increment: 1 },
          lastScheduledAt: new Date(),
          lastScheduledById: actingUserId,
        },
      });
      await tx.auditEvent.create({
        data: {
          companyId,
          actingUserId,
          entityType: "Job",
          entityId: target.job.id,
          eventType: "ROUTE_ORDER_CHANGED",
          metadata: {
            suggestionId: suggestion.id,
            previous: {
              start: target.job.scheduledStart,
              end: target.job.scheduledEnd,
            },
            next: { start: target.start, end: target.end },
          },
        },
      });
    }
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId,
        entityType: "RouteSuggestion",
        entityId: suggestion.id,
        eventType: "ROUTE_SUGGESTION_APPLIED",
        metadata: {
          previousOrder: jobIds,
          newOrder: proposedJobIds,
          estimatedBenefit: suggestion.estimatedBenefit,
          confidence: suggestion.confidence,
          overrideReason: suggestion.overrideReason?.trim() || null,
        },
      },
    });
  });
  for (const jobId of jobIds) {
    await cancelPendingCommunicationForSource(companyId, "Job", jobId, [
      "JOB_SCHEDULED",
      "JOB_CONFIRMED",
    ]);
    await emitCommunicationEventForSource({
      companyId,
      eventType: "JOB_RESCHEDULED",
      sourceType: "Job",
      sourceId: jobId,
      dedupeKey: `JOB_RESCHEDULED:${jobId}:route:${suggestion.id}`,
    });
  }
}

export async function applyRouteCrewAssignment(
  companyId: string,
  actingUserId: string,
  role: MembershipRole,
  jobId: string,
  targetEmployeeId: string,
  suggestion: {
    id: string;
    type: "ASSIGN_AVAILABLE_CREW" | "CLOSER_AVAILABLE_CREW";
    estimatedBenefit: string;
    confidence: string;
    overrideReason?: string;
  },
) {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      companyId,
      scheduledStart: { not: null },
      scheduledEnd: { not: null },
    },
    select: {
      id: true,
      scheduledStart: true,
      scheduledEnd: true,
      arrivalWindowStart: true,
      arrivalWindowEnd: true,
      estimatedDurationMinutes: true,
      schedulingStatus: true,
      dispatchNotes: true,
      internalAccessNotes: true,
      customerInstructions: true,
      allDay: true,
      timeZone: true,
      scheduleVersion: true,
      assignments: {
        where: { employeeId: { not: null }, status: { not: "Removed" } },
        select: { employeeId: true, role: true, lead: true },
      },
      vehicleAssignments: { select: { fleetAssetId: true } },
    },
  });
  if (!job) throw new Error("Route job was not found.");
  const target = await prisma.employee.findFirst({
    where: { id: targetEmployeeId, companyId, status: "Active" },
    select: { id: true },
  });
  if (!target) throw new Error("The suggested crew lead is unavailable.");
  const retained = job.assignments
    .filter(
      (assignment) =>
        !assignment.lead && assignment.employeeId !== targetEmployeeId,
    )
    .map((assignment) => ({
      employeeId: assignment.employeeId!,
      role: assignment.role,
      lead: false,
    }));
  await scheduleJob(companyId, actingUserId, role, job.id, {
    scheduledStart: job.scheduledStart!,
    scheduledEnd: job.scheduledEnd!,
    arrivalWindowStart: job.arrivalWindowStart,
    arrivalWindowEnd: job.arrivalWindowEnd,
    estimatedDurationMinutes:
      job.estimatedDurationMinutes ??
      Math.max(
        1,
        Math.round(
          (job.scheduledEnd!.getTime() - job.scheduledStart!.getTime()) / 60000,
        ),
      ),
    schedulingStatus:
      job.schedulingStatus === "Tentative" ||
      job.schedulingStatus === "Confirmed"
        ? job.schedulingStatus
        : "Scheduled",
    employeeAssignments: [
      { employeeId: targetEmployeeId, role: "CrewLead", lead: true },
      ...retained,
    ],
    vehicleIds: job.vehicleAssignments.map(
      (assignment) => assignment.fleetAssetId,
    ),
    dispatchNotes: job.dispatchNotes ?? "",
    internalAccessNotes: job.internalAccessNotes ?? "",
    customerInstructions: job.customerInstructions ?? "",
    allDay: job.allDay,
    timeZone: job.timeZone,
    expectedVersion: job.scheduleVersion,
    overrideReason: suggestion.overrideReason,
  });
  await prisma.auditEvent.create({
    data: {
      companyId,
      actingUserId,
      entityType: "RouteSuggestion",
      entityId: suggestion.id,
      eventType: "ROUTE_SUGGESTION_APPLIED",
      metadata: {
        type: suggestion.type,
        jobId,
        targetEmployeeId,
        estimatedBenefit: suggestion.estimatedBenefit,
        confidence: suggestion.confidence,
        overrideReason: suggestion.overrideReason?.trim() || null,
      },
    },
  });
}

export async function updateSchedulingStatus(
  companyId: string,
  actingUserId: string,
  role: MembershipRole,
  jobId: string,
  status: SchedulingStatus,
  reason?: string,
) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId },
    select: { id: true, schedulingStatus: true },
  });
  if (!job) throw new Error("Job not found.");
  if (["Cancelled", "Delayed", "NoShow"].includes(status) && !reason?.trim())
    throw new Error("A reason is required.");
  const eventType =
    status === "Confirmed"
      ? "JOB_CONFIRMED"
      : status === "Delayed"
        ? "JOB_DELAYED"
        : status === "Cancelled"
          ? "JOB_CANCELLED"
          : "JOB_STATUS_UPDATED";
  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.job.update({
      where: { id: jobId },
      data: {
        schedulingStatus: status,
        ...(status === "Cancelled"
          ? { status: "Cancelled" }
          : status === "Completed"
            ? {
                status: "Completed",
                completedAt: new Date(),
                fieldStage: "Completed",
              }
            : status === "InProgress"
              ? { status: "InProgress", fieldStage: "Working" }
              : status === "EnRoute"
                ? {
                    dispatchProgress: "EnRoute",
                    fieldStage: "EnRoute",
                    enRouteAt: new Date(),
                  }
                : status === "Arrived"
                  ? {
                      dispatchProgress: "Arrived",
                      fieldStage: "Arrived",
                      arrivedAt: new Date(),
                    }
                  : {}),
      },
    });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId,
        entityType: "Job",
        entityId: jobId,
        eventType,
        metadata: {
          previous: job.schedulingStatus,
          next: status,
          reason: reason?.trim() || null,
          role,
        },
      },
    });
    return updated;
  });
  const communicationType =
    status === "Confirmed"
      ? "JOB_CONFIRMED"
      : status === "Delayed"
        ? "JOB_DELAYED"
        : status === "Completed"
          ? "JOB_COMPLETED"
          : status === "Cancelled"
            ? "JOB_CANCELLED"
            : status === "EnRoute"
              ? "JOB_EN_ROUTE"
              : status === "Arrived"
                ? "JOB_ARRIVED"
                : null;
  if (communicationType)
    await emitCommunicationEventForSource({
      companyId,
      eventType: communicationType,
      sourceType: "Job",
      sourceId: jobId,
      dedupeKey: `${communicationType}:${jobId}:${updated.updatedAt.toISOString()}`,
      urgent: status === "Delayed",
      extraVariables:
        status === "Delayed"
          ? { "job.delayMinutes": reason?.match(/\d+/)?.[0] ?? "Unknown" }
          : undefined,
    });
  return updated;
}

export async function unassignDispatchResources(
  companyId: string,
  actingUserId: string,
  jobId: string,
  target: "crew" | "vehicle" | "both",
) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId },
    select: { id: true },
  });
  if (!job) throw new Error("Job not found.");
  return prisma.$transaction(async (tx) => {
    if (target !== "vehicle")
      await tx.jobAssignment.deleteMany({
        where: { companyId, jobId, employeeId: { not: null } },
      });
    if (target !== "crew")
      await tx.jobVehicleAssignment.deleteMany({ where: { companyId, jobId } });
    await tx.job.update({
      where: { id: jobId },
      data: { scheduleVersion: { increment: 1 } },
    });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId,
        entityType: "Job",
        entityId: jobId,
        eventType: "DISPATCH_ASSIGNMENT_CHANGED",
        metadata: { action: "unassign", target },
      },
    });
    return { jobId, target };
  });
}

export async function createEmployeeAvailability(
  companyId: string,
  actingUserId: string,
  input: {
    employeeId: string;
    type: "WorkingHours" | "Unavailable" | "TimeOff";
    startsAt: Date;
    endsAt: Date;
    recurringDayOfWeek?: number | null;
    notes?: string;
  },
) {
  if (input.endsAt <= input.startsAt)
    throw new Error("Availability end must be after its start.");
  if (
    input.recurringDayOfWeek != null &&
    (!Number.isInteger(input.recurringDayOfWeek) ||
      input.recurringDayOfWeek < 0 ||
      input.recurringDayOfWeek > 6)
  )
    throw new Error("Recurring day must be between Sunday and Saturday.");
  const employee = await prisma.employee.findFirst({
    where: { id: input.employeeId, companyId },
    select: { id: true },
  });
  if (!employee) throw new Error("Employee not found.");
  return prisma.$transaction(async (tx) => {
    const availability = await tx.employeeAvailability.create({
      data: { companyId, ...input, notes: input.notes?.trim() || null },
    });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId,
        entityType: "Employee",
        entityId: input.employeeId,
        eventType: "EMPLOYEE_AVAILABILITY_CREATED",
        metadata: {
          type: input.type,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
        },
      },
    });
    return availability;
  });
}
