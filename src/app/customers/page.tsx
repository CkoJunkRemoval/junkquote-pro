import AppLayout from "@/components/layout/AppLayout";
import CustomerManagement from "@/features/customers/CustomerManagement";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <AppLayout><CustomerManagement initialSearch={q ?? ""} /></AppLayout>;
}
