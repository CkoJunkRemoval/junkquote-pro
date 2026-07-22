import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import ScheduleJobButton from "@/features/jobs/ScheduleJobButton";
import CreateInvoiceButton from "@/features/invoices/CreateInvoiceButton";
import { getEstimateManagementDetail } from "@/lib/estimates/getEstimateManagementDetail";
import { requireCompanyRole } from "@/lib/auth/tenant";
import Link from "next/link";
import { isEstimateLocked } from "@/lib/estimates/isEstimateLocked";
import { getEstimateRevisionHistory } from "@/lib/estimates/getEstimateRevisionHistory";
import CreateRevisionButton from "@/features/estimate/CreateRevisionButton";
import {estimateStatusBadges,listEstimateActivity} from "@/lib/estimates/estimateLifecycle";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  const [estimate, history, activity] = await Promise.all([
    getEstimateManagementDetail(companyId, id),
    getEstimateRevisionHistory(companyId, id),
    listEstimateActivity(companyId,id),
  ]);

  if (!estimate) notFound();
  const locked = isEstimateLocked(estimate);

  return (
    <AppLayout>
      <main className="mx-auto max-w-5xl p-6 sm:p-10">
        <p className="text-sm font-semibold text-blue-700">{locked ? "Read-only approved estimate" : "Editable estimate"}</p>
        <p className="mt-1 text-sm text-slate-500">{estimate.displayNumber ?? "Estimate"} · {estimate.revisionNumber === 0 ? "Original" : `Revision ${estimate.revisionNumber}`}</p>
        <h1 className="mt-1 text-3xl font-bold">
          {estimate.customer.firstName} {estimate.customer.lastName}
        </h1>
        <p className="mt-1 text-slate-600">
          {estimate.property.address}, {estimate.property.city}, {estimate.property.state} {estimate.property.zip}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-slate-100 p-4"><p className="text-xs font-medium uppercase text-slate-500">Status</p><span className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-semibold ${estimateStatusBadges[estimate.status].className}`}>{estimateStatusBadges[estimate.status].label}</span></div>
          <Summary label="Subtotal" value={formatCurrency(estimate.pricingSubtotal)} />
          <Summary label="Labor" value={formatCurrency(estimate.pricingLabor)} />
          <Summary label="Disposal" value={formatCurrency(estimate.pricingDisposal)} />
          <Summary label="Total" value={formatCurrency(estimate.pricingTotal)} />
        </div>
        {estimate.pricingDiscount !== 0 && <p className="mt-4 text-slate-600">Discount: {formatCurrency(estimate.pricingDiscount)}</p>}
        <p className="mt-3 text-sm text-slate-500">Last updated {estimate.updatedAt.toLocaleString()}</p>
        <div className="mt-6 flex flex-wrap gap-3">{!locked && <Link href={`/estimates?estimateId=${id}`} className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">Edit estimate</Link>}{estimate.status === "Approved" && <><CreateRevisionButton estimateId={id} /><ScheduleJobButton estimateId={id} /><CreateInvoiceButton estimateId={id} /></>}</div>
        {history && <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold">Revision history</h2><div className="mt-4 space-y-2">{history.revisions.map((revision, index) => { const current = revision.id === history.currentId; const latest = index === history.revisions.length - 1; return <Link key={revision.id} href={`/estimates/${revision.id}`} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${current ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}><span><strong>{revision.revisionNumber === 0 ? "Original" : `Revision ${revision.revisionNumber}`}</strong><span className="ml-2 text-sm text-slate-500">{revision.displayNumber}</span></span><span className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{revision.status}</span>{current && <span className="text-xs font-semibold text-blue-700">Current</span>}{latest && <span className="text-xs font-semibold text-slate-600">Latest</span>}</span></Link>; })}</div></section>}
        <section className="mt-8 space-y-3"><h2 className="text-xl font-bold">Activity</h2>{activity.map(item=><p key={item.id} className="rounded-xl border bg-white p-3"><strong>{item.message}</strong><span className="ml-2 text-sm text-slate-500">{item.createdAt.toLocaleString()}</span></p>)}{activity.length===0&&<p className="text-slate-500">No activity yet.</p>}</section>
        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-bold">Job sites</h2>
          {estimate.jobSites.map((jobSite) => (
            <article key={jobSite.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold">{jobSite.name}</h3>
              {jobSite.customerNotes && <p className="mt-2 text-slate-600">{jobSite.customerNotes}</p>}
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {jobSite.items.map((item) => <li key={`${jobSite.name}-${item.name}`}>{item.quantity} × {item.name}{item.notes ? ` — ${item.notes}` : ""}</li>)}
              </ul>
            </article>
          ))}
        </section>
      </main>
    </AppLayout>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-100 p-4"><p className="text-xs font-medium uppercase text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}
