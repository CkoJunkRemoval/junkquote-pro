import Link from "next/link";
import FinanceShell, {
  FinanceNotice,
  Money,
} from "@/features/finance/FinanceShell";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireFinanceCapability } from "@/lib/finance/permissions";
import { listJobCostingRows } from "@/lib/finance/service";

export default async function JobCostingPage() {
  const tenant = await requireTenantContext();
  requireFinanceCapability(tenant.role, "finance.jobCosting.view");
  requireFinanceCapability(tenant.role, "finance.costs.view");
  const rows = await listJobCostingRows(tenant.companyId);
  return (
    <FinanceShell active="/finance/job-costing" title="Operational job costing" description="Aggregate advisory profitability without exposing individual compensation rates or changing invoices and payroll records.">
      <FinanceNotice />
      <div className="mt-5 grid gap-3">
        {rows.map((row) => (
          <Link href={`/jobs/${row.job.id}`} className="glass-card grid gap-4 p-4 md:grid-cols-[1.2fr_repeat(4,1fr)]" key={row.job.id}>
            <span>
              <strong>{row.job.jobNumber ?? "Job"}</strong>
              <small className="block text-slate-400">{row.job.status} · {row.completenessScore}% complete</small>
            </span>
            <span><small className="block text-slate-400">Collected</small><strong><Money cents={row.inputs.collectedCents} /></strong></span>
            <span><small className="block text-slate-400">Labor</small><strong><Money cents={row.inputs.laborCents ?? 0} /></strong></span>
            <span><small className="block text-slate-400">Direct cost</small><strong><Money cents={row.directCostCents} /></strong></span>
            <span><small className="block text-slate-400">Operational profit</small><strong className={row.collectedProfitCents < 0 ? "text-red-300" : "text-emerald-300"}><Money cents={row.collectedProfitCents} /></strong></span>
            {row.missingData.length > 0 && <span className="text-sm text-amber-200 md:col-span-5">Incomplete: {row.missingData.join(", ")}</span>}
          </Link>
        ))}
        {!rows.length && <div className="glass-card p-10 text-center text-slate-400">No jobs are available for costing.</div>}
      </div>
    </FinanceShell>
  );
}
