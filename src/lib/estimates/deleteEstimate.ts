
import { prisma } from "../prisma";

export async function deleteEstimate(companyId: string, estimateId: string) {
  const result = await prisma.estimate.deleteMany({
    where: {
      id: estimateId,
      companyId,
      status: "Draft",
    },
  });

  if (result.count !== 1) {
    throw new Error("Only draft estimates for this company may be deleted.");
  }
}
