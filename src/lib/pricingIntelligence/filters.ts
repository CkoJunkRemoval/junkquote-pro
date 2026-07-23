export type PricingIntelligenceFilters={
  from:Date;to:Date;pricingProfileId?:string;employeeId?:string;serviceArea?:string;category?:string;crewId?:string;page:number;
};
const value=(input:string|string[]|undefined)=>Array.isArray(input)?input[0]:input||undefined;
export function parsePricingIntelligenceFilters(raw:Record<string,string|string[]|undefined>,now=new Date()):PricingIntelligenceFilters{
  const to=parseDate(value(raw.to),now);to.setUTCHours(23,59,59,999);
  const fallback=new Date(to);fallback.setUTCDate(fallback.getUTCDate()-89);fallback.setUTCHours(0,0,0,0);
  const from=parseDate(value(raw.from),fallback);from.setUTCHours(0,0,0,0);
  return {from:from<=to?from:fallback,to,pricingProfileId:value(raw.profile),employeeId:value(raw.employee),serviceArea:value(raw.serviceArea),category:value(raw.category),crewId:value(raw.crew),page:Math.max(1,Number(value(raw.page))||1)};
}
const parseDate=(raw:string|undefined,fallback:Date)=>{if(!raw)return new Date(fallback);const date=new Date(`${raw}T12:00:00.000Z`);return Number.isNaN(date.getTime())?new Date(fallback):date;};
export function pricingIntelligenceQuery(filters:PricingIntelligenceFilters){
  const query=new URLSearchParams({from:filters.from.toISOString().slice(0,10),to:filters.to.toISOString().slice(0,10)});
  if(filters.pricingProfileId)query.set("profile",filters.pricingProfileId);if(filters.employeeId)query.set("employee",filters.employeeId);
  if(filters.serviceArea)query.set("serviceArea",filters.serviceArea);if(filters.category)query.set("category",filters.category);if(filters.crewId)query.set("crew",filters.crewId);
  return query.toString();
}
