import Link from "next/link";
import FinanceShell, {
  FinanceNotice,
  Money,
} from "@/features/finance/FinanceShell";
import { requireTenantContext } from "@/lib/auth/tenant";
import {
  hasFinanceCapability,
  requireFinanceCapability,
} from "@/lib/finance/permissions";
import { getFinanceDashboardSummary } from "@/lib/finance/service";

export default async function FinanceDashboardPage() {
  const tenant = await requireTenantContext();
  requireFinanceCapability(tenant.role, "finance.view");
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const summary = await getFinanceDashboardSummary(
    tenant.companyId,
    from,
    now,
  );
  const canSeeCosts = hasFinanceCapability(tenant.role, "finance.costs.view");
  const canExport = hasFinanceCapability(tenant.role, "finance.exports");
  const cards: Array<readonly [string, number]> = [
    ["Collected revenue", summary.income.collectedRevenueCents],
    ["Invoiced revenue", summary.income.invoicedRevenueCents],
    ["Outstanding invoices", summary.income.outstandingRevenueCents],
  ];
  if (canSeeCosts)
    cards.push(
      ["Approved expenses", summary.approvedExpenseCents],
      ["Operational profit", summary.operationalProfitCents],
      ["Unallocated expenses", summary.unallocatedExpenseCents],
    );
  const chartMax = Math.max(
    summary.income.collectedRevenueCents,
    summary.approvedExpenseCents,
    1,
  );
  return (
    <FinanceShell
      active="/finance"
      title="Finance overview"
      description="A tenant-scoped operational view of revenue, business costs, obligations, and job profitability."
      actions={
        <Link
          href="/finance/expenses/new"
          className="ui-button ui-button--primary rounded-xl px-4 py-3 font-semibold"
        >
          Add expense
        </Link>
      }
    >
      <FinanceNotice />
      {canExport && (
        <details className="glass-card mt-5 p-4">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-blue-200">
            Accountant CSV exports
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "expenses",
              "allocations",
              "vendors",
              "categories",
              "documents",
              "recurring",
              "income",
              "job-costs",
              "periods",
              "revisions",
              "operational-sources",
              "asset-purchases",
            ].map((kind) => (
              <a
                key={kind}
                href={`/api/finance/exports/${kind}`}
                className="ui-button ui-button--secondary inline-flex min-h-11 items-center rounded-xl px-3 text-sm capitalize"
              >
                {kind.replaceAll("-", " ")}
              </a>
            ))}
          </div>
        </details>
      )}
      <section
        aria-label="Finance key performance indicators"
        className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {cards.map(([label, value]) => (
          <article className="glass-card p-5" key={label}>
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-bold">
              <Money cents={value} />
            </p>
          </article>
        ))}
      </section>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {canSeeCosts && <section className="glass-card p-5">
          <h2 className="text-xl font-bold">Income versus expenses</h2>
          <p className="mt-1 text-sm text-slate-400">
            Current calendar month · collected revenue and approved expenses
          </p>
          <div className="mt-6 space-y-5">
            {[
              ["Collected", summary.income.collectedRevenueCents, "bg-blue-400"],
              ["Expenses", summary.approvedExpenseCents, "bg-orange-400"],
            ].map(([label, rawValue, color]) => {
              const value = Number(rawValue);
              return (
                <div key={String(label)}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>{label}</span>
                    <strong><Money cents={value} /></strong>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${Math.max(2, (value / chartMax) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>}
        <section className="glass-card p-5">
          <h2 className="text-xl font-bold">Attention</h2>
          <dl className="mt-4 space-y-4">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Awaiting review</dt>
              <dd className="font-bold">{summary.awaitingReview}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Upcoming obligations</dt>
              <dd className="font-bold">{summary.upcoming.length}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Completed jobs in review set</dt>
              <dd className="font-bold">{summary.completedJobCount}</dd>
            </div>
          </dl>
        </section>
      </div>
      {canSeeCosts && (
        <section aria-label="Finance trends and cost breakdowns" className="mt-5 grid gap-5 xl:grid-cols-3">
          <article className="glass-card p-5 xl:col-span-2">
            <h2 className="text-xl font-bold">Operational profit trend</h2>
            <p className="mt-1 text-sm text-slate-400">Six-month collected revenue and approved expense trend</p>
            <div className="mt-5 grid grid-cols-6 items-end gap-2">
              {summary.monthlyTrend.map((month) => {
                const max = Math.max(...summary.monthlyTrend.flatMap((item) => [item.collectedCents, item.expenseCents]), 1);
                return (
                  <div key={month.key} className="text-center">
                    <div className="flex h-32 items-end justify-center gap-1" aria-label={`${month.label}: collected ${(month.collectedCents / 100).toFixed(2)}, expenses ${(month.expenseCents / 100).toFixed(2)}, operational profit ${(month.operationalProfitCents / 100).toFixed(2)}`}>
                      <span className="w-3 rounded-t bg-blue-400" style={{ height: `${Math.max(2, (month.collectedCents / max) * 100)}%` }} />
                      <span className="w-3 rounded-t bg-orange-400" style={{ height: `${Math.max(2, (month.expenseCents / max) * 100)}%` }} />
                    </div>
                    <span className="mt-2 block text-xs text-slate-400">{month.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-4 text-xs">
              <span className="text-blue-300">■ Collected</span>
              <span className="text-orange-300">■ Expenses</span>
            </div>
          </article>
          <article className="glass-card p-5">
            <h2 className="text-xl font-bold">Expense categories</h2>
            <div className="mt-4 space-y-3">
              {summary.expenseByCategory.slice(0, 6).map((item) => {
                const max = summary.expenseByCategory[0]?.totalCents || 1;
                return (
                  <div key={item.category}>
                    <div className="flex justify-between gap-3 text-sm">
                      <span>{item.category}</span>
                      <strong><Money cents={item.totalCents} /></strong>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded bg-slate-800">
                      <div className="h-full rounded bg-orange-400" style={{ width: `${(item.totalCents / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
              {!summary.expenseByCategory.length && <p className="text-sm text-slate-400">No approved expenses this month.</p>}
            </div>
          </article>
          <article className="glass-card p-5 xl:col-span-3">
            <h2 className="text-xl font-bold">Top job-cost drivers</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {summary.topCostDrivers.map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className="mt-1 text-xl font-bold"><Money cents={item.totalCents} /></p>
                </div>
              ))}
              {!summary.topCostDrivers.length && <p className="text-sm text-slate-400">No complete job-cost inputs yet.</p>}
            </div>
          </article>
        </section>
      )}
      <section className="glass-card mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h2 className="text-xl font-bold">Recent expenses</h2>
          <Link
            href="/finance/expenses"
            className="inline-flex min-h-11 items-center text-blue-300"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-white/10">
          {summary.recent.map((expense) => (
            <Link
              href={`/finance/expenses/${expense.id}`}
              key={expense.id}
              className="flex min-h-14 flex-wrap items-center justify-between gap-3 p-4 hover:bg-white/5"
            >
              <span>
                <strong>#{expense.expenseNumber}</strong> · {expense.description}
                <small className="block text-slate-400">
                  {expense.category.name} · {expense.reviewStatus}
                </small>
              </span>
              <strong><Money cents={expense.totalCents} /></strong>
            </Link>
          ))}
          {!summary.recent.length && (
            <p className="p-8 text-center text-slate-400">No expenses yet.</p>
          )}
        </div>
      </section>
    </FinanceShell>
  );
}
