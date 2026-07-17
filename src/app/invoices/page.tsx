import AppLayout from "@/components/layout/AppLayout";
import InvoiceManagement from "@/features/invoices/InvoiceManagement";
import { requireOperationalTenant } from "@/lib/auth/tenant";
export default async function InvoicesPage() { await requireOperationalTenant(); return <AppLayout><InvoiceManagement /></AppLayout>; }
