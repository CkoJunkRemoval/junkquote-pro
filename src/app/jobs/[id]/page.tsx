import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import JobDetail from "@/features/jobs/JobDetail";
import { getJobDetail } from "@/lib/jobs/getJobDetail";
import JobPhotos from "@/features/jobs/JobPhotos";
import JobAssignments from "@/features/crews/JobAssignments";
import { requireCompanyRole } from "@/lib/auth/tenant";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  const job = await getJobDetail(companyId, id);
  if (!job) notFound();
  return <AppLayout><JobDetail initialJob={job} /><JobAssignments jobId={job.id} initialAssignments={job.assignments} /><JobPhotos jobId={job.id} jobSites={job.estimate.jobSites.map((site) => ({ id: site.id, name: site.name }))} /></AppLayout>;
}
