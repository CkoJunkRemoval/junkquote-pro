import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  ["Overview", "/platform-admin"],
  ["Companies", "/platform-admin/companies"],
  ["Activation Funnel", "/platform-admin/activation"],
  ["Usage", "/platform-admin/usage"],
  ["Subscriptions", "/platform-admin/subscriptions"],
  ["Conversion Metrics", "/platform-admin/conversions"],
] as const;

export default function PlatformAdminShell({ children, active }: { children: ReactNode; active: string }) {
  return <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
    <header className="border-b border-white/10 bg-slate-950/95 px-4 py-5 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-orange-300">Internal · Platform owner only</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">JunkQuote Pro Platform Administration</h1>
        <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-4 font-semibold focus-visible:ring-2 focus-visible:ring-orange-300">Company workspace</Link>
      </div>
      <nav aria-label="Platform administration" className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {links.map(([label, href]) => <Link key={href} href={href} aria-current={active === href ? "page" : undefined}
          className={`inline-flex min-h-11 shrink-0 items-center rounded-xl px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-orange-300 ${active === href ? "bg-orange-500 text-slate-950" : "bg-white/5 text-slate-200 hover:bg-white/10"}`}>{label}</Link>)}
      </nav>
    </header>
    <main className="mx-auto max-w-7xl p-4 sm:p-8">{children}</main>
  </div>;
}

export function MetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return <article className="rounded-2xl border border-white/10 bg-white/[.06] p-5">
    <p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p>
    {detail && <p className="mt-2 text-xs text-slate-400">{detail}</p>}
  </article>;
}
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.05] p-5 sm:p-6"><h2 className="text-xl font-bold">{title}</h2><div className="mt-4">{children}</div></section>;
}
export function Bars({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((x) => x.value));
  return <div className="space-y-4" role="img" aria-label={rows.map((x) => `${x.label}: ${x.value}`).join(", ")}>
    {rows.map((row) => <div key={row.label}><div className="mb-1 flex justify-between gap-3 text-sm"><span>{row.label}</span><strong>{row.value}</strong></div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-orange-400" style={{ width: `${row.value / max * 100}%` }} /></div></div>)}
  </div>;
}
export const tableClass = "w-full min-w-[720px] text-left text-sm [&_td]:border-b [&_td]:border-white/10 [&_td]:p-3 [&_th]:border-b [&_th]:border-white/15 [&_th]:p-3 [&_th]:text-slate-300";
export function ExportLinks() {
  return <div className="flex flex-wrap gap-2">{["companies", "activation", "usage", "subscriptions", "conversions"].map((kind) =>
    <a key={kind} href={`/api/platform-admin/exports/${kind}`} className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-4 text-sm font-semibold capitalize focus-visible:ring-2 focus-visible:ring-orange-300">{kind} CSV</a>)}</div>;
}
