import {
  createFinancialPeriodAction,
  periodTransitionAction,
} from "@/app/actions/finance/finance";
import FinanceShell, { financeField } from "@/features/finance/FinanceShell";
import { requireTenantContext } from "@/lib/auth/tenant";
import {
  hasFinanceCapability,
  requireFinanceCapability,
} from "@/lib/finance/permissions";
import { listFinancialPeriods } from "@/lib/finance/service";

export default async function FinancialPeriodsPage() {
  const tenant = await requireTenantContext();
  requireFinanceCapability(tenant.role, "finance.view");
  const periods = await listFinancialPeriods(tenant.companyId);
  const canManage = hasFinanceCapability(tenant.role, "finance.periods.manage");
  const canUnlock = hasFinanceCapability(tenant.role, "finance.periods.unlock");
  return (
    <FinanceShell active="/finance/periods" title="Reporting periods" description="Optional operational locks prevent ordinary edits. A lock is not an accounting close or tax filing.">
      <div className="grid gap-3">
        {periods.map((period) => (
          <article className="glass-card flex flex-wrap items-center justify-between gap-4 p-4" key={period.id}>
            <div>
              <h2 className="font-bold">{period.name}</h2>
              <p className="text-sm text-slate-400">{period.startDate.toLocaleDateString()} – {period.endDate.toLocaleDateString()}</p>
            </div>
            <span className="status-chip rounded-full px-3 py-2">{period.status}</span>
            {canManage && period.status !== "Locked" && (
              <form action={periodTransitionAction}>
                <input type="hidden" name="periodId" value={period.id} />
                <button name="intent" value="lock" className="ui-button ui-button--secondary min-h-11 rounded-xl px-4 font-semibold">Lock period</button>
              </form>
            )}
            {canUnlock && period.status === "Locked" && (
              <form action={periodTransitionAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="periodId" value={period.id} />
                <input required name="reason" placeholder="Unlock reason" className={`${financeField} max-w-sm`} />
                <button name="intent" value="unlock" className="min-h-11 rounded-xl border border-amber-400/50 bg-amber-950/40 px-4 font-semibold text-amber-100">Unlock</button>
              </form>
            )}
          </article>
        ))}
      </div>
      {canManage && (
        <form action={createFinancialPeriodAction} className="glass-card mt-6 grid gap-3 p-5 sm:grid-cols-4">
          <h2 className="text-xl font-bold sm:col-span-4">Create reporting period</h2>
          <input required name="name" placeholder="Period name" className={financeField} />
          <input required aria-label="Period start" name="startDate" type="date" className={financeField} />
          <input required aria-label="Period end" name="endDate" type="date" className={financeField} />
          <button className="ui-button ui-button--primary min-h-11 rounded-xl px-4 font-semibold">Create period</button>
        </form>
      )}
    </FinanceShell>
  );
}
