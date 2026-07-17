"use server";
import type { JobPhotoCategory } from "@/generated/prisma/client";
import { deleteJobPhoto, listJobPhotos, reorderJobPhotos, updateJobPhoto, uploadJobPhotos } from "@/lib/jobPhotos/jobPhotos";
export async function uploadJobPhotosAction(formData: FormData) { const jobId = String(formData.get("jobId") ?? ""); const category = String(formData.get("category") ?? "Other") as JobPhotoCategory; const jobSiteId = String(formData.get("jobSiteId") ?? "") || undefined; const files = formData.getAll("files").filter((item): item is File => item instanceof File); return uploadJobPhotos({ jobId, category, jobSiteId, files }); }
export async function listJobPhotosAction(jobId: string) { return listJobPhotos(jobId); }
export async function updateJobPhotoAction(input: { id: string; category?: JobPhotoCategory; caption?: string | null; jobSiteId?: string | null; takenAt?: Date | null }) { return updateJobPhoto(input); }
export async function deleteJobPhotoAction(photoId: string) { return deleteJobPhoto(photoId); }
export async function reorderJobPhotosAction(jobId: string, photoIds: string[]) { return reorderJobPhotos(jobId, photoIds); }
