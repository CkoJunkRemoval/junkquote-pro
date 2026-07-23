import type { Estimate, EstimateItem, EstimatePricingRuleSnapshot } from "@/features/estimate/types";
import { calculateEstimate, type EstimateTotals } from "./calculateEstimate";
import { DEFAULT_PRICING } from "./defaultPricing";

export type PricingBreakdownWarningCode =
  | "MANUAL_OVERRIDE" | "RULE_DISABLED" | "MISSING_DISPOSAL" | "NEGATIVE_DISCOUNT"
  | "PROFILE_CHANGED" | "HISTORICAL_SNAPSHOT";

export type PricingBreakdownWarning = { code: PricingBreakdownWarningCode; message: string };
export type PricingBreakdownDetail = { label: string; value: string };
export type PricingBreakdownLine = {
  id: string;
  label: string;
  amount: number;
  quantity?: number;
  details?: PricingBreakdownDetail[];
  affectedItems?: string[];
  warningCodes?: PricingBreakdownWarningCode[];
  customerVisible: boolean;
};
export type PricingBreakdownSectionKey = "base"|"items"|"rules"|"labor"|"disposal"|"discounts"|"taxes";
export type PricingBreakdownSection = { key: PricingBreakdownSectionKey; title: string; lines: PricingBreakdownLine[]; total: number; customerVisible: boolean };
export type LivePricingBreakdown = {
  sections: PricingBreakdownSection[];
  warnings: PricingBreakdownWarning[];
  subtotal: number;
  grandTotal: number;
  totals: EstimateTotals;
  fingerprint: string;
};
export type CustomerPricingBreakdown = Pick<LivePricingBreakdown, "subtotal"|"grandTotal"> & {
  sections: Array<Pick<PricingBreakdownSection,"key"|"title"|"total"> & { lines: Array<Pick<PricingBreakdownLine,"id"|"label"|"amount"|"quantity">> }>;
};

const money = (value:number) => `$${value.toFixed(2)}`;
const line = (value:PricingBreakdownLine) => value;
const section = (key:PricingBreakdownSectionKey,title:string,lines:PricingBreakdownLine[],customerVisible=true):PricingBreakdownSection => ({
  key,title,lines,total:Math.round(lines.reduce((sum,row)=>sum+row.amount,0)*100)/100,customerVisible,
});
const itemAffectedByRule=(item:EstimateItem,rule:EstimatePricingRuleSnapshot)=>{
  const normalized=`${rule.name} ${rule.category}`.toLowerCase();
  return (normalized.includes("refrigerant")&&item.refrigerant)||(normalized.includes("mattress")&&item.mattress)||
    (normalized.includes("tire")&&item.tire)||(normalized.includes("hazard")&&item.hazardous)||
    (normalized.includes("heavy")&&item.crewRequirement>=2)||(normalized.includes("disassembly")&&item.requiresDisassembly)||
    (normalized.includes("equipment")&&item.requiresSpecialEquipment);
};

