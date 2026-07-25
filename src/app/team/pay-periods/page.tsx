import AppLayout from "@/components/layout/AppLayout";
import {
  createPayPeriodAction,
  setPayPeriodLockedAction,
} from "@/app/actions/timekeeping/timekeeping";
import { requireTenantContext } from "@/lib/auth/tenant";
import {
  hasTimeCapability,
  requireTimeCapability,
} from "@/lib/timekeeping/permissions";
import {
  getTimekeepingSettings,
  listPayPeriods,
} from "@/lib/timekeeping/service";
export default async function PayPeriodsPage() {
  const c = await requireTenantContext();
  requireTimeCapability(c.role, "time.team.view");
  const [periods, settings] = await Promise.all([
      listPayPeriods(c.companyId),
      getTimekeepingSettings(c.companyId),
    ]),
    manage = hasTimeCapability(c.role, "time.payPeriod.manage"),
    lock = hasTimeCapability(c.role, "time.lock.manage"),
    canExport = hasTimeCapability(c.role, "time.export");
  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
        <p className="text-sm font-semibold uppercase tracking-[.18em] text-[var(--brand-orange)]">
          Team · Payroll summaries
        </p>
        <h1 className="text-3xl font-bold">Pay Periods</h1>
        <p className="mt-2 text-slate-400">
          Advisory hour summaries only. No withholding, deductions, or net pay
          are calculated.
        </p>
        {manage && (
          <form
            action={createPayPeriodAction}
            className="glass-card mt-6 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5"
          >
            <select
              name="frequency"
              className="min-h-11 rounded-xl border px-3"
            >
              {["Weekly", "Biweekly", "Semimonthly", "Monthly", "Custom"].map(
                (x) => (
                  <option key={x}>{x}</option>
                ),
              )}
            </select>
            <input
              name="anchor"
              aria-label="Anchor date"
              type="date"
              required
              className="min-h-11 rounded-xl border px-3"
            />
            <input
              name="startDate"
              aria-label="Custom start date"
              type="date"
              className="min-h-11 rounded-xl border px-3"
            />
            <input
              name="endDate"
              aria-label="Custom end date"
              type="date"
              className="min-h-11 rounded-xl border px-3"
            />
            <input type="hidden" name="timezone" value={settings.timezone} />
            <button className="ui-button ui-button--primary rounded-xl px-4 font-semibold">
              Create period
            </button>
          </form>
        )}
        <div className="mt-6 grid gap-4">
          {periods.map((period) => {
            const regular = period.timesheets.reduce(
                (n, x) => n + x.regularMinutes,
                0,
              ),
              overtime = period.timesheets.reduce(
                (n, x) => n + x.overtimeMinutes,
                0,
              ),
              exceptions = period.timesheets.reduce(
                (n, x) => n + x.exceptionFlags.length,
                0,
              );
            return (
              <article
                key={period.id}
                className="glass-card grid gap-4 p-5 lg:grid-cols-[1.4fr_repeat(4,.7fr)_auto] lg:items-center"
              >
                <div>
                  <h2 className="font-bold">
                    {period.startDate.toLocaleDateString()} –{" "}
                    {period.endDate.toLocaleDateString()}
                  </h2>
                  <p className="text-sm text-slate-400">{period.status}</p>
                </div>
                <Metric label="Employees" value={period.timesheets.length} />
                <Metric
                  label="Regular"
                  value={`${(regular / 60).toFixed(2)}h`}
                />
                <Metric
                  label="Overtime"
                  value={`${(overtime / 60).toFixed(2)}h`}
                />
                <Metric label="Exceptions" value={exceptions} />
                <div className="flex flex-wrap gap-2">
                  {canExport &&
                    ["Approved", "Exported", "Locked"].includes(
                      period.status,
                    ) && (
                      <a
                        href={`/api/timekeeping/pay-periods/${period.id}/export`}
                        className="ui-button ui-button--primary rounded-xl px-4 py-3 font-semibold"
                      >
                        Export CSV
                      </a>
                    )}
                  {lock && (
                    <form
                      action={setPayPeriodLockedAction.bind(
                        null,
                        period.id,
                        period.status !== "Locked",
                      )}
                    >
                      <button className="ui-button ui-button--secondary rounded-xl px-4 font-semibold">
                        {period.status === "Locked" ? "Unlock" : "Lock"}
                      </button>
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </AppLayout>
  );
}
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="text-xs uppercase text-slate-400">{label}</span>
      <strong className="block">{value}</strong>
    </div>
  );
}
