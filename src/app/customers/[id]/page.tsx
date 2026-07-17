import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import CustomerDetail from "@/features/customers/CustomerDetail";
import { getCustomerDetail } from "@/lib/customers/getCustomerDetail";
import { requireCompanyRole } from "@/lib/auth/tenant";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  const customer = await getCustomerDetail(companyId, id);
  if (!customer) notFound();
  return <AppLayout><CustomerDetail initialCustomer={customer} /></AppLayout>;
}
