import { notFound } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import InvoiceDetail from "@/features/invoices/InvoiceDetail";
import InvoicePayments from "@/features/invoices/InvoicePayments";
import { requireCompanyModulePage } from "@/lib/auth/pageAccess";
import { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";

function safeInvoicePageError(error: unknown) {
  const value = error as { name?: unknown; code?: unknown; digest?: unknown };
  return {
    errorName: typeof value?.name === "string" ? value.name : "UnknownError",
    applicationErrorCode: typeof value?.code === "string" ? value.code : undefined,
    prismaErrorCode:
      typeof value?.code === "string" && /^P\d{4}$/.test(value.code)
        ? value.code
        : undefined,
    digest: typeof value?.digest === "string" ? value.digest : undefined,
  };
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.info(JSON.stringify({ event: "INVOICE_PAGE_LOAD_STARTED", invoiceId: id }));
  let invoice: NonNullable<Awaited<ReturnType<typeof getInvoiceDetail>>>;
  try {
    const { companyId, user } = await requireCompanyModulePage("invoices");
    console.info(JSON.stringify({ event: "INVOICE_PAGE_AUTHORIZED", invoiceId: id, companyId, userId: user.id }));
    const queriedInvoice = await getInvoiceDetail(companyId, id);
    if (!queriedInvoice) notFound();
    invoice = queriedInvoice;
    console.info(JSON.stringify({ event: "INVOICE_PAGE_QUERY_SUCCESS", invoiceId: id, companyId, userId: user.id }));
    console.info(JSON.stringify({
      event: "INVOICE_PAGE_RENDER_DATA_READY",
      invoiceId: id,
      companyId,
      userId: user.id,
      hasJob: Boolean(invoice.job),
      lineItemCount: invoice.lineItems.length,
    }));
  } catch (error) {
    console.error(JSON.stringify({ event: "INVOICE_PAGE_FAILED", invoiceId: id, ...safeInvoicePageError(error) }));
    throw error;
  }
  return <AppLayout><div className="contrast-controls"><div className="mx-auto max-w-5xl px-4 pt-4"><Link className="control-secondary inline-flex min-h-11 items-center rounded-xl border px-4 font-semibold" href={`/communications?manual=1&sourceType=Invoice&sourceId=${invoice.id}&customerId=${invoice.customer.id}`}>Email customer</Link></div><InvoiceDetail initialInvoice={invoice} /><InvoicePayments invoiceId={invoice.id} total={invoice.total} initialBalance={invoice.balanceDue} /></div></AppLayout>;
}
