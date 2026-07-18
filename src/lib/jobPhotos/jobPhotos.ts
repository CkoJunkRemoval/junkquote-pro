import type { JobPhotoCategory } from "@/generated/prisma/client";
import { prisma } from "../prisma";
import {
  localJobPhotoStorage,
  sanitizeJobPhotoFilename,
} from "../storage/jobPhotoStorage";

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];
export const maxJobPhotoSize = 10 * 1024 * 1024;
export interface UploadJobPhotosInput {
  jobSiteId?: string;
  category: JobPhotoCategory;
  files: File[];
}
export interface UpdateJobPhotoInput {
  category?: JobPhotoCategory;
  caption?: string | null;
  jobSiteId?: string | null;
  takenAt?: Date | null;
  customerVisible?: boolean;
}
export function validateJobPhotoFile(file: File) {
  if (!allowedMimeTypes.includes(file.type))
    throw new Error("Only JPEG, PNG, WebP, and HEIC images are supported.");
  if (file.size <= 0 || file.size > maxJobPhotoSize)
    throw new Error("Image must be no larger than 10 MB.");
}

async function assertJob(companyId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      companyId,
      customer: { companyId },
      property: { customer: { companyId } },
      estimate: { companyId },
    },
    select: { id: true, estimateId: true },
  });
  if (!job) throw new Error("Job not found.");
  return job;
}

export async function uploadJobPhotos(
  companyId: string,
  jobId: string,
  input: UploadJobPhotosInput,
) {
  const job = await assertJob(companyId, jobId);
  if (!input.files.length) throw new Error("Select at least one photo.");
  if (input.jobSiteId) {
    const site = await prisma.jobSite.findFirst({
      where: {
        id: input.jobSiteId,
        estimateId: job.estimateId,
        estimate: { companyId },
      },
      select: { id: true },
    });
    if (!site) throw new Error("Job site not found for this job.");
  }
  const current = await prisma.jobPhoto.count({
    where: {
      jobId: job.id,
      companyId,
      category: input.category,
      job: { companyId },
    },
  });
  const uploaded = [];
  for (const [index, file] of input.files.entries()) {
    validateJobPhotoFile(file);
    const stored = await localJobPhotoStorage.save(companyId, job.id, file);
    try {
      uploaded.push(
        await prisma.jobPhoto.create({
          data: {
            companyId,
            jobId: job.id,
            ...(input.jobSiteId ? { jobSiteId: input.jobSiteId } : {}),
            category: input.category,
            fileUrl: stored.fileUrl,
            thumbnailUrl: stored.thumbnailUrl,
            fileName: sanitizeJobPhotoFilename(file.name),
            mimeType: file.type,
            fileSize: file.size,
            sortOrder: current + index,
          },
        }),
      );
    } catch (error) {
      await localJobPhotoStorage.remove(companyId, job.id, stored.fileUrl);
      throw error;
    }
  }
  return uploaded;
}
export async function uploadJobPhoto(
  companyId: string,
  jobId: string,
  input: Omit<UploadJobPhotosInput, "files"> & { file: File },
) {
  const [photo] = await uploadJobPhotos(companyId, jobId, {
    ...input,
    files: [input.file],
  });
  return photo;
}
export async function listJobPhotos(companyId: string, jobId: string) {
  const job = await assertJob(companyId, jobId);
  return prisma.jobPhoto.findMany({
    where: { jobId: job.id, companyId, job: { companyId } },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      jobSiteId: true,
      category: true,
      fileUrl: true,
      thumbnailUrl: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
        caption: true,
        customerVisible: true,
      sortOrder: true,
      takenAt: true,
      createdAt: true,
    },
  });
}
export async function updateJobPhoto(
  companyId: string,
  photoId: string,
  input: UpdateJobPhotoInput,
) {
  const photo = await prisma.jobPhoto.findFirst({
    where: {
      id: photoId,
      companyId,
      job: {
        companyId,
        customer: { companyId },
        property: { customer: { companyId } },
      },
    },
    select: { id: true, job: { select: { estimateId: true } } },
  });
  if (!photo) throw new Error("Photo not found.");
  if (input.jobSiteId) {
    const site = await prisma.jobSite.findFirst({
      where: {
        id: input.jobSiteId,
        estimateId: photo.job.estimateId,
        estimate: { companyId },
      },
      select: { id: true },
    });
    if (!site) throw new Error("Job site not found for this job.");
  }
  return prisma.jobPhoto.update({
    where: { id: photo.id },
    data: {
      ...(input.category ? { category: input.category } : {}),
      ...(input.caption !== undefined
        ? { caption: input.caption?.trim() || null }
        : {}),
      ...(input.jobSiteId !== undefined ? { jobSiteId: input.jobSiteId } : {}),
      ...(input.takenAt !== undefined ? { takenAt: input.takenAt } : {}),
      ...(input.customerVisible !== undefined
        ? { customerVisible: input.customerVisible }
        : {}),
    },
  });
}
export async function deleteJobPhoto(companyId: string, photoId: string) {
  const photo = await prisma.jobPhoto.findFirst({
    where: { id: photoId, companyId, job: { companyId } },
    select: { id: true, jobId: true, fileUrl: true, thumbnailUrl: true },
  });
  if (!photo) throw new Error("Photo not found.");
  await prisma.jobPhoto.delete({ where: { id: photo.id } });
  await localJobPhotoStorage.remove(companyId, photo.jobId, photo.fileUrl);
  if (photo.thumbnailUrl && photo.thumbnailUrl !== photo.fileUrl)
    await localJobPhotoStorage.remove(
      companyId,
      photo.jobId,
      photo.thumbnailUrl,
    );
}
export async function reorderJobPhotos(
  companyId: string,
  jobId: string,
  photoIds: string[],
) {
  const job = await assertJob(companyId, jobId);
  const photos = await prisma.jobPhoto.findMany({
    where: {
      id: { in: photoIds },
      jobId: job.id,
      companyId,
      job: { companyId },
    },
    select: { id: true },
  });
  if (photos.length !== photoIds.length)
    throw new Error("Invalid photo order.");
  await prisma.$transaction(
    photoIds.map((id, sortOrder) =>
      prisma.jobPhoto.update({ where: { id }, data: { sortOrder } }),
    ),
  );
}
export async function getJobPhotoReportData(companyId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      companyId,
      customer: { companyId },
      property: { customer: { companyId } },
      estimate: { companyId },
    },
    select: {
      scheduledStart: true,
      customer: { select: { firstName: true, lastName: true } },
      property: {
        select: { address: true, city: true, state: true, zip: true },
      },
      company: {
        select: {
          name: true,
          displayName: true,
          logoUrl: true,
          primaryColor: true,
          secondaryColor: true,
        },
      },
      photos: {
        where: { companyId, category: { in: ["Before", "After"] } },
        orderBy: { sortOrder: "asc" },
        select: { category: true, fileUrl: true, caption: true },
      },
    },
  });
  if (!job) throw new Error("Job not found.");
  return job;
}
