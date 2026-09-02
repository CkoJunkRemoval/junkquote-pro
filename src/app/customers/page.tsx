import AppLayout from "@/components/layout/AppLayout";
import CustomerManagement from "@/features/customers/CustomerManagement";
import { requireCompanyModulePage } from "@/lib/auth/pageAccess";

export const metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireCompanyModulePage("customers");
  const { q } = await searchParams;
  return <AppLayout><CustomerManagement initialSearch={q ?? ""} /></AppLayout>;
}
