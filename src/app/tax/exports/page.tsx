import { TaxShell, yearFrom } from "@/features/tax/TaxShell";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireTaxCapability } from "@/lib/tax/permissions";
import { getTaxCenterData } from "@/lib/tax/service";

const contents = ["Expense CSV", "Income CSV", "Mileage CSV", "Payroll summary CSV", "Vendor summary CSV", "Asset purchase CSV", "Receipt index", "Document manifest"];
export default async function TaxExportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const tenant = await requireTenantContext(); requireTaxCapability(tenant.role, "tax.exports");
  const year = yearFrom((await searchParams).year); const data = await getTaxCenterData(tenant.companyId, year);
  return <TaxShell active="/tax/exports" title="Accountant Exports" description="A deterministic ZIP package assembled from current tenant-scoped records. Every generation is audited." year={year}>
    <section className="glass-card p-5"><h2 className="text-xl font-bold">{year} accountant package</h2><p className="mt-2 text-slate-400">Includes eight CSV files; source documents remain in their private vaults and are represented by indexes and manifests.</p><ul className="mt-5 grid gap-2 sm:grid-cols-2">{contents.map((x) => <li className="rounded-xl border border-white/10 bg-slate-950/40 p-3" key={x}>{x}</li>)}</ul><div className="mt-5 flex flex-wrap items-center gap-3"><a href={`/api/tax/exports/accountant-package?year=${year}`} className="ui-button ui-button--primary inline-flex min-h-11 items-center rounded-xl px-4 font-semibold">Generate ZIP package</a><span className="text-sm text-slate-400">{data.summary.missingReceipts ? `${data.summary.missingReceipts} approved expenses are missing receipts.` : "Receipt index is complete."}</span></div></section>
  </TaxShell>;
}
