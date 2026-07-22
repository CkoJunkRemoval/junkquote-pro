import { prisma } from "../prisma";
import { generateApprovalToken } from "./approvalToken";
import { transitionEstimateInTransaction } from "./estimateLifecycle";
export type EstimateDeliveryMethod = "email"|"sms"|"link"|"device";
export async function prepareEstimateDelivery(companyId:string,estimateId:string,method:EstimateDeliveryMethod) {
  const approvalToken=generateApprovalToken(); const now=new Date(); const approvalTokenExpiresAt=new Date(now); approvalTokenExpiresAt.setDate(approvalTokenExpiresAt.getDate()+7);
  await prisma.$transaction(tx=>transitionEstimateInTransaction(tx,companyId,estimateId,"Sent",{actor:{label:"Team member"},metadata:{method},data:{approvalToken,approvalTokenExpiresAt,sentAt:now,...(method==="email"?{sentByEmailAt:now}:{}),...(method==="sms"?{sentBySmsAt:now}:{})}}));
  const baseUrl=(process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000").replace(/\/$/,"");
  return {approvalUrl:`${baseUrl}/approve/${approvalToken}`,approvalTokenExpiresAt};
}
