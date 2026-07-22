import { prisma } from "../prisma";
import { getPublicApprovalError,type PublicApprovalStatus } from "./publicEstimateApproval";
import { validateSignature } from "./signatureValidation";
import { requireSubscriptionAccess } from "@/lib/billing/entitlements";
import { transitionEstimate } from "./estimateLifecycle";
export type PublicEstimateResponse="approve"|"decline";
export async function respondToEstimateApproval(token:string,response:PublicEstimateResponse,signerName?:string,signatureData?:string) {
  const estimate=await prisma.estimate.findUnique({where:{approvalToken:token},select:{id:true,companyId:true,status:true,approvalTokenExpiresAt:true}});const error=getPublicApprovalError(estimate?.status as PublicApprovalStatus|undefined??null,estimate?.approvalTokenExpiresAt??null);if(error)throw new Error(error);await requireSubscriptionAccess(estimate!.companyId);
  const next=response==="approve"?"Approved":"Declined";if(response==="approve")validateSignature(signerName??"",signatureData??"");
  await transitionEstimate(estimate!.companyId,estimate!.id,next,{actor:{label:"Customer"},metadata:{signatureMethod:response==="approve"?"PublicLink":undefined},data:response==="approve"?{signerName:signerName!.trim(),signatureData:signatureData!,signedAt:new Date(),signatureMethod:"PublicLink"}:{}});return {status:next};
}
