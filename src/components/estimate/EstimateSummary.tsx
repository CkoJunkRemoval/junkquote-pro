"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ReceiptText } from "lucide-react";
import Card from "@/components/ui/Card";
import { useEstimate } from "@/features/estimate/EstimateContext";
import { buildLivePricingBreakdown, type PricingBreakdownLine } from "@/data/pricing/livePricingBreakdown";

const money=(value:number)=>`${value<0?"−":""}$${Math.abs(value).toFixed(2)}`;
const rowAmounts=(sections:ReturnType<typeof buildLivePricingBreakdown>["sections"])=>new Map(sections.flatMap(section=>section.lines.map(line=>[line.id,line.amount] as const)));

export default function EstimateSummary() {
  const {estimate}=useEstimate();
  const breakdown=useMemo(()=>buildLivePricingBreakdown(estimate),[estimate]);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [baseline]=useState(()=>rowAmounts(breakdown.sections));

  return <aside aria-label="Live pricing breakdown" className="xl:sticky xl:top-4 xl:self-start">
    <div className="xl:hidden">
      <button type="button" aria-expanded={mobileOpen} aria-controls="mobile-pricing-breakdown" onClick={()=>setMobileOpen(value=>!value)}
        className="flex min-h-14 w-full items-center justify-between rounded-2xl bg-blue-700 px-4 font-semibold text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
        <span className="flex items-center gap-2"><ReceiptText size={20}/>Pricing total</span>
        <span className="flex items-center gap-2 text-xl">{money(breakdown.grandTotal)}<ChevronDown className={`motion-safe:transition-transform ${mobileOpen?"rotate-180":""}`} size={20}/></span>
      </button>
    </div>
    <div id="mobile-pricing-breakdown" className={`${mobileOpen?"block":"hidden"} mt-3 xl:mt-0 xl:block`}>
      <Card>
        <header className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Live Pricing Breakdown</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Every charge updates with the estimate.</p></div><ReceiptText aria-hidden size={22}/></header>
        {breakdown.warnings.length>0&&<section aria-label="Pricing warnings" className="mt-4 space-y-2">{breakdown.warnings.map(warning=><p role="status" key={warning.code} className="flex gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"><AlertTriangle aria-hidden className="mt-0.5 shrink-0" size={16}/>{warning.message}</p>)}</section>}
        <div className="mt-4 divide-y divide-[var(--border-color)]">{breakdown.sections.map(section=>section.lines.length>0&&<section key={section.key} className="py-3"><div className="mb-1 flex justify-between gap-3"><h3 className="font-semibold">{section.title}</h3><span className="font-semibold">{money(section.total)}</span></div>{section.lines.map(line=><BreakdownRow key={line.id} line={line} previous={baseline.get(line.id)}/>)}</section>)}</div>
        <div className="sticky bottom-0 mt-3 rounded-xl bg-blue-700 p-4 text-white shadow-lg"><div className="flex items-center justify-between gap-4"><span className="font-semibold">Grand Total</span><strong aria-live="polite" className="text-2xl">{money(breakdown.grandTotal)}</strong></div></div>
      </Card>
    </div>
  </aside>;
}

function BreakdownRow({line,previous}:{line:PricingBreakdownLine;previous?:number}){
  const changed=previous!==undefined&&previous!==line.amount;
  const hasDetails=Boolean(line.details?.length||line.affectedItems?.length);
  const content=<div className="flex min-h-11 items-center justify-between gap-3 py-1.5 text-sm"><span>{line.quantity&&line.quantity!==1?`${line.quantity} × `:""}{line.label}</span><span className="text-right"><strong>{money(line.amount)}</strong>{changed&&<span className="ml-2 text-xs text-blue-700 dark:text-blue-300"><span className="sr-only">Changed from </span>{money(previous!)} →</span>}</span></div>;
  if(!hasDetails)return content;
  return <details className="group"><summary aria-label={`Show pricing details for ${line.label}`} className="cursor-pointer list-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">{content}</summary><div className="mb-2 ml-3 border-l-2 border-slate-200 pl-3 text-xs text-slate-600 motion-safe:animate-in dark:border-slate-700 dark:text-slate-300">{line.details?.map(detail=><p className="flex justify-between gap-3 py-1" key={detail.label}><span>{detail.label}</span><span className="text-right">{detail.value}</span></p>)}{line.affectedItems&&<p className="py-1"><span className="font-medium">Affected: </span>{line.affectedItems.length?line.affectedItems.join(", "):"Entire estimate"}</p>}</div></details>;
}
