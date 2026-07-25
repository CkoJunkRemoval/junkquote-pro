import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { requireAdminTenant } from "@/lib/auth/tenant";
import { listTeamInvitations } from "@/lib/teamInvitations/service";
import {
  createTeamInvitationAction,
  resendTeamInvitationAction,
  revokeTeamInvitationAction,
} from "@/app/actions/teamInvitations/teamInvitations";

export default async function TeamInvitationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const c = await requireAdminTenant();
  const invitations = await listTeamInvitations(c.companyId);
  const notice = query.sent ? "Invitation sent." : query.resent ? "Invitation reminder sent." : query.revoked ? "Invitation revoked." : null;
  return <AppLayout><main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-10">
    <Link href="/team" className="inline-flex min-h-11 items-center text-blue-300">← Team directory</Link>
    <h1 className="mt-2 text-3xl font-bold">Team invitations</h1>
    <p className="mt-2 text-slate-400">Invite employees to securely create or connect their JunkQuote Pro login.</p>
    {notice && <p role="status" className="mt-4 rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-green-200">{notice}</p>}
    <section className="glass-card mt-6 p-5">
      <h2 className="text-xl font-bold">Invite Team Member</h2>
      <form action={createTeamInvitationAction} className="mt-4 grid gap-3 md:grid-cols-2">
        <Field name="firstName" label="First name" autoComplete="given-name" />
        <Field name="lastName" label="Last name" autoComplete="family-name" />
        <Field name="email" label="Email" type="email" autoComplete="email" />
        <label className="grid gap-2">Company role<select name="role" className="min-h-11 rounded-xl border px-3" defaultValue="Crew">
          {c.role === "Owner" && <option value="Admin">Admin</option>}
          <option value="Manager">Manager</option><option value="Office">Office</option><option value="Crew">Crew</option>
        </select></label>
        <button className="ui-button ui-button--primary min-h-11 rounded-xl px-4 font-semibold md:col-span-2">Send invitation</button>
      </form>
    </section>
    <section className="glass-card mt-6 overflow-hidden">
      <div className="border-b border-white/10 p-5"><h2 className="text-xl font-bold">Pending Invitations</h2></div>
      <div className="divide-y divide-white/10">{invitations.filter(x => x.status === "Pending").map(invitation =>
        <article key={invitation.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div><strong>{invitation.employee.firstName} {invitation.employee.lastName}</strong><span className="block text-sm text-slate-400">{invitation.email} · {invitation.role} · expires {invitation.expiresAt.toLocaleDateString()}</span></div>
          <div className="flex gap-2">
            <form action={resendTeamInvitationAction}><input type="hidden" name="invitationId" value={invitation.id}/><button className="ui-button ui-button--secondary min-h-11 rounded-xl px-3">Resend</button></form>
            <form action={revokeTeamInvitationAction}><input type="hidden" name="invitationId" value={invitation.id}/><button className="min-h-11 rounded-xl border border-red-400/50 px-3 text-red-200">Revoke</button></form>
          </div>
        </article>)}
        {!invitations.some(x => x.status === "Pending") && <p className="p-8 text-center text-slate-400">No pending invitations.</p>}
      </div>
    </section>
    {invitations.some(x => x.status !== "Pending") && <section className="glass-card mt-6 p-5"><h2 className="text-xl font-bold">Invitation history</h2><ul className="mt-3 space-y-2 text-sm">{invitations.filter(x => x.status !== "Pending").map(x => <li key={x.id}>{x.employee.firstName} {x.employee.lastName} · {x.role} · {x.status}</li>)}</ul></section>}
  </main></AppLayout>;
}

function Field({ label, ...props }: { label: string; name: string; type?: string; autoComplete?: string }) {
  return <label className="grid gap-2">{label}<input {...props} required className="min-h-11 rounded-xl border px-3" /></label>;
}
