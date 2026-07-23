import { beforeEach,describe,expect,it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTenantFixtures,resetIntegrationDatabase } from "./fixtures";
import { getPricingIntelligence } from "@/lib/pricingIntelligence/service";
import type { PricingIntelligenceFilters } from "@/lib/pricingIntelligence/filters";
const range=(overrides:Partial<PricingIntelligenceFilters>={}):PricingIntelligenceFilters=>({from:new Date("2020-01-01"),to:new Date("2030-01-01"),page:1,...overrides});
describe("pricing intelligence integration",()=>{
  beforeEach(resetIntegrationDatabase);
  it("aggregates only the requested tenant",async()=>{
    const {a,b}=await createTenantFixtures();
    const site=await prisma.jobSite.create({data:{estimateId:a.estimate.id,name:"Room",sortOrder:0}});
    await prisma.estimateItem.create({data:{jobSiteId:site.id,itemId:"sofa",name:"Sofa",category:"Furniture",quantity:2,basePrice:50,sortOrder:0}});
    const [dataA,dataB]=await Promise.all([getPricingIntelligence(a.company.id,range()),getPricingIntelligence(b.company.id,range())]);
    expect(dataA.meta.estimateCount).toBe(1);expect(dataA.items[0]).toMatchObject({name:"Sofa",quoted:2});
    expect(dataB.items).toEqual([]);
  });
  it("applies profile, category, service-area, and crew filters",async()=>{
    const {a}=await createTenantFixtures();
    await prisma.property.update({where:{id:a.property.id},data:{serviceArea:"North"}});
    const site=await prisma.jobSite.create({data:{estimateId:a.estimate.id,name:"Room",sortOrder:0}});
    await prisma.estimateItem.create({data:{jobSiteId:site.id,itemId:"chair",name:"Chair",category:"Furniture",sortOrder:0}});
    await prisma.jobAssignment.create({data:{companyId:a.company.id,jobId:a.job.id,crewId:a.crew.id}});
    const data=await getPricingIntelligence(a.company.id,range({pricingProfileId:a.pricingProfile.id,category:"Furniture",serviceArea:"North",crewId:a.crew.id}));
    expect(data.meta.estimateCount).toBe(1);expect(data.profiles[0].name).toBe("Standard");
  });
  it("rejects cross-tenant filter identifiers",async()=>{
    const {a,b}=await createTenantFixtures();
    await expect(getPricingIntelligence(a.company.id,range({pricingProfileId:b.pricingProfile.id}))).rejects.toThrow(/not available/i);
  });
});
