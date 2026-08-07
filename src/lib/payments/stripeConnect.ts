import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeConnect } from "@/lib/billing/stripe";
import { canAccessFeature } from "@/lib/billing/entitlements";

export function resolveConnectStatus(account: Pick<Stripe.Account,"details_submitted"|"charges_enabled"|"payouts_enabled"|"requirements">) {
  const due=[...(account.requirements?.past_due??[]),...(account.requirements?.currently_due??[])];
  if(account.requirements?.disabled_reason)return "RESTRICTED" as const;
  if(due.length)return "ACTION_REQUIRED" as const;
  if(account.details_submitted&&account.charges_enabled&&account.payouts_enabled)return "CONNECTED" as const;
  return "ONBOARDING" as const;
}
export async function syncConnectedAccount(account:Stripe.Account){
  const company=await prisma.company.findFirst({where:{stripeConnectedAccountId:account.id},select:{id:true,stripeConnectConnectedAt:true}});
  if(!company)throw new Error("Connected Stripe account is not mapped to a company.");
  const requirements=[...new Set([...(account.requirements?.past_due??[]),...(account.requirements?.currently_due??[])])];
  const status=resolveConnectStatus(account);
  return prisma.company.update({where:{id:company.id},data:{stripeConnectStatus:status,stripeChargesEnabled:account.charges_enabled,stripePayoutsEnabled:account.payouts_enabled,stripeDetailsSubmitted:account.details_submitted,stripeConnectRequirementsDue:requirements,stripeConnectUpdatedAt:new Date(),...(status==="CONNECTED"&&!company.stripeConnectConnectedAt?{stripeConnectConnectedAt:new Date()}: {})}});
}
export async function retrieveAndSyncConnectedAccount(companyId:string){
  const company=await prisma.company.findUnique({where:{id:companyId}});
  if(!company?.stripeConnectedAccountId)return company;
  return syncConnectedAccount(await getStripeConnect().accounts.retrieve(company.stripeConnectedAccountId));
}

export async function getOnlinePaymentAvailability(companyId: string) {
  const [company, entitled] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { stripeConnectedAccountId: true, stripeConnectStatus: true, stripeChargesEnabled: true, stripePayoutsEnabled: true, stripeConnectDisconnectedAt: true } }),
    canAccessFeature(companyId, "onlinePayments"),
  ]);
  if (!entitled) return { available: false, reason: "PLAN_UNAVAILABLE" } as const;
  if (!company?.stripeConnectedAccountId || company.stripeConnectDisconnectedAt) return { available: false, reason: "NOT_CONNECTED" } as const;
  if (company.stripeConnectStatus !== "CONNECTED" || !company.stripeChargesEnabled || !company.stripePayoutsEnabled) return { available: false, reason: "ACTION_REQUIRED" } as const;
  return { available: true, accountId: company.stripeConnectedAccountId } as const;
}
export async function isConnectedPaymentsReady(companyId:string){
  const company=await prisma.company.findUnique({where:{id:companyId},select:{stripeConnectedAccountId:true,stripeConnectStatus:true,stripeChargesEnabled:true,stripePayoutsEnabled:true,stripeConnectDisconnectedAt:true}});
  return Boolean(company?.stripeConnectedAccountId&&!company.stripeConnectDisconnectedAt&&company.stripeConnectStatus==="CONNECTED"&&company.stripeChargesEnabled&&company.stripePayoutsEnabled);
}
