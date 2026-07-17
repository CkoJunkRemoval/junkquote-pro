import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { getEmployeeDetail } from "@/lib/crews/management";
import EmployeeDetailEditor from "@/features/crews/EmployeeDetailEditor";
export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const employee = await getEmployeeDetail(id); if (!employee) notFound(); return <AppLayout><EmployeeDetailEditor initialEmployee={employee} /></AppLayout>; }
