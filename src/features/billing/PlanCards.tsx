"use client";
import { useState } from "react";
import { startCheckoutAction } from "@/app/actions/billing/billing";
import type { SubscriptionPlan } from "@/generated/prisma/client";
import { plans } from "@/lib/billing/config";

export default function PlanCards({ current, billingEnabled = true }: { current?: SubscriptionPlan; billingEnabled?: boolean }) {
  const [interval, setInterval] = useState<"Monthly" | "Yearly">("Monthly");
  return <>
    <div className="mb-6 flex justify-center" role="group" aria-label="Billing interval">
      {(["Monthly", "Yearly"] as const).map(value => <button key={value} type="button" onClick={() => setInterval(value)} aria-pressed={interval === value} className={`min-h-11 px-5 py-3 font-semibold first:rounded-l-xl last:rounded-r-xl ${interval === value ? "bg-blue-700 text-white" : "border bg-white text-slate-800"}`}>{value}{value === "Yearly" ? " (save 2 months)" : ""}</button>)}
    </div>
    <div className="grid gap-5 lg:grid-cols-3">
      {(["Starter", "Professional", "Enterprise"] as const).map(id => { const plan = plans[id]; const cents = interval === "Monthly" ? plan.monthlyCents : plan.yearlyCents; return <article key={id} className={`relative rounded-2xl border bg-white p-6 ${current === id ? "border-blue-600 ring-2 ring-blue-100" : ""}`}>
        {id === "Professional" && <span className="absolute right-4 top-4 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-900">Recommended</span>}
        <h2 className="text-2xl font-bold">{plan.name}</h2><p className="mt-2 text-slate-600">{plan.description}</p>
        <p className="mt-5 text-3xl font-bold">${(cents / 100).toLocaleString()}<span className="text-base font-normal text-slate-500">/{interval === "Monthly" ? "month" : "year"}</span></p>
        {interval === "Yearly" && <p className="mt-1 text-sm text-emerald-700">Save ${(plan.monthlyCents * 12 - plan.yearlyCents) / 100} per year</p>}
        <ul className="mt-4 space-y-2 text-sm"><li>{plan.userLimit} users</li><li>{plan.monthlyEstimateLimit === Number.MAX_SAFE_INTEGER ? "Unlimited" : plan.monthlyEstimateLimit} estimates/month</li>{plan.features.slice(0, 7).map(feature => <li key={feature}>✓ {feature.replaceAll(/([A-Z])/g, " $1")}</li>)}</ul>
        <form action={startCheckoutAction.bind(null, id, interval)}><button disabled={!billingEnabled || current === id} className="control-disabled mt-6 min-h-11 w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{!billingEnabled ? "Billing unavailable" : current === id ? "Current plan" : `Choose ${plan.name}`}</button></form>
      </article>})}
    </div>
  </>;
}
