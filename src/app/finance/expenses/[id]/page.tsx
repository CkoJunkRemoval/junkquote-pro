import { notFound } from "next/navigation";
import {
  attachReceiptAction,
  expenseTransitionAction,
  reviseExpenseAction,
} from "@/app/actions/finance/finance";
import ExpenseAllocationForm from "@/features/finance/ExpenseAllocationForm";
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
  getExpenseDetail,
  getFinanceFormOptions,
} from "@/lib/finance/service";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await requireTenantContext();
  requireFinanceCapability(tenant.role, "finance.expenses.view");
  const { id } = await params;
  const [expense, options] = await Promise.all([
    getExpenseDetail(tenant.companyId, id),
    getFinanceFormOptions(tenant.companyId),
  ]);
  if (!expense) notFound();
  const allocated = expense.allocations.reduce(
    (sum, item) => sum + item.allocatedAmountCents,
    0,
  );
  const canManage = hasFinanceCapability(
    tenant.role,
    "finance.expenses.manage",
  );
  const canApprove = hasFinanceCapability(
    tenant.role,
    "finance.expenses.approve",
  );
  const allocationOptions = {
    Job: options.jobs.map((item) => ({
      id: item.id,
      label: `${item.jobNumber ?? item.id} · ${item.status}`,
    })),
    Employee: options.employees.map((item) => ({
      id: item.id,
      label: `${item.firstName} ${item.lastName}`,
    })),
    Vehicle: options.assets
      .filter((item) => item.category === "Vehicle")
      .map((item) => ({ id: item.id, label: `${item.assetNumber} · ${item.name}` })),
    Trailer: options.assets
      .filter((item) => item.category === "Trailer")
      .map((item) => ({ id: item.id, label: `${item.assetNumber} · ${item.name}` })),
    Equipment: options.assets
      .filter((item) =>
        ["PoweredEquipment", "NonPoweredEquipment", "Tool"].includes(item.category),
      )
      .map((item) => ({ id: item.id, label: `${item.assetNumber} · ${item.name}` })),
    Customer: options.customers.map((item) => ({
      id: item.id,
      label: `${item.firstName} ${item.lastName}`,
    })),
    Crew: options.crews.map((item) => ({ id: item.id, label: item.name })),
  };
  return (
    <FinanceShell
      active="/finance/expenses"
      title={`Expense #${expense.expenseNumber}`}
      description="Approved values are preserved through explicit revision history; source records remain authoritative."
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <section className="glass-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">{expense.description}</h2>
              <p className="mt-1 text-slate-400">
                {expense.category.name} · {expense.vendor?.name ?? "No vendor"}
              </p>
            </div>
            <span className="status-chip rounded-full px-3 py-2">
              {expense.reviewStatus}
            </span>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Transaction date", expense.transactionDate.toLocaleDateString()],
              ["Source", expense.sourceType],
              ["Payment method", expense.paymentMethod ?? "Not specified"],
              ["Currency", expense.currencyCode],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-slate-400">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-slate-950/50 p-4 sm:grid-cols-5">
            {[
              ["Subtotal", expense.subtotalCents],
              ["Tax", expense.taxCents],
              ["Tip", expense.tipCents],
              ["Fees", expense.feeCents],
              ["Total", expense.totalCents],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-slate-400">{label}</p>
                <strong><Money cents={Number(value)} /></strong>
              </div>
            ))}
          </div>
          {(canManage || canApprove) && (
            <div className="mt-5 flex flex-wrap gap-3">
              {canManage && ["Draft", "Rejected"].includes(expense.reviewStatus) && (
                <form action={expenseTransitionAction}>
                  <input type="hidden" name="expenseId" value={expense.id} />
                  <button name="intent" value="submit" className="ui-button ui-button--primary min-h-11 rounded-xl px-4 font-semibold">Submit for review</button>
                </form>
              )}
              {canApprove && expense.reviewStatus === "NeedsReview" && (
                <>
                  <form action={expenseTransitionAction}>
                    <input type="hidden" name="expenseId" value={expense.id} />
                    <button name="intent" value="approve" className="ui-button ui-button--primary min-h-11 rounded-xl px-4 font-semibold">Approve</button>
                  </form>
                  <form action={expenseTransitionAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="expenseId" value={expense.id} />
                    <input name="reason" required placeholder="Rejection reason" className={`${financeField} max-w-sm`} />
                    <button name="intent" value="reject" className="min-h-11 rounded-xl border border-amber-400/50 bg-amber-950/40 px-4 font-semibold text-amber-100">Reject</button>
                  </form>
                </>
              )}
              {canManage && expense.reviewStatus !== "Voided" && (
                <form action={expenseTransitionAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="expenseId" value={expense.id} />
                  <input name="reason" required placeholder="Void reason" className={`${financeField} max-w-sm`} />
                  <button name="intent" value="void" className="min-h-11 rounded-xl border border-red-400/50 bg-red-950/40 px-4 font-semibold text-red-100">Void</button>
                </form>
              )}
            </div>
          )}
        </section>
        <aside className="space-y-5">
          {canApprove && expense.reviewStatus === "Approved" && (
            <section className="glass-card p-5">
              <h2 className="text-xl font-bold">Correct approved expense</h2>
              <p className="mt-2 text-sm text-slate-400">
                Prior approved values are preserved. A correction reason is
                required.
              </p>
              <form action={reviseExpenseAction} className="mt-4 grid gap-3">
                <input type="hidden" name="expenseId" value={expense.id} />
                <input required name="reason" placeholder="Correction reason" className={financeField} />
                <input required aria-label="Transaction date" name="transactionDate" type="date" defaultValue={expense.transactionDate.toISOString().slice(0, 10)} className={financeField} />
                <select required name="categoryId" defaultValue={expense.categoryId} className={financeField}>
                  {options.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <select name="vendorId" defaultValue={expense.vendorId ?? ""} className={financeField}>
                  <option value="">No vendor</option>
                  {options.vendors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <input required name="description" defaultValue={expense.description} className={financeField} />
                {[
                  ["subtotal", expense.subtotalCents],
                  ["tax", expense.taxCents],
                  ["tip", expense.tipCents],
                  ["fee", expense.feeCents],
                  ["total", expense.totalCents],
                ].map(([name, value]) => (
                  <input key={name} required aria-label={String(name)} name={String(name)} type="number" min="0" step=".01" defaultValue={(Number(value) / 100).toFixed(2)} className={financeField} />
                ))}
                <input name="paymentMethod" defaultValue={expense.paymentMethod ?? ""} placeholder="Payment method" className={financeField} />
                <input name="transactionReference" defaultValue={expense.transactionReference ?? ""} placeholder="Transaction reference" className={financeField} />
                <textarea name="notes" defaultValue={expense.notes ?? ""} placeholder="Notes" className={financeField} />
                <button className="ui-button ui-button--primary min-h-11 rounded-xl px-4 font-semibold">Save correction</button>
              </form>
            </section>
          )}
          <section className="glass-card p-5">
            <h2 className="text-xl font-bold">Revision history</h2>
            <div className="mt-3 space-y-3">
              {expense.revisions.map((revision) => (
                <article key={revision.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong>Revision {revision.revisionNumber}</strong>
                    <time className="text-sm text-slate-400">{revision.correctedAt.toLocaleString()}</time>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{revision.reason}</p>
                </article>
              ))}
              {!expense.revisions.length && <p className="text-sm text-slate-400">No approved-value corrections.</p>}
            </div>
          </section>
          <section className="glass-card p-5">
            <h2 className="text-xl font-bold">Allocation</h2>
            <p className="mt-2 text-sm text-slate-400">
              <Money cents={allocated} /> of <Money cents={expense.totalCents} /> allocated
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded bg-slate-800">
              <div className="h-full bg-blue-400" style={{ width: `${Math.min(100, (allocated / expense.totalCents) * 100 || 0)}%` }} />
            </div>
            {canManage && allocated < expense.totalCents && (
              <ExpenseAllocationForm
                expenseId={expense.id}
                remainingCents={expense.totalCents - allocated}
                options={allocationOptions}
              />
            )}
            <div className="mt-4 space-y-2">
              {expense.allocations.map((item) => (
                <div key={item.id} className="rounded-lg bg-slate-950/40 p-3 text-sm">
                  <strong>{item.targetType}</strong> · <Money cents={item.allocatedAmountCents} />
                  <span className="block text-slate-400">
                    {item.job?.jobNumber ??
                      (item.customer
                        ? `${item.customer.firstName} ${item.customer.lastName}`
                        : item.employee
                          ? `${item.employee.firstName} ${item.employee.lastName}`
                          : item.crew?.name ?? item.asset?.name ?? "Reference")}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="glass-card p-5">
            <h2 className="text-xl font-bold">Private documents</h2>
            <div className="mt-3 space-y-2">
              {expense.documents.map((document) => (
                <a key={document.id} href={`/api/finance/documents/${document.id}`} className="block min-h-11 rounded-lg bg-slate-950/40 p-3 text-blue-300">
                  {document.category} · {document.originalFilename}
                </a>
              ))}
              {!expense.documents.length && <p className="text-sm text-slate-400">No receipt attached.</p>}
            </div>
            {canManage && (
              <form action={attachReceiptAction} className="mt-4 grid gap-3">
                <input type="hidden" name="expenseId" value={expense.id} />
                <input required name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className={`${financeField} file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-1 file:font-semibold file:text-slate-950`} />
                <button className="ui-button ui-button--secondary min-h-11 rounded-xl px-4 font-semibold">
                  Attach receipt
                </button>
              </form>
            )}
          </section>
        </aside>
      </div>
    </FinanceShell>
  );
}
