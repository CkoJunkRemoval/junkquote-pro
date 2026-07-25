import AppLayout from "@/components/layout/AppLayout";
import {
  clockEventAction,
  requestCorrectionAction,
} from "@/app/actions/timekeeping/timekeeping";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireTimeCapability } from "@/lib/timekeeping/permissions";
import {
  getActiveClockState,
  getEmployeeTimeHistory,
  getTimeClockOptions,
  getTimekeepingEmployeeForUser,
  getTimekeepingSettings,
} from "@/lib/timekeeping/service";

const control = "min-h-11 rounded-xl border px-3 py-2";
export default async function MyTimePage() {
  const c = await requireTenantContext();
  requireTimeCapability(c.role, "time.self.view");
  const [employee, settings] = await Promise.all([
    getTimekeepingEmployeeForUser(c.companyId, c.user.id),
    getTimekeepingSettings(c.companyId),
  ]);
  return (
    <AppLayout>
      <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-10">
        <p className="text-sm font-semibold uppercase tracking-[.18em] text-[var(--brand-orange)]">
          Team · Timekeeping
        </p>
        <h1 className="text-3xl font-bold">My Time</h1>
        {!employee ? (
          <div className="glass-card mt-6 p-8">
            A linked workforce profile is required before using the time clock.
          </div>
        ) : (
          <Clock
            employeeId={employee.id}
            companyId={c.companyId}
            timezone={settings.timezone}
          />
        )}
      </main>
    </AppLayout>
  );
}
async function Clock({
  employeeId,
  companyId,
  timezone,
}: {
  employeeId: string;
  companyId: string;
  timezone: string;
}) {
  const [state, history, options] = await Promise.all([
    getActiveClockState(companyId, employeeId),
    getEmployeeTimeHistory(companyId, employeeId),
    getTimeClockOptions(companyId, employeeId),
  ]);
  const next = state.nextEvents;
  return (
    <>
      <section className="glass-card mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Current status</p>
            <h2 className="text-2xl font-bold">
              {!state.clockedIn
                ? "Clocked out"
                : state.onBreak
                  ? "On break"
                  : "Clocked in"}
            </h2>
            {state.session && (
              <p className="mt-2 text-slate-400">
                Started {state.session.clockInAt.toLocaleString()}
              </p>
            )}
          </div>
          <span className="status-chip rounded-full px-4 py-2">
            {state.clockedIn ? "Active shift" : "No active shift"}
          </span>
        </div>
        <form className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="timezone" value={timezone} />
          <select name="jobId" className={control}>
            <option value="">No job</option>
            {options.jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.jobNumber || "Job"} · {job.property.address}
              </option>
            ))}
          </select>
          <select name="crewId" className={control}>
            <option value="">No crew</option>
            {options.crews.map((crew) => (
              <option key={crew.id} value={crew.id}>
                {crew.name}
              </option>
            ))}
          </select>
          <input name="notes" placeholder="Optional note" className={control} />
          <div className="flex flex-wrap gap-2">
            {next.includes("ClockIn") && (
              <button
                formAction={clockEventAction.bind(null, "ClockIn")}
                className="ui-button ui-button--primary rounded-xl px-4 font-semibold"
              >
                Clock In
              </button>
            )}
            {next.includes("BreakStart") && (
              <button
                formAction={clockEventAction.bind(null, "BreakStart")}
                className="ui-button ui-button--warning rounded-xl px-4 font-semibold"
              >
                Start Break
              </button>
            )}
            {next.includes("BreakEnd") && (
              <button
                formAction={clockEventAction.bind(null, "BreakEnd")}
                className="ui-button ui-button--primary rounded-xl px-4 font-semibold"
              >
                End Break
              </button>
            )}
            {next.includes("ClockOut") && (
              <button
                formAction={clockEventAction.bind(null, "ClockOut")}
                className="ui-button ui-button--secondary rounded-xl px-4 font-semibold"
              >
                Clock Out
              </button>
            )}
          </div>
        </form>
      </section>
      <section className="glass-card mt-6 p-6">
        <h2 className="text-xl font-bold">Recent time history</h2>
        <div className="mt-4 space-y-3">
          {history.slice(0, 14).map((session) => (
            <div
              key={session.id}
              className="grid gap-2 rounded-xl border p-4 sm:grid-cols-4"
            >
              <span>{session.clockInAt.toLocaleDateString()}</span>
              <span>
                {session.clockInAt.toLocaleTimeString()} –{" "}
                {session.clockOutAt?.toLocaleTimeString() || "Open"}
              </span>
              <span>
                {(session.payableMinutes / 60).toFixed(2)} payable hours
              </span>
              <span>{session.unpaidBreakMinutes} break minutes</span>
            </div>
          ))}
        </div>
      </section>
      <section className="glass-card mt-6 p-6">
        <h2 className="text-xl font-bold">Request a correction</h2>
        <form
          action={requestCorrectionAction}
          className="mt-4 grid gap-3 sm:grid-cols-3"
        >
          <select name="eventType" className={control}>
            <option value="">Choose event</option>
            {["ClockIn", "ClockOut", "BreakStart", "BreakEnd"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input name="timestamp" type="datetime-local" className={control} />
          <input
            name="reason"
            required
            placeholder="Correction reason"
            className={control}
          />
          <button className="ui-button ui-button--primary rounded-xl px-4 font-semibold">
            Submit request
          </button>
        </form>
      </section>
    </>
  );
}
