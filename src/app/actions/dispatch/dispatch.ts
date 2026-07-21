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
