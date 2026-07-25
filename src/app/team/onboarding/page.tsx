import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireWorkforceCapability } from "@/lib/workforce/permissions";
import { listWorkforceOnboardingOverview } from "@/lib/workforce/service";

export default async function WorkforceOnboardingPage() {
  const c = await requireTenantContext();
  requireWorkforceCapability(c.role, "workforce.view");
  const members = await listWorkforceOnboardingOverview(c.companyId);
  return <AppLayout><main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-10"><Link href="/team" className="inline-flex min-h-11 items-center text-blue-300">← Team directory</Link><h1 className="mt-3 text-3xl font-bold">Onboarding</h1><p className="mt-2 text-slate-400">Required steps remain preserved after completion.</p><div className="mt-6 grid gap-4 lg:grid-cols-2">{members.map(member=>{const required=member.onboardingItems.filter(item=>item.required);const done=required.filter(item=>item.status==="Completed").length;const progress=required.length?Math.round(done/required.length*100):100;return <Link key={member.id} href={`/team/${member.id}?section=onboarding`} className="glass-card block p-5"><div className="flex justify-between gap-3"><h2 className="text-xl font-bold">{member.preferredName||member.firstName} {member.lastName}</h2><strong>{progress}%</strong></div><div className="mt-4 h-2 overflow-hidden rounded bg-slate-700"><div className="h-full bg-[var(--brand-orange)]" style={{width:`${progress}%`}} /></div><p className="mt-3 text-sm text-slate-400">{done} of {required.length} required items complete</p></Link>})}</div>{!members.length&&<div className="glass-card mt-6 p-10 text-center text-slate-400">No team members are currently onboarding.</div>}</main></AppLayout>;
}

