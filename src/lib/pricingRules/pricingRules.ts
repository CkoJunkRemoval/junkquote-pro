import "server-only";
import { prisma } from "@/lib/prisma";
import { evaluatePricingRules, calculateRuleAmount } from "./evaluator";
import { validatePricingRule } from "./validation";
import type { EvaluatableRule, PricingRuleContext, PricingRuleInput } from "./types";

const clean = (value?: string | null) => value?.trim() || null;
const data = (input: PricingRuleInput) => {
  validatePricingRule(input);
  return {
    pricingProfileId: input.pricingProfileId || null, name: input.name.trim(),
    description: clean(input.description), active: input.active, priority: input.priority,
    category: input.category.trim(), applicationMode: input.applicationMode, valueType: input.valueType,
    value: input.value, maxValue: input.maxValue ?? null, minimumEstimate: input.minimumEstimate ?? null,
    maximumEstimate: input.maximumEstimate ?? null, taxable: input.taxable,
  };
};

async function assertProfile(companyId: string, profileId?: string | null) {
  if (!profileId) return;
  if (!await prisma.pricingProfile.findFirst({ where: { id: profileId, companyId }, select: { id: true } }))
    throw new Error("Pricing profile does not belong to this company.");
}
async function assertUnique(companyId: string, name: string, profileId?: string | null, excludeId?: string) {
  const duplicate = await prisma.pricingRule.findFirst({ where: {
    companyId, active: true, name: { equals: name.trim(), mode: "insensitive" },
    pricingProfileId: profileId || null, ...(excludeId ? { id: { not: excludeId } } : {}),
  }, select: { id: true } });
  if (duplicate) throw new Error("An active rule with this name already exists for this profile.");
}

export function listPricingRules(companyId: string) {
  return prisma.pricingRule.findMany({
    where: { companyId }, orderBy: [{ active: "desc" }, { priority: "asc" }, { name: "asc" }],
    include: { conditions: { orderBy: { displayOrder: "asc" } }, pricingProfile: { select: { id: true, name: true } }, _count: { select: { estimateSnapshots: true } } },
  });
}
export function listApplicablePricingRules(companyId: string, pricingProfileId: string) {
  return prisma.pricingRule.findMany({
    where: { companyId, active: true, OR: [{ pricingProfileId: null }, { pricingProfileId }] },
    orderBy: [{ priority: "asc" }, { id: "asc" }], include: { conditions: { orderBy: { displayOrder: "asc" } } },
  });
}

export async function createPricingRule(companyId: string, actingUserId: string, input: PricingRuleInput) {
  const next = data(input); await assertProfile(companyId, next.pricingProfileId); await assertUnique(companyId, next.name, next.pricingProfileId);
  return prisma.$transaction(async (tx) => {
    const rule = await tx.pricingRule.create({ data: { companyId, ...next, conditions: { create: input.conditions } }, include: { conditions: true } });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "Pricing Rule Created", entityType: "PricingRule", entityId: rule.id } });
    return rule;
  });
}
export async function updatePricingRule(companyId: string, actingUserId: string, ruleId: string, input: PricingRuleInput) {
  const existing = await prisma.pricingRule.findFirst({ where: { id: ruleId, companyId }, select: { id: true } });
  if (!existing) throw new Error("Pricing rule not found.");
  const next = data(input); await assertProfile(companyId, next.pricingProfileId); if (next.active) await assertUnique(companyId, next.name, next.pricingProfileId, ruleId);
  return prisma.$transaction(async (tx) => {
    await tx.ruleCondition.deleteMany({ where: { pricingRuleId: ruleId } });
    const rule = await tx.pricingRule.update({ where: { id: ruleId }, data: { ...next, conditions: { create: input.conditions } }, include: { conditions: true } });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "Pricing Rule Updated", entityType: "PricingRule", entityId: ruleId } });
    return rule;
  });
}
export async function duplicatePricingRule(companyId: string, actingUserId: string, ruleId: string) {
  const source = await prisma.pricingRule.findFirst({ where: { id: ruleId, companyId }, include: { conditions: true } });
  if (!source) throw new Error("Pricing rule not found.");
  let name = `${source.name} Copy`, suffix = 2;
  while (await prisma.pricingRule.findFirst({ where: { companyId, active: true, pricingProfileId: source.pricingProfileId, name: { equals: name, mode: "insensitive" } } })) name = `${source.name} Copy ${suffix++}`;
  return createPricingRule(companyId, actingUserId, {
    ...source, name, pricingProfileId: source.pricingProfileId,
    applicationMode: source.applicationMode as PricingRuleInput["applicationMode"],
    valueType: source.valueType as PricingRuleInput["valueType"],
    conditions: source.conditions.map((condition) => ({
      field: condition.field as PricingRuleInput["conditions"][number]["field"],
      operator: condition.operator as PricingRuleInput["conditions"][number]["operator"],
      value: condition.value, secondaryValue: condition.secondaryValue, displayOrder: condition.displayOrder,
    })),
  });
}
export async function setPricingRuleActive(companyId: string, actingUserId: string, ruleId: string, active: boolean) {
  const rule = await prisma.pricingRule.findFirst({ where: { id: ruleId, companyId } });
  if (!rule) throw new Error("Pricing rule not found.");
  if (active) await assertUnique(companyId, rule.name, rule.pricingProfileId, rule.id);
  const updated = await prisma.pricingRule.update({ where: { id: rule.id }, data: { active } });
  await prisma.auditEvent.create({ data: { companyId, actingUserId, eventType: active ? "Pricing Rule Enabled" : "Pricing Rule Disabled", entityType: "PricingRule", entityId: rule.id } });
  return updated;
}
export async function deletePricingRule(companyId: string, actingUserId: string, ruleId: string) {
  const rule = await prisma.pricingRule.findFirst({ where: { id: ruleId, companyId }, select: { id: true, _count: { select: { estimateSnapshots: true } } } });
  if (!rule) throw new Error("Pricing rule not found.");
  if (rule._count.estimateSnapshots) throw new Error("Rules used by estimates must be disabled instead of deleted.");
  await prisma.auditEvent.create({ data: { companyId, actingUserId, eventType: "Pricing Rule Deleted", entityType: "PricingRule", entityId: rule.id } });
  return prisma.pricingRule.delete({ where: { id: rule.id } });
}

