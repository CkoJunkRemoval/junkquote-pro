import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PortalPage from "@/features/portal/PortalPage";
import { getCustomerPortalContext } from "@/lib/portal/context";
import { getPortalInvoice } from "@/lib/portal/data";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await getCustomerPortalContext();
  if (!context) redirect("/portal/sign-in");
  const invoice = await getPortalInvoice(
    context.companyId,
    context.customerId,
    (await params).id,
  );
  if (!invoice) notFound();
  return (
    <PortalPage company={context.company}>
      <h1 className="text-3xl font-bold">
        {invoice.displayNumber ?? "Invoice"}
      </h1>
      <Link
        className="mt-4 inline-flex min-h-11 items-center rounded border border-slate-300 bg-white px-4 font-semibold"
        href={`/api/portal/invoices/${invoice.id}/pdf`}
      >
        Download invoice PDF
      </Link>
      <section className="mt-5 rounded-xl border bg-white p-5">
        <p>Status: {invoice.status}</p>
        <p>Total: {money(invoice.total)}</p>
        <p>Balance due: {money(invoice.balanceDue)}</p>
        <h2 className="mt-5 text-xl font-bold">Payments</h2>
        {invoice.payments.length ? (
          invoice.payments.map((payment) => (
            <p key={payment.id}>
              {payment.paymentDate.toLocaleDateString()} ·{" "}
              {money(payment.amount)}
              {payment.refunds.length
                ? ` · Refunded ${money(
                    payment.refunds.reduce(
                      (sum, refund) => sum + refund.amount,
                      0,
                    ),
                  )}`
                : ""}
            </p>
          ))
        ) : (
          <p className="mt-2 text-slate-600">No payments have been recorded.</p>
        )}
      </section>
    </PortalPage>
  );
}
