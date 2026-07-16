CREATE TYPE "SignatureMethod" AS ENUM ('PublicLink', 'TeamDevice');

ALTER TABLE "estimates"
  ADD COLUMN "signatureData" TEXT,
  ADD COLUMN "signedAt" TIMESTAMP(3),
  ADD COLUMN "signerName" TEXT,
  ADD COLUMN "signatureMethod" "SignatureMethod";
