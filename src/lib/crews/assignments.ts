import { prisma } from "../prisma";

export async function assignEmployeeToJob(companyId: string, jobId: string, employeeId: string, notes?: string) {
  const [job, employee] = await Promise.all([prisma.job.findFirst({ where: { id: jobId, companyId }, select: { id: true } }), prisma.employee.findFirst({ where: { id: employeeId, companyId }, select: { id: true, status: true } })]);
  if (!job || !employee) throw new Error("Job or employee not found."); if (employee.status !== "Active") throw new Error("Inactive employees cannot receive new assignments.");
  return prisma.jobAssignment.create({ data: { companyId, jobId: job.id, employeeId: employee.id, notes: notes?.trim() || null } });
}
export async function assignCrewToJob(companyId: string, jobId: string, crewId: string, notes?: string) {
  const [job, crew] = await Promise.all([prisma.job.findFirst({ where: { id: jobId, companyId }, select: { id: true } }), prisma.crew.findFirst({ where: { id: crewId, companyId }, select: { id: true, active: true } })]);
  if (!job || !crew) throw new Error("Job or crew not found."); if (!crew.active) throw new Error("Inactive crews cannot receive new assignments.");
  return prisma.jobAssignment.create({ data: { companyId, jobId: job.id, crewId: crew.id, notes: notes?.trim() || null } });
}
export async function removeJobAssignment(companyId: string, assignmentId: string) { const assignment = await prisma.jobAssignment.findFirst({ where: { id: assignmentId, companyId, job: { companyId }, OR: [{ employeeId: null }, { employee: { companyId } }], AND: [{ OR: [{ crewId: null }, { crew: { companyId } }] }] }, select: { id: true } }); if (!assignment) throw new Error("Assignment not found."); return prisma.jobAssignment.delete({ where: { id: assignment.id } }); }
