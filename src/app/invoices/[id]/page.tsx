import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import InvoiceDetail from "@/features/invoices/InvoiceDetail";
import { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";
import InvoicePayments from "@/features/invoices/InvoicePayments";
import { requireOperationalTenant } from "@/lib/auth/tenant";
export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) { const { companyId } = await requireOperationalTenant(); const { id } = await params; const invoice = await getInvoiceDetail(companyId, id); if (!invoice) notFound(); return <AppLayout><InvoiceDetail initialInvoice={invoice} /><InvoicePayments invoiceId={invoice.id} total={invoice.total} initialBalance={invoice.balanceDue} /></AppLayout>; }
