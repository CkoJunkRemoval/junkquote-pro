import { startCheckoutAction } from "@/app/actions/billing/billing";
import type { SubscriptionPlan } from "@/generated/prisma/client";
import { plans } from "@/lib/billing/config";

export default function PlanCards({
  current,
  billingEnabled = true,
}: {
  current?: SubscriptionPlan;
  billingEnabled?: boolean;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {(
        Object.entries(plans) as Array<
          [SubscriptionPlan, (typeof plans)[SubscriptionPlan]]
        >
      ).map(([id, plan]) => (
        <article
          key={id}
          className={`rounded-2xl border bg-white p-6 ${current === id ? "border-blue-600 ring-2 ring-blue-100" : ""}`}
        >
          <h2 className="text-2xl font-bold">{plan.name}</h2>
          <p className="mt-2 text-slate-600">{plan.description}</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              {plan.userLimit} user{plan.userLimit === 1 ? "" : "s"}
            </li>
            <li>
              {plan.monthlyEstimateLimit === Number.MAX_SAFE_INTEGER
                ? "Unlimited"
                : plan.monthlyEstimateLimit}{" "}
              estimates/month
            </li>
            <li>
              {plan.truckLimit} truck{plan.truckLimit === 1 ? "" : "s"}
            </li>
            {plan.features.map((feature) => (
              <li key={feature}>✓ {feature.replaceAll(/([A-Z])/g, " $1")}</li>
            ))}
          </ul>
          <form action={startCheckoutAction.bind(null, id)}>
            <button
              disabled={!billingEnabled || current === id}
              className="mt-6 w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white disabled:bg-slate-300"
            >
              {!billingEnabled
                ? "Billing unavailable"
                : current === id
                  ? "Current plan"
                  : `Choose ${plan.name}`}
            </button>
          </form>
        </article>
      ))}
    </div>
  );
}
