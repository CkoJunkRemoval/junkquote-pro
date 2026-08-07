import { openBillingPortalAction } from "@/app/actions/billing/billing";
import AppLayout from "@/components/layout/AppLayout";
import { requireCompanyModulePage } from "@/lib/auth/pageAccess";
import { getCompanyEntitlements, getEstimateUsage } from "@/lib/billing/entitlements";
import { isBillingAvailable } from "@/lib/billing/stripe";
import Link from "next/link";
import { catchUpTrialLifecycle } from "@/lib/billing/trialLifecycle";
import { billingFeatureLabel, billingStatusLabel } from "@/lib/billing/presentation";

export default async function Page() {
  const context = await requireCompanyModulePage("billing");
  await catchUpTrialLifecycle(context.companyId);
  const entitlements = await getCompanyEntitlements(context.companyId);
  const subscription = entitlements.subscription;
  const usage = await getEstimateUsage(context.companyId);
  const billingEnabled = isBillingAvailable();
  return (
    <AppLayout>
      <main className="mx-auto max-w-4xl p-6 sm:p-10">
        <h1 className="text-3xl font-bold">Billing & subscription</h1>
        {!billingEnabled && (
          <div className="surface-warning mt-5 rounded-xl border border-amber-300 p-4">
            <strong>Online billing is temporarily unavailable.</strong>
            <p>
              Your current subscription details remain visible. Contact a
              platform administrator for billing changes.
            </p>
          </div>
        )}
        {entitlements.plan === "Free" && (
          <div className="surface-warning mt-5 rounded-xl border border-red-300 p-4">
            <strong>Your company is on the Free plan</strong>
            <p>
              Existing records are preserved. Free includes six estimates per UTC calendar month; paid features require an upgrade.
            </p>
          </div>
        )}
        {subscription?.status === "PastDue" && (
          <div className="surface-warning mt-5 rounded-xl border border-amber-300 p-4">
            Payment failed. Update your payment method before the grace period
            ends.
          </div>
        )}
        <section className="mt-6 rounded-2xl border bg-white p-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Effective plan" value={entitlements.plan} />
            <Field label="Status" value={billingStatusLabel(subscription, entitlements.reason)} />
            <Field label="Billing interval" value={subscription?.billingInterval ?? "—"} />
            <Field label="Trial ends" value={date(subscription?.trialEnd)} />
            <Field
              label="Trial remaining"
              value={`${entitlements.trialDaysRemaining} days`}
            />
            <Field
              label="Renews"
              value={date(subscription?.currentPeriodEnd)}
            />
            {entitlements.plan === "Free" && <Field label="Estimate usage" value={`${usage.used} of ${usage.limit} estimates used this month`} />}
            <Field
              label="Cancellation"
              value={
                subscription?.cancelAtPeriodEnd
                  ? "Cancels at period end"
                  : "Not scheduled"
              }
            />
          </dl>
          {entitlements.reason === "trial" && <div className="surface-warning mt-6 rounded-xl border border-blue-300 p-4"><strong>Professional Trial · {entitlements.trialDaysRemaining} days remaining</strong><p className="mt-1">No card required. You have full Professional access for 30 days. If you do not subscribe, your company will move to the Free plan with 6 estimates per month when the trial ends.</p></div>}
          <h2 className="mt-6 text-xl font-bold">Included features</h2>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Included features">
            {entitlements.config.features.map((feature) => <li className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-200" key={feature}>{billingFeatureLabel(feature)}</li>)}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            {billingEnabled && (
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center rounded bg-blue-700 px-4 py-2 font-semibold text-white"
              >
                {entitlements.reason === "trial" ? "View Plans / Upgrade" : "Change plan"}
              </Link>
            )}
            {billingEnabled && subscription?.stripeCustomerId && (
              <form action={openBillingPortalAction}>
                <button className="min-h-11 rounded border px-4 py-2 font-semibold">
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
