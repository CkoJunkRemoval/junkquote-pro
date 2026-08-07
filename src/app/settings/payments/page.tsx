import AppLayout from "@/components/layout/AppLayout";
import { requireAdminTenantPage } from "@/lib/auth/pageAccess";
import { prisma } from "@/lib/prisma";
import {
  disconnectStripeConnectAction,
  startStripeConnectAction,
} from "@/app/actions/payments/stripeConnect";
export default async function PaymentsSettings({
  searchParams,
}: {
  searchParams: Promise<{ connectError?: string }>;
}) {
  const c = await requireAdminTenantPage();
  const connectError = (await searchParams).connectError === "1";
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: c.companyId },
  });
  const connected = Boolean(
    company.stripeConnectedAccountId && !company.stripeConnectDisconnectedAt,
  );
  return (
    <AppLayout>
      <main className="mx-auto max-w-3xl p-5 sm:p-10">
        <h1 className="text-3xl font-bold">Accept Customer Payments</h1>
        <p className="mt-3">
          Connect Stripe to accept secure card payments directly from your
          JunkQuote Pro invoices. Payments are deposited into your own Stripe
          account and paid out to your bank account.
        </p>
        {connectError && (
          <p
            className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
            role="alert"
          >
            We couldn&apos;t start Stripe setup. Please try again or contact
            support if the problem continues.
          </p>
        )}
        <div className="surface-card mt-6 rounded-2xl border p-6">
          {!connected ? (
            <form action={startStripeConnectAction}>
              <button className="min-h-11 rounded-xl bg-blue-700 px-5 font-semibold text-white">
                Connect Stripe
              </button>
            </form>
          ) : (
            <>
              <h2 className="text-xl font-bold">
                {company.stripeConnectStatus === "CONNECTED"
                  ? "Stripe connected"
                  : "Stripe setup"}
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field
                  label="Charges"
                  value={
                    company.stripeChargesEnabled ? "Enabled" : "Action required"
                  }
                />
                <Field
                  label="Payouts"
                  value={
                    company.stripePayoutsEnabled ? "Enabled" : "Action required"
                  }
                />
                <Field
                  label="Details submitted"
                  value={company.stripeDetailsSubmitted ? "Yes" : "No"}
                />
                <Field
                  label="Last synced"
                  value={
                    company.stripeConnectUpdatedAt?.toLocaleString() ??
                    "Not yet"
                  }
                />
              </dl>
              {company.stripeConnectRequirementsDue.length > 0 && (
                <p className="mt-4 break-words" role="status">
                  Outstanding requirements:{" "}
                  {company.stripeConnectRequirementsDue.join(", ")}
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-3">
                <form action={startStripeConnectAction}>
                  <button className="min-h-11 rounded-xl bg-blue-700 px-5 font-semibold text-white">
                    Finish setup
                  </button>
                </form>
                <a
                  className="inline-flex min-h-11 items-center rounded-xl border px-5 font-semibold"
                  href="https://dashboard.stripe.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Stripe Dashboard
                </a>
              </div>
              <details className="mt-6">
                <summary className="min-h-11 cursor-pointer py-3 font-semibold">
                  Disconnect Stripe
                </summary>
                <p className="mb-3 text-sm">
                  Disconnecting Stripe prevents new online invoice payments but
                  does not delete payment history.
                </p>
                <form action={disconnectStripeConnectAction}>
                  <button className="min-h-11 rounded-xl border border-red-300 px-5 font-semibold text-red-700">
                    Confirm disconnect
                  </button>
                </form>
              </details>
            </>
          )}
        </div>
        <aside className="mt-6 space-y-2 text-sm text-slate-600">
          <p>
            JunkQuote Pro subscription billing is separate from customer invoice
            payments.
          </p>
          <p>
            No additional JunkQuote Pro transaction fee applies in this version.
            Stripe processing fees apply to your connected Stripe account.
          </p>
        </aside>
      </main>
    </AppLayout>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
