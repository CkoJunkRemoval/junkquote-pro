import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { calculatePricingIntelligence, type IntelligenceEstimate } from "./calculations";
import type { PricingIntelligenceFilters } from "./filters";

async function validate(companyId:string,filters:PricingIntelligenceFilters){
  const [profile,employee,crew]=await Promise.all([
    filters.pricingProfileId?prisma.pricingProfile.count({where:{id:filters.pricingProfileId,companyId}}):1,
    filters.employeeId?prisma.user.count({where:{id:filters.employeeId,companyId}}):1,
    filters.crewId?prisma.crew.count({where:{id:filters.crewId,companyId}}):1,
  ]);
  if(!profile||!employee||!crew)throw new Error("A pricing analytics filter is not available for this company.");
}

export const getPricingIntelligence=cache(async(companyId:string,filters:PricingIntelligenceFilters)=>{
  await validate(companyId,filters);
  const where={
    companyId,createdAt:{gte:filters.from,lte:filters.to},
    ...(filters.pricingProfileId?{pricingProfileId:filters.pricingProfileId}:{}),
    ...(filters.employeeId?{smartPricingDecision:{actingUserId:filters.employeeId,companyId}}:{}),
    ...(filters.serviceArea?{property:{OR:[{serviceArea:filters.serviceArea},{city:filters.serviceArea},{zip:filters.serviceArea}]}}:{}),
    ...(filters.category?{jobSites:{some:{items:{some:{category:filters.category}}}}}:{}),
    ...(filters.crewId?{job:{assignments:{some:{companyId,crewId:filters.crewId}}}}:{}),
  };
  const [estimates,payments]=await Promise.all([
    prisma.estimate.findMany({where,take:5000,orderBy:{createdAt:"asc"},select:{
      id:true,createdAt:true,status:true,pricingTotal:true,pricingDiscount:true,signedAt:true,
      pricingProfile:{select:{id:true,name:true,laborRate:true}},property:{select:{zip:true,city:true,serviceArea:true}},
      customer:{select:{id:true,firstName:true,lastName:true}},
      smartPricingDecision:{select:{actingUser:{select:{firstName:true,lastName:true,email:true}}}},
      jobSites:{select:{items:{select:{name:true,category:true,quantity:true,basePrice:true,priceOverride:true,laborHours:true,disposalFee:true,hazardous:true,refrigerant:true,mattress:true,tire:true,pricingManuallyEdited:true}}}},
      appliedPricingRules:{select:{name:true,category:true,calculatedAmount:true,status:true,manuallyAdjusted:true,reason:true}},
      job:{select:{id:true,status:true,completedAt:true,scheduledStart:true,invoice:{select:{total:true}},assignments:{where:{companyId},select:{crew:{select:{name:true}}}}}},
      invoice:{select:{total:true,issuedDate:true,paidDate:true}},
    }}),
    prisma.payment.findMany({where:{companyId,paymentDate:{gte:new Date(Math.min(filters.from.getTime(),new Date(new Date().getFullYear(),0,1).getTime())),lte:new Date()}},take:10000,select:{amount:true,paymentDate:true}}),
  ]);
  const rows:IntelligenceEstimate[]=estimates.map(estimate=>({
    id:estimate.id,createdAt:estimate.createdAt,status:estimate.status,pricingTotal:estimate.pricingTotal,pricingDiscount:estimate.pricingDiscount,signedAt:estimate.signedAt,
    profile:estimate.pricingProfile,property:estimate.property,customer:{id:estimate.customer.id,name:`${estimate.customer.firstName} ${estimate.customer.lastName}`.trim()},
    employeeName:estimate.smartPricingDecision?.actingUser?[estimate.smartPricingDecision.actingUser.firstName,estimate.smartPricingDecision.actingUser.lastName].filter(Boolean).join(" ")||estimate.smartPricingDecision.actingUser.email:"Unassigned",
    items:estimate.jobSites.flatMap(site=>site.items.map(item=>({name:item.name,category:item.category,quantity:item.quantity,price:item.priceOverride??item.basePrice,laborHours:item.laborHours,disposalFee:item.disposalFee,missingDisposal:item.disposalFee===0&&(item.hazardous||item.refrigerant||item.mattress||item.tire),manuallyEdited:item.pricingManuallyEdited||item.priceOverride!==null}))),
    rules:estimate.appliedPricingRules.map(rule=>({name:rule.name,category:rule.category,amount:rule.calculatedAmount,status:rule.status,manuallyAdjusted:rule.manuallyAdjusted,reason:rule.reason})),
    job:estimate.job?{id:estimate.job.id,status:estimate.job.status,completedAt:estimate.job.completedAt,scheduledStart:estimate.job.scheduledStart,crewNames:estimate.job.assignments.flatMap(assignment=>assignment.crew?[assignment.crew.name]:[]),invoiceTotal:estimate.job.invoice?.total??null}:null,
    invoice:estimate.invoice,
  }));
  return calculatePricingIntelligence(rows,payments);
});

export const getPricingIntelligenceOptions=cache(async(companyId:string)=>{
  const [profiles,employees,crews,categories,areas]=await Promise.all([
    prisma.pricingProfile.findMany({where:{companyId},select:{id:true,name:true},orderBy:{name:"asc"}}),
    prisma.user.findMany({where:{companyId,active:true,memberships:{some:{companyId,status:"Active",role:{in:["Owner","Admin","Manager","Office"]}}}},select:{id:true,firstName:true,lastName:true,email:true},orderBy:{email:"asc"}}),
    prisma.crew.findMany({where:{companyId,active:true},select:{id:true,name:true},orderBy:{name:"asc"}}),
    prisma.estimateItem.findMany({where:{jobSite:{estimate:{companyId}}},distinct:["category"],select:{category:true},orderBy:{category:"asc"}}),
    prisma.property.findMany({where:{customer:{companyId}},distinct:["city"],select:{city:true,zip:true,serviceArea:true},orderBy:{city:"asc"},take:1000}),
  ]);
  return {profiles,employees,crews,categories:categories.map(row=>row.category),serviceAreas:[...new Set(areas.flatMap(row=>[row.serviceArea,row.city,row.zip]).filter((value):value is string=>Boolean(value)))].sort()};
});
