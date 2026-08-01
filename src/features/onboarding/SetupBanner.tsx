import Link from "next/link";

export default function SetupBanner({
  completed,
  total,
  setupComplete,
  dismissAction,
}: {
  completed: number;
  total: number;
  setupComplete: boolean;
  dismissAction?: () => Promise<void>;
}) {
  return (
    <section data-testid="setup-banner" className="mt-6 rounded-2xl border border-orange-400/40 bg-slate-950/90 p-5 text-slate-100 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-white">
            {setupComplete ? "Setup complete" : "Finish setting up your workspace"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-white">
            <strong className="text-orange-200">{completed} of {total}</strong>{" "}
            setup sections complete. {setupComplete
              ? "You’re ready to create estimates."
              : "Resume anytime without losing progress."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={setupComplete ? "/estimates" : "/onboarding"}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-orange-500 px-4 py-2 font-semibold text-slate-950 hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {setupComplete ? "Create Estimate" : "Resume setup"}
          </Link>
          {setupComplete && dismissAction && (
            <form action={dismissAction}>
              <button className="min-h-11 rounded-lg border border-slate-500 bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
                Dismiss
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
