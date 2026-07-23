import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { getPricingAnalytics, getSmartPricingAccuracy, getSmartPricingFilterOptions } from "@/lib/smartPricing/analytics";
import { getJobScheduleSummary } from "@/lib/jobs/getJobScheduleSummary";
import { getInvoiceDashboardSummary } from "@/lib/invoices/getInvoiceDashboardSummary";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { onboardingSections } from "@/lib/onboarding/service";
import { getEstimateLifecycleDashboardCounts } from "@/lib/estimates/dashboardCounts";
import {getEstimateActivityDashboard} from "@/lib/estimates/estimateEvents";
import { canCreateEstimateForRole } from "@/lib/estimates/permissions";
import DashboardKpiCards from "@/features/dashboard/DashboardKpiCards";
import { dashboardPerformanceContent } from "@/features/dashboard/dashboardPresentation";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { companyId, role } = await requireCompanyRole(
    "Owner",
    "Admin",
    "Manager",
    "Office",
  );
  const onboarding = await prisma.companyOnboarding.upsert({ where: { companyId }, create: { companyId }, update: {} });
  if (!onboarding.completedAt && !onboarding.skippedAt) redirect("/onboarding");
  const query = await searchParams; const value = (key: string) => typeof query[key] === "string" ? query[key] as string : ""; const today = new Date(); const defaultFrom = new Date(today); defaultFrom.setDate(today.getDate() - 90); const date = (raw: string, fallback?: Date) => raw && !Number.isNaN(new Date(`${raw}T00:00:00`).getTime()) ? new Date(`${raw}T00:00:00`) : fallback;
  const filters = { from: date(value("from"), defaultFrom), to: date(value("to"), today), estimatorId: value("estimator") || undefined, category: value("category") || undefined, propertyType: value("propertyType") || undefined, crewId: value("crew") || undefined };
  const [analytics, accuracy, options, schedule, invoices, lifecycle,activity] = await Promise.all([getPricingAnalytics(companyId), getSmartPricingAccuracy(companyId, filters), getSmartPricingFilterOptions(companyId), getJobScheduleSummary(companyId), getInvoiceDashboardSummary(companyId),getEstimateLifecycleDashboardCounts(companyId),getEstimateActivityDashboard(companyId)]);
  const performance=dashboardPerformanceContent(analytics);
  return (
    <AppLayout dashboard={{ canCreateEstimate: canCreateEstimateForRole(role) }}>
      <div className="mx-auto max-w-6xl p-6 sm:p-10">
        <p className="text-slate-600">Your JunkQuote Pro workspace.</p>
        {!onboarding.dismissedAt && <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">{onboarding.completedAt?"Setup complete":"Finish setting up your workspace"}</h2><p className="text-sm text-slate-600">{onboarding.completedSections.length} of {onboardingSections.length} setup sections complete. {onboarding.completedAt?"You’re ready to create estimates.":"Resume anytime without losing progress."}</p></div><div className="flex gap-2"><Link href={onboarding.completedAt?"/estimates":"/onboarding"} className="rounded bg-blue-700 px-4 py-2 text-white">{onboarding.completedAt?"Create Estimate":"Resume setup"}</Link>{onboarding.completedAt&&<form action={async()=>{"use server";const c=await requireCompanyRole("Owner","Admin");await prisma.companyOnboarding.update({where:{companyId:c.companyId},data:{dismissedAt:new Date()}});redirect("/dashboard")}}><button className="rounded border bg-white px-4 py-2">Dismiss</button></form>}</div></div></section>}
        <DashboardKpiCards counts={lifecycle} />
        <section className="mt-7"><h2 className="mb-3 text-lg font-bold text-slate-900">Recent Activity</h2><div className="grid gap-5 lg:grid-cols-3"><Metric title="Pending approvals" value={String(activity.pendingApprovals)}/><Metric title="Today's changes" value={String(activity.todaysChanges)}/><div className="rounded-2xl border bg-white p-6"><h3 className="font-bold">Recent company activity</h3><div className="mt-3 space-y-2">{activity.recentCompanyActivity.slice(0,5).map(event=><Link className="block text-sm" href={`/estimates/${event.estimateId}`} key={event.id}><strong>{event.title}</strong><span className="block text-slate-500">{event.summary}</span></Link>)}{!activity.recentCompanyActivity.length&&<p className="text-sm text-slate-500">No recent activity.</p>}</div></div></div></section>
        <section className="mt-7"><h2 className="mb-3 text-lg font-bold text-slate-900">Performance</h2><div className="grid gap-5 md:grid-cols-3">
          <Metric
            title="Estimate accuracy"
            value={performance.estimateAccuracy}
            empty={analytics.sampleSize===0}
          />
          <Metric
            title="Suggestion acceptance"
            value={performance.suggestionAcceptance}
            empty={analytics.decisionCount===0}
          />
          <Metric
            title="Average discount"
            value={performance.averageDiscount}
            empty={analytics.sampleSize===0}
          />
          <Metric
            title="Revenue vs quoted"
            value={performance.revenueVsQuoted}
            empty={analytics.sampleSize===0}
          />
          <div className="rounded-2xl border bg-white p-6">
            <h3 className="font-bold">Most profitable items</h3>
            <p className="mt-2 text-sm text-slate-600">
              {performance.mostProfitableItems}
            </p>
          </div>
        </div></section>
        <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Job schedule</h2><Link href="/schedule" className="text-sm font-semibold text-blue-700">Open calendar</Link></div><div className="mt-4 grid gap-4 lg:grid-cols-3"><JobWidget title="Today's Jobs" jobs={schedule.today} /><JobWidget title="Tomorrow's Jobs" jobs={schedule.tomorrow} /><JobWidget title="Overdue Jobs" jobs={schedule.overdue} urgent /></div></section>
        <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Invoices & revenue</h2><Link href="/invoices" className="text-sm font-semibold text-blue-700">Manage invoices</Link></div><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Metric title={`Outstanding (${invoices.outstandingCount})`} value={`$${invoices.outstanding.toFixed(2)}`} /><Metric title={`Overdue (${invoices.overdueCount})`} value={`$${invoices.overdue.toFixed(2)}`} /><Metric title="Revenue this month" value={`$${invoices.revenueMonth.toFixed(2)}`} /><Metric title="Revenue YTD" value={`$${invoices.revenueYtd.toFixed(2)}`} /><Metric title="Average invoice" value={`$${invoices.averageInvoice.toFixed(2)}`} /></div></section>
        <section className="mt-8 rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Smart Pricing accuracy</h2><form className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6"><Filter label="From" name="from" type="date" defaultValue={formatDate(filters.from)} /><Filter label="To" name="to" type="date" defaultValue={formatDate(filters.to)} /><Select label="Estimator" name="estimator" value={value("estimator")} options={options.estimators.map((row) => ({ value: row.id, label: [row.firstName,row.lastName].filter(Boolean).join(" ") || row.email }))}/><Select label="Category" name="category" value={value("category")} options={options.categories.map((entry) => ({ value: entry, label: entry }))}/><Select label="Property type" name="propertyType" value={value("propertyType")} options={options.propertyTypes.map((entry) => ({ value: entry, label: entry }))}/><Select label="Crew" name="crew" value={value("crew")} options={options.crews.map((row) => ({ value: row.id, label: row.name }))}/><div className="flex items-end gap-2"><button className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white" type="submit">Apply</button><Link className="rounded border px-4 py-2 text-sm" href="/dashboard">Clear</Link></div></form>{accuracy.sampleSize === 0 ? <p className="mt-6 rounded-xl border border-dashed p-6 text-center text-slate-500">No completed pricing outcomes match these filters.</p> : <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric title="Absolute estimate error" value={`$${accuracy.averageAbsoluteEstimateError.toFixed(2)}`} /><Metric title="Quoted to collected" value={`$${accuracy.averageQuotedToCollectedVariance.toFixed(2)}`} /><Metric title="Underbid / overbid" value={`${accuracy.underbidRate.toFixed(1)}% / ${accuracy.overbidRate.toFixed(1)}%`} />{role !== "Office" && <Metric title="Average gross margin" value={`${accuracy.averageGrossMargin.toFixed(1)}%`} />}<Metric title="Low-margin jobs" value={String(role === "Office" ? "Hidden" : accuracy.lowMarginJobCount)} /><Metric title="High-refund jobs" value={String(accuracy.highRefundJobCount)} /><Metric title="Incomplete outcomes" value={String(accuracy.incompleteOutcomeCount)} /><Metric title="Acceptance performance" value={`${accuracy.recommendationAcceptancePerformance.toFixed(1)}%`} /></div>}</section>
      </div>
    </AppLayout>
  );
}
type ScheduleJob = Awaited<ReturnType<typeof getJobScheduleSummary>>["today"][number];
function JobWidget({ title, jobs, urgent = false }: { title: string; jobs: ScheduleJob[]; urgent?: boolean }) { return <div className={`rounded-2xl border bg-white p-5 ${urgent && jobs.length ? "border-red-300" : ""}`}><div className="flex justify-between"><h3 className="font-bold">{title}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-sm font-semibold">{jobs.length}</span></div><div className="mt-3 space-y-2">{jobs.slice(0,5).map(job=><Link key={job.id} href={`/jobs/${job.id}`} className="block rounded-lg border p-3 text-sm"><strong>{job.jobNumber ?? "Job"} · {job.customer.firstName} {job.customer.lastName}</strong><span className="mt-1 block text-slate-600">{job.scheduledStart?.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})} · {job.property.address}</span></Link>)}{!jobs.length&&<p className="text-sm text-slate-500">No jobs.</p>}</div></div>; }
function formatDate(value?: Date) { return value ? value.toISOString().slice(0,10) : ""; }
function Filter({ label, name, type, defaultValue }: { label: string; name: string; type: string; defaultValue: string }) { return <label className="grid gap-1 text-sm font-medium">{label}<input className="rounded border p-2" name={name} type={type} defaultValue={defaultValue}/></label>; }
function Select({ label, name, value, options }: { label: string; name: string; value: string; options: Array<{value:string;label:string}> }) { return <label className="grid gap-1 text-sm font-medium">{label}<select className="rounded border p-2" name={name} defaultValue={value}><option value="">All</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function Metric({ title, value, empty = false }: { title: string; value: string; empty?: boolean }) {
  return (
    <div className="rounded-2xl border bg-white p-6 text-slate-900">
      <h3 className="font-bold text-slate-700">{title}</h3>
      <p className={`mt-2 font-semibold ${empty?"text-sm leading-5 text-slate-600":"text-2xl text-slate-950"}`}>{value}</p>
    </div>
  );
}
