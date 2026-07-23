"use client";
import { useState } from "react";
import { Copy, Plus, ToggleLeft, Trash2 } from "lucide-react";
import {
  createPricingRuleAction, deletePricingRuleAction, duplicatePricingRuleAction,
  setPricingRuleActiveAction, updatePricingRuleAction,
} from "@/app/actions/pricingRules/pricingRules";
import type { PricingRuleInput } from "@/lib/pricingRules/types";

type Rule = Awaited<ReturnType<typeof import("@/lib/pricingRules/pricingRules").listPricingRules>>[number];
type Profile = {id:string;name:string};
const button="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] px-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50";
const primary=`${button} bg-blue-700 text-white`;
const input="min-h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3";
const empty:PricingRuleInput={name:"",description:"",active:true,priority:100,category:"Access",applicationMode:"Automatic",valueType:"FlatFee",value:0,taxable:true,conditions:[]};

export default function PricingRulesManagement({initialRules,profiles,canManage}:{initialRules:Rule[];profiles:Profile[];canManage:boolean}) {
  const [rules]=useState(initialRules),[editing,setEditing]=useState<Rule|"new"|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function run(work:()=>Promise<unknown>){setBusy(true);setError("");try{await work();location.reload();}catch(reason){setError(reason instanceof Error?reason.message:"Pricing rule operation failed.");setBusy(false);}}
  return <main className="mx-auto max-w-7xl p-4 sm:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">Pricing Rules</h1><p className="mt-1 text-slate-600 dark:text-slate-300">Reusable automatic and optional estimate modifiers.</p></div>{canManage&&<button className={primary} onClick={()=>setEditing("new")}><Plus size={18}/>New Rule</button>}</header>
    {!canManage&&<p className="mt-4 rounded-xl border bg-blue-50 p-3 text-sm text-blue-900">Pricing rules are read only for your role.</p>}
    {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
    {editing&&<RuleForm key={editing==="new"?"new":editing.id} rule={editing==="new"?null:editing} profiles={profiles} busy={busy} onCancel={()=>setEditing(null)} onSave={(value)=>run(async()=>{if(editing==="new")await createPricingRuleAction(value);else await updatePricingRuleAction(editing.id,value);})}/>}
    <div className="mt-6 hidden overflow-hidden rounded-2xl border md:block"><table className="w-full"><thead className="bg-slate-50 text-left dark:bg-slate-900"><tr><th className="p-4">Rule</th><th>Scope</th><th>Calculation</th><th>Priority</th><th>Status</th><th className="p-4">Actions</th></tr></thead><tbody>{rules.map(rule=><RuleRow key={rule.id} rule={rule} canManage={canManage} busy={busy} edit={()=>setEditing(rule)} run={run}/>)}</tbody></table></div>
    <div className="mt-6 grid gap-4 md:hidden">{rules.map(rule=><article key={rule.id} className="rounded-2xl border p-4"><h2 className="font-bold">{rule.name}</h2><p className="text-sm text-slate-600">{rule.description||"No description"}</p><dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><div><dt>Scope</dt><dd className="font-semibold">{rule.pricingProfile?.name||"All profiles"}</dd></div><div><dt>Calculation</dt><dd className="font-semibold">{rule.valueType} · {rule.value}</dd></div><div><dt>Mode</dt><dd>{rule.applicationMode}</dd></div><div><dt>Status</dt><dd>{rule.active?"Active":"Disabled"}</dd></div></dl>{canManage&&<RuleActions rule={rule} busy={busy} edit={()=>setEditing(rule)} run={run}/>}</article>)}</div>
    {!rules.length&&<p className="mt-6 rounded-2xl border border-dashed p-8 text-center text-slate-500">No pricing rules configured.</p>}
  </main>;
}
function RuleRow({rule,canManage,busy,edit,run}:{rule:Rule;canManage:boolean;busy:boolean;edit:()=>void;run:(work:()=>Promise<unknown>)=>Promise<void>}){return <tr className="border-t"><td className="p-4"><strong>{rule.name}</strong><p className="text-sm text-slate-500">{rule.category} · {rule.applicationMode}</p></td><td>{rule.pricingProfile?.name||"All profiles"}</td><td>{rule.valueType} · {rule.value}</td><td>{rule.priority}</td><td>{rule.active?"Active":"Disabled"}</td><td className="p-4">{canManage&&<RuleActions rule={rule} busy={busy} edit={edit} run={run}/>}</td></tr>}
function RuleActions({rule,busy,edit,run}:{rule:Rule;busy:boolean;edit:()=>void;run:(work:()=>Promise<unknown>)=>Promise<void>}){return <div className="mt-3 flex flex-wrap gap-2 md:mt-0"><button className={button} disabled={busy} onClick={edit}>Edit</button><button aria-label={`Duplicate ${rule.name}`} className={button} disabled={busy} onClick={()=>run(()=>duplicatePricingRuleAction(rule.id))}><Copy size={16}/></button><button aria-label={`${rule.active?"Disable":"Enable"} ${rule.name}`} className={button} disabled={busy} onClick={()=>run(()=>setPricingRuleActiveAction(rule.id,!rule.active))}><ToggleLeft size={16}/></button><button aria-label={`Delete ${rule.name}`} className={`${button} text-red-700`} disabled={busy||rule._count.estimateSnapshots>0} onClick={()=>window.confirm(`Delete ${rule.name}?`)&&run(()=>deletePricingRuleAction(rule.id))}><Trash2 size={16}/></button></div>}
function RuleForm({rule,profiles,busy,onCancel,onSave}:{rule:Rule|null;profiles:Profile[];busy:boolean;onCancel:()=>void;onSave:(input:PricingRuleInput)=>void}) {
  const [value,setValue]=useState<PricingRuleInput>(rule?{
    ...rule,
    applicationMode:rule.applicationMode as PricingRuleInput["applicationMode"],
    valueType:rule.valueType as PricingRuleInput["valueType"],
    conditions:rule.conditions.map(condition=>({field:condition.field as PricingRuleInput["conditions"][number]["field"],operator:condition.operator as PricingRuleInput["conditions"][number]["operator"],value:condition.value,secondaryValue:condition.secondaryValue,displayOrder:condition.displayOrder})),
  }:empty);
  const update=<K extends keyof PricingRuleInput>(key:K,next:PricingRuleInput[K])=>setValue(current=>({...current,[key]:next}));
  return <section className="mt-6 rounded-2xl border bg-[var(--surface)] p-4 sm:p-6"><h2 className="text-xl font-bold">{rule?"Edit":"Create"} pricing rule</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <label className="sm:col-span-2">Name<input className={input} value={value.name} onChange={e=>update("name",e.target.value)}/></label><label>Category<input className={input} value={value.category} onChange={e=>update("category",e.target.value)}/></label>
    <label>Profile<select className={input} value={value.pricingProfileId||""} onChange={e=>update("pricingProfileId",e.target.value||null)}><option value="">All profiles</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label>Mode<select className={input} value={value.applicationMode} onChange={e=>update("applicationMode",e.target.value as PricingRuleInput["applicationMode"])}><option>Automatic</option><option>Optional</option></select></label>
    <label>Calculation<select className={input} value={value.valueType} onChange={e=>update("valueType",e.target.value as PricingRuleInput["valueType"])}>{["FlatFee","Percentage","PerItem","PerCubicYard","PerLaborHour","PerCrewMember","Multiplier","Discount"].map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Value<input type="number" min="0" step=".01" className={input} value={value.value} onChange={e=>update("value",Number(e.target.value))}/></label><label>Priority<input type="number" className={input} value={value.priority} onChange={e=>update("priority",Number(e.target.value))}/></label>
    <label className="sm:col-span-2 lg:col-span-4">Description<input className={input} value={value.description||""} onChange={e=>update("description",e.target.value)}/></label>
    <label>Condition field<select className={input} value={value.conditions[0]?.field||""} onChange={e=>update("conditions",e.target.value?[{field:e.target.value as PricingRuleInput["conditions"][number]["field"],operator:"equals",value:"",displayOrder:0}]:[])}><option value="">No condition</option>{["propertyType","itemCategory","itemFlag","minimumQuantity","maximumQuantity","customerType","crewSize","serviceArea","distance","floor","estimateTotal"].map(x=><option key={x}>{x}</option>)}</select></label>
    {value.conditions[0]&&<><label>Operator<select className={input} value={value.conditions[0].operator} onChange={e=>update("conditions",[{...value.conditions[0],operator:e.target.value as PricingRuleInput["conditions"][number]["operator"]}])}>{["equals","notEquals","greaterThan","greaterThanOrEqual","lessThan","lessThanOrEqual"].map(x=><option key={x}>{x}</option>)}</select></label><label>Condition value<input className={input} value={value.conditions[0].value} onChange={e=>update("conditions",[{...value.conditions[0],value:e.target.value}])}/></label></>}
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={value.taxable} onChange={e=>update("taxable",e.target.checked)}/>Taxable</label>
  </div><div className="mt-5 flex gap-2"><button disabled={busy} className={primary} onClick={()=>onSave(value)}>Save rule</button><button disabled={busy} className={button} onClick={onCancel}>Cancel</button></div></section>;
}
