import { addTaxChecklistItemAction, toggleTaxChecklistItemAction } from "@/app/actions/tax/tax";
import { TaxShell, taxField, yearFrom } from "@/features/tax/TaxShell";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireTaxCapability } from "@/lib/tax/permissions";
import { getTaxCenterData } from "@/lib/tax/service";

export default async function TaxChecklistPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const tenant = await requireTenantContext(); requireTaxCapability(tenant.role, "tax.view");
  const year = yearFrom((await searchParams).year); const data = await getTaxCenterData(tenant.companyId, year);
  return <TaxShell active="/tax/checklist" title="Year-End Checklist" description="A collaborative preparation checklist. Completion is a workflow signal, not tax or legal advice." year={year}>
    <section className="glass-card overflow-hidden"><div className="divide-y divide-white/10">{data.checklist.map((item) => <form action={toggleTaxChecklistItemAction} key={item.id} className="flex min-h-16 items-center justify-between gap-3 p-4"><span><strong className={item.completed ? "text-slate-400 line-through" : ""}>{item.label}</strong>{item.isCustom && <small className="ml-2 rounded-full bg-blue-400/15 px-2 py-1 text-blue-200">Custom</small>}</span><input type="hidden" name="itemId" value={item.id} /><input type="hidden" name="completed" value={String(!item.completed)} /><button className={`ui-button min-h-11 rounded-xl px-4 ${item.completed ? "ui-button--secondary" : "ui-button--primary"}`}>{item.completed ? "Reopen" : "Complete"}</button></form>)}</div></section>
    <form action={addTaxChecklistItemAction} className="glass-card mt-5 flex flex-wrap gap-3 p-5"><input type="hidden" name="taxYear" value={year} /><label className="min-w-[240px] flex-1"><span className="text-sm text-slate-300">Custom checklist item</span><input name="label" required className={taxField} placeholder="Add a company-specific review task" /></label><button className="ui-button ui-button--primary mt-auto min-h-11 rounded-xl px-4">Add item</button></form>
  </TaxShell>;
}
