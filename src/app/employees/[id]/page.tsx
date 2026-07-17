import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { getEmployeeDetail } from "@/lib/crews/management";
import EmployeeDetailEditor from "@/features/crews/EmployeeDetailEditor";
import { requireOperationalTenant } from "@/lib/auth/tenant";
export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) { const { companyId } = await requireOperationalTenant(); const { id } = await params; const employee = await getEmployeeDetail(companyId, id); if (!employee) notFound(); return <AppLayout><EmployeeDetailEditor initialEmployee={employee} /></AppLayout>; }
