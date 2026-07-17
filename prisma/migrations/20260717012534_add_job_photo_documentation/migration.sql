-- CreateEnum
CREATE TYPE "JobPhotoCategory" AS ENUM ('Before', 'During', 'After', 'Damage', 'Disposal', 'Other');

-- CreateTable
CREATE TABLE "job_photos" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobSiteId" TEXT,
    "category" "JobPhotoCategory" NOT NULL DEFAULT 'Other',
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "takenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_photos_companyId_idx" ON "job_photos"("companyId");

-- CreateIndex
CREATE INDEX "job_photos_jobId_category_sortOrder_idx" ON "job_photos"("jobId", "category", "sortOrder");

-- CreateIndex
CREATE INDEX "job_photos_jobSiteId_idx" ON "job_photos"("jobSiteId");

-- AddForeignKey
ALTER TABLE "job_photos" ADD CONSTRAINT "job_photos_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_photos" ADD CONSTRAINT "job_photos_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_photos" ADD CONSTRAINT "job_photos_jobSiteId_fkey" FOREIGN KEY ("jobSiteId") REFERENCES "job_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
