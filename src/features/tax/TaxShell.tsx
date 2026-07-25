import Link from "next/link";
import type { ReactNode } from "react";
import AppLayout from "@/components/layout/AppLayout";

const tabs = [
  ["Overview", "/tax"],
  ["Tax Documents", "/tax/documents"],
  ["Mileage", "/tax/mileage"],
  ["Assets", "/tax/assets"],
  ["Payroll", "/tax/payroll"],
  ["Vendors", "/tax/vendors"],
  ["Year-End Checklist", "/tax/checklist"],
  ["Exports", "/tax/exports"],
] as const;

export const taxField = "min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/25";

export function TaxShell({ active, title, description, year, children }: { active: string; title: string; description: string; year: number; children: ReactNode }) {
  return <AppLayout><main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-[.18em] text-[var(--brand-orange)]">Tax Center</p><h1 className="text-3xl font-bold">{title}</h1><p className="mt-2 max-w-3xl text-slate-400">{description}</p></div>
      <form className="flex items-center gap-2"><label htmlFor="tax-year" className="text-sm text-slate-300">Tax year</label><input id="tax-year" name="year" type="number" min="2000" max="2200" defaultValue={year} className={`${taxField} w-28`} /><button className="ui-button ui-button--secondary min-h-11 rounded-xl px-3">View</button></form>
    </div>
    <p className="mt-5 rounded-xl border border-blue-400/20 bg-blue-950/25 p-3 text-sm text-blue-100">Records and preparation tools only. JunkQuote Pro does not calculate taxes, deductions, withholding, depreciation, or file tax forms.</p>
    <nav aria-label="Tax Center sections" className="mt-6 flex gap-2 overflow-x-auto pb-2">{tabs.map(([label, href]) => <Link key={href} href={`${href}?year=${year}`} aria-current={active === href ? "page" : undefined} className={`filter-pill min-h-11 whitespace-nowrap rounded-full px-4 py-2.5 ${active === href ? "filter-pill--active" : ""}`}>{label}</Link>)}</nav>
    <div className="mt-6">{children}</div>
  </main></AppLayout>;
}

export function Money({ cents }: { cents: number }) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function yearFrom(value?: string) {
  const candidate = Number(value);
  return Number.isInteger(candidate) && candidate >= 2000 && candidate <= 2200 ? candidate : new Date().getUTCFullYear();
}
