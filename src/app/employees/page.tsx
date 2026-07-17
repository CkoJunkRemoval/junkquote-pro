import AppLayout from "@/components/layout/AppLayout";
import { EmployeesManagement } from "@/features/crews/PeopleManagement";
import { requireOperationalTenant } from "@/lib/auth/tenant";
export default async function EmployeesPage() { await requireOperationalTenant(); return <AppLayout><EmployeesManagement /></AppLayout>; }
