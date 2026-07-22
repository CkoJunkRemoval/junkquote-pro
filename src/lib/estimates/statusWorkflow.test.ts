import {describe,expect,it} from "vitest";
import {ESTIMATE_STATUSES,canDeleteEstimate,canTransitionEstimateStatus,estimateTransitions,isEstimateEditable} from "./lifecyclePolicy";
describe("estimate lifecycle",()=>{
  it("accepts every configured transition",()=>{for(const from of ESTIMATE_STATUSES)for(const to of estimateTransitions[from])expect(canTransitionEstimateStatus(from,to)).toBe(true)});
  it("rejects every unconfigured transition",()=>{for(const from of ESTIMATE_STATUSES)for(const to of ESTIMATE_STATUSES)if(!estimateTransitions[from].includes(to))expect(canTransitionEstimateStatus(from,to)).toBe(false)});
  it("centralizes edit rules",()=>{for(const status of ESTIMATE_STATUSES)expect(isEstimateEditable({status})).toBe(["Draft","Sent","Viewed","Declined","Expired"].includes(status))});
  it("centralizes delete rules",()=>{for(const status of ESTIMATE_STATUSES)expect(canDeleteEstimate({status})).toBe(["Draft","Sent","Viewed","Declined","Expired"].includes(status))});
});
