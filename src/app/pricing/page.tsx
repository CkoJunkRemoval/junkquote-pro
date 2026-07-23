import AppLayout from "@/components/layout/AppLayout";
import PlanCards from "@/features/billing/PlanCards";
import { requireTenantContext } from "@/lib/auth/tenant";
import { getCompanyEntitlements } from "@/lib/billing/entitlements";
import { isBillingAvailable } from "@/lib/billing/stripe";

export default async function Page() {
  const context = await requireTenantContext();
  const entitlements = await getCompanyEntitlements(context.companyId);
  const billingEnabled = isBillingAvailable();
  return (
    <AppLayout>
      <main className="mx-auto max-w-6xl p-6 sm:p-10">
        <h1 className="text-4xl font-bold">
          Plans built for junk removal teams
        </h1>
        <p className="mt-2 text-slate-600">
          Pricing and payment details are shown securely in Stripe Checkout.
        </p>
        {!billingEnabled && (
          <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <strong>Online billing is temporarily unavailable.</strong>
            <p>
              Your existing account and application data remain available.
              Contact a platform administrator to change plans.
            </p>
          </div>
        )}
        <div className="mt-8">
          <PlanCards
            current={entitlements.subscription?.plan}
            billingEnabled={billingEnabled}
          />
        </div>
      </main>
    </AppLayout>
  );
}
