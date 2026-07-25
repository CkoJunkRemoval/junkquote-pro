import AppLayout from "@/components/layout/AppLayout";
import { reviewCorrectionAction } from "@/app/actions/timekeeping/timekeeping";
import { requireTenantContext } from "@/lib/auth/tenant";
import {
  hasTimeCapability,
  requireTimeCapability,
} from "@/lib/timekeeping/permissions";
import {
  listCorrectionRequests,
  listTimeExceptions,
} from "@/lib/timekeeping/service";
export default async function TimeExceptionsPage() {
  const c = await requireTenantContext();
  requireTimeCapability(c.role, "time.team.view");
  const [timesheets, requests] = await Promise.all([
      listTimeExceptions(c.companyId),
      listCorrectionRequests(c.companyId),
    ]),
    manage = hasTimeCapability(c.role, "time.team.manage");
  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
        <p className="text-sm font-semibold uppercase tracking-[.18em] text-[var(--brand-orange)]">
          Team · Timekeeping
        </p>
        <h1 className="text-3xl font-bold">Time Exceptions</h1>
        <section className="mt-6">
          <h2 className="text-xl font-bold">Timesheet exceptions</h2>
          <div className="mt-3 grid gap-3">
            {timesheets.map((row) => (
              <div key={row.id} className="glass-card p-5">
                <strong>
                  {row.employee.firstName} {row.employee.lastName}
                </strong>
                <p className="text-sm text-slate-400">
                  {row.exceptionFlags.join(", ") || row.status}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-8">
          <h2 className="text-xl font-bold">Correction requests</h2>
          <div className="mt-3 grid gap-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="glass-card flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div>
                  <strong>
                    {request.employee.firstName} {request.employee.lastName}
                  </strong>
                  <p>{request.reason}</p>
                  <small className="text-slate-400">
                    {request.status} · {request.createdAt.toLocaleString()}
                  </small>
                </div>
                {manage && request.status === "Pending" && (
                  <div className="flex flex-wrap gap-2">
                    <form
                      action={reviewCorrectionAction.bind(
                        null,
                        request.id,
                        true,
                      )}
                    >
                      <input
                        name="note"
                        placeholder="Review note"
                        className="min-h-11 rounded-xl border px-3"
                      />
                      <button className="ui-button ui-button--primary ml-2 rounded-xl px-4 font-semibold">
                        Approve
                      </button>
                    </form>
                    <form
                      action={reviewCorrectionAction.bind(
                        null,
                        request.id,
                        false,
                      )}
                    >
                      <button className="ui-button ui-button--danger rounded-xl px-4 font-semibold">
                        Reject
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}
