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
import { createEmployeeAvailability, inspectScheduleConflicts, scheduleJob, unassignDispatchResources, updateSchedulingStatus } from "@/lib/dispatch/scheduling";
import type { SchedulingStatus } from "@/generated/prisma/client";
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
export async function scheduleJobAction(jobId: string, input: Parameters<typeof scheduleJob>[4]) {
  const context = await scheduler();
  return scheduleJob(context.companyId, context.user.id, context.role, jobId, input);
}
export async function inspectScheduleConflictsAction(jobId: string, input: Parameters<typeof scheduleJob>[4]) {
  const context = await scheduler();
  return inspectScheduleConflicts(context.companyId, jobId, input);
}
export async function updateSchedulingStatusAction(jobId: string, status: SchedulingStatus, reason?: string) {
  const context = await requireCompanyRole("Owner", "Admin", "Office", "Crew");
  if (context.role === "Crew") {
    if (!["EnRoute", "Arrived", "InProgress", "Completed", "Delayed"].includes(status)) throw new Error("Crew cannot make this scheduling change.");
    const employee = await (await import("@/lib/prisma")).prisma.employee.findFirst({ where: { companyId: context.companyId, userId: context.user.id }, select: { id: true } });
    const assigned = employee && await (await import("@/lib/prisma")).prisma.jobAssignment.findFirst({ where: { companyId: context.companyId, jobId, employeeId: employee.id, status: { not: "Removed" } }, select: { id: true } });
    if (!assigned) throw new Error("Crew may update only assigned jobs.");
  }
  return updateSchedulingStatus(context.companyId, context.user.id, context.role, jobId, status, reason);
}
export async function createEmployeeAvailabilityAction(input: Parameters<typeof createEmployeeAvailability>[2]) {
  const context = await scheduler();
  return createEmployeeAvailability(context.companyId, context.user.id, input);
}
export async function unassignDispatchResourcesAction(jobId: string, target: "crew" | "vehicle" | "both") {
  const context = await scheduler();
  return unassignDispatchResources(context.companyId, context.user.id, jobId, target);
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
    !(await checkRateLimit(
      `communication:${context.companyId}:${context.user.id}`,
      ratePolicies.communication,
    )).allowed
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
