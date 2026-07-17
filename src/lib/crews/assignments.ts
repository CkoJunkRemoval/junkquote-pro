import { DEVELOPMENT_COMPANY_ID } from "@/lib/config";
import { prisma } from "../prisma";

export async function assignEmployeeToJob(jobId: string, employeeId: string, notes?: string) {
  const [job, employee] = await Promise.all([prisma.job.findFirst({ where: { id: jobId, companyId: DEVELOPMENT_COMPANY_ID }, select: { id: true } }), prisma.employee.findFirst({ where: { id: employeeId, companyId: DEVELOPMENT_COMPANY_ID }, select: { id: true, status: true } })]);
  if (!job || !employee) throw new Error("Job or employee not found."); if (employee.status !== "Active") throw new Error("Inactive employees cannot receive new assignments.");
  return prisma.jobAssignment.create({ data: { companyId: DEVELOPMENT_COMPANY_ID, jobId: job.id, employeeId: employee.id, notes: notes?.trim() || null } });
}
export async function assignCrewToJob(jobId: string, crewId: string, notes?: string) {
  const [job, crew] = await Promise.all([prisma.job.findFirst({ where: { id: jobId, companyId: DEVELOPMENT_COMPANY_ID }, select: { id: true } }), prisma.crew.findFirst({ where: { id: crewId, companyId: DEVELOPMENT_COMPANY_ID }, select: { id: true, active: true } })]);
  if (!job || !crew) throw new Error("Job or crew not found."); if (!crew.active) throw new Error("Inactive crews cannot receive new assignments.");
  return prisma.jobAssignment.create({ data: { companyId: DEVELOPMENT_COMPANY_ID, jobId: job.id, crewId: crew.id, notes: notes?.trim() || null } });
}
export async function removeJobAssignment(id: string) { const assignment = await prisma.jobAssignment.findFirst({ where: { id, companyId: DEVELOPMENT_COMPANY_ID }, select: { id: true } }); if (!assignment) throw new Error("Assignment not found."); return prisma.jobAssignment.delete({ where: { id: assignment.id } }); }
