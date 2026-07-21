import { prisma } from "../prisma";

export async function getJobSiteItems(companyId: string, jobSiteId: string) {
  return prisma.estimateItem.findMany({
    where: { jobSiteId, jobSite: { estimate: { companyId } } },
    orderBy: { sortOrder: "asc" },
  });
}
