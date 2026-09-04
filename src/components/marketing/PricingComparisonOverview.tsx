import Link from "next/link";
import { billingConfig, plans } from "@/lib/billing/config";
import { comparisonPages, type ComparisonPageData } from "@/lib/marketing/comparison";

type OverviewCompany = {
  name: string;
  href?: string;
  values: Record<string, string>;
};

const categories = ["Industry focus", "Pricing", "Users", "Estimating", "Scheduling / dispatch", "Trial"] as const;

function competitorValue(data: ComparisonPageData, label: string) {
  return data.rows.find((row) => row.label === label)?.competitor;
}

const competitors: OverviewCompany[] = [
  {
    name: "Housecall Pro",
    href: "/vs-housecall-pro",
    values: {
      "Industry focus": competitorValue(comparisonPages["housecall-pro"], "Industry focus")!,
      Pricing: comparisonPages["housecall-pro"].overview.pricing,
      Users: comparisonPages["housecall-pro"].overview.users,
      Estimating: competitorValue(comparisonPages["housecall-pro"], "Estimating")!,
      "Scheduling / dispatch": competitorValue(comparisonPages["housecall-pro"], "Scheduling and dispatch")!,
      Trial: comparisonPages["housecall-pro"].overview.trial,
    },
  },
  {
    name: "Jobber",
    href: "/vs-jobber",
    values: {
      "Industry focus": competitorValue(comparisonPages.jobber, "Industry focus")!,
      Pricing: comparisonPages.jobber.overview.pricing,
      Users: comparisonPages.jobber.overview.users,
      Estimating: competitorValue(comparisonPages.jobber, "Estimating")!,
      "Scheduling / dispatch": competitorValue(comparisonPages.jobber, "Scheduling")!,
      Trial: comparisonPages.jobber.overview.trial,
    },
  },
  {
    name: "JunkIQ",
    href: "/vs-junkiq",
    values: {
      "Industry focus": competitorValue(comparisonPages.junkiq, "Industry focus")!,
      Pricing: comparisonPages.junkiq.overview.pricing,
      Users: comparisonPages.junkiq.overview.users,
      Estimating: competitorValue(comparisonPages.junkiq, "Estimating")!,
      "Scheduling / dispatch": competitorValue(comparisonPages.junkiq, "Scheduling and dispatch")!,
      Trial: comparisonPages.junkiq.overview.trial,
    },
  },
];

export function pricingOverviewCompanies(): OverviewCompany[] {
  return [
    {
      name: "JunkQuote Pro",
      values: {
        "Industry focus": "Purpose-built for junk removal businesses",
        Pricing: `$${plans.Professional.monthlyCents / 100}/month for Professional`,
        Users: `Up to ${plans.Professional.userLimit} users; no per-seat fees`,
        Estimating: "Area- and item-based estimating with saved pricing",
        "Scheduling / dispatch": "Included on Professional",
        Trial: `${billingConfig.trialDays}-day Professional trial; no card required`,
      },
    },
    ...competitors,
  ];
}

export default function PricingComparisonOverview() {
  const companies = pricingOverviewCompanies();

  return (
    <section aria-labelledby="comparison-overview-heading" className="border-t border-white/10 bg-[#090d0a] px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-bold uppercase tracking-[.2em] text-[#a4ef29]">Compare your options</p>
        <h2 id="comparison-overview-heading" className="mt-3 text-3xl font-black sm:text-5xl">How JunkQuote Pro compares</h2>
        <p className="mt-4 max-w-3xl text-lg text-slate-300">Start with the high-level differences, then open a detailed comparison for the products you are considering.</p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:hidden" aria-label="Mobile software comparison">
          {companies.map((company) => <article key={company.name} className={`rounded-2xl border p-5 ${company.name === "JunkQuote Pro" ? "border-[#a4ef29]/60 bg-[#10180d]" : "border-white/10 bg-[#0d130e]"}`}><h3 className="text-xl font-black">{company.name}</h3><dl className="mt-5 space-y-4">{categories.map((category) => <div key={category}><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{category}</dt><dd className="mt-1 text-sm text-slate-100">{company.values[category]}</dd></div>)}</dl>{company.href ? <Link href={company.href} className="mt-5 inline-flex min-h-11 items-center font-bold text-[#a4ef29] underline decoration-2 underline-offset-4">Full comparison →</Link> : <Link href="/sign-up" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#a4ef29] px-4 font-black text-black">Start Your 30-Day Professional Trial</Link>}</article>)}
        </div>

        <div className="mt-10 hidden overflow-hidden rounded-2xl border border-white/10 lg:block">
          <table className="w-full table-fixed border-collapse text-left">
            <caption className="sr-only">High-level comparison of JunkQuote Pro, Housecall Pro, Jobber, and JunkIQ</caption>
            <thead className="bg-[#10180d]"><tr><th scope="col" className="w-1/6 p-4">Category</th>{companies.map((company) => <th scope="col" key={company.name} className="p-4 text-lg font-black">{company.name}</th>)}</tr></thead>
            <tbody>{categories.map((category) => <tr key={category} className="border-t border-white/10 align-top"><th scope="row" className="p-4 text-sm font-bold text-[#a4ef29]">{category}</th>{companies.map((company) => <td key={company.name} className="p-4 text-sm leading-relaxed text-slate-200">{company.values[category]}</td>)}</tr>)}</tbody>
            <tfoot className="border-t border-white/10 bg-black/20"><tr><th scope="row" className="p-4 text-sm font-bold">Next step</th>{companies.map((company) => <td key={company.name} className="p-4">{company.href ? <Link href={company.href} className="inline-flex min-h-11 items-center text-sm font-bold text-[#a4ef29] underline decoration-2 underline-offset-4">Full comparison →</Link> : <Link href="/sign-up" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#a4ef29] px-4 text-center text-sm font-black text-black">Start Your 30-Day Professional Trial</Link>}</td>)}</tr></tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}
