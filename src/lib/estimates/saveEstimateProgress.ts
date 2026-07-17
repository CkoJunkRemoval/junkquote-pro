
import { prisma } from "../prisma";

export interface SaveEstimateProgressInput {
  estimateId: string;
  currentStep: number;
  pricingSubtotal: number;
  pricingLabor: number;
  pricingDisposal: number;
  pricingDiscount: number;
  pricingTotal: number;
}

export async function saveEstimateProgress(companyId: string, input: SaveEstimateProgressInput) {
  const { estimateId, ...data } = input;
  const result = await prisma.estimate.updateMany({
    where: {
      id: estimateId,
      companyId,
      status: "Draft",
    },
    data,
  });

  if (result.count !== 1) {
    throw new Error("Draft estimate not found.");
  }
}