function contextFromEstimate(estimate: {
  property: { propertyType: string | null; serviceArea: string | null };
  pricingSubtotal: number; pricingLabor: number; pricingDiscount: number; estimatedLaborHours: number | null; pricingProfile: { defaultCrewSize: number };
  jobSites: Array<{ items: Array<{ category:string;quantity:number;estimatedVolume:number;laborHours:number;crewRequirement:number;hazardous:boolean;refrigerant:boolean;mattress:boolean;tire:boolean;requiresDisassembly:boolean;requiresSpecialEquipment:boolean }> }>;
}): PricingRuleContext {
  const raw = estimate.jobSites.flatMap((site) => site.items);
  return {
    propertyType: estimate.property.propertyType, serviceArea: estimate.property.serviceArea,
    estimateTotal: Math.max(0, estimate.pricingSubtotal + estimate.pricingLabor - estimate.pricingDiscount),
    crewSize: Math.max(estimate.pricingProfile.defaultCrewSize, ...raw.map((item) => item.crewRequirement), 1),
    items: raw.map((item) => ({ category: item.category, quantity: item.quantity, estimatedVolume: item.estimatedVolume, laborHours: item.laborHours,
      flags: { hazardous:item.hazardous,refrigerant:item.refrigerant,mattress:item.mattress,tire:item.tire,requiresTwoPeople:item.crewRequirement >= 2,requiresDisassembly:item.requiresDisassembly,requiresSpecialEquipment:item.requiresSpecialEquipment } })),
  };
}
export async function evaluateEstimatePricingRules(companyId: string, estimateId: string) {
  const estimate = await prisma.estimate.findFirst({ where: { id: estimateId, companyId }, include: { property: true, pricingProfile: true, jobSites: { include: { items: true } }, appliedPricingRules: true } });
  if (!estimate) throw new Error("Estimate not found.");
  const rules = await listApplicablePricingRules(companyId, estimate.pricingProfileId);
  const skippedRuleIds = new Set(estimate.appliedPricingRules.filter((row) => row.status === "Skipped").map((row) => row.pricingRuleId));
  const evaluated = evaluatePricingRules(rules as EvaluatableRule[], contextFromEstimate(estimate)).filter((row) => !skippedRuleIds.has(row.pricingRuleId));
  return prisma.$transaction(async (tx) => {
    await tx.estimatePricingRule.deleteMany({ where: { estimateId, source: "Automatic", status: "Applied" } });
    if (evaluated.length) await tx.estimatePricingRule.createMany({ data: evaluated.map((row) => ({ estimateId, ...row, source: "Automatic", status: "Applied" })) });
    return tx.estimatePricingRule.findMany({ where: { estimateId }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] });
  });
}
export async function addManualEstimatePricingRule(companyId: string, actingUserId: string, estimateId: string, pricingRuleId: string, reason: string) {
  if (!reason.trim()) throw new Error("A reason is required for manual pricing changes.");
  const [estimate, rule] = await Promise.all([
    prisma.estimate.findFirst({ where: { id: estimateId, companyId }, include: { property:true,pricingProfile:true,jobSites:{include:{items:true}} } }),
    prisma.pricingRule.findFirst({ where: { id: pricingRuleId, companyId, active: true }, include: { conditions: { orderBy: { displayOrder: "asc" } } } }),
  ]);
  if (!estimate || !rule) throw new Error("Estimate or pricing rule not found.");
  if (rule.pricingProfileId && rule.pricingProfileId !== estimate.pricingProfileId) throw new Error("This rule does not apply to the estimate pricing profile.");
  const amount = calculateRuleAmount(rule as EvaluatableRule, contextFromEstimate(estimate));
  const row = await prisma.estimatePricingRule.create({ data: { estimateId, pricingRuleId: rule.id, name:rule.name,category:rule.category,calculationType:rule.valueType,value:rule.value,calculatedAmount:amount,taxable:rule.taxable,source:"Manual",status:"Applied",reason,manuallyAdjusted:true } });
  await prisma.auditEvent.create({ data: { companyId,actingUserId,eventType:"Estimate Pricing Rule Added",entityType:"Estimate",entityId:estimateId,metadata:{pricingRuleId,reason,amount} } });
  return row;
}
export async function updateEstimatePricingRule(companyId:string,actingUserId:string,estimateId:string,snapshotId:string,amount:number,status:"Applied"|"Skipped",reason:string) {
  if (!reason.trim()) throw new Error("A reason is required for manual pricing changes.");
  if (!Number.isFinite(amount)) throw new Error("Rule amount must be a valid number.");
  const snapshot=await prisma.estimatePricingRule.findFirst({where:{id:snapshotId,estimateId,estimate:{companyId}}});
  if(!snapshot)throw new Error("Applied pricing rule not found.");
  const updated=await prisma.estimatePricingRule.update({where:{id:snapshot.id},data:{calculatedAmount:amount,status,reason,manuallyAdjusted:true}});
  await prisma.auditEvent.create({data:{companyId,actingUserId,eventType:"Estimate Pricing Rule Changed",entityType:"Estimate",entityId:estimateId,metadata:{snapshotId,amount,status,reason}}});
  return updated;
}
