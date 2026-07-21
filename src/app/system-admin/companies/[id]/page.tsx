import AppLayout from "@/components/layout/AppLayout";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin/platformAuth";
import { getSystemCompany } from "@/lib/admin/systemAdmin";
import {
  beginImpersonationAction,
  endImpersonationAction,
  forceLogoutCompanyAction,
  resetOwnerPasswordAction,
  setCompanyActiveAction,
} from "@/app/actions/systemAdmin/admin";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePlatformAdmin();
  const company = await getSystemCompany((await params).id);
  if (!company) notFound();
  const activeSession = company.impersonations.find((item) =>
    item.adminUserId === admin.id && !item.endedAt && item.expiresAt > new Date(),
  );
  return <AppLayout><main className="mx-auto max-w-6xl p-6">
    {activeSession && <aside role="status" className="mb-5 rounded-lg border-2 border-amber-500 bg-amber-50 p-4">
      <strong>Audited support session active</strong>
      <p>Expires {activeSession.expiresAt.toLocaleString()}. Platform controls remain separate from the company context.</p>
      <form action={endImpersonationAction.bind(null, activeSession.id)}><button className="mt-2 rounded border bg-white px-3 py-1">End support session</button></form>
    </aside>}
    <h1 className="text-3xl font-bold">{company.name}</h1>
    <p>{company.active ? "Active" : "Suspended"} · {company.subscription?.plan ?? "No plan"} · {company.subscription?.status ?? "No subscription"}</p>
    <div className="mt-5 flex flex-wrap gap-2">
      <form action={setCompanyActiveAction.bind(null, company.id, !company.active)}><button className="rounded border px-4 py-2">{company.active ? "Suspend" : "Reactivate"}</button></form>
      <form action={forceLogoutCompanyAction.bind(null, company.id)}><button className="rounded border px-4 py-2">Force Logout All Users</button></form>
      <form action={resetOwnerPasswordAction.bind(null, company.id)}><button className="rounded border px-4 py-2">Email Owner Reset Link</button></form>
      {!activeSession && <form action={async (data) => { "use server"; await beginImpersonationAction(company.id, String(data.get("reason") ?? "")); }}>
        <input name="reason" required minLength={10} placeholder="Support reason" className="rounded border p-2" />
        <button className="rounded border px-4 py-2">Start Audited Support Session</button>
      </form>}
    </div>
    {!company.active && <p className="mt-4 rounded bg-red-50 p-3 text-red-900">Suspended: staff mutations, portal sessions, and private tenant access are blocked until reactivation.</p>}
    <section className="mt-8 grid gap-5 lg:grid-cols-2">
      <Box title="Usage"><p>Estimates: {company._count.estimates}</p><p>Jobs: {company._count.jobs}</p><p>Invoices: {company._count.invoices}</p><p>Photos/storage objects: {company._count.jobPhotos}</p><p>Emails: {company._count.communicationDeliveries}</p>{company.usageMetrics.map((usage) => <p key={usage.id}>{usage.date.toLocaleDateString()}: {usage.apiRequests} API · {usage.storageBytes.toString()} bytes</p>)}</Box>
      <Box title="Users & Login History">{company.memberships.map((membership) => <div key={membership.id} className="mb-3 rounded border p-3"><strong>{membership.user.email}</strong> · {membership.role} · {membership.status}<p>Last login: {membership.user.lastLogin?.toLocaleString() ?? "Never"}</p>{membership.user.devices.map((device) => <p className="text-xs" key={device.id}>{device.userAgent ?? "Unknown device"} · {device.lastSeenAt.toLocaleString()}</p>)}</div>)}</Box>
    </section>
    <Box title="Audit & Activity">{company.auditEvents.map((event) => <p key={event.id} className="border-b py-2">{event.createdAt.toLocaleString()} · {event.eventType} · {event.entityType} {event.entityId}</p>)}</Box>
  </main></AppLayout>;
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-6 rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">{title}</h2><div className="mt-3">{children}</div></section>;
}
