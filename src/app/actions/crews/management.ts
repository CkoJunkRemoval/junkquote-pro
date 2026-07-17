"use server";
import { requireOperationalTenant, requireTenantRole } from "@/lib/auth/tenant";
import * as service from "@/lib/crews/management";
import type { EmployeeStatus } from "@/generated/prisma/client";
import type { CrewInput, EmployeeInput, ListEmployeesInput } from "@/lib/crews/management";

async function viewCompanyId() { return (await requireOperationalTenant()).companyId; }
async function manageCompanyId() { return (await requireTenantRole("Owner", "Admin", "Manager")).companyId; }

export async function listEmployees(input: ListEmployeesInput = {}) { return service.listEmployees(await viewCompanyId(), input); }
export async function getEmployeeDetail(employeeId: string) { return service.getEmployee(await viewCompanyId(), employeeId); }
export async function createEmployee(input: EmployeeInput) { return service.createEmployee(await manageCompanyId(), input); }
export async function updateEmployee(employeeId: string, input: EmployeeInput) { return service.updateEmployee(await manageCompanyId(), employeeId, input); }
export async function setEmployeeStatus(employeeId: string, status: EmployeeStatus) { return service.setEmployeeStatus(await manageCompanyId(), employeeId, status); }
export async function archiveEmployee(employeeId: string) { return service.archiveEmployee(await manageCompanyId(), employeeId); }
export async function listCrews(active?: boolean) { return service.listCrews(await viewCompanyId(), active); }
export async function getCrewDetail(crewId: string) { return service.getCrew(await viewCompanyId(), crewId); }
export async function createCrew(input: CrewInput) { return service.createCrew(await manageCompanyId(), input); }
export async function updateCrew(crewId: string, input: CrewInput) { return service.updateCrew(await manageCompanyId(), crewId, input); }
export async function setCrewStatus(crewId: string, active: boolean) { return service.setCrewStatus(await manageCompanyId(), crewId, active); }
export async function deleteCrew(crewId: string) { return service.deleteCrew(await manageCompanyId(), crewId); }
export async function addCrewMember(crewId: string, employeeId: string) { return service.addCrewMember(await manageCompanyId(), crewId, employeeId); }
export async function removeCrewMember(crewId: string, employeeId: string) { return service.removeCrewMember(await manageCompanyId(), crewId, employeeId); }
export async function setCrewLead(crewId: string, employeeId: string) { return service.setCrewLead(await manageCompanyId(), crewId, employeeId); }
