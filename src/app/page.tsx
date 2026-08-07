import Link from "next/link";
import { plans } from "@/lib/billing/config";
import { billingFeatureLabel } from "@/lib/billing/presentation";

const outcomes = [
  ["Create professional estimates quickly", "Build consistent estimates and send them for customer approval."],
  ["Schedule and run the work", "Keep customers, jobs, scheduling, dispatch, teams, and fleet information together."],
  ["Turn completed work into revenue", "Move from invoicing to payments and business reporting without losing the thread."],
] as const;

export default function Home() {
  const professional = plans.Professional;
  return <main className="min-h-screen overflow-x-hidden bg-[#050806] text-white">
    <header className="border-b border-[#a4ef29]/20 bg-black/80">
      <nav aria-label="Public navigation" className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="inline-flex min-h-11 items-center text-lg font-black tracking-tight">JunkQuote <span className="ml-1 text-[#a4ef29]">Pro</span></Link>
        <div className="flex items-center gap-2"><Link href="/pricing" className="inline-flex min-h-11 items-center px-3 font-semibold text-slate-200">Pricing</Link><Link href="/sign-in" className="inline-flex min-h-11 items-center px-3 font-semibold text-slate-200">Sign in</Link></div>
      </nav>
    </header>
    <section className="relative border-b border-white/10 px-5 py-16 sm:px-8 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(164,239,41,.14),transparent_34%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.2fr_.8fr]">
        <div><p className="font-bold uppercase tracking-[.22em] text-[#a4ef29]">JunkQuote Pro</p><h1 className="mt-4 max-w-4xl text-5xl font-black leading-[.95] tracking-[-.05em] sm:text-7xl">Business. <span className="text-[#a4ef29]">Easier.</span></h1><p className="mt-6 max-w-2xl text-xl font-semibold text-slate-200 sm:text-2xl">Run Your Junk Removal Business — Not Your Paperwork.</p><div className="mt-8 flex flex-wrap gap-3 text-sm font-bold"><span className="rounded-full border border-[#a4ef29]/50 bg-[#a4ef29]/10 px-4 py-2">30-Day Professional Trial</span><span className="rounded-full border border-white/20 px-4 py-2">No Credit Card Required</span><span className="rounded-full border border-white/20 px-4 py-2">Full Professional Access</span></div><Link href="/sign-up" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#a4ef29] px-6 py-3 text-center text-base font-black text-black shadow-[0_0_30px_rgba(164,239,41,.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a4ef29]">Start Your 30-Day Professional Trial</Link></div>
        <aside className="rounded-3xl border border-[#a4ef29]/30 bg-[#0d130e] p-6 shadow-2xl sm:p-8"><p className="text-sm font-bold uppercase tracking-wider text-[#a4ef29]">What happens after 30 days?</p><h2 className="mt-3 text-2xl font-black">Keep growing on your terms.</h2><p className="mt-3 text-slate-300">If you do not subscribe, your company automatically moves to the Free plan. There is no automatically renewing paid trial.</p><div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5"><strong>Free stays available</strong><p className="mt-1 text-slate-300">6 estimates per month with limited core features.</p></div><p className="mt-5 text-sm text-slate-300">Upgrade to Starter, Professional, or Enterprise at any time.</p></aside>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><p className="text-sm font-bold uppercase tracking-[.2em] text-[#a4ef29]">One organized platform</p><h2 className="mt-3 max-w-3xl text-3xl font-black sm:text-5xl">Less paperwork. Less chaos. More control.</h2><p className="mt-4 max-w-2xl text-lg text-slate-300">More time to serve customers, lead your team, and grow the business.</p><div className="mt-10 grid gap-5 md:grid-cols-3">{outcomes.map(([title,copy])=><article key={title} className="rounded-2xl border border-white/10 bg-[#0d130e] p-6"><h3 className="text-xl font-bold">{title}</h3><p className="mt-3 text-slate-300">{copy}</p></article>)}</div></section>
    <section className="border-y border-white/10 bg-[#090d0a] px-5 py-16 sm:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-[#a4ef29]">Professional access</p><h2 className="mt-2 text-3xl font-black">Try the tools built for a growing operation.</h2></div><Link href="/pricing" className="inline-flex min-h-11 items-center font-bold text-[#a4ef29] underline decoration-2 underline-offset-4">Compare all plans</Link></div><ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{professional.features.slice(0,8).map(feature=><li key={feature} className="rounded-xl border border-white/10 p-4 text-slate-200">✓ {billingFeatureLabel(feature)}</li>)}</ul></div></section>
    <footer className="px-5 py-12 text-center"><h2 className="text-3xl font-black">Ready to make business easier?</h2><Link href="/sign-up" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#a4ef29] px-6 font-black text-black">Start Your 30-Day Professional Trial</Link><p className="mt-4 text-sm text-slate-400">No credit card required. Full Professional access for 30 days.</p></footer>
  </main>;
}
