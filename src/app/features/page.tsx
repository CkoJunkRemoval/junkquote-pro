import Link from "next/link";
import { marketingMetadata } from "@/lib/marketing/metadata";

export const metadata = marketingMetadata(
  "/features",
  "Junk Removal Software Features | JunkQuote Pro",
  "Explore JunkQuote Pro features for estimating, job management, customer organization, scheduling, dispatch, invoicing, and day-to-day junk removal operations.",
);

const groups = [
  {
    title: "Quote the Job",
    features: [
      ["Professional estimates", "Create consistent estimates without rebuilding the same quote from scratch."],
      ["Customer approvals", "Send estimates for approval while the details are still fresh."],
    ],
  },
  {
    title: "Run the Job",
    features: [
      ["Job management", "Keep job details, notes, status, and customer information together."],
      ["Dispatch and scheduling", "See what is booked, who is available, and what is happening today."],
      ["Photos and notes", "Keep job photos and details attached to the work they belong to."],
    ],
  },
  {
    title: "Keep the Office Organized",
    features: [
      ["Customer management", "Keep customer and job history organized instead of digging through texts and notes."],
      ["Reporting", "See the operational picture in one place as your company grows."],
    ],
  },
  {
    title: "Get Paid",
    features: [
      ["Invoicing", "Move completed work toward invoicing without re-entering the same information."],
      ["Payments", "Collect payment on-site and keep payment status connected to the job."],
    ],
  },
] as const;

export default function Features() {
  return <main className="min-h-screen overflow-x-hidden bg-[#050806] text-white">
    <header className="border-b border-[#a4ef29]/20 bg-black/80"><nav aria-label="Public navigation" className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-x-4 px-5 py-2 sm:px-8"><Link href="/" className="inline-flex min-h-11 items-center text-lg font-black tracking-tight">JunkQuote <span className="ml-1 text-[#a4ef29]">Pro</span></Link><div className="flex flex-wrap items-center justify-end gap-1"><Link href="/features" aria-current="page" className="inline-flex min-h-11 items-center px-3 font-semibold text-slate-200">Features</Link><Link href="/compare" className="inline-flex min-h-11 items-center px-3 font-semibold text-slate-200">Pricing</Link><Link href="/about" className="inline-flex min-h-11 items-center px-3 font-semibold text-slate-200">About</Link><Link href="/sign-in" className="inline-flex min-h-11 items-center px-3 font-semibold text-slate-200">Sign in</Link></div></nav></header>
    <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24"><p className="font-bold uppercase tracking-[.2em] text-[#a4ef29]">Built for junk removal pros</p><h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">Built for the Way Junk Removal Companies Actually Work</h1><p className="mt-5 max-w-3xl text-xl text-slate-300">JunkQuote Pro keeps estimating, jobs, customers, scheduling, and day-to-day work organized in one place.</p></section>
    <div className="border-y border-white/10 bg-[#090d0a] px-5 py-16 sm:px-8"><div className="mx-auto max-w-5xl space-y-12">{groups.map(group => <section key={group.title} aria-labelledby={`feature-${group.title.toLowerCase().replaceAll(" ", "-")}`}><h2 id={`feature-${group.title.toLowerCase().replaceAll(" ", "-")}`} className="text-3xl font-black">{group.title}</h2><div className="mt-5 grid gap-5 md:grid-cols-2">{group.features.map(([name, copy]) => <article key={name} className="rounded-2xl border border-white/10 bg-[#0d130e] p-6"><h3 className="text-xl font-bold">{name}</h3><p className="mt-3 leading-relaxed text-slate-300">{copy}</p></article>)}</div></section>)}</div></div>
    <section className="px-5 py-16 text-center sm:px-8"><h2 className="text-3xl font-black">Ready to Put It to Work?</h2><Link href="/sign-up" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#a4ef29] px-6 py-3 text-center font-black text-black">Start Your 30-Day Professional Trial</Link><p className="mt-4 text-sm text-slate-400">30-day Professional trial. No credit card required.</p></section>
  </main>;
}
