import { DEVELOPMENT_COMPANY_ID } from "@/lib/config";

import { prisma } from "../prisma";

export async function deleteEstimate(estimateId: string) {
  const result = await prisma.estimate.deleteMany({
    where: {
      id: estimateId,
      companyId: DEVELOPMENT_COMPANY_ID,
      status: "Draft",
    },
  });

  if (result.count !== 1) {
    throw new Error("Only draft estimates for this company may be deleted.");
  }
}
