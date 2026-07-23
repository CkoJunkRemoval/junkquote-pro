import { describe, expect, it } from "vitest";
import { buildPublicEstimatePdf } from "./buildPublicEstimatePdf";
import type { PublicEstimateApproval } from "@/lib/estimates/getPublicEstimateByApprovalToken";

describe("estimate PDF pricing consistency",()=>{
  it("uses the same customer-safe breakdown and grand total",()=>{
    const estimate={company:{name:"Acme",phone:null,email:null,website:null,logoUrl:null,primaryColor:null,secondaryColor:null},customerName:"Jamie",propertyAddress:{address:"1 Main",city:"Town",state:"NY",zip:"10001"},jobSites:[],pricing:{subtotal:100,labor:20,disposal:5,discount:0,total:125},breakdown:{subtotal:125,grandTotal:125,sections:[{key:"items",title:"Items",total:100,lines:[{id:"i",label:"Sofa",amount:100,quantity:1}]},{key:"rules",title:"Applied Charges",total:25,lines:[{id:"r",label:"Trip Charge",amount:25}]}]},status:"Sent",approvalTokenExpiresAt:new Date()} as PublicEstimateApproval;
    const pdf=buildPublicEstimatePdf(estimate);
    expect(pdf.total).toBe("$125.00");
    expect(pdf.sections.find(section=>section.title==="Applied Charges")?.rows).toEqual([{label:"Trip Charge",value:"$25.00"}]);
    expect(JSON.stringify(pdf)).not.toContain("Labor");
  });
});
