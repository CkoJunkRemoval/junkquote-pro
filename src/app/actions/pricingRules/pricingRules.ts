"use server";
import { revalidatePath } from "next/cache";
import { requireCompanyRole, requireTenantContext } from "@/lib/auth/tenant";
import {
  addManualEstimatePricingRule, createPricingRule, deletePricingRule, duplicatePricingRule,
  evaluateEstimatePricingRules, listApplicablePricingRules, setPricingRuleActive,
  updateEstimatePricingRule, updatePricingRule,
} from "@/lib/pricingRules/pricingRules";
import type { PricingRuleInput } from "@/lib/pricingRules/types";

const manage = async () => { const context = await requireCompanyRole("Owner","Admin","Office"); return { companyId:context.companyId,userId:context.user.id }; };
const estimator = async () => { const context = await requireCompanyRole("Owner","Admin","Manager","Office"); return { companyId:context.companyId,userId:context.user.id }; };
const refresh = () => revalidatePath("/settings/pricing-rules");
export async function createPricingRuleAction(input:PricingRuleInput){const c=await manage();const result=await createPricingRule(c.companyId,c.userId,input);refresh();return result;}
export async function updatePricingRuleAction(id:string,input:PricingRuleInput){const c=await manage();const result=await updatePricingRule(c.companyId,c.userId,id,input);refresh();return result;}
export async function duplicatePricingRuleAction(id:string){const c=await manage();const result=await duplicatePricingRule(c.companyId,c.userId,id);refresh();return result;}
export async function setPricingRuleActiveAction(id:string,active:boolean){const c=await manage();const result=await setPricingRuleActive(c.companyId,c.userId,id,active);refresh();return result;}
export async function deletePricingRuleAction(id:string){const c=await manage();const result=await deletePricingRule(c.companyId,c.userId,id);refresh();return result;}
export async function listApplicablePricingRulesAction(profileId:string){const c=await requireTenantContext();return listApplicablePricingRules(c.companyId,profileId);}
export async function evaluateEstimatePricingRulesAction(estimateId:string){const c=await estimator();return evaluateEstimatePricingRules(c.companyId,estimateId);}
export async function addManualEstimatePricingRuleAction(estimateId:string,ruleId:string,reason:string){const c=await estimator();return addManualEstimatePricingRule(c.companyId,c.userId,estimateId,ruleId,reason);}
export async function updateEstimatePricingRuleAction(estimateId:string,snapshotId:string,amount:number,status:"Applied"|"Skipped",reason:string){const c=await estimator();return updateEstimatePricingRule(c.companyId,c.userId,estimateId,snapshotId,amount,status,reason);}
