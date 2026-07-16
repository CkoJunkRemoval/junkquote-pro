"use server";
import { signEstimateOnTeamDevice } from "@/lib/estimates/signEstimateOnTeamDevice";
export async function signEstimateOnTeamDeviceAction(estimateId: string, signerName: string, signatureData: string) {
  return signEstimateOnTeamDevice(estimateId, signerName, signatureData);
}
