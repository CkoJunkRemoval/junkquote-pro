import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import CustomerDetail from "@/features/customers/CustomerDetail";
import { getCustomerDetail } from "@/lib/customers/getCustomerDetail";
import { requireCompanyModulePage } from "@/lib/auth/pageAccess";
import Link from "next/link";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { companyId } = await requireCompanyModulePage("customers");
  const customer = await getCustomerDetail(companyId, id);
  if (!customer) notFound();
  return <AppLayout><div className="mx-auto max-w-7xl px-4 pt-4"><Link className="inline-flex min-h-11 items-center rounded-xl border px-4 font-semibold" href={`/communications?manual=1&sourceType=Customer&sourceId=${customer.id}&customerId=${customer.id}`}>Email customer</Link></div><CustomerDetail initialCustomer={customer} /></AppLayout>;
}
