"use server";
import { signEstimateOnTeamDevice } from "@/lib/estimates/signEstimateOnTeamDevice";
import { requireCompanyRole } from "@/lib/auth/tenant";
export async function signEstimateOnTeamDeviceAction(estimateId: string, signerName: string, signatureData: string) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return signEstimateOnTeamDevice(companyId, estimateId, signerName, signatureData);
}
