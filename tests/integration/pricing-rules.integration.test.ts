import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createPricingRule, deletePricingRule, evaluateEstimatePricingRules, listPricingRules, setPricingRuleActive } from "@/lib/pricingRules/pricingRules";
import { resetIntegrationDatabase } from "./fixtures";
import { getEstimatePdfData } from "@/lib/estimates/getEstimatePdfData";
import { getPortalEstimate } from "@/lib/portal/data";

const input={name:"Refrigerant Fee",description:"Handling",active:true,priority:1,category:"Disposal",applicationMode:"Automatic" as const,valueType:"PerItem" as const,value:35,taxable:true,conditions:[{field:"itemFlag" as const,operator:"equals" as const,value:"refrigerant",displayOrder:0}]};
async function tenant(label:string){
  const company=await prisma.company.create({data:{name:label}});
  const user=await prisma.user.create({data:{companyId:company.id,email:`${label}@test.local`,passwordHash:"test",role:"OWNER"}});
  const profile=await prisma.pricingProfile.create({data:{companyId:company.id,name:"Standard",defaultProfile:true}});
  const customer=await prisma.customer.create({data:{companyId:company.id,firstName:"A",lastName:"Customer",phone:"555"}});
  const property=await prisma.property.create({data:{customerId:customer.id,address:"1 Main",city:"Town",state:"NY",zip:"10001"}});
  const estimate=await prisma.estimate.create({data:{companyId:company.id,customerId:customer.id,propertyId:property.id,pricingProfileId:profile.id,pricingTotal:300}});
  const site=await prisma.jobSite.create({data:{estimateId:estimate.id,name:"Kitchen",sortOrder:0}});
  await prisma.estimateItem.create({data:{jobSiteId:site.id,itemId:"fridge",name:"Fridge",category:"Appliances",quantity:2,refrigerant:true,sortOrder:0}});
  return {company,user,profile,estimate};
}
describe("pricing rules integration",()=>{
  beforeEach(resetIntegrationDatabase);
  it("tenant scopes management and prevents duplicate active names",async()=>{
    const a=await tenant("rules-a"),b=await tenant("rules-b");
    await createPricingRule(a.company.id,a.user.id,input);
    await createPricingRule(b.company.id,b.user.id,input);
    expect(await listPricingRules(a.company.id)).toHaveLength(1);
    await expect(createPricingRule(a.company.id,a.user.id,input)).rejects.toThrow(/already exists/i);
  });
  it("evaluates item conditions and preserves estimate snapshots",async()=>{
    const a=await tenant("evaluate");
    const rule=await createPricingRule(a.company.id,a.user.id,input);
    const snapshots=await evaluateEstimatePricingRules(a.company.id,a.estimate.id);
    expect(snapshots[0]).toMatchObject({pricingRuleId:rule.id,name:"Refrigerant Fee",calculatedAmount:70,status:"Applied"});
    await expect(deletePricingRule(a.company.id,a.user.id,rule.id)).rejects.toThrow(/disabled/i);
  });
  it("supports disable and delete for unused rules",async()=>{
    const a=await tenant("archive");
    const rule=await createPricingRule(a.company.id,a.user.id,{...input,name:"Unused"});
    await setPricingRuleActive(a.company.id,a.user.id,rule.id,false);
    await expect(deletePricingRule(a.company.id,a.user.id,rule.id)).resolves.toMatchObject({id:rule.id});
  });
  it("keeps snapshot totals identical across PDF and customer portal projections",async()=>{
    const a=await tenant("breakdown");
    await prisma.estimate.update({where:{id:a.estimate.id},data:{pricingSubtotal:100,pricingLabor:40,pricingDisposal:20,pricingDiscount:10,pricingTotal:175}});
    await prisma.estimatePricingRule.create({data:{estimateId:a.estimate.id,name:"Long Carry",category:"Access",calculationType:"FlatFee",value:25,calculatedAmount:25,taxable:true,status:"Applied"}});
    const [pdf,portal]=await Promise.all([getEstimatePdfData(a.company.id,a.estimate.id),getPortalEstimate(a.company.id,(await prisma.estimate.findUniqueOrThrow({where:{id:a.estimate.id}})).customerId,a.estimate.id)]);
    expect(pdf.breakdown.grandTotal).toBe(175);
    expect(portal?.breakdown.grandTotal).toBe(pdf.breakdown.grandTotal);
    expect(pdf.breakdown.sections.flatMap(section=>section.lines).some(line=>line.label==="Long Carry")).toBe(true);
  });
});
