import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import CreateJobButton from "@/features/jobs/CreateJobButton";
import CreateInvoiceButton from "@/features/invoices/CreateInvoiceButton";
import { getEstimateManagementDetail } from "@/lib/estimates/getEstimateManagementDetail";
import { requireCompanyRole } from "@/lib/auth/tenant";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  const estimate = await getEstimateManagementDetail(companyId, id);

  if (!estimate) notFound();

  return (
    <AppLayout>
      <main className="mx-auto max-w-5xl p-6 sm:p-10">
        <p className="text-sm font-semibold text-blue-700">Read-only estimate</p>
        <h1 className="mt-1 text-3xl font-bold">
          {estimate.customer.firstName} {estimate.customer.lastName}
        </h1>
        <p className="mt-1 text-slate-600">
          {estimate.property.address}, {estimate.property.city}, {estimate.property.state} {estimate.property.zip}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Summary label="Status" value={estimate.status} />
          <Summary label="Subtotal" value={formatCurrency(estimate.pricingSubtotal)} />
          <Summary label="Labor" value={formatCurrency(estimate.pricingLabor)} />
          <Summary label="Disposal" value={formatCurrency(estimate.pricingDisposal)} />
          <Summary label="Total" value={formatCurrency(estimate.pricingTotal)} />
        </div>
        {estimate.pricingDiscount !== 0 && <p className="mt-4 text-slate-600">Discount: {formatCurrency(estimate.pricingDiscount)}</p>}
        <p className="mt-3 text-sm text-slate-500">Last updated {estimate.updatedAt.toLocaleString()}</p>
        {estimate.status === "Approved" && <div className="mt-6 flex flex-wrap gap-3"><CreateJobButton estimateId={id} /><CreateInvoiceButton estimateId={id} /></div>}
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
