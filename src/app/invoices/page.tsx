import AppLayout from "@/components/layout/AppLayout";
import InvoiceManagement from "@/features/invoices/InvoiceManagement";
import { parseInvoiceManagementPeriod, parseInvoiceManagementStatus } from "@/features/invoices/invoiceListFilters";
import { requireCompanyModulePage } from "@/lib/auth/pageAccess";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string; period?: string }> }) {
  await requireCompanyModulePage("invoices");
  const query = await searchParams;
  return <AppLayout><InvoiceManagement initialStatus={parseInvoiceManagementStatus(query.status)} initialPeriod={parseInvoiceManagementPeriod(query.period)} /></AppLayout>;
}
