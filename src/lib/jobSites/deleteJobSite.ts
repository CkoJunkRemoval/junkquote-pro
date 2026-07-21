import { prisma } from "../prisma";
import { ESTIMATE_LOCKED_MESSAGE, isEstimateLocked } from "../estimates/isEstimateLocked";

export async function deleteJobSite(companyId: string, id: string) {
  const site = await prisma.jobSite.findFirst({ where: { id, estimate: { companyId } }, select: { estimate: { select: { status: true, signedAt: true } } } });
  if (!site) throw new Error("Job site not found.");
  if (isEstimateLocked(site.estimate)) throw new Error(ESTIMATE_LOCKED_MESSAGE);
  return prisma.jobSite.delete({
    where: { id },
  });
}
