import { describe, expect, it } from "vitest";
import { buildLivePricingBreakdown, buildPersistedCustomerPricingBreakdown, toCustomerPricingBreakdown } from "./livePricingBreakdown";
import type { Estimate } from "@/features/estimate/types";
import { EstimateStatus } from "@/features/estimate/status";

const estimate=(overrides:Partial<Estimate>={}):Estimate=>({
  pricingProfileId:"profile",pricingProfileName:"Residential",pricingManuallyEdited:false,
  pricingDefaults:{minimumCharge:0,tripFee:20,laborRate:50,dumpFee:10,mileageRate:2,fuelSurcharge:5,defaultCrewSize:2,taxEnabled:true,taxRate:10,currency:"USD"},
  customerType:"existing",customer:{firstName:"A",lastName:"Customer",phone:"555",email:"a@test.invalid"},
  property:{type:"house",address:"1 Main",city:"Town",state:"NY",zip:"10001",gateCode:"",notes:""},
  jobSites:[{id:"site",name:"Kitchen",status:"not-started",customerNotes:"",crewNotes:"",internalNotes:"",photos:[],subtotal:0,items:[{
    id:"item",itemId:"fridge",libraryItemId:"library",quantity:2,name:"Refrigerator",category:"Appliances",notes:"",
    basePrice:40,disposalFee:15,laborHours:.5,weightClass:"Heavy",estimatedVolume:1,crewRequirement:2,
    recyclable:false,donationEligible:false,hazardous:false,refrigerant:true,electronics:false,mattress:false,tire:false,
    appliance:true,constructionDebris:false,yardWaste:false,requiresDisassembly:false,requiresSpecialEquipment:false,pricingManuallyEdited:false,
  }]}],
  pricing:{subtotal:0,labor:0,disposal:0,discount:10,total:0},status:EstimateStatus.Draft,timeline:[],
  pricingRules:[{id:"rule",pricingRuleId:"master",name:"Second Floor",category:"Access",calculationType:"FlatFee",value:25,calculatedAmount:25,taxable:true,displayOrder:0,source:"Automatic",status:"Applied",reason:"Property Floor = 2",manuallyAdjusted:false}],
  ...overrides,
});

describe("live pricing breakdown",()=>{
  it("accounts for every dollar exactly once",()=>{
    const result=buildLivePricingBreakdown(estimate());
    expect(result.sections.reduce((sum,section)=>sum+section.total,0)).toBeCloseTo(result.grandTotal,2);
    expect(result.sections.find(section=>section.key==="items")?.lines[0]).toMatchObject({label:"Refrigerator",quantity:2,amount:80});
    expect(result.sections.find(section=>section.key==="rules")?.lines[0]).toMatchObject({label:"Second Floor",amount:25});
  });
  it("updates immediately when item quantity, rules, discounts, profile, and tax change",()=>{
    const before=buildLivePricingBreakdown(estimate()).grandTotal;
    const changed=estimate({pricingDefaults:{...estimate().pricingDefaults,tripFee:40,taxRate:5},pricing:{...estimate().pricing,discount:0},pricingRules:[]});
    changed.jobSites[0].items[0].quantity=3;
    expect(buildLivePricingBreakdown(changed).grandTotal).not.toBe(before);
  });
  it("exposes expandable item and rule details",()=>{
    const result=buildLivePricingBreakdown(estimate());
    expect(result.sections.find(section=>section.key==="items")?.lines[0].details?.map(row=>row.label)).toEqual(expect.arrayContaining(["Base price","Disposal","Labor","Volume","Weight","Applied rules","Snapshot source"]));
    expect(result.sections.find(section=>section.key==="rules")?.lines[0]).toMatchObject({affectedItems:["Refrigerator"]});
  });
  it("returns nonblocking warnings for overrides, disabled rules, missing disposal, and historical snapshots",()=>{
    const value=estimate({pricingManuallyEdited:true,pricingRules:[
      {...estimate().pricingRules![0],id:"skipped",status:"Skipped"},
      {...estimate().pricingRules![0],id:"history",pricingRuleId:null,status:"Applied"},
    ]});
    value.jobSites[0].items[0].priceOverride=45;value.jobSites[0].items[0].disposalFee=0;
    expect(buildLivePricingBreakdown(value).warnings.map(row=>row.code)).toEqual(expect.arrayContaining(["MANUAL_OVERRIDE","RULE_DISABLED","MISSING_DISPOSAL","PROFILE_CHANGED","HISTORICAL_SNAPSHOT"]));
  });
  it("removes internal labor and rule logic from the customer projection",()=>{
    const customer=toCustomerPricingBreakdown(buildLivePricingBreakdown(estimate()));
    expect(customer.sections.some(section=>section.key==="labor")).toBe(false);
    expect(JSON.stringify(customer)).not.toContain("Triggered because");
  });
  it("keeps persisted portal and PDF totals authoritative",()=>{
    const result=buildPersistedCustomerPricingBreakdown({items:[{id:"i",name:"Sofa",quantity:1,basePrice:75,priceOverride:null}],rules:[{id:"r",name:"Long Carry",calculatedAmount:25,status:"Applied"}],pricing:{subtotal:100,labor:50,disposal:25,discount:10,total:165}});
    expect(result.grandTotal).toBe(165);
    expect(result.sections.flatMap(section=>section.lines).reduce((sum,row)=>sum+row.amount,0)).toBe(165);
  });
});
