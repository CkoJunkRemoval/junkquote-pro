import { prisma } from "../prisma";
import { ESTIMATE_LOCKED_MESSAGE, isEstimateLocked } from "../estimates/isEstimateLocked";

export async function deleteEstimateItem(companyId: string, id: string) {
  const item = await prisma.estimateItem.findFirst({ where: { id, jobSite: { estimate: { companyId } } }, select: { jobSite: { select: { estimate: { select: { status: true, signedAt: true } } } } } });
  if (!item) throw new Error("Estimate item not found.");
  if (isEstimateLocked(item.jobSite.estimate)) throw new Error(ESTIMATE_LOCKED_MESSAGE);
  return prisma.estimateItem.delete({
    where: { id },
  });
}
