ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'Viewed';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'Void';

ALTER TABLE "invoices"
  ADD COLUMN "sentAt" TIMESTAMP(3),
  ADD COLUMN "viewedAt" TIMESTAMP(3),
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "lastSentTo" TEXT;

CREATE TABLE "invoice_line_items" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'Service',
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "invoice_line_items_invoiceId_sortOrder_idx" ON "invoice_line_items"("invoiceId", "sortOrder");
