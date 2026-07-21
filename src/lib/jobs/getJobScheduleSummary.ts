import { prisma } from "../prisma";

export async function getJobScheduleSummary(companyId: string, now = new Date()) {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow); dayAfter.setDate(dayAfter.getDate() + 1);
  const select = { id: true, jobNumber: true, status: true, dispatchProgress: true, scheduledStart: true, scheduledEnd: true, customer: { select: { firstName: true, lastName: true } }, property: { select: { address: true } } } as const;
  const [todayJobs, tomorrowJobs, overdueJobs] = await Promise.all([
    prisma.job.findMany({ where: { companyId, scheduledStart: { gte: today, lt: tomorrow }, status: { notIn: ["Completed", "Cancelled"] } }, orderBy: { scheduledStart: "asc" }, select }),
    prisma.job.findMany({ where: { companyId, scheduledStart: { gte: tomorrow, lt: dayAfter }, status: { notIn: ["Completed", "Cancelled"] } }, orderBy: { scheduledStart: "asc" }, select }),
    prisma.job.findMany({ where: { companyId, scheduledEnd: { lt: now }, status: { notIn: ["Completed", "Cancelled"] } }, orderBy: { scheduledEnd: "asc" }, select }),
  ]);
  return { today: todayJobs, tomorrow: tomorrowJobs, overdue: overdueJobs };
}
