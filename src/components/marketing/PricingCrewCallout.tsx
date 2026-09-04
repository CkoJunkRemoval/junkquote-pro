import Link from "next/link";

export default function PricingCrewCallout({ monthlyCents, comparisonHref }: { monthlyCents: number; comparisonHref?: string }) {
  const monthlyPrice = `$${monthlyCents / 100}/month total`;

  return (
    <aside aria-label="Professional per-company pricing comparison" className="mx-auto mt-5 max-w-xl rounded-2xl border border-[#a4ef29]/40 bg-[#10180d] p-4 text-left shadow-lg shadow-black/20 sm:p-5">
      <dl className="grid gap-3 sm:grid-cols-2">
        {(["3-person crew", "10-person crew"] as const).map((crew) => (
          <div key={crew} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <dt className="text-sm font-bold text-slate-300">{crew}</dt>
            <dd className="mt-1 text-xl font-black text-white">{monthlyPrice}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-center text-sm font-black text-[#a4ef29]">No per-seat fees.</p>
      {comparisonHref && <p className="mt-2 text-center"><Link href={comparisonHref} className="inline-flex min-h-11 items-center text-sm font-bold text-slate-200 underline decoration-2 underline-offset-4">Compare JunkQuote Pro and Housecall Pro</Link></p>}
    </aside>
  );
}
