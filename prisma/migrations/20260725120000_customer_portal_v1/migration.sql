CREATE TABLE "portal_estimate_responses" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "customerId" TEXT NOT NULL, "estimateId" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL, "portalAccessId" TEXT NOT NULL, "response" TEXT NOT NULL, "customerName" TEXT NOT NULL,
  "declineReason" TEXT, "signatureData" TEXT, "consentAccepted" BOOLEAN NOT NULL, "termsVersion" TEXT NOT NULL,
  "ipAddress" TEXT, "userAgent" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "portal_estimate_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "portal_estimate_responses_portalAccessId_fkey" FOREIGN KEY ("portalAccessId") REFERENCES "customer_portal_accesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "portal_estimate_responses_estimateId_key" ON "portal_estimate_responses"("estimateId");
CREATE INDEX "portal_estimate_responses_companyId_customerId_createdAt_idx" ON "portal_estimate_responses"("companyId","customerId","createdAt");
CREATE INDEX "portal_estimate_responses_portalAccessId_createdAt_idx" ON "portal_estimate_responses"("portalAccessId","createdAt");

CREATE TABLE "customer_reschedule_requests" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "customerId" TEXT NOT NULL, "jobId" TEXT NOT NULL,
  "portalAccessId" TEXT NOT NULL, "preferredStart" TIMESTAMP(3) NOT NULL, "preferredEnd" TIMESTAMP(3),
  "reason" TEXT NOT NULL, "customerNote" TEXT, "status" TEXT NOT NULL DEFAULT 'Pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "customer_reschedule_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_reschedule_requests_portalAccessId_fkey" FOREIGN KEY ("portalAccessId") REFERENCES "customer_portal_accesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "customer_reschedule_requests_companyId_status_createdAt_idx" ON "customer_reschedule_requests"("companyId","status","createdAt");
CREATE INDEX "customer_reschedule_requests_customerId_createdAt_idx" ON "customer_reschedule_requests"("customerId","createdAt");
CREATE INDEX "customer_reschedule_requests_jobId_status_idx" ON "customer_reschedule_requests"("jobId","status");

CREATE TABLE "customer_message_threads" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "customerId" TEXT NOT NULL, "portalAccessId" TEXT NOT NULL,
  "estimateId" TEXT, "jobId" TEXT, "invoiceId" TEXT, "subject" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_message_threads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_message_threads_portalAccessId_fkey" FOREIGN KEY ("portalAccessId") REFERENCES "customer_portal_accesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "customer_message_threads_companyId_customerId_updatedAt_idx" ON "customer_message_threads"("companyId","customerId","updatedAt");
CREATE INDEX "customer_message_threads_estimateId_idx" ON "customer_message_threads"("estimateId");
CREATE INDEX "customer_message_threads_jobId_idx" ON "customer_message_threads"("jobId");
CREATE INDEX "customer_message_threads_invoiceId_idx" ON "customer_message_threads"("invoiceId");

CREATE TABLE "customer_messages" (
  "id" TEXT NOT NULL, "threadId" TEXT NOT NULL, "senderType" TEXT NOT NULL, "senderId" TEXT,
  "senderDisplayName" TEXT NOT NULL, "body" TEXT NOT NULL, "attachments" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "customer_message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "customer_messages_threadId_createdAt_id_idx" ON "customer_messages"("threadId","createdAt","id");
