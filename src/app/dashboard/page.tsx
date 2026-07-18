import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { getPricingAnalytics, getSmartPricingAccuracy, getSmartPricingFilterOptions } from "@/lib/smartPricing/analytics";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { companyId, role } = await requireCompanyRole(
    "Owner",
    "Admin",
    "Manager",
    "Office",
  );
  const query = await searchParams; const value = (key: string) => typeof query[key] === "string" ? query[key] as string : ""; const today = new Date(); const defaultFrom = new Date(today); defaultFrom.setDate(today.getDate() - 90); const date = (raw: string, fallback?: Date) => raw && !Number.isNaN(new Date(`${raw}T00:00:00`).getTime()) ? new Date(`${raw}T00:00:00`) : fallback;
  const filters = { from: date(value("from"), defaultFrom), to: date(value("to"), today), estimatorId: value("estimator") || undefined, category: value("category") || undefined, propertyType: value("propertyType") || undefined, crewId: value("crew") || undefined };
  const [analytics, accuracy, options] = await Promise.all([getPricingAnalytics(companyId), getSmartPricingAccuracy(companyId, filters), getSmartPricingFilterOptions(companyId)]);
  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl p-6 sm:p-10">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-slate-600">Your JunkQuote Pro workspace.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Link
            href="/estimates"
            className="rounded-2xl bg-blue-600 p-6 text-white"
          >
            <h2 className="text-xl font-bold">New Estimate</h2>
            <p className="mt-2 text-blue-100">Create or resume an estimate.</p>
          </Link>
          <Metric
            title="Estimate accuracy"
            value={`${analytics.averageEstimateAccuracy.toFixed(1)}%`}
          />
          <Metric
            title="Suggestion acceptance"
            value={`${analytics.acceptanceRate.toFixed(1)}%`}
          />
          <Metric
            title="Average discount"
            value={`$${analytics.averageDiscount.toFixed(2)}`}
          />
          <Metric
            title="Revenue vs quoted"
            value={`$${analytics.revenueVsQuoted.collected.toFixed(0)} / $${analytics.revenueVsQuoted.quoted.toFixed(0)}`}
          />
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="font-bold">Most profitable items</h2>
            <p className="mt-2 text-sm text-slate-600">
              {analytics.mostProfitableItems
                .map((row) => `${row.item} ($${row.averageProfit.toFixed(0)})`)
                .join(", ") || "Complete jobs to populate analytics."}
            </p>
          </div>
        </div>
        <section className="mt-8 rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Smart Pricing accuracy</h2><form className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6"><Filter label="From" name="from" type="date" defaultValue={formatDate(filters.from)} /><Filter label="To" name="to" type="date" defaultValue={formatDate(filters.to)} /><Select label="Estimator" name="estimator" value={value("estimator")} options={options.estimators.map((row) => ({ value: row.id, label: [row.firstName,row.lastName].filter(Boolean).join(" ") || row.email }))}/><Select label="Category" name="category" value={value("category")} options={options.categories.map((entry) => ({ value: entry, label: entry }))}/><Select label="Property type" name="propertyType" value={value("propertyType")} options={options.propertyTypes.map((entry) => ({ value: entry, label: entry }))}/><Select label="Crew" name="crew" value={value("crew")} options={options.crews.map((row) => ({ value: row.id, label: row.name }))}/><div className="flex items-end gap-2"><button className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white" type="submit">Apply</button><Link className="rounded border px-4 py-2 text-sm" href="/dashboard">Clear</Link></div></form>{accuracy.sampleSize === 0 ? <p className="mt-6 rounded-xl border border-dashed p-6 text-center text-slate-500">No completed pricing outcomes match these filters.</p> : <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric title="Absolute estimate error" value={`$${accuracy.averageAbsoluteEstimateError.toFixed(2)}`} /><Metric title="Quoted to collected" value={`$${accuracy.averageQuotedToCollectedVariance.toFixed(2)}`} /><Metric title="Underbid / overbid" value={`${accuracy.underbidRate.toFixed(1)}% / ${accuracy.overbidRate.toFixed(1)}%`} />{role !== "Office" && <Metric title="Average gross margin" value={`${accuracy.averageGrossMargin.toFixed(1)}%`} />}<Metric title="Low-margin jobs" value={String(role === "Office" ? "Hidden" : accuracy.lowMarginJobCount)} /><Metric title="High-refund jobs" value={String(accuracy.highRefundJobCount)} /><Metric title="Incomplete outcomes" value={String(accuracy.incompleteOutcomeCount)} /><Metric title="Acceptance performance" value={`${accuracy.recommendationAcceptancePerformance.toFixed(1)}%`} /></div>}</section>
      </div>
    </AppLayout>
  );
}
function formatDate(value?: Date) { return value ? value.toISOString().slice(0,10) : ""; }
function Filter({ label, name, type, defaultValue }: { label: string; name: string; type: string; defaultValue: string }) { return <label className="grid gap-1 text-sm font-medium">{label}<input className="rounded border p-2" name={name} type={type} defaultValue={defaultValue}/></label>; }
function Select({ label, name, value, options }: { label: string; name: string; value: string; options: Array<{value:string;label:string}> }) { return <label className="grid gap-1 text-sm font-medium">{label}<select className="rounded border p-2" name={name} defaultValue={value}><option value="">All</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <h2 className="font-bold">{title}</h2>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
