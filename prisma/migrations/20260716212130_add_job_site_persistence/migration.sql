-- CreateTable
CREATE TABLE "job_sites" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not-started',
    "customerNotes" TEXT NOT NULL DEFAULT '',
    "crewNotes" TEXT NOT NULL DEFAULT '',
    "internalNotes" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_sites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_sites_estimateId_idx" ON "job_sites"("estimateId");

-- AddForeignKey
ALTER TABLE "job_sites" ADD CONSTRAINT "job_sites_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
