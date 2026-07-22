
import { prisma } from "../prisma";
import { canDeleteEstimate, ESTIMATE_DELETE_MESSAGE } from "./lifecyclePolicy";

export async function deleteEstimate(companyId: string, estimateId: string) {
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    select: { id: true, status: true, signedAt: true },
  });
  if (!estimate) throw new Error("Estimate not found.");
  if (!canDeleteEstimate(estimate)) throw new Error(ESTIMATE_DELETE_MESSAGE);
  await prisma.estimate.delete({ where: { id: estimate.id } });
}
