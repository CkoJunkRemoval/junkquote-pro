import { notFound } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import InvoiceDetail from "@/features/invoices/InvoiceDetail";
import InvoicePayments from "@/features/invoices/InvoicePayments";
import { requireCompanyModulePage } from "@/lib/auth/pageAccess";
import { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireCompanyModulePage("invoices");
  const { id } = await params;
  const invoice = await getInvoiceDetail(companyId, id);
  if (!invoice) notFound();
  return <AppLayout><div className="contrast-controls"><div className="mx-auto max-w-5xl px-4 pt-4"><Link className="control-secondary inline-flex min-h-11 items-center rounded-xl border px-4 font-semibold" href={`/communications?manual=1&sourceType=Invoice&sourceId=${invoice.id}&customerId=${invoice.customer.id}`}>Email customer</Link></div><InvoiceDetail initialInvoice={invoice} /><InvoicePayments invoiceId={invoice.id} total={invoice.total} initialBalance={invoice.balanceDue} /></div></AppLayout>;
}
