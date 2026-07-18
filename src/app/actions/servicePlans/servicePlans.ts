"use server";
import { requireCompanyRole } from "@/lib/auth/tenant";
import {
  createServicePlan,
  generateDueServicePlanJobs,
  generateJobFromServicePlan,
  generateServicePlanJobsThrough,
  getServicePlan,
  listServicePlans,
  previewServicePlanOccurrences,
  setServicePlanStatus,
  updateServicePlan,
  type ServicePlanInput,
} from "@/lib/servicePlans/servicePlans";
import { recordAuditEvent } from "@/lib/audit/audit";
import { currentRequestId } from "@/lib/audit/requestAudit";
const authorized = () =>
  requireCompanyRole("Owner", "Admin", "Manager", "Office");
export async function createServicePlanAction(input: ServicePlanInput) {
  const context = await authorized();
  const result = await createServicePlan(
    context.companyId,
    context.user.id,
    input,
  );
  await recordAuditEvent({
    companyId: context.companyId,
    actingUserId: context.user.id,
    eventType: "service_plan.created",
    entityType: "ServicePlan",
    entityId: result.id,
    requestId: await currentRequestId(),
  });
  return result;
}
export async function updateServicePlanAction(
  id: string,
  input: ServicePlanInput,
) {
  const c = await authorized();
  const result = await updateServicePlan(c.companyId, id, input);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "service_plan.updated",
    entityType: "ServicePlan",
    entityId: id,
    requestId: await currentRequestId(),
    metadata: { fields: Object.keys(input) },
  });
  return result;
}
export async function listServicePlansAction(
  filters?: Parameters<typeof listServicePlans>[1],
) {
  return listServicePlans((await authorized()).companyId, filters);
}
export async function getServicePlanAction(id: string) {
  return getServicePlan((await authorized()).companyId, id);
}
export async function setServicePlanStatusAction(
  id: string,
  status: Parameters<typeof setServicePlanStatus>[2],
) {
  const c = await authorized();
  const result = await setServicePlanStatus(c.companyId, id, status);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: `service_plan.${String(status).toLowerCase()}`,
    entityType: "ServicePlan",
    entityId: id,
    requestId: await currentRequestId(),
    metadata: { status },
  });
  return result;
}
export async function previewServicePlanOccurrencesAction(
  id: string,
  through: Date,
) {
  return previewServicePlanOccurrences(
    (await authorized()).companyId,
    id,
    through,
  );
}
export async function generateJobFromServicePlanAction(
  id: string,
  occurrence: Date,
) {
  return generateJobFromServicePlan(
    (await authorized()).companyId,
    id,
    occurrence,
  );
}
export async function generateDueServicePlanJobsAction(through: Date) {
  return generateDueServicePlanJobs((await authorized()).companyId, {
    through,
  });
}
export async function generateServicePlanJobsThroughAction(
  id: string,
  through: Date,
) {
  return generateServicePlanJobsThrough(
    (await authorized()).companyId,
    id,
    through,
  );
}
