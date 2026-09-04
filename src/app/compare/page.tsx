import Link from "next/link";
import PricingComparisonOverview from "@/components/marketing/PricingComparisonOverview";
import PricingCrewCallout from "@/components/marketing/PricingCrewCallout";
import { plans } from "@/lib/billing/config";
import { billingFeatureLabel } from "@/lib/billing/presentation";
import { marketingMetadata } from "@/lib/marketing/metadata";

export const metadata = marketingMetadata(
  "/compare",
  "JunkQuote Pro Pricing & Software Comparison",
  "Compare JunkQuote Pro pricing and junk removal software options, including Housecall Pro, Jobber, and JunkIQ.",
);

export default function ComparePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050806] text-white">
      <header className="border-b border-[#a4ef29]/20 bg-black/80">
        <nav aria-label="Public navigation" className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-x-4 px-5 py-2 sm:px-8">
          <Link href="/" className="inline-flex min-h-11 items-center text-lg font-black tracking-tight">JunkQuote <span className="ml-1 text-[#a4ef29]">Pro</span></Link>
          <div className="flex flex-wrap items-center justify-end gap-1"><Link href="/features" className="inline-flex min-h-11 items-center px-3 font-semibold text-slate-200">Features</Link><Link href="/compare" aria-current="page" className="inline-flex min-h-11 items-center px-3 font-semibold text-slate-200">Pricing</Link><Link href="/about" className="inline-flex min-h-11 items-center px-3 font-semibold text-slate-200">About</Link><Link href="/sign-in" className="inline-flex min-h-11 items-center px-3 font-semibold text-slate-200">Sign in</Link></div>
        </nav>
      </header>

      <section className="border-b border-white/10 px-5 py-16 text-center sm:px-8 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="font-bold uppercase tracking-[.2em] text-[#a4ef29]">Pricing and comparisons</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Pricing &amp; Software Comparison</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-300">Simple company pricing. See how JunkQuote Pro compares. Explore junk-removal-specific software with a 30-day Professional trial and no credit card required.</p>
          <p className="mt-4 font-bold text-[#a4ef29]">One company price. No per-seat fees; each plan includes the user limit shown below.</p>
          <PricingCrewCallout monthlyCents={plans.Professional.monthlyCents} />
        </div>
      </section>

      <section aria-labelledby="plans-heading" className="px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[.2em] text-[#a4ef29]">JunkQuote Pro plans</p>
          <h2 id="plans-heading" className="mt-3 text-3xl font-black sm:text-5xl">Choose the plan that fits your operation.</h2>
          <p className="mt-4 max-w-3xl text-lg text-slate-300">If you do not subscribe after the trial, your company automatically moves to Free.</p>
          <div className="mt-10 grid gap-5 lg:grid-cols-4">
            {Object.values(plans).map((plan) => {
              const annualSaving = (plan.monthlyCents * 12 - plan.yearlyCents) / 100;
              return (
                <article key={plan.name} className={`relative rounded-2xl border p-6 ${plan.name === "Professional" ? "border-[#a4ef29] bg-[#10180d]" : "border-white/15 bg-[#0d130e]"}`}>
                  {plan.name === "Professional" && <span className="absolute right-4 top-4 max-w-32 rounded-full bg-[#a4ef29] px-3 py-1 text-center text-xs font-black leading-tight text-black">Recommended for Growing Teams</span>}
                  <h3 className={`text-2xl font-black ${plan.name === "Professional" ? "pr-32" : ""}`}>{plan.name}</h3>
                  <p className="mt-2 min-h-12 text-sm text-slate-300">{plan.description}</p>
                  <p className="mt-5 text-3xl font-black">${plan.monthlyCents / 100}<span className="text-sm font-normal text-slate-400">/month</span></p>
                  {plan.name === "Free" ? <p className="mt-2 min-h-10 text-sm text-slate-300">Free stays available.</p> : <p className="mt-2 min-h-10 text-sm text-slate-300">${plan.yearlyCents / 100}/year · Save ${annualSaving}/year</p>}
                  <ul className="mt-5 space-y-2 text-sm"><li>{plan.monthlyEstimateLimit === Number.MAX_SAFE_INTEGER ? "Unlimited estimates" : `${plan.monthlyEstimateLimit} estimates per month`}</li><li>{plan.userLimit} user{plan.userLimit === 1 ? "" : "s"}</li>{plan.features.slice(0, 6).map((feature) => <li key={feature}>✓ {billingFeatureLabel(feature)}</li>)}</ul>
                  <Link href="/sign-up" className={`mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-center font-bold ${plan.name === "Professional" ? "bg-[#a4ef29] text-black" : "border border-white/20"}`}>Start Your 30-Day Professional Trial</Link>
                </article>
              );
            })}
          </div>
          <p className="mt-10 text-center text-slate-300">Monthly or yearly billing is available for Starter, Professional, and Enterprise. You can upgrade at any time.</p>
        </div>
      </section>

      <PricingComparisonOverview />

      <footer className="px-5 py-12 text-center sm:px-8"><h2 className="text-3xl font-black">Ready to see how it fits your company?</h2><Link href="/sign-up" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#a4ef29] px-6 py-3 font-black text-black">Start Your 30-Day Professional Trial</Link><p className="mt-4 text-sm text-slate-400">No credit card required. Full Professional access for 30 days.</p></footer>
    </main>
  );
}
