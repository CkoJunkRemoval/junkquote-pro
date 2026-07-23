import { openBillingPortalAction } from "@/app/actions/billing/billing";
import AppLayout from "@/components/layout/AppLayout";
import { requireTenantContext } from "@/lib/auth/tenant";
import { getCompanyEntitlements } from "@/lib/billing/entitlements";
import { isBillingAvailable } from "@/lib/billing/stripe";
import Link from "next/link";

export default async function Page() {
  const context = await requireTenantContext();
  if (context.role !== "Owner" && !context.membership.billingAdmin)
    throw new Error(
      "Billing access is restricted to owners and billing administrators.",
    );
  const entitlements = await getCompanyEntitlements(context.companyId);
  const subscription = entitlements.subscription;
  const billingEnabled = isBillingAvailable();
  return (
    <AppLayout>
      <main className="mx-auto max-w-4xl p-6 sm:p-10">
        <h1 className="text-3xl font-bold">Billing & subscription</h1>
        {!billingEnabled && (
          <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <strong>Online billing is temporarily unavailable.</strong>
            <p>
              Your current subscription details remain visible. Contact a
              platform administrator for billing changes.
            </p>
          </div>
        )}
        {!entitlements.allowed && (
          <div className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4">
            <strong>Restricted mode</strong>
            <p>
              Existing data remains available to view and export. New estimates,
              jobs, invoices, approvals, and users are disabled.
            </p>
          </div>
        )}
        {subscription?.status === "PastDue" && (
          <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
            Payment failed. Update your payment method before the grace period
            ends.
          </div>
        )}
        <section className="mt-6 rounded-2xl border bg-white p-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan" value={subscription?.plan ?? "No plan"} />
            <Field label="Status" value={subscription?.status ?? "Inactive"} />
            <Field label="Trial ends" value={date(subscription?.trialEnd)} />
            <Field
              label="Trial remaining"
              value={`${entitlements.trialDaysRemaining} days`}
            />
            <Field
              label="Renews"
              value={date(subscription?.currentPeriodEnd)}
            />
            <Field
              label="Cancellation"
              value={
                subscription?.cancelAtPeriodEnd
                  ? "Cancels at period end"
                  : "Not scheduled"
              }
            />
          </dl>
          <h2 className="mt-6 text-xl font-bold">Included features</h2>
          <p className="mt-2 capitalize text-slate-600">
            {entitlements.config.features.join(" · ")}
          </p>
          <div className="mt-6 flex gap-3">
            {billingEnabled && (
              <Link
                href="/pricing"
                className="rounded bg-blue-700 px-4 py-2 font-semibold text-white"
              >
                Change plan
              </Link>
            )}
            {billingEnabled && subscription?.stripeCustomerId && (
              <form action={openBillingPortalAction}>
                <button className="rounded border px-4 py-2 font-semibold">
                  Manage billing
                </button>
              </form>
            )}
          </div>
        </section>
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
function date(value: Date | null | undefined) {
  return value ? value.toLocaleDateString() : "—";
}
