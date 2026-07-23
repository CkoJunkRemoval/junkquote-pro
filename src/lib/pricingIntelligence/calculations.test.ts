import { describe,expect,it } from "vitest";
import { calculatePricingIntelligence,type IntelligenceEstimate } from "./calculations";
const now=new Date("2026-07-23T12:00:00Z");
const row=(overrides:Partial<IntelligenceEstimate>={}):IntelligenceEstimate=>({
  id:"e1",createdAt:new Date("2026-07-20"),status:"Approved",pricingTotal:500,pricingDiscount:25,signedAt:new Date("2026-07-21"),
  profile:{id:"p1",name:"Residential",laborRate:50},property:{zip:"10001",city:"Town",serviceArea:"North"},
  customer:{id:"c1",name:"Jamie Customer"},employeeName:"Owner",
  items:[{name:"Refrigerator",category:"Appliances",quantity:1,price:100,laborHours:1,disposalFee:25,missingDisposal:false,manuallyEdited:false}],
  rules:[{name:"Second Floor",category:"Access",amount:25,status:"Applied",manuallyAdjusted:false,reason:"Floor = 2"}],
  job:{id:"j1",status:"Completed",completedAt:new Date("2026-07-22"),scheduledStart:new Date("2026-07-22T10:00:00Z"),crewNames:["Crew A"],invoiceTotal:525},
  invoice:{total:525,issuedDate:new Date("2026-07-22"),paidDate:new Date("2026-07-23")},...overrides,
});
describe("pricing intelligence calculations",()=>{
  it("aggregates summary revenue, acceptance, payment, and approval metrics",()=>{
    const result=calculatePricingIntelligence([row(),row({id:"e2",status:"Draft",job:null,invoice:null,signedAt:null})],[{amount:525,paymentDate:new Date("2026-07-23")}],now);
    expect(result.summary).toMatchObject({averageEstimate:500,averageApprovedEstimate:500,averageInvoice:525,acceptanceRate:50,revenueThisWeek:525,averageTimeToApprovalDays:1,averageDaysUntilPayment:1});
  });
  it("aggregates item revenue, costs, profit, and frequency",()=>{
    const item=calculatePricingIntelligence([row()],[],now).items[0];
    expect(item).toMatchObject({quoted:1,accepted:1,revenue:100,averageSellingPrice:100,averageDisposalCost:25,averageProfitEstimate:25});
  });
  it("tracks rule removals, edits, revenue, and common triggers",()=>{
    const result=calculatePricingIntelligence([row(),row({id:"e2",rules:[{name:"Second Floor",category:"Access",amount:25,status:"Skipped",manuallyAdjusted:true,reason:"Elevator available"}]})],[],now).rules[0];
    expect(result).toMatchObject({triggered:1,removed:1,edited:1,revenue:25,removalRate:50});
  });
  it("compares profiles, service areas, customers, and crews",()=>{
    const result=calculatePricingIntelligence([row(),row({id:"e2"})],[],now);
    expect(result.profiles[0]).toMatchObject({name:"Residential",acceptanceRate:100});
    expect(result.serviceAreas[0]).toMatchObject({name:"Town, 10001",jobs:2});
    expect(result.customers.repeatCustomers).toBe(1);
    expect(result.crews[0]).toMatchObject({name:"Crew A",jobsCompleted:2});
  });
  it("produces deterministic health warnings, charts, and insights",()=>{
    const old=row({id:"old",createdAt:new Date("2026-04-30"),items:[{...row().items[0],price:120,missingDisposal:true,manuallyEdited:true}]});
    const recent=row({id:"recent",createdAt:new Date("2026-07-20"),rules:[{...row().rules[0],status:"Skipped",manuallyAdjusted:true}]});
    const result=calculatePricingIntelligence([old,recent],[],now);
    expect(result.health).toMatchObject({manualOverrides:1,ruleOverrides:1,missingDisposalFees:1});
    expect(result.charts.topItems.length).toBeGreaterThan(0);
    expect(result.insights.join(" ")).toMatch(/decreased|removed|highest/i);
  });
  it("returns stable empty analytics without NaN",()=>{
    expect(JSON.stringify(calculatePricingIntelligence([],[],now))).not.toContain("NaN");
  });
});
