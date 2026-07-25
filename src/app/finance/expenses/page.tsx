import Link from "next/link";
import type {
  ExpenseReviewStatus,
  ExpenseSourceType,
} from "@/generated/prisma/client";
import FinanceShell, {
  Money,
  financeField,
} from "@/features/finance/FinanceShell";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireFinanceCapability } from "@/lib/finance/permissions";
import {
  getFinanceFormOptions,
  listExpenses,
} from "@/lib/finance/service";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const tenant = await requireTenantContext();
  requireFinanceCapability(tenant.role, "finance.expenses.view");
  const query = await searchParams;
  const [expenses, options] = await Promise.all([
    listExpenses(tenant.companyId, {
      search: query.search,
      categoryId: query.category || undefined,
      vendorId: query.vendor || undefined,
      reviewStatus: query.status as ExpenseReviewStatus | undefined,
      sourceType: query.source as ExpenseSourceType | undefined,
      receipt: query.receipt as "attached" | "missing" | undefined,
      allocation: query.allocation as "allocated" | "unallocated" | undefined,
    }),
    getFinanceFormOptions(tenant.companyId),
  ]);
  return (
    <FinanceShell
      active="/finance/expenses"
      title="Expenses"
      description="Categorized business expenses remain traceable to their operational source and allocations."
      actions={
        <Link
          href="/finance/expenses/new"
          className="ui-button ui-button--primary rounded-xl px-4 py-3 font-semibold"
        >
          Add expense
        </Link>
      }
    >
      <form className="glass-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6">
        <input
          name="search"
          defaultValue={query.search}
          placeholder="Search expenses"
          className={`${financeField} xl:col-span-2`}
        />
        <select name="category" defaultValue={query.category} className={financeField}>
          <option value="">All categories</option>
          {options.categories.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <select name="vendor" defaultValue={query.vendor} className={financeField}>
          <option value="">All vendors</option>
          {options.vendors.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <select name="status" defaultValue={query.status} className={financeField}>
          <option value="">All statuses</option>
          {["Draft", "NeedsReview", "Approved", "Rejected", "Voided"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <button className="ui-button ui-button--secondary rounded-xl px-4 font-semibold">
          Apply filters
        </button>
      </form>
      <div className="mt-5 grid gap-3">
        {expenses.map((expense) => {
          const allocated = expense.allocations.reduce(
            (sum, item) => sum + item.allocatedAmountCents,
            0,
          );
          return (
            <Link
              href={`/finance/expenses/${expense.id}`}
              className="glass-card grid min-h-20 gap-3 p-4 hover:border-blue-400/50 sm:grid-cols-[1fr_auto]"
              key={expense.id}
            >
              <span>
                <span className="font-bold">#{expense.expenseNumber} · {expense.description}</span>
                <small className="mt-1 block text-slate-400">
                  {expense.transactionDate.toLocaleDateString()} · {expense.vendor?.name ?? "No vendor"} · {expense.category.name}
                </small>
                <span className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="status-chip rounded-full px-2 py-1">{expense.reviewStatus}</span>
                  <span className="rounded-full bg-slate-800 px-2 py-1">
                    {expense.documents.some((item) => item.category === "Receipt") ? "Receipt attached" : "Receipt missing"}
                  </span>
                  <span className="rounded-full bg-slate-800 px-2 py-1">
                    {allocated === expense.totalCents ? "Fully allocated" : `${Math.round((allocated / expense.totalCents) * 100) || 0}% allocated`}
                  </span>
                </span>
              </span>
              <strong className="text-lg"><Money cents={expense.totalCents} /></strong>
            </Link>
          );
        })}
        {!expenses.length && (
          <div className="glass-card p-10 text-center text-slate-400">
            No expenses match these filters.
          </div>
        )}
      </div>
    </FinanceShell>
  );
}
