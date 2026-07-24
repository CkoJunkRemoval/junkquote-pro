import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import InvoiceDetail from "@/features/invoices/InvoiceDetail";
import { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";
import InvoicePayments from "@/features/invoices/InvoicePayments";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import Link from "next/link";
export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) { const { companyId } = await requireOperationalTenant(); const { id } = await params; const invoice = await getInvoiceDetail(companyId, id); if (!invoice) notFound(); return <AppLayout><div className="contrast-controls"><div className="mx-auto max-w-5xl px-4 pt-4"><Link className="control-secondary inline-flex min-h-11 items-center rounded-xl border px-4 font-semibold" href={`/communications?manual=1&sourceType=Invoice&sourceId=${invoice.id}&customerId=${invoice.customer.id}`}>Email customer</Link></div><InvoiceDetail initialInvoice={invoice} /><InvoicePayments invoiceId={invoice.id} total={invoice.total} initialBalance={invoice.balanceDue} /></div></AppLayout>; }
