"use server";
import { requireCompanyRole } from "@/lib/auth/tenant";
import {
  assignDispatchCrew,
  assignDispatchEmployee,
  getDispatchData,
  updateDispatchJob,
} from "@/lib/dispatch/dispatch";
import { sendOrEnqueueCommunication } from "@/lib/communications/queueCommunication";
import { recordAuditEvent } from "@/lib/audit/audit";
import { currentRequestId } from "@/lib/audit/requestAudit";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";
import { AppError } from "@/lib/errors/appError";
import {
  createEmployeeAvailability,
  inspectScheduleConflicts,
  scheduleJob,
  unassignDispatchResources,
  updateSchedulingStatus,
} from "@/lib/dispatch/scheduling";
import type { SchedulingStatus } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import {
  routeIntelligenceSettings,
  validateRouteSettings,
  type RouteIntelligenceSettings,
} from "@/lib/routeIntelligence/settings";
import {
  applyRouteCrewAssignment,
  applyRouteOrderSwap,
} from "@/lib/dispatch/scheduling";
export async function loadDispatchAction(date: Date) {
  const context = await requireCompanyRole(
    "Owner",
    "Admin",
    "Manager",
    "Office",
    "Crew",
  );
  return getDispatchData(
    context.companyId,
    date,
    context.role === "Crew" ? context.user.id : undefined,
  );
}
async function operational() {
  return requireCompanyRole("Owner", "Admin", "Manager", "Office");
}
async function scheduler() {
  return requireCompanyRole("Owner", "Admin", "Office");
}
export async function scheduleJobAction(
  jobId: string,
  input: Parameters<typeof scheduleJob>[4],
) {
  const context = await scheduler();
  return scheduleJob(
    context.companyId,
    context.user.id,
    context.role,
    jobId,
    input,
  );
}
export async function inspectScheduleConflictsAction(
  jobId: string,
  input: Parameters<typeof scheduleJob>[4],
) {
  const context = await scheduler();
  return inspectScheduleConflicts(context.companyId, jobId, input);
}
export async function updateSchedulingStatusAction(
  jobId: string,
  status: SchedulingStatus,
  reason?: string,
) {
  const context = await requireCompanyRole("Owner", "Admin", "Office", "Crew");
  if (context.role === "Crew") {
    if (
      !["EnRoute", "Arrived", "InProgress", "Completed", "Delayed"].includes(
        status,
      )
    )
      throw new Error("Crew cannot make this scheduling change.");
    const employee = await (
      await import("@/lib/prisma")
    ).prisma.employee.findFirst({
      where: { companyId: context.companyId, userId: context.user.id },
      select: { id: true },
    });
    const assigned =
      employee &&
      (await (
        await import("@/lib/prisma")
      ).prisma.jobAssignment.findFirst({
        where: {
          companyId: context.companyId,
          jobId,
          employeeId: employee.id,
          status: { not: "Removed" },
        },
        select: { id: true },
      }));
    if (!assigned) throw new Error("Crew may update only assigned jobs.");
  }
  return updateSchedulingStatus(
    context.companyId,
    context.user.id,
    context.role,
    jobId,
    status,
    reason,
  );
}
export async function createEmployeeAvailabilityAction(
  input: Parameters<typeof createEmployeeAvailability>[2],
) {
  const context = await scheduler();
  return createEmployeeAvailability(context.companyId, context.user.id, input);
}
export async function unassignDispatchResourcesAction(
  jobId: string,
  target: "crew" | "vehicle" | "both",
) {
  const context = await scheduler();
  return unassignDispatchResources(
    context.companyId,
    context.user.id,
    jobId,
    target,
  );
}
export async function updateDispatchJobAction(
  jobId: string,
  input: Parameters<typeof updateDispatchJob>[2],
) {
  const c = await operational();
  const result = await updateDispatchJob(c.companyId, jobId, input);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "dispatch.job_updated",
    entityType: "Job",
    entityId: jobId,
    requestId: await currentRequestId(),
    metadata: {
      status: input.status,
      dispatchProgress: input.dispatchProgress,
      priority: input.priority,
    },
  });
  return result;
}
export async function assignDispatchCrewAction(jobId: string, crewId: string) {
  const c = await operational();
  const result = await assignDispatchCrew(c.companyId, jobId, crewId);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "dispatch.crew_assigned",
    entityType: "Job",
    entityId: jobId,
    requestId: await currentRequestId(),
    metadata: { crewId },
  });
  return result;
}
export async function assignDispatchEmployeeAction(
  jobId: string,
  employeeId: string,
) {
  const c = await operational();
  const result = await assignDispatchEmployee(c.companyId, jobId, employeeId);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "dispatch.employee_assigned",
    entityType: "Job",
    entityId: jobId,
    requestId: await currentRequestId(),
    metadata: { employeeId },
  });
  return result;
}
export async function sendDispatchMessageAction(jobId: string, body: string) {
  const context = await operational();
  if (
    !(
      await checkRateLimit(
        `communication:${context.companyId}:${context.user.id}`,
        ratePolicies.communication,
      )
    ).allowed
  )
    throw new AppError("RATE_LIMITED", "Too many communication requests.");
  const job = await (
    await import("@/lib/prisma")
  ).prisma.job.findFirst({
    where: { id: jobId, companyId: context.companyId },
    include: { customer: true },
  });
  if (!job) throw new Error("Job not found.");
  const to = job.customer.phone || job.customer.email;
  if (!to) throw new Error("Customer has no message destination.");
  return sendOrEnqueueCommunication(context.companyId, {
    channel: "sms",
    to,
    body,
    idempotencyKey: `dispatch:${job.id}:${Date.now()}`,
    createdByUserId: context.user.id,
  });
}

