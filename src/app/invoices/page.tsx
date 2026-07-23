import AppLayout from "@/components/layout/AppLayout";
import InvoiceManagement from "@/features/invoices/InvoiceManagement";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import {parseInvoiceManagementPeriod,parseInvoiceManagementStatus} from "@/features/invoices/invoiceListFilters";
export default async function InvoicesPage({searchParams}:{searchParams:Promise<{status?:string;period?:string}>}) { await requireOperationalTenant();const query=await searchParams; return <AppLayout><InvoiceManagement initialStatus={parseInvoiceManagementStatus(query.status)} initialPeriod={parseInvoiceManagementPeriod(query.period)} /></AppLayout>; }
