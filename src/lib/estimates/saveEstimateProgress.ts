
import { prisma } from "../prisma";
import { ESTIMATE_LOCKED_MESSAGE, isEstimateLocked } from "./isEstimateLocked";

export interface SaveEstimateProgressInput {
  estimateId: string;
  currentStep: number;
  pricingSubtotal: number;
  pricingLabor: number;
  pricingDisposal: number;
  pricingDiscount: number;
  pricingTotal: number;
  estimatedLaborHours: number | null;
  estimatedLaborCost: number | null;
}

export async function saveEstimateProgress(companyId: string, input: SaveEstimateProgressInput) {
  const { estimateId, ...data } = input;
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    select: { id: true, status: true, signedAt: true },
  });
  if (!estimate) throw new Error("Estimate not found.");
  if (isEstimateLocked(estimate)) throw new Error(ESTIMATE_LOCKED_MESSAGE);
  await prisma.estimate.update({ where: { id: estimate.id }, data });
}
