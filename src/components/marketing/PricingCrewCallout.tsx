export default function PricingCrewCallout({ monthlyCents }: { monthlyCents: number }) {
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
    </aside>
  );
}