export function buildLivePricingBreakdown(estimate:Estimate):LivePricingBreakdown {
  const totals=calculateEstimate(estimate);
  const items=estimate.jobSites.flatMap(site=>site.items.map(item=>({site:site.name,item})));
  const activeRules=(estimate.pricingRules??[]).filter(rule=>rule.status==="Applied");
  const skippedRules=(estimate.pricingRules??[]).filter(rule=>rule.status==="Skipped");
  const disposalMarkup=totals.disposalFees*DEFAULT_PRICING.disposalMarkup;
  const preMinimum=totals.subtotal+totals.labor+totals.pricingRules-totals.discounts+totals.tax;
  const minimumAdjustment=Math.max(0,estimate.pricingDefaults.minimumCharge-preMinimum);
  const warnings:PricingBreakdownWarning[]=[];
  if(items.some(({item})=>item.pricingManuallyEdited||item.priceOverride!==undefined))warnings.push({code:"MANUAL_OVERRIDE",message:"One or more item prices were manually overridden."});
  if(skippedRules.length)warnings.push({code:"RULE_DISABLED",message:`${skippedRules.length} pricing rule${skippedRules.length===1?" is":"s are"} disabled for this estimate.`});
  if(items.some(({item})=>item.disposalFee===0&&(item.hazardous||item.refrigerant||item.mattress||item.tire)))warnings.push({code:"MISSING_DISPOSAL",message:"A disposal-sensitive item has no item disposal fee."});
  if(estimate.pricing.discount<0)warnings.push({code:"NEGATIVE_DISCOUNT",message:"The manual discount is negative and increases the estimate."});
  if(estimate.pricingManuallyEdited)warnings.push({code:"PROFILE_CHANGED",message:"Pricing defaults changed after manual pricing edits."});
  if(activeRules.some(rule=>!rule.pricingRuleId))warnings.push({code:"HISTORICAL_SNAPSHOT",message:"This estimate contains a historical pricing-rule snapshot."});

  const baseLines=[
    line({id:"base:minimum",label:"Minimum Charge",amount:minimumAdjustment,details:[{label:"Configured minimum",value:money(estimate.pricingDefaults.minimumCharge)}],customerVisible:true}),
    line({id:"base:trip",label:"Trip Charge",amount:estimate.pricingDefaults.tripFee,customerVisible:true}),
    line({id:"base:mileage",label:"Mileage",amount:0,details:[{label:"Rate",value:`${money(estimate.pricingDefaults.mileageRate)} per mile`}],customerVisible:true}),
    line({id:"base:fuel",label:"Fuel",amount:estimate.pricingDefaults.fuelSurcharge,customerVisible:true}),
  ].filter(row=>row.amount!==0||row.id==="base:minimum");
  const itemLines=items.map(({site,item})=>line({
    id:`item:${item.id}`,label:item.name,quantity:item.quantity,
    amount:(item.priceOverride??item.basePrice)*item.quantity,customerVisible:true,
    warningCodes:item.pricingManuallyEdited||item.priceOverride!==undefined?["MANUAL_OVERRIDE"]:undefined,
    details:[
      {label:"Area",value:site},{label:"Base price",value:money(item.basePrice)},
      ...(item.priceOverride!==undefined?[{label:"Override",value:money(item.priceOverride)}]:[]),
      {label:"Disposal",value:money(item.disposalFee*item.quantity)},{label:"Labor",value:`${(item.laborHours*item.quantity).toFixed(2)} hours`},
      {label:"Volume",value:`${(item.estimatedVolume*item.quantity).toFixed(2)} yd³`},{label:"Weight",value:item.weightClass},
      {label:"Applied rules",value:activeRules.filter(rule=>itemAffectedByRule(item,rule)).map(rule=>rule.name).join(", ")||"None"},
      {label:"Snapshot source",value:item.libraryItemId?"Item Library":"Historical/manual item"},
    ],
  }));
  const ruleLines=activeRules.filter(rule=>rule.calculatedAmount>0).map(rule=>{
    const matched=items.filter(({item})=>itemAffectedByRule(item,rule)).map(({item})=>item.name);
    return line({
    id:`rule:${rule.id}`,label:rule.name,amount:rule.calculatedAmount,customerVisible:true,
    affectedItems:matched.length?matched:items.map(({item})=>item.name),
    warningCodes:rule.manuallyAdjusted?["MANUAL_OVERRIDE"]:undefined,
    details:[{label:"Triggered because",value:rule.reason||`${rule.calculationType} at ${rule.value}`},{label:"Source",value:rule.source==="Manual"?"Manual rule":"Automatic pricing rule"}],
  });});
  const laborLines=[line({id:"labor:crew",label:"Crew Labor",amount:totals.labor,customerVisible:false,details:[{label:"Hours",value:totals.laborHours.toFixed(2)},{label:"Recommended crew",value:String(totals.recommendedCrew)}]})].filter(row=>row.amount!==0);
  const disposalLines=[
    line({id:"disposal:items",label:"Item Disposal Fees",amount:totals.disposalFees,customerVisible:true}),
    line({id:"disposal:dump",label:"Dump Fees",amount:estimate.pricingDefaults.dumpFee,customerVisible:true}),
    line({id:"disposal:markup",label:"Environmental / Disposal Handling",amount:disposalMarkup,customerVisible:true}),
  ].filter(row=>row.amount!==0);
  const discountLines=[
    ...(estimate.pricing.discount!==0?[line({id:"discount:manual",label:"Manual Discount",amount:-estimate.pricing.discount,customerVisible:true})]:[]),
    ...activeRules.filter(rule=>rule.calculatedAmount<0).map(rule=>line({id:`discount:${rule.id}`,label:rule.name,amount:rule.calculatedAmount,customerVisible:true,details:[{label:"Source",value:rule.reason||"Pricing rule discount"}]})),
  ];
  const taxLines=totals.tax?[line({id:"tax:sales",label:"Sales Tax",amount:totals.tax,customerVisible:true,details:[{label:"Rate",value:`${estimate.pricingDefaults.taxRate}%`}]})]:[];
  const sections=[
    section("base","Base Charges",baseLines),section("items","Items",itemLines),section("rules","Rules",ruleLines),
    section("labor","Labor",laborLines,false),section("disposal","Disposal",disposalLines),
    section("discounts","Discounts",discountLines),section("taxes","Taxes",taxLines),
  ];
  return {sections,warnings,subtotal:Math.round((totals.total-totals.tax)*100)/100,grandTotal:totals.total,totals,fingerprint:JSON.stringify(sections.map(value=>[value.key,value.lines.map(row=>[row.id,row.amount])]))};
}

