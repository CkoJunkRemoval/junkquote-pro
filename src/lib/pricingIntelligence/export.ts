import { jsPDF } from "jspdf";
type Data=ReturnType<typeof import("./calculations").calculatePricingIntelligence>;
export function pricingIntelligenceRows(data:Data){
  const rows:Array<[string,string|number]>=[["Pricing Intelligence Report",""],["Estimates analyzed",data.meta.estimateCount]];
  for(const [label,value] of Object.entries(data.summary))rows.push([label,value]);
  rows.push(["",""],["Item Analytics",""]);
  for(const item of data.items)rows.push([`${item.category} / ${item.name}`,`Quoted ${item.quoted}; Accepted ${item.accepted}; Revenue ${item.revenue}; Avg price ${item.averageSellingPrice}; Avg profit ${item.averageProfitEstimate}`]);
  rows.push(["",""],["Pricing Rule Analytics",""]);
  for(const rule of data.rules)rows.push([rule.name,`Triggered ${rule.triggered}; Avg ${rule.averageValue}; Revenue ${rule.revenue}; Removed ${rule.removed}; Edited ${rule.edited}`]);
  rows.push(["",""],["Profile Analytics",""]);
  for(const profile of data.profiles)rows.push([profile.name,`Avg estimate ${profile.averageEstimate}; Acceptance ${profile.acceptanceRate}%; Revenue ${profile.revenue}`]);
  rows.push(["",""],["Pricing Health",""],["Manual overrides",data.health.manualOverrides],["Rule overrides",data.health.ruleOverrides],["Missing disposal fees",data.health.missingDisposalFees]);
  rows.push(["",""],["Insights",""]);for(const insight of data.insights)rows.push(["Insight",insight]);
  return rows;
}
const csv=(value:string|number)=>`"${String(value).replaceAll('"','""')}"`;
export const renderPricingIntelligenceCsv=(rows:Array<[string,string|number]>)=>rows.map(row=>row.map(csv).join(",")).join("\r\n");
export function renderPricingIntelligencePdf(rows:Array<[string,string|number]>){
  const pdf=new jsPDF();pdf.setFontSize(18);pdf.text("Pricing Intelligence Report",18,20);pdf.setFontSize(9);let y=30;
  for(const [label,value] of rows){if(y>280){pdf.addPage();y=20;}pdf.text(String(label).slice(0,55),18,y);pdf.text(String(value).slice(0,90),85,y);y+=6;}
  return Buffer.from(pdf.output("arraybuffer"));
}
