import AppLayout from "@/components/layout/AppLayout";
import { CrewsManagement } from "@/features/crews/PeopleManagement";
import { requireOperationalTenant } from "@/lib/auth/tenant";
export default async function CrewsPage() { await requireOperationalTenant(); return <AppLayout><CrewsManagement /></AppLayout>; }
