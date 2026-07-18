CREATE TABLE "audit_events" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "actingUserId" TEXT,
  "portalAccessId" TEXT,
  "eventType" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "requestId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_events_companyId_createdAt_idx" ON "audit_events"("companyId", "createdAt");
CREATE INDEX "audit_events_companyId_eventType_createdAt_idx" ON "audit_events"("companyId", "eventType", "createdAt");
CREATE INDEX "audit_events_companyId_actingUserId_createdAt_idx" ON "audit_events"("companyId", "actingUserId", "createdAt");
CREATE INDEX "audit_events_requestId_idx" ON "audit_events"("requestId");
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actingUserId_fkey" FOREIGN KEY ("actingUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_portalAccessId_fkey" FOREIGN KEY ("portalAccessId") REFERENCES "customer_portal_accesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
