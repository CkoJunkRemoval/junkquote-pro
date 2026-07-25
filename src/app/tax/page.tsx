import Link from "next/link";
import { taxPeriodAction } from "@/app/actions/tax/tax";
import { Money, TaxShell, yearFrom } from "@/features/tax/TaxShell";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireTaxCapability } from "@/lib/tax/permissions";
import { getTaxCenterData } from "@/lib/tax/service";

export default async function TaxCenterPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const tenant = await requireTenantContext();
  requireTaxCapability(tenant.role, "tax.view");
  const year = yearFrom((await searchParams).year);
  const data = await getTaxCenterData(tenant.companyId, year);
  const cards = [
    ["YTD revenue", <Money key="revenue" cents={data.summary.revenueCents} />],
    ["Approved expenses", <Money key="expenses" cents={data.summary.approvedExpenseCents} />],
    ["Business mileage", `${data.summary.totalBusinessMiles.toLocaleString()} mi`],
    ["Fuel", `${data.summary.fuelGallons.toFixed(1)} gal · ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(data.summary.fuelCents / 100)}`],
    ["Payroll summaries", data.summary.payrollPeriods],
    ["Asset purchases", <Money key="assets" cents={data.summary.assetPurchaseCents} />],
    ["Missing receipts", data.summary.missingReceipts],
    ["Uncategorized expenses", data.summary.uncategorizedExpenses],
    ["Documents awaiting review", data.summary.awaitingDocuments],
    ["Reporting periods", data.summary.periodsLocked ? "Locked" : data.periods.length ? "Review needed" : "Not configured"],
    ["Accountant export readiness", data.checklist.every((item) => item.completed) ? "Ready" : `${data.checklist.filter((item) => item.completed).length}/${data.checklist.length} complete`],
  ];
  return <TaxShell active="/tax" title={`${year} Tax Center`} description="A secure year-end workspace assembled from authoritative finance, workforce, fleet, and document records." year={year}>
    <section aria-label="Tax Center readiness" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{cards.map(([label, value]) => <article className="glass-card p-5" key={String(label)}><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></article>)}</section>
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <section className="glass-card p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Year-end checklist</h2><Link className="inline-flex min-h-11 items-center px-2 text-blue-300" href={`/tax/checklist?year=${year}`}>Manage</Link></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-[var(--brand-orange)]" style={{ width: `${data.checklist.length ? data.checklist.filter((x) => x.completed).length / data.checklist.length * 100 : 0}%` }} /></div><p className="mt-3 text-sm text-slate-400">{data.checklist.filter((x) => x.completed).length} of {data.checklist.length} preparation items complete.</p></section>
      <section className="glass-card p-5"><h2 className="text-xl font-bold">Reporting periods</h2><div className="mt-3 space-y-3">{data.periods.map((period) => <div key={period.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span><strong>{period.name}</strong><small className="block text-slate-400">{period.status}</small></span><form action={taxPeriodAction}><input type="hidden" name="periodId" value={period.id} /><input type="hidden" name="intent" value={period.status === "Locked" ? "unlock" : "lock"} />{period.status === "Locked" && <input name="reason" required aria-label="Unlock reason" placeholder="Unlock reason" className="mr-2 min-h-11 rounded-xl border border-white/15 bg-slate-950 px-3" />}<button className="ui-button ui-button--secondary min-h-11 rounded-xl px-3">{period.status === "Locked" ? "Unlock" : "Lock"}</button></form></div></div>)}{!data.periods.length && <p className="text-sm text-slate-400">Create tax-year, quarterly, or monthly periods in Finance → Periods.</p>}</div></section>
    </div>
  </TaxShell>;
}
