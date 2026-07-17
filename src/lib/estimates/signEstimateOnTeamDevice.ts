import { prisma } from "../prisma";
import { validateSignature } from "./signatureValidation";

export async function signEstimateOnTeamDevice(companyId: string, estimateId: string, signerName: string, signatureData: string) {
  validateSignature(signerName, signatureData);
  const result = await prisma.estimate.updateMany({
    where: { id: estimateId, companyId, status: { in: ["Ready", "Sent"] }, signatureData: null },
    data: { status: "Approved", signerName: signerName.trim(), signatureData, signedAt: new Date(), signatureMethod: "TeamDevice" },
  });
  if (result.count !== 1) throw new Error("This estimate cannot be signed or has already been signed.");
}
