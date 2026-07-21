import { prisma } from "@/lib/prisma";
import { withDistributedLock } from "@/lib/distributed/locks";

export async function aggregateCompanyUsage(companyId: string, date = new Date()) {
  const day = new Date(date); day.setUTCHours(0, 0, 0, 0);
  return withDistributedLock("usage-aggregation", `${companyId}:${day.toISOString()}`, 10 * 60_000, async () => {
    const [activeUsers, estimates, jobs, emails] = await Promise.all([
      prisma.user.count({ where: { companyId, active: true } }),
      prisma.estimate.count({ where: { companyId, createdAt: { gte: day } } }),
      prisma.job.count({ where: { companyId, createdAt: { gte: day } } }),
      prisma.communicationDelivery.count({ where: { companyId, createdAt: { gte: day }, channel: "email" } }),
    ]);
    const pdfs = 0;
    return prisma.companyUsageDaily.upsert({ where: { companyId_date: { companyId, date: day } }, create: { companyId, date: day, activeUsers, estimates, jobs, pdfs, emails }, update: { activeUsers, estimates, jobs, pdfs, emails } });
  });
}
