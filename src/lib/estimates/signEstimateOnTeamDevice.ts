import { requireSubscriptionAccess } from "@/lib/billing/entitlements";
import { transitionEstimate } from "./estimateLifecycle";
import { validateSignature } from "./signatureValidation";
export async function signEstimateOnTeamDevice(companyId:string,estimateId:string,signerName:string,signatureData:string) {
  await requireSubscriptionAccess(companyId);validateSignature(signerName,signatureData);
  return transitionEstimate(companyId,estimateId,"Approved",{actor:{label:signerName.trim()},metadata:{signatureMethod:"TeamDevice"},data:{signerName:signerName.trim(),signatureData,signedAt:new Date(),signatureMethod:"TeamDevice"}});
}
