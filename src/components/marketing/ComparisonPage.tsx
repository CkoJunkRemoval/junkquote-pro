import Link from "next/link";
import { plans } from "@/lib/billing/config";
import { comparisonFaqs, type ComparisonPageData } from "@/lib/marketing/comparison";
import { siteUrl } from "@/lib/marketing/metadata";
import PricingCrewCallout from "./PricingCrewCallout";

export default function ComparisonPage({ data }: { data: ComparisonPageData }) {
  const faqs = comparisonFaqs(data);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${new URL(`/vs-${data.slug}`, siteUrl)}#faq`,
    mainEntity: faqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050806] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} />
      <header className="border-b border-[#a4ef29]/20 bg-black/80">
        <nav aria-label="Public navigation" className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-x-4 px-5 py-2 sm:px-8">
          <Link href="/" className="inline-flex min-h-11 items-center text-lg font-black tracking-tight">JunkQuote <span className="ml-1 text-[#a4ef29]">Pro</span></Link>
          <div className="flex flex-wrap items-center justify-end gap-1"><Link href="/features" className="inline-flex min-h-11 items-center px-3 font-semibold text-slate-200">Features</Link><Link href="/compare" className="inline-flex min-h-11 items-center px-3 font-semibold text-slate-200">Pricing</Link><Link href="/about" className="inline-flex min-h-11 items-center px-3 font-semibold text-slate-200">About</Link><Link href="/sign-in" className="inline-flex min-h-11 items-center px-3 font-semibold text-slate-200">Sign in</Link></div>
        </nav>
      </header>

      <section className="border-b border-white/10 px-5 py-16 text-center sm:px-8 sm:py-24">
        <div className="mx-auto max-w-4xl"><p className="font-bold uppercase tracking-[.2em] text-[#a4ef29]">Software comparison</p><h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">JunkQuote Pro vs {data.competitor}</h1><p className="mx-auto mt-6 max-w-3xl text-lg text-slate-300 sm:text-xl">{data.subheading}</p></div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8"><h2 className="text-3xl font-black">Quick summary</h2><p className="mt-4 text-lg leading-relaxed text-slate-300">{data.summary}</p></section>

      <section className="border-y border-white/10 bg-[#090d0a] px-5 py-14 sm:px-8"><div className="mx-auto max-w-6xl"><h2 className="text-3xl font-black">Feature comparison</h2><p className="mt-3 text-slate-300">A neutral view based on JunkQuote Pro&apos;s current application and the competitor&apos;s official pages linked below.</p>
        <div className="mt-8 space-y-4 sm:hidden">{data.rows.map((row) => <article key={row.label} className="rounded-2xl border border-white/10 bg-[#0d130e] p-5"><h3 className="font-black text-[#a4ef29]">{row.label}</h3><dl className="mt-4 space-y-3"><div><dt className="text-sm font-bold text-slate-400">JunkQuote Pro</dt><dd className="mt-1 text-slate-100">{row.junkQuotePro}</dd></div><div><dt className="text-sm font-bold text-slate-400">{data.competitor}</dt><dd className="mt-1 text-slate-100">{row.competitor}</dd></div></dl></article>)}</div>
        <div className="mt-8 hidden overflow-hidden rounded-2xl border border-white/10 sm:block"><table className="w-full table-fixed border-collapse text-left"><caption className="sr-only">JunkQuote Pro and {data.competitor} feature comparison</caption><thead className="bg-[#10180d]"><tr><th scope="col" className="w-1/4 p-4">Workflow</th><th scope="col" className="p-4">JunkQuote Pro</th><th scope="col" className="p-4">{data.competitor}</th></tr></thead><tbody>{data.rows.map((row) => <tr key={row.label} className="border-t border-white/10 align-top"><th scope="row" className="p-4 font-bold text-[#a4ef29]">{row.label}</th><td className="p-4 text-slate-200">{row.junkQuotePro}</td><td className="p-4 text-slate-200">{row.competitor}</td></tr>)}</tbody></table></div>
      </div></section>

      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8"><div className="text-center"><h2 className="text-3xl font-black">Compare the company price</h2><p className="mt-3 text-slate-300">Professional keeps the same total plan price as your included team grows.</p></div><PricingCrewCallout monthlyCents={plans.Professional.monthlyCents} /><p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-relaxed text-slate-300">{data.competitorPricing} <a href={data.competitorPricingUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-[#a4ef29] underline underline-offset-4">Review official pricing</a>.</p></section>

      <section className="border-y border-white/10 bg-[#090d0a] px-5 py-14 sm:px-8"><div className="mx-auto max-w-5xl"><h2 className="text-3xl font-black">Who JunkQuote Pro is for</h2><p className="mt-4 text-lg leading-relaxed text-slate-300">JunkQuote Pro is for junk removal businesses that want one workflow for quoting jobs by areas and items, getting customer approval, turning approved estimates into scheduled jobs, dispatching crews, invoicing, and managing day-to-day operations.</p></div></section>

      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8"><h2 className="text-3xl font-black">Questions, answered</h2><div className="mt-8 grid gap-4 md:grid-cols-2">{faqs.map(([question, answer]) => <article key={question} className="rounded-2xl border border-white/10 bg-[#0d130e] p-6"><h3 className="font-bold">{question}</h3><p className="mt-3 text-slate-300">{answer}</p></article>)}</div></section>

      <section className="border-t border-white/10 bg-[#090d0a] px-5 py-14 text-center sm:px-8"><h2 className="text-3xl font-black">See how JunkQuote Pro fits your operation.</h2><Link href="/sign-up" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#a4ef29] px-6 py-3 font-black text-black">Start Your 30-Day Professional Trial</Link><p className="mt-4 text-sm text-slate-400">No credit card required. Full Professional access for 30 days.</p></section>

      <footer className="px-5 py-10 sm:px-8"><div className="mx-auto max-w-5xl"><Link href="/compare" className="mb-6 inline-flex min-h-11 items-center font-bold text-[#a4ef29] underline underline-offset-4">View pricing and all comparisons</Link><h2 className="text-sm font-black uppercase tracking-[.16em] text-slate-400">Official competitor sources reviewed</h2><ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">{data.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#a4ef29] underline underline-offset-4">{source.label}</a></li>)}</ul><p className="mt-6 text-xs text-slate-500">Competitor products, prices, and terms can change. Review their official pages before making a purchasing decision.</p></div></footer>
    </main>
  );
}
