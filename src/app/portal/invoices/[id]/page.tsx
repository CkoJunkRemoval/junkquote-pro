import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PortalPage from "@/features/portal/PortalPage";
import { getCustomerPortalContext } from "@/lib/portal/context";
import { getPortalInvoice } from "@/lib/portal/data";
import { getInvoiceOnlinePaymentState } from "@/lib/payments/connectedCheckout";
import { payPortalInvoiceAction } from "@/app/actions/portal/stripePayments";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const context = await getCustomerPortalContext();
  if (!context) redirect("/portal/sign-in");
  const invoice = await getPortalInvoice(
    context.companyId,
    context.customerId,
    (await params).id,
  );
  if (!invoice) notFound();
  const paymentState = await getInvoiceOnlinePaymentState(context.companyId, context.customerId, invoice.id);
  const query = await searchParams;
  return (
    <PortalPage company={context.company}>
      {query.payment === "confirming" && <p className="mb-4 rounded-xl bg-blue-50 p-4 font-semibold text-blue-900" role="status">Payment received — confirming</p>}
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
        <p>Due date: {invoice.dueDate?.toLocaleDateString() ?? "Not specified"}</p>
        {paymentState.available ? <form action={payPortalInvoiceAction.bind(null, invoice.id)}><button className="mt-5 min-h-11 rounded-xl bg-blue-700 px-5 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Pay Securely</button></form> : paymentState.reason === "ALREADY_PAID" ? <p className="mt-4 font-semibold text-green-700" role="status">Paid</p> : <p className="mt-4 text-slate-600" role="status">Online payment is currently unavailable.</p>}
        <h2 className="mt-5 text-xl font-bold">Line items</h2>
        <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[32rem] text-left"><thead><tr><th>Description</th><th>Quantity</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>{invoice.lineItems.map(item => <tr key={item.id}><td>{item.description}</td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td>{money(item.amount)}</td></tr>)}</tbody></table></div>
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
