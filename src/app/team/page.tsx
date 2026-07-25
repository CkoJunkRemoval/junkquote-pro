import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import type { EmployeeStatus, WorkerType } from "@/generated/prisma/client";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireWorkforceCapability } from "@/lib/workforce/permissions";
import { listWorkforceDirectory } from "@/lib/workforce/service";

export default async function TeamPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const c = await requireTenantContext();
  requireWorkforceCapability(c.role, "workforce.view");
  const members = await listWorkforceDirectory(c.companyId, {
    search: query.q,
    status: query.status as EmployeeStatus | undefined,
    workerType: query.workerType as WorkerType | undefined,
    jobTitle: query.jobTitle,
    active: query.active === "true" ? true : query.active === "false" ? false : undefined,
  });
  return <AppLayout><main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[.18em] text-[var(--brand-orange)]">Team & Workforce</p><h1 className="text-3xl font-bold">Team directory</h1><p className="mt-2 text-slate-400">Employment records stay separate from application login access.</p></div><div className="flex flex-wrap gap-2"><Link href="/team/onboarding" className="ui-button ui-button--secondary rounded-xl px-4 py-3 font-semibold">Onboarding</Link><Link href="/team/credentials" className="ui-button ui-button--secondary rounded-xl px-4 py-3 font-semibold">Expiring credentials</Link><Link href="/team/new" className="ui-button ui-button--primary rounded-xl px-4 py-3 font-semibold">Add team member</Link></div></div>
    <form className="glass-card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
      <input name="q" defaultValue={query.q} placeholder="Search team" className="min-h-11 rounded-xl border px-3" />
      <select name="status" defaultValue={query.status ?? ""} className="min-h-11 rounded-xl border px-3"><option value="">All statuses</option>{["Onboarding","Active","Leave","Suspended","Terminated","Inactive"].map(x=><option key={x}>{x}</option>)}</select>
      <select name="workerType" defaultValue={query.workerType ?? ""} className="min-h-11 rounded-xl border px-3"><option value="">All worker types</option>{["Employee","Contractor","Owner"].map(x=><option key={x}>{x}</option>)}</select>
      <input name="jobTitle" defaultValue={query.jobTitle} placeholder="Job title" className="min-h-11 rounded-xl border px-3" />
      <button className="ui-button ui-button--primary rounded-xl px-4 font-semibold">Apply filters</button>
    </form>
    <div className="mt-6 grid gap-4 lg:grid-cols-2">{members.map(member => {
      const required = member.onboardingItems.filter(item=>item.required);
      const complete = required.filter(item=>item.status==="Completed").length;
      const expired = member.workforceCredentials.some(item=>item.status==="Expired" || Boolean(item.expirationDate && item.expirationDate < new Date()));
      return <Link href={`/team/${member.id}`} key={member.id} className="glass-card block p-5 transition hover:border-orange-400/60"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{member.preferredName || member.firstName} {member.lastName}</h2><p className="text-sm text-slate-400">{member.jobTitle || member.role} · {member.workerType}</p></div><span className="status-chip rounded-full px-3 py-1 text-xs">{member.status}</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><span>Onboarding <strong>{complete}/{required.length}</strong></span><span>{member.authorizedDriver ? "Authorized driver" : "Not a driver"}</span><span>{member.defaultCrew?.name || "No default crew"}</span><span className={expired ? "text-red-300" : "text-slate-300"}>{expired ? "Credential attention" : "Credentials current"}</span></div></Link>;
    })}</div>
    {!members.length && <div className="glass-card mt-6 p-10 text-center text-slate-400">No team members match these filters.</div>}
  </main></AppLayout>;
}

