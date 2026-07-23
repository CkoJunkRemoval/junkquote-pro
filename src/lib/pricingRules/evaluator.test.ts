import { describe, expect, it } from "vitest";
import { evaluatePricingRules } from "./evaluator";
import { validatePricingRule } from "./validation";
import type { EvaluatableRule, PricingRuleContext, PricingRuleInput } from "./types";

const context:PricingRuleContext={propertyType:"house",customerType:"existing",crewSize:2,serviceArea:"North",distance:8,floor:2,estimateTotal:500,items:[
  {category:"Appliances",quantity:2,estimatedVolume:1,laborHours:.5,flags:{refrigerant:true,requiresTwoPeople:true}},
]};
const rule=(overrides:Partial<EvaluatableRule>={}):EvaluatableRule=>({id:"rule-1",name:"Second Floor",description:null,active:true,priority:10,category:"Access",applicationMode:"Automatic",valueType:"FlatFee",value:25,taxable:true,conditions:[{field:"floor",operator:"equals",value:"2",displayOrder:0}],...overrides});

describe("pricing rule evaluator",()=>{
  it("applies matching rules in priority order",()=>{
    const result=evaluatePricingRules([rule({id:"later",priority:20}),rule({id:"first",priority:1})],context);
    expect(result.map(row=>row.pricingRuleId)).toEqual(["first","later"]);
    expect(result[0].calculatedAmount).toBe(25);
  });
  it("supports per-item flags, percentage caps, and discounts",()=>{
    const perItem=rule({id:"refrigerant",valueType:"PerItem",value:35,conditions:[{field:"itemFlag",operator:"equals",value:"refrigerant",displayOrder:0}]});
    const percent=rule({id:"percent",valueType:"Percentage",value:20,maxValue:60,conditions:[]});
    const discount=rule({id:"discount",valueType:"Discount",value:10,conditions:[]});
    expect(evaluatePricingRules([perItem,percent,discount],context).map(row=>row.calculatedAmount).sort((a,b)=>a-b)).toEqual([-10,60,70]);
  });
  it("skips profile-optional and nonmatching rules",()=>{
    expect(evaluatePricingRules([rule({applicationMode:"Optional"}),rule({conditions:[{field:"floor",operator:"equals",value:"3",displayOrder:0}]})],context)).toEqual([]);
  });
});

describe("pricing rule validation",()=>{
  const valid:PricingRuleInput={name:"Rule",active:true,priority:1,category:"Access",applicationMode:"Automatic",valueType:"FlatFee",value:1,taxable:true,conditions:[]};
  it("rejects negative pricing and inverted ranges",()=>{
    expect(()=>validatePricingRule({...valid,value:-1,minimumEstimate:500,maximumEstimate:100})).toThrow(/zero or greater.*cannot exceed/i);
  });
  it("rejects invalid condition combinations",()=>{
    expect(()=>validatePricingRule({...valid,conditions:[{field:"itemFlag",operator:"greaterThan",value:"hazardous",displayOrder:0}]})).toThrow(/only supports/i);
  });
  it("accepts all supported calculation types",()=>{
    for(const valueType of ["FlatFee","Percentage","PerItem","PerCubicYard","PerLaborHour","PerCrewMember","Multiplier","Discount"] as const)
      expect(()=>validatePricingRule({...valid,valueType})).not.toThrow();
  });
});
