
import { prisma } from "../prisma";
import { ESTIMATE_LOCKED_MESSAGE, isEstimateLocked } from "./isEstimateLocked";

export async function deleteEstimate(companyId: string, estimateId: string) {
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    select: { id: true, status: true, signedAt: true },
  });
  if (!estimate) throw new Error("Estimate not found.");
  if (isEstimateLocked(estimate)) throw new Error(ESTIMATE_LOCKED_MESSAGE);
  await prisma.estimate.delete({ where: { id: estimate.id } });
}
