import Link from "next/link";
import type { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/client";
import { requirePlatformAdminPage } from "@/lib/admin/platformPageAuth";
import { getPlatformCompanies } from "@/lib/admin/platformAnalytics";
import PlatformAdminShell, { Panel, tableClass } from "@/features/platformAdmin/PlatformAdminShell";

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePlatformAdminPage("platform_admin.companies_viewed");
  const query = await searchParams;
  const date = (value?: string, end = false) => value && !Number.isNaN(Date.parse(value)) ? new Date(`${value}T${end ? "23:59:59.999" : "00:00:00"}`) : undefined;
  const companies = await getPlatformCompanies({
    search: query.search, plan: query.plan as SubscriptionPlan || undefined, status: query.status as SubscriptionStatus || undefined,
    from: date(query.from), to: date(query.to, true), stage: query.stage, inactiveDays: query.inactive ? Number(query.inactive) : undefined,
  });
  return <PlatformAdminShell active="/platform-admin/companies"><h2 className="text-2xl font-bold">Companies</h2>
    <p className="mt-2 text-slate-400">Account, activation, subscription, seat, and high-level usage only.</p>
    <form className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <input name="search" defaultValue={query.search} placeholder="Search company" className="min-h-11 rounded-xl border border-white/15 bg-slate-900 px-3"/>
      <select name="plan" defaultValue={query.plan ?? ""} className="min-h-11 rounded-xl border border-white/15 bg-slate-900 px-3"><option value="">All plans</option>{["Free", "Starter", "Professional", "Enterprise"].map((x) => <option key={x}>{x}</option>)}</select>
      <select name="status" defaultValue={query.status ?? ""} className="min-h-11 rounded-xl border border-white/15 bg-slate-900 px-3"><option value="">All subscription statuses</option>{["Trialing", "Active", "PastDue", "Unpaid", "Canceled", "Incomplete", "Paused"].map((x) => <option key={x}>{x}</option>)}</select>
      <select name="stage" defaultValue={query.stage ?? ""} className="min-h-11 rounded-xl border border-white/15 bg-slate-900 px-3"><option value="">All activation stages</option>{["Registered", "Onboarded", "Customer", "Estimate", "Sent", "Approved", "Job", "Invoice"].map((x) => <option key={x}>{x}</option>)}</select>
      <input aria-label="Signup from" type="date" name="from" defaultValue={query.from} className="min-h-11 rounded-xl border border-white/15 bg-slate-900 px-3"/>
      <input aria-label="Signup to" type="date" name="to" defaultValue={query.to} className="min-h-11 rounded-xl border border-white/15 bg-slate-900 px-3"/>
      <select name="inactive" defaultValue={query.inactive ?? ""} className="min-h-11 rounded-xl border border-white/15 bg-slate-900 px-3"><option value="">Any activity</option><option value="7">Inactive 7+ days</option><option value="14">Inactive 14+ days</option><option value="30">Inactive 30+ days</option></select>
      <button className="min-h-11 rounded-xl bg-orange-500 px-5 font-bold text-slate-950">Filter</button>
    </form>
    <Panel title={`${companies.length} matching companies`}><div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Company</th><th>Signup</th><th>Plan/status</th><th>Seats</th><th>Onboarding</th><th>Activation</th><th>Estimates/approved/jobs/invoices</th><th>Last activity</th><th>Trial end</th><th>Account</th></tr></thead>
      <tbody>{companies.map((c) => <tr key={c.id}><td><Link className="font-semibold text-orange-300 underline-offset-4 hover:underline" href={`/platform-admin/companies/${c.id}`}>{c.name}</Link></td><td>{c.createdAt.toLocaleDateString()}</td><td>{c.subscription?.plan ?? "None"} · {c.subscription?.status ?? "None"}</td><td>{c.seatUsage}</td><td>{c.onboarding?.completedAt ? "Completed" : "Incomplete"}</td><td>{c.activationStage}</td><td>{c._count.estimates} / {c.approvals} / {c._count.jobs} / {c._count.invoices}</td><td>{c.lastActivity?.toLocaleString() ?? "No activity"}</td><td>{c.subscription?.trialEnd?.toLocaleDateString() ?? "—"}</td><td>{c.active ? "Active" : "Suspended"}</td></tr>)}</tbody>
    </table></div>{!companies.length && <p className="text-slate-400">No companies match these filters.</p>}</Panel>
  </PlatformAdminShell>;
}