export function toCustomerPricingBreakdown(breakdown:LivePricingBreakdown):CustomerPricingBreakdown {
  const sections=breakdown.sections.filter(value=>value.customerVisible).map(value=>{
    const lines=value.lines.filter(row=>row.customerVisible);
    return {...value,lines:lines.map(({id,label,amount,quantity})=>({id,label,amount,quantity})),total:lines.reduce((sum,row)=>sum+row.amount,0)};
  }).filter(value=>value.lines.length>0);
  return {sections,subtotal:breakdown.subtotal,grandTotal:breakdown.grandTotal};
}

export function buildPersistedCustomerPricingBreakdown(input:{
  items:Array<{id:string;name:string;quantity:number;basePrice:number;priceOverride:number|null}>;
  rules:Array<{id:string;name:string;calculatedAmount:number;status:string}>;
  pricing:{subtotal:number;labor:number;disposal:number;discount:number;total:number};
  tax?:{enabled:boolean;rate:number};
}):CustomerPricingBreakdown {
  const itemLines=input.items.map(item=>({id:`item:${item.id}`,label:item.name,quantity:item.quantity,amount:(item.priceOverride??item.basePrice)*item.quantity}));
  const ruleLines=input.rules.filter(rule=>rule.status==="Applied"&&rule.calculatedAmount>0).map(rule=>({id:`rule:${rule.id}`,label:rule.name,amount:rule.calculatedAmount}));
  const discountLines=[
    ...(input.pricing.discount?[{id:"discount:manual",label:"Discount",amount:-input.pricing.discount}]:[]),
    ...input.rules.filter(rule=>rule.status==="Applied"&&rule.calculatedAmount<0).map(rule=>({id:`discount:${rule.id}`,label:rule.name,amount:rule.calculatedAmount})),
  ];
  const itemTotal=itemLines.reduce((sum,row)=>sum+row.amount,0),ruleTotal=ruleLines.reduce((sum,row)=>sum+row.amount,0),discountTotal=discountLines.reduce((sum,row)=>sum+row.amount,0);
  const estimatedTax=input.tax?.enabled?Math.round(Math.max(0,input.pricing.subtotal+input.pricing.labor+ruleTotal+discountTotal)*input.tax.rate)/100:0;
  const visibleKnown=itemTotal+ruleTotal+discountTotal+estimatedTax;
  const appliedCharges=Math.round((input.pricing.total-visibleKnown)*100)/100;
  const sections:CustomerPricingBreakdown["sections"]=([
    {key:"items",title:"Items",lines:itemLines,total:itemLines.reduce((sum,row)=>sum+row.amount,0)},
    {key:"rules",title:"Applied Charges",lines:[...ruleLines,...(appliedCharges?[{id:"charges:service",label:"Service and disposal charges",amount:appliedCharges}]:[])],total:ruleTotal+appliedCharges},
    {key:"discounts",title:"Discounts",lines:discountLines,total:discountLines.reduce((sum,row)=>sum+row.amount,0)},
    {key:"taxes",title:"Taxes",lines:estimatedTax?[{id:"tax:sales",label:"Sales Tax",amount:estimatedTax}]:[],total:estimatedTax},
  ] satisfies CustomerPricingBreakdown["sections"]).filter(section=>section.lines.length>0);
  return {sections,subtotal:input.pricing.total,grandTotal:input.pricing.total};
}
