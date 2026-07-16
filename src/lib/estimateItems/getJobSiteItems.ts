import { prisma } from "../prisma";

export async function getJobSiteItems(jobSiteId: string) {
  return prisma.estimateItem.findMany({
    where: { jobSiteId },
    orderBy: { sortOrder: "asc" },
  });
}
