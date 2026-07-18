"use server";
import { requireOperationalTenant, requireTenantRole } from "@/lib/auth/tenant";
import * as service from "@/lib/crews/management";
import type { EmployeeStatus } from "@/generated/prisma/client";
import type {
  CrewInput,
  EmployeeInput,
  ListEmployeesInput,
} from "@/lib/crews/management";
import { recordAuditEvent } from "@/lib/audit/audit";
import { currentRequestId } from "@/lib/audit/requestAudit";

async function viewCompanyId() {
  return (await requireOperationalTenant()).companyId;
}
async function managed() {
  return requireTenantRole("Owner", "Admin", "Manager");
}
async function audit(
  c: Awaited<ReturnType<typeof managed>>,
  eventType: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
) {
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType,
    entityType,
    entityId,
    requestId: await currentRequestId(),
    metadata,
  });
}

export async function listEmployees(input: ListEmployeesInput = {}) {
  return service.listEmployees(await viewCompanyId(), input);
}
export async function getEmployeeDetail(employeeId: string) {
  return service.getEmployee(await viewCompanyId(), employeeId);
}
export async function createEmployee(input: EmployeeInput) {
  const c = await requireTenantRole("Owner", "Admin", "Manager");
  const result = await service.createEmployee(c.companyId, input);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "employee.created",
    entityType: "Employee",
    entityId: result.id,
    requestId: await currentRequestId(),
    metadata: { role: input.role },
  });
  return result;
}
export async function updateEmployee(employeeId: string, input: EmployeeInput) {
  const c = await managed();
  const result = await service.updateEmployee(c.companyId, employeeId, input);
  await audit(c, "employee.updated", "Employee", employeeId, {
    role: input.role,
  });
  return result;
}
export async function setEmployeeStatus(
  employeeId: string,
  status: EmployeeStatus,
) {
  const c = await managed();
  const result = await service.setEmployeeStatus(
    c.companyId,
    employeeId,
    status,
  );
  await audit(c, "employee.status_changed", "Employee", employeeId, { status });
  return result;
}
export async function archiveEmployee(employeeId: string) {
  const c = await managed();
  const result = await service.archiveEmployee(c.companyId, employeeId);
  await audit(c, "employee.archived", "Employee", employeeId);
  return result;
}
export async function listCrews(active?: boolean) {
  return service.listCrews(await viewCompanyId(), active);
}
export async function getCrewDetail(crewId: string) {
  return service.getCrew(await viewCompanyId(), crewId);
}
export async function createCrew(input: CrewInput) {
  const c = await requireTenantRole("Owner", "Admin", "Manager");
  const result = await service.createCrew(c.companyId, input);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "crew.created",
    entityType: "Crew",
    entityId: result.id,
    requestId: await currentRequestId(),
  });
  return result;
}
export async function updateCrew(crewId: string, input: CrewInput) {
  const c = await managed();
  const result = await service.updateCrew(c.companyId, crewId, input);
  await audit(c, "crew.updated", "Crew", crewId);
  return result;
}
export async function setCrewStatus(crewId: string, active: boolean) {
  const c = await managed();
  const result = await service.setCrewStatus(c.companyId, crewId, active);
  await audit(c, "crew.status_changed", "Crew", crewId, { active });
  return result;
}
export async function deleteCrew(crewId: string) {
  const c = await requireTenantRole("Owner", "Admin", "Manager");
  const result = await service.deleteCrew(c.companyId, crewId);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "crew.deleted",
    entityType: "Crew",
    entityId: crewId,
    requestId: await currentRequestId(),
  });
  return result;
}
export async function addCrewMember(crewId: string, employeeId: string) {
  const c = await managed();
  const result = await service.addCrewMember(c.companyId, crewId, employeeId);
  await audit(c, "crew.member_added", "Crew", crewId, { employeeId });
  return result;
}
export async function removeCrewMember(crewId: string, employeeId: string) {
  const c = await managed();
  const result = await service.removeCrewMember(
    c.companyId,
    crewId,
    employeeId,
  );
  await audit(c, "crew.member_removed", "Crew", crewId, { employeeId });
  return result;
}
export async function setCrewLead(crewId: string, employeeId: string) {
  const c = await managed();
  const result = await service.setCrewLead(c.companyId, crewId, employeeId);
  await audit(c, "crew.lead_changed", "Crew", crewId, { employeeId });
  return result;
}
