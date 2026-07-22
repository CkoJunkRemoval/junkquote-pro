-- CreateTable
CREATE TABLE "estimate_items" (
    "id" TEXT NOT NULL,
    "jobSiteId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT NOT NULL DEFAULT '',
    "priceOverride" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estimate_items_jobSiteId_idx" ON "estimate_items"("jobSiteId");

-- CreateIndex
CREATE UNIQUE INDEX "estimate_items_jobSiteId_itemId_key" ON "estimate_items"("jobSiteId", "itemId");

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_jobSiteId_fkey" FOREIGN KEY ("jobSiteId") REFERENCES "job_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
