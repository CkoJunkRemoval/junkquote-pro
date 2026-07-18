"use server";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { createServicePlan, generateDueServicePlanJobs, generateJobFromServicePlan, generateServicePlanJobsThrough, getServicePlan, listServicePlans, previewServicePlanOccurrences, setServicePlanStatus, updateServicePlan, type ServicePlanInput } from "@/lib/servicePlans/servicePlans";
const authorized = () => requireCompanyRole("Owner","Admin","Manager","Office");
export async function createServicePlanAction(input: ServicePlanInput) { const context = await authorized(); return createServicePlan(context.companyId, context.user.id, input); }
export async function updateServicePlanAction(id: string, input: ServicePlanInput) { return updateServicePlan((await authorized()).companyId, id, input); }
export async function listServicePlansAction(filters?: Parameters<typeof listServicePlans>[1]) { return listServicePlans((await authorized()).companyId, filters); }
export async function getServicePlanAction(id: string) { return getServicePlan((await authorized()).companyId, id); }
export async function setServicePlanStatusAction(id: string, status: Parameters<typeof setServicePlanStatus>[2]) { return setServicePlanStatus((await authorized()).companyId, id, status); }
export async function previewServicePlanOccurrencesAction(id: string, through: Date) { return previewServicePlanOccurrences((await authorized()).companyId, id, through); }
export async function generateJobFromServicePlanAction(id: string, occurrence: Date) { return generateJobFromServicePlan((await authorized()).companyId, id, occurrence); }
export async function generateDueServicePlanJobsAction(through: Date) { return generateDueServicePlanJobs((await authorized()).companyId, { through }); }
export async function generateServicePlanJobsThroughAction(id: string, through: Date) { return generateServicePlanJobsThrough((await authorized()).companyId, id, through); }