export async function saveRouteIntelligenceSettingsAction(
  input: RouteIntelligenceSettings,
) {
  const context = await requireCompanyRole("Owner", "Admin");
  const settings = routeIntelligenceSettings(input);
  validateRouteSettings(settings);
  await (
    await import("@/lib/prisma")
  ).prisma.companySettings.upsert({
    where: { companyId: context.companyId },
    create: {
      companyId: context.companyId,
      routeIntelligenceSettings: settings,
    },
    update: { routeIntelligenceSettings: settings },
  });
  await recordAuditEvent({
    companyId: context.companyId,
    actingUserId: context.user.id,
    eventType: "route_intelligence.settings_updated",
    entityType: "Company",
    entityId: context.companyId,
    metadata: { enabled: settings.enabled },
  });
  revalidatePath("/dispatch");
}

async function currentSuggestion(
  companyId: string,
  suggestionId: string,
  date: Date,
  grouping: "crewLead" | "crewMember" | "vehicle" | "unassigned",
) {
  const data = await getDispatchData(companyId, date, undefined, { grouping });
  return data.routeIntelligence.routes
    .flatMap((route) => route.suggestions)
    .find((row) => row.id === suggestionId);
}

export async function previewRouteSuggestionAction(
  suggestionId: string,
  date: Date,
  grouping: "crewLead" | "crewMember" | "vehicle" | "unassigned",
) {
  const context = await requireCompanyRole("Owner", "Admin", "Office");
  const suggestion = await currentSuggestion(
    context.companyId,
    suggestionId,
    date,
    grouping,
  );
  if (!suggestion) throw new Error("Route suggestion is no longer current.");
  await recordAuditEvent({
    companyId: context.companyId,
    actingUserId: context.user.id,
    eventType: "route.suggestion_previewed",
    entityType: "RouteSuggestion",
    entityId: suggestion.id,
    metadata: suggestion,
  });
  return suggestion;
}

export async function dismissRouteSuggestionAction(
  suggestionId: string,
  date: Date,
  grouping: "crewLead" | "crewMember" | "vehicle" | "unassigned",
) {
  const context = await requireCompanyRole("Owner", "Admin", "Office");
  const suggestion = await currentSuggestion(
    context.companyId,
    suggestionId,
    date,
    grouping,
  );
  if (!suggestion) throw new Error("Route suggestion is no longer current.");
  await recordAuditEvent({
    companyId: context.companyId,
    actingUserId: context.user.id,
    eventType: "route.suggestion_dismissed",
    entityType: "RouteSuggestion",
    entityId: suggestion.id,
    metadata: { affectedJobIds: suggestion.affectedJobIds },
  });
}

export async function applyRouteSuggestionAction(
  suggestionId: string,
  date: Date,
  grouping: "crewLead" | "crewMember" | "vehicle" | "unassigned",
  overrideReason?: string,
) {
  const context = await requireCompanyRole("Owner", "Admin", "Office");
  const suggestion = await currentSuggestion(
    context.companyId,
    suggestionId,
    date,
    grouping,
  );
  if (!suggestion) throw new Error("Route suggestion is no longer current.");
  if (
    ["ASSIGN_AVAILABLE_CREW", "CLOSER_AVAILABLE_CREW"].includes(
      suggestion.type,
    )
  ) {
    if (
      suggestion.affectedJobIds.length !== 1 ||
      !suggestion.targetEmployeeId
    )
      throw new Error("The crew suggestion is incomplete.");
    await applyRouteCrewAssignment(
      context.companyId,
      context.user.id,
      context.role,
      suggestion.affectedJobIds[0],
      suggestion.targetEmployeeId,
      {
        id: suggestion.id,
        type: suggestion.type as
          | "ASSIGN_AVAILABLE_CREW"
          | "CLOSER_AVAILABLE_CREW",
        estimatedBenefit: suggestion.estimatedBenefit,
        confidence: suggestion.confidence,
        overrideReason,
      },
    );
  } else if (
    ["ADJACENT_SWAP", "SAME_ZIP_GROUPING", "NON_ADJACENT_MOVE"].includes(
      suggestion.type,
    )
  ) {
    await applyRouteOrderSwap(
      context.companyId,
      context.user.id,
      context.role,
      suggestion.affectedJobIds,
      {
        id: suggestion.id,
        estimatedBenefit: suggestion.estimatedBenefit,
        confidence: suggestion.confidence,
        proposedJobIds: suggestion.proposedJobIds,
        overrideReason,
      },
    );
  } else {
    throw new Error(
      "This advisory suggestion cannot be applied automatically.",
    );
  }
  revalidatePath("/dispatch");
}
