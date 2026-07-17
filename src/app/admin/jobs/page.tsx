import AppLayout from "@/components/layout/AppLayout";
import BackgroundJobsAdmin from "@/features/admin/BackgroundJobsAdmin";
import { requireAdminTenant } from "@/lib/auth/tenant";
import { listBackgroundJobs } from "@/lib/backgroundJobs/admin";

export default async function AdminJobsPage() { const { companyId } = await requireAdminTenant(); return <AppLayout><BackgroundJobsAdmin initialData={await listBackgroundJobs(companyId)} /></AppLayout>; }
