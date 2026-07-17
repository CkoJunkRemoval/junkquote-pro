"use server";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import { getJobPhotoReportData } from "@/lib/jobPhotos/jobPhotos";
import { renderJobPhotoReportPdf } from "@/data/output/renderJobPhotoReportPdf";
export async function downloadJobPhotoReportAction(jobId: string) { const { companyId } = await requireOperationalTenant(); return renderJobPhotoReportPdf(await getJobPhotoReportData(companyId, jobId)); }
