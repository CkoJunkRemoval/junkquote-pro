ALTER TABLE "estimates"
ADD COLUMN "revisionNumber" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "revisionRootId" TEXT;

CREATE TABLE "estimate_photos" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "jobSiteId" TEXT,
    "category" "JobPhotoCategory" NOT NULL DEFAULT 'Other',
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "caption" TEXT,
    "customerVisible" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "takenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "estimate_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "estimates_revisionRootId_idx" ON "estimates"("revisionRootId");
CREATE UNIQUE INDEX "estimates_revisionRootId_revisionNumber_key" ON "estimates"("revisionRootId", "revisionNumber");
CREATE INDEX "estimate_photos_estimateId_category_sortOrder_idx" ON "estimate_photos"("estimateId", "category", "sortOrder");
CREATE INDEX "estimate_photos_jobSiteId_idx" ON "estimate_photos"("jobSiteId");

ALTER TABLE "estimates" ADD CONSTRAINT "estimates_revisionRootId_fkey" FOREIGN KEY ("revisionRootId") REFERENCES "estimates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "estimate_photos" ADD CONSTRAINT "estimate_photos_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "estimate_photos" ADD CONSTRAINT "estimate_photos_jobSiteId_fkey" FOREIGN KEY ("jobSiteId") REFERENCES "job_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
