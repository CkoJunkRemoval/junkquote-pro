"use server";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import { assignCrewToJob, assignEmployeeToJob, removeJobAssignment } from "@/lib/crews/assignments";
async function operationalCompanyId() { return (await requireOperationalTenant()).companyId; }
export async function assignEmployeeToJobAction(jobId: string, employeeId: string, notes?: string) { return assignEmployeeToJob(await operationalCompanyId(), jobId, employeeId, notes); }
export async function assignCrewToJobAction(jobId: string, crewId: string, notes?: string) { return assignCrewToJob(await operationalCompanyId(), jobId, crewId, notes); }
export async function removeJobAssignmentAction(assignmentId: string) { return removeJobAssignment(await operationalCompanyId(), assignmentId); }
