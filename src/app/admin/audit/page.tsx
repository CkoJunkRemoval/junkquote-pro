import AppLayout from "@/components/layout/AppLayout";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { listAuditEvents } from "@/lib/audit/audit";
import Link from "next/link";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const c = await requireCompanyRole("Owner", "Admin");
  const p = await searchParams;
  const page = Math.max(1, Number(one(p.page)) || 1);
  const from = one(p.from) ? new Date(`${one(p.from)}T00:00:00Z`) : undefined;
  const to = one(p.to) ? new Date(`${one(p.to)}T23:59:59Z`) : undefined;
  const data = await listAuditEvents(c.companyId, {
    from,
    to,
    actorId: one(p.actor),
    eventType: one(p.event),
    entity: one(p.entity),
    requestId: one(p.requestId),
    page,
  });
  const query = new URLSearchParams(
    Object.entries(p).flatMap(([k, v]) =>
      typeof v === "string" ? [[k, v]] : [],
    ),
  );
  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl p-6">
        <h1 className="text-3xl font-bold">Audit log</h1>
        <p className="text-slate-600">
          Append-only security and financial events.
        </p>
        <form className="mt-5 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3 lg:grid-cols-6">
          <input
            name="from"
            type="date"
            defaultValue={one(p.from)}
            aria-label="From date"
            className="rounded border p-2"
          />
          <input
            name="to"
            type="date"
            defaultValue={one(p.to)}
            aria-label="To date"
            className="rounded border p-2"
          />
          <select
            name="actor"
            defaultValue={one(p.actor) ?? ""}
            aria-label="Actor"
            className="rounded border p-2"
          >
            <option value="">All actors</option>
            {data.actors.map((a) => (
              <option key={a.id} value={a.id}>
                {[a.firstName, a.lastName].filter(Boolean).join(" ") || a.email}
              </option>
            ))}
          </select>
          <select
            name="event"
            defaultValue={one(p.event) ?? ""}
            aria-label="Event type"
            className="rounded border p-2"
          >
            <option value="">All events</option>
            {data.eventTypes.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <input
            name="entity"
            defaultValue={one(p.entity)}
            placeholder="Entity type or ID"
            aria-label="Entity"
            className="rounded border p-2"
          />
          <input
            name="requestId"
            defaultValue={one(p.requestId)}
            placeholder="Request ID"
            aria-label="Request ID"
            className="rounded border p-2"
          />
          <button className="rounded bg-slate-900 px-4 py-2 text-white">
            Filter
          </button>
          <Link
            href="/admin/audit"
            className="rounded border px-4 py-2 text-center"
          >
            Reset
          </Link>
        </form>
        <div className="mt-5 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {[
                  "Time",
                  "Event",
                  "Actor",
                  "Entity",
                  "Request ID",
                  "Detail",
                ].map((x) => (
                  <th className="p-3 text-left" key={x}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.events.map((e) => (
                <tr className="border-t align-top" key={e.id}>
                  <td className="whitespace-nowrap p-3">
                    {e.createdAt.toLocaleString()}
                  </td>
                  <td className="p-3 font-medium">{e.eventType}</td>
                  <td className="p-3">
                    {e.actingUser?.email ?? e.portalAccess?.email ?? "System"}
                  </td>
                  <td className="p-3">
                    {e.entityType ?? "—"} {e.entityId ?? ""}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {e.requestId ?? "—"}
                  </td>
                  <td className="p-3">
                    <details>
                      <summary className="cursor-pointer">View</summary>
                      <pre className="mt-2 max-w-md overflow-auto whitespace-pre-wrap text-xs">
                        {JSON.stringify(e.metadata, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.events.length && (
            <p className="p-5 text-slate-500">
              No audit events match these filters.
            </p>
          )}
        </div>
        <nav className="mt-4 flex justify-between">
          <Link aria-disabled={page <= 1} href={`?${setPage(query, page - 1)}`}>
            Previous
          </Link>
          <span>
            Page {page} of {data.pages}
          </span>
          <Link
            aria-disabled={page >= data.pages}
            href={`?${setPage(query, page + 1)}`}
          >
            Next
          </Link>
        </nav>
      </main>
    </AppLayout>
  );
}
function setPage(query: URLSearchParams, page: number) {
  const next = new URLSearchParams(query);
  next.set("page", String(Math.max(1, page)));
  return next.toString();
}
