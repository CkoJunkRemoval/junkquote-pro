ALTER TABLE "properties" ADD COLUMN "propertyType" TEXT;
ALTER TABLE "estimates" ADD COLUMN "estimatedLaborHours" DOUBLE PRECISION, ADD COLUMN "estimatedLaborCost" DOUBLE PRECISION;
ALTER TABLE "pricing_outcomes" ALTER COLUMN "laborHoursEstimated" DROP NOT NULL, ADD COLUMN "propertyType" TEXT;
CREATE TABLE "refunds" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "paymentId" TEXT NOT NULL, "invoiceId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL, "reason" TEXT, "externalReference" TEXT, "refundedAt" TIMESTAMP(3) NOT NULL,
  "createdByUserId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "refunds_companyId_paymentId_idx" ON "refunds"("companyId", "paymentId");
CREATE INDEX "refunds_companyId_invoiceId_idx" ON "refunds"("companyId", "invoiceId");
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
