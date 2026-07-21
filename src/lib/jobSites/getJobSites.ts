import { prisma } from "../prisma";

export async function getJobSites(companyId: string, estimateId: string) {
  return prisma.jobSite.findMany({
    where: { estimateId, estimate: { companyId } },
    orderBy: { sortOrder: "asc" },
  });
}
