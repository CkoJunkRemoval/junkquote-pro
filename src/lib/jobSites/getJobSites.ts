import { prisma } from "../prisma";

export async function getJobSites(estimateId: string) {
  return prisma.jobSite.findMany({
    where: { estimateId },
    orderBy: { sortOrder: "asc" },
  });
}
