import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/platformAuth";
import {
  getSystemAdminDashboard,
  listSystemErrors,
} from "@/lib/admin/systemAdmin";
import { prisma } from "@/lib/prisma";
import {
  retrySystemJobAction,
  upsertFeatureFlagAction,
} from "@/app/actions/systemAdmin/admin";
import { validateContentSecurityPolicy } from "@/lib/security/adminSecurity";
import { inspectProductionEnvironment } from "@/lib/production/environment";
export default async function Page() {
  await requirePlatformAdmin();
  const [data, errors, flags, failedJobs, notifications] = await Promise.all([
    getSystemAdminDashboard(),
    listSystemErrors(),
    prisma.featureFlag.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.backgroundJob.findMany({
      where: { status: { in: ["Failed", "Pending", "Running"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { company: { select: { name: true } } },
    }),
    prisma.systemNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { company: { select: { name: true } } },
    }),
  ]);
  const environment = inspectProductionEnvironment();
  const security = validateContentSecurityPolicy(
    environment.contentSecurityPolicy,
  );
  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl p-4 sm:p-8">
        <h1 className="text-3xl font-bold">System Administration</h1>
        <p className="text-slate-600">
          Internal platform control plane. Platform administrators only.
        </p>
        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(data.metrics).map(([k, v]) => (
            <Card
              key={k}
              title={human(k)}
              value={k === "monthlyRevenue" ? money(v) : String(v)}
            />
          ))}
        </section>
        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <Panel title="System Health">
            <Rows
              rows={[
                ["Database", `${data.health.databaseLatencyMs} ms`],
                [
                  "Storage",
                  data.health.storage.ok
                    ? `Healthy (${data.health.storage.latencyMs} ms)`
                    : "Failed",
                ],
                ["Worker", data.health.workersEnabled ? "Enabled" : "Disabled"],
                [
                  "Readiness",
                  data.health.readiness.ready ? "Ready" : "Not ready",
                ],
                ["Failed webhooks", String(data.health.failedWebhooks)],
              ]}
            />
          </Panel>
          <Panel title="Queue Health">
            <Rows
              rows={data.health.queue.map((x) => [x.status, String(x._count)])}
            />
          </Panel>
          <Panel title="Security Readiness">
            <Rows
              rows={[
                ["CSP", security.valid ? "Valid" : security.errors.join("; ")],
                ["CSRF", security.csrfStrategy],
                [
                  "MFA",
                  security.mfaReady ? "Ready" : "Schema/provider pending",
                ],
                ["Session monitoring", "Versioned revocation + device history"],
                ["IP lockouts", "Rate-limit telemetry enabled"],
              ]}
            />
          </Panel>
        </section>
        {environment.warnings.length > 0 && (
          <Panel title="Optional integration warnings">
            <ul className="space-y-2 text-amber-800">
              {environment.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </Panel>
        )}
        <Panel title="Companies">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Users</th>
                  <th>Estimates</th>
                  <th>Jobs</th>
                </tr>
              </thead>
              <tbody>
                {data.companies.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        className="text-blue-700"
                        href={`/system-admin/companies/${c.id}`}
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td>{c.active ? "Active" : "Suspended"}</td>
                    <td>{c.subscription?.plan ?? "None"}</td>
                    <td>{c._count.users}</td>
                    <td>{c._count.estimates}</td>
                    <td>{c._count.jobs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <section className="mt-8 grid gap-5 xl:grid-cols-2">
          <Panel title="Background Jobs">
            <div className="space-y-2">
              {failedJobs.map((j) => (
                <div key={j.id} className="rounded border p-3">
                  <strong>{j.type}</strong> · {j.status} · {j.company.name}
                  <span className="float-right">
                    {j.attempts}/{j.maxAttempts}
                  </span>
                  {j.status === "Failed" && (
                    <form action={retrySystemJobAction.bind(null, j.id)}>
                      <button className="mt-2 rounded border px-3 py-1">
                        Retry
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Error Monitoring">
            <div className="max-h-96 space-y-2 overflow-auto">
              {errors.map((e) => (
                <div key={e.id} className="rounded border p-3">
                  <strong>
                    {e.source} · {e.severity}
                  </strong>
                  <span className="float-right text-xs">
                    {e.createdAt.toLocaleString()}
                  </span>
                  <p>{e.message}</p>
                  <p className="text-xs text-slate-500">
                    {e.company?.name ?? "Platform"} ·{" "}
                    {e.requestId ?? "No request ID"}
                  </p>
                </div>
              ))}
              {!errors.length && <p>No captured errors.</p>}
            </div>
          </Panel>
        </section>
        <section className="mt-8 grid gap-5 xl:grid-cols-2">
          <Panel title="Feature Flags">
            <form
              action={async (fd) => {
                "use server";
                await upsertFeatureFlagAction({
                  key: String(fd.get("key")),
                  description: String(fd.get("description")),
                  enabled: fd.get("enabled") === "on",
                  environment: String(fd.get("environment")) || null,
                  rolloutPercent: Number(fd.get("rollout")),
                });
              }}
              className="grid gap-2 sm:grid-cols-2"
            >
              <input
                name="key"
                required
                placeholder="flag.key"
                className="rounded border p-2"
              />
              <input
                name="description"
                placeholder="Description"
                className="rounded border p-2"
              />
              <input
                name="environment"
                placeholder="Environment (optional)"
                className="rounded border p-2"
              />
              <input
                name="rollout"
                type="number"
                min="0"
                max="100"
                defaultValue="100"
                className="rounded border p-2"
              />
              <label>
                <input name="enabled" type="checkbox" /> Enabled
              </label>
              <button className="rounded bg-slate-900 p-2 text-white">
                Create Flag
              </button>
            </form>
            <div className="mt-4 space-y-2">
              {flags.map((f) => (
                <p key={f.id}>
                  {f.key}
                  <span className="float-right">
                    {f.enabled ? "On" : "Off"} · {f.rolloutPercent}%
                  </span>
                </p>
              ))}
            </div>
          </Panel>
          <Panel title="Notification Center">
            <Rows
              rows={notifications.map((n) => [
                `${n.company.name} · ${n.channel}`,
                `${n.status}: ${n.title}`,
              ])}
            />
            <p className="mt-3 text-sm text-slate-500">
              Channels: in-app and email active; SMS and push adapters reserved.
            </p>
          </Panel>
        </section>
      </main>
    </AppLayout>
  );
}
function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 rounded-2xl border bg-white p-5">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
function Rows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="space-y-2">
      {rows.map(([a, b]) => (
        <p key={a}>
          {a}
          <span className="float-right text-right">{b}</span>
        </p>
      ))}
    </div>
  );
}
function human(x: string) {
  return x.replaceAll(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
function money(x: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(x);
}
