ALTER TABLE "estimates"
  ADD COLUMN "sentAt" TIMESTAMP(3),
  ADD COLUMN "sentByEmailAt" TIMESTAMP(3),
  ADD COLUMN "sentBySmsAt" TIMESTAMP(3),
  ADD COLUMN "approvalToken" TEXT,
  ADD COLUMN "approvalTokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "estimates_approvalToken_key" ON "estimates"("approvalToken");
