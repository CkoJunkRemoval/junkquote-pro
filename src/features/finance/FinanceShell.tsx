import Link from "next/link";
import type { ReactNode } from "react";
import AppLayout from "@/components/layout/AppLayout";

const tabs = [
  ["Overview", "/finance"],
  ["Expenses", "/finance/expenses"],
  ["Receipts", "/finance/receipts"],
  ["Vendors", "/finance/vendors"],
  ["Recurring", "/finance/recurring"],
  ["Job costing", "/finance/job-costing"],
  ["Periods", "/finance/periods"],
] as const;

export default function FinanceShell({
  children,
  active,
  title,
  description,
  actions,
}: {
  children: ReactNode;
  active: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-[var(--brand-orange)]">
              Business Finance
            </p>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="mt-2 max-w-3xl text-slate-400">{description}</p>
          </div>
          {actions}
        </div>
        <nav
          aria-label="Finance sections"
          className="mt-6 flex gap-2 overflow-x-auto pb-2"
        >
          {tabs.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={active === href ? "page" : undefined}
              className={`filter-pill min-h-11 whitespace-nowrap rounded-full px-4 py-2.5 ${active === href ? "filter-pill--active" : ""}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-6">{children}</div>
      </main>
    </AppLayout>
  );
}

export const financeField =
  "min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/25";

export function Money({ cents }: { cents: number }) {
  return (
    <>
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(cents / 100)}
    </>
  );
}

export function FinanceNotice() {
  return (
    <p className="rounded-xl border border-blue-400/20 bg-blue-950/25 p-3 text-sm text-blue-100">
      Operational and advisory reporting only. JunkQuote Pro is not a general
      ledger, tax filing, or tax-preparation system.
    </p>
  );
}
