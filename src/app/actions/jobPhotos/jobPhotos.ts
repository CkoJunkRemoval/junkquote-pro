"use server";
import type { JobPhotoCategory } from "@/generated/prisma/client";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import {
  deleteJobPhoto,
  listJobPhotos,
  reorderJobPhotos,
  updateJobPhoto,
  uploadJobPhotos,
} from "@/lib/jobPhotos/jobPhotos";
async function authorizedCompanyId() {
  return (await requireOperationalTenant()).companyId;
}
export async function uploadJobPhotosAction(formData: FormData) {
  const companyId = await authorizedCompanyId();
  const jobId = String(formData.get("jobId") ?? "");
  const category = String(
    formData.get("category") ?? "Other",
  ) as JobPhotoCategory;
  const jobSiteId = String(formData.get("jobSiteId") ?? "") || undefined;
  const files = formData
    .getAll("files")
    .filter((item): item is File => item instanceof File);
  return uploadJobPhotos(companyId, jobId, { category, jobSiteId, files });
}
export async function listJobPhotosAction(jobId: string) {
  return listJobPhotos(await authorizedCompanyId(), jobId);
}
export async function updateJobPhotoAction(input: {
  id: string;
  category?: JobPhotoCategory;
  caption?: string | null;
  jobSiteId?: string | null;
    takenAt?: Date | null;
    customerVisible?: boolean;
    annotation?: string | null;
}) {
  const { id, ...changes } = input;
  return updateJobPhoto(await authorizedCompanyId(), id, changes);
}
export async function deleteJobPhotoAction(photoId: string) {
  return deleteJobPhoto(await authorizedCompanyId(), photoId);
}
export async function reorderJobPhotosAction(
  jobId: string,
  photoIds: string[],
) {
  return reorderJobPhotos(await authorizedCompanyId(), jobId, photoIds);
}
