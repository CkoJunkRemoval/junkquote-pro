import { prisma } from "../prisma";
import { ESTIMATE_LOCKED_MESSAGE, isEstimateLocked } from "../estimates/isEstimateLocked";

export interface UpdateEstimateItemInput {
  id: string;
  quantity?: number;
  notes?: string;
  priceOverride?: number | null;
  sortOrder?: number;
}

export async function updateEstimateItem(companyId: string, input: UpdateEstimateItemInput) {
  const { id, ...data } = input;
  const item = await prisma.estimateItem.findFirst({ where: { id, jobSite: { estimate: { companyId } } }, select: { jobSite: { select: { estimate: { select: { status: true, signedAt: true } } } } } });
  if (!item) throw new Error("Estimate item not found.");
  if (isEstimateLocked(item.jobSite.estimate)) throw new Error(ESTIMATE_LOCKED_MESSAGE);
  return prisma.estimateItem.update({
    where: { id },
    data,
  });
}
