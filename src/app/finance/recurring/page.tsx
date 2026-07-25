import { createRecurringExpenseAction } from "@/app/actions/finance/finance";
import FinanceShell, {
  Money,
  financeField,
} from "@/features/finance/FinanceShell";
import { requireTenantContext } from "@/lib/auth/tenant";
import {
  hasFinanceCapability,
  requireFinanceCapability,
} from "@/lib/finance/permissions";
import {
  getFinanceFormOptions,
  listUpcomingObligations,
} from "@/lib/finance/service";

export default async function RecurringExpensesPage() {
  const tenant = await requireTenantContext();
  requireFinanceCapability(tenant.role, "finance.view");
  const [obligations, options] = await Promise.all([
    listUpcomingObligations(tenant.companyId),
    getFinanceFormOptions(tenant.companyId),
  ]);
  const canManage = hasFinanceCapability(
    tenant.role,
    "finance.recurring.manage",
  );
  return (
    <FinanceShell active="/finance/recurring" title="Recurring obligations" description="Track upcoming costs and optionally create idempotent draft expenses. No payments are initiated or marked paid automatically.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {obligations.map((item) => (
          <article className="glass-card p-5" key={item.id}>
            <div className="flex justify-between gap-3">
              <h2 className="font-bold">{item.description}</h2>
              <span className="status-chip rounded-full px-2 py-1 text-xs">{item.cadence}</span>
            </div>
            <p className="mt-2 text-xl font-bold"><Money cents={item.expectedAmountCents} /></p>
            <p className="mt-2 text-sm text-slate-400">
              Due {item.nextDueDate.toLocaleDateString()} · {item.vendor?.name ?? "No vendor"}
            </p>
            <p className="mt-3 text-xs text-slate-400">{item.autoCreateDraft ? "Draft generation enabled" : "Reminder only"}</p>
          </article>
        ))}
      </div>
      {canManage && (
        <form action={createRecurringExpenseAction} className="glass-card mt-6 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <h2 className="text-xl font-bold sm:col-span-2 lg:col-span-4">Add recurring obligation</h2>
          <input required name="description" placeholder="Description" className={financeField} />
          <select required name="categoryId" className={financeField}>
            <option value="">Category</option>
            {options.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select name="vendorId" className={financeField}>
            <option value="">No vendor</option>
            {options.vendors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select name="cadence" className={financeField}>
            {["Weekly", "Biweekly", "Monthly", "Quarterly", "Semiannually", "Annually", "Custom"].map((value) => <option key={value}>{value}</option>)}
          </select>
          <input required name="expectedAmount" type="number" min="0" step=".01" placeholder="Expected amount" className={financeField} />
          <input required aria-label="Start date" name="startDate" type="date" className={financeField} />
          <input required aria-label="Next due date" name="nextDueDate" type="date" className={financeField} />
          <input name="reminderLeadDays" type="number" min="0" defaultValue="7" placeholder="Reminder lead days" className={financeField} />
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/15 px-3">
            <input name="autoCreateDraft" type="checkbox" className="h-5 w-5" />
            Auto-create draft
          </label>
          <button className="ui-button ui-button--primary min-h-11 rounded-xl px-4 font-semibold">Add obligation</button>
        </form>
      )}
    </FinanceShell>
  );
}
