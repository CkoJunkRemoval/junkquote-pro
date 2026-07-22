import { describe, expect, it } from "vitest";
import { assertCoordinate, calculateFieldDurations, canTransitionFieldStage, FIELD_STAGE_ORDER, validNextTimeEvents, REQUIRED_FIELD_CHECKLIST } from "./policy";

describe("field operations policy",()=>{
  it("allows every sequential field transition",()=>{for(let i=0;i<FIELD_STAGE_ORDER.length-1;i++)expect(canTransitionFieldStage(FIELD_STAGE_ORDER[i],FIELD_STAGE_ORDER[i+1])).toBe(true)});
  it("blocks skipped and backwards stages",()=>{expect(canTransitionFieldStage("Scheduled","Arrived")).toBe(false);expect(canTransitionFieldStage("Working","Arrived")).toBe(false);expect(canTransitionFieldStage("ReadyForInvoice","Completed")).toBe(false)});
  it("allows a forward skip only with authorization",()=>{expect(canTransitionFieldStage("Scheduled","Working",true)).toBe(true);expect(canTransitionFieldStage("Working","ReadyForInvoice",true)).toBe(true);expect(canTransitionFieldStage("Working","Scheduled",true)).toBe(false)});
  it("defines all six completion requirements",()=>{expect(REQUIRED_FIELD_CHECKLIST.map(([key])=>key)).toEqual(["arrival","walkthrough","photos","customer-confirmation","cleanup","final-walkthrough"])});
  it("enforces clock and break ordering",()=>{expect(validNextTimeEvents()).toEqual(["ClockIn"]);expect(validNextTimeEvents("ClockIn")).toEqual(["BreakStart","ClockOut"]);expect(validNextTimeEvents("BreakStart")).toEqual(["BreakEnd"]);expect(validNextTimeEvents("BreakEnd")).toEqual(["BreakStart","ClockOut"]);expect(validNextTimeEvents("ClockOut")).toEqual(["ClockIn"])});
  it("calculates labor and idle duration",()=>{const at=(minute:number)=>new Date(2026,0,1,8,minute);expect(calculateFieldDurations([{type:"ClockIn",timestamp:at(0)},{type:"BreakStart",timestamp:at(30)},{type:"BreakEnd",timestamp:at(40)},{type:"ClockOut",timestamp:at(60)}])).toEqual({laborMinutes:50,idleMinutes:10})});
  it("validates GPS coordinate ranges",()=>{expect(()=>assertCoordinate(90,"latitude")).not.toThrow();expect(()=>assertCoordinate(-180,"longitude")).not.toThrow();expect(()=>assertCoordinate(91,"latitude")).toThrow("Invalid latitude");expect(()=>assertCoordinate(181,"longitude")).toThrow("Invalid longitude")});
});
