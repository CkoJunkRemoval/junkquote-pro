"use server";
import { getJobPhotoReportData } from "@/lib/jobPhotos/jobPhotos";
import { renderJobPhotoReportPdf } from "@/data/output/renderJobPhotoReportPdf";
export async function downloadJobPhotoReportAction(jobId: string) { return renderJobPhotoReportPdf(await getJobPhotoReportData(jobId)); }
