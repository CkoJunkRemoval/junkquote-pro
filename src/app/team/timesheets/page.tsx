import AppLayout from "@/components/layout/AppLayout";
import {
  approveTimesheetAction,
  rejectTimesheetAction,
  submitTimesheetAction,
} from "@/app/actions/timekeeping/timekeeping";
import { requireTenantContext } from "@/lib/auth/tenant";
import {
  hasTimeCapability,
  requireTimeCapability,
} from "@/lib/timekeeping/permissions";
import { listTeamTimesheets } from "@/lib/timekeeping/service";
export default async function TeamTimesheetsPage() {
  const c = await requireTenantContext();
  requireTimeCapability(c.role, "time.team.view");
  const rows = await listTeamTimesheets(c.companyId);
  const approve = hasTimeCapability(c.role, "time.timesheet.approve");
  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
        <p className="text-sm font-semibold uppercase tracking-[.18em] text-[var(--brand-orange)]">
          Team · Timekeeping
        </p>
        <h1 className="text-3xl font-bold">Team Timesheets</h1>
        <div className="mt-6 grid gap-4">
          {rows.map((row) => (
            <article
              key={row.id}
              className="glass-card grid gap-4 p-5 lg:grid-cols-[1.2fr_repeat(4,.7fr)_auto] lg:items-center"
            >
              <div>
                <h2 className="font-bold">
                  {row.employee.firstName} {row.employee.lastName}
                </h2>
                <p className="text-sm text-slate-400">
                  {row.payPeriod.startDate.toLocaleDateString()} –{" "}
                  {row.payPeriod.endDate.toLocaleDateString()}
                </p>
              </div>
              <Metric
                label="Regular"
                value={`${(row.regularMinutes / 60).toFixed(2)}h`}
              />
              <Metric
                label="Overtime"
                value={`${(row.overtimeMinutes / 60).toFixed(2)}h`}
              />
              <Metric
                label="Exceptions"
                value={String(row.exceptionFlags.length)}
              />
              <Metric label="Status" value={row.status} />
              <div className="flex flex-wrap gap-2">
                {row.status === "Open" && (
                  <form action={submitTimesheetAction.bind(null, row.id)}>
                    <button className="ui-button ui-button--secondary rounded-xl px-3 font-semibold">
                      Submit
                    </button>
                  </form>
                )}
                {approve && row.status === "Submitted" && (
                  <>
                    <form action={approveTimesheetAction.bind(null, row.id)}>
                      <button className="ui-button ui-button--primary rounded-xl px-3 font-semibold">
                        Approve
                      </button>
                    </form>
                    <form
                      action={rejectTimesheetAction.bind(null, row.id)}
                      className="flex gap-2"
                    >
                      <input
                        name="note"
                        required
                        placeholder="Rejection reason"
                        className="min-h-11 rounded-xl border px-3"
                      />
                      <button className="ui-button ui-button--danger rounded-xl px-3 font-semibold">
                        Reject
                      </button>
                    </form>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
        {!rows.length && (
          <div className="glass-card mt-6 p-10 text-center text-slate-400">
            No timesheets have been generated.
          </div>
        )}
      </main>
    </AppLayout>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs uppercase text-slate-400">{label}</span>
      <strong className="block">{value}</strong>
    </div>
  );
}
