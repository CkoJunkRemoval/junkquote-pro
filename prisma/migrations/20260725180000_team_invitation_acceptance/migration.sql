CREATE TYPE "TeamInvitationStatus" AS ENUM ('Pending', 'Accepted', 'Revoked', 'Expired');

DROP INDEX IF EXISTS "employees_userId_key";
CREATE UNIQUE INDEX "employees_companyId_userId_key"
  ON "employees"("companyId", "userId");

CREATE TABLE "team_invitations" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "TeamInvitationStatus" NOT NULL DEFAULT 'Pending',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "acceptedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "team_invitations_tokenHash_key" ON "team_invitations"("tokenHash");
CREATE INDEX "team_invitations_companyId_status_createdAt_idx" ON "team_invitations"("companyId", "status", "createdAt");
CREATE INDEX "team_invitations_companyId_email_idx" ON "team_invitations"("companyId", "email");
CREATE INDEX "team_invitations_employeeId_status_idx" ON "team_invitations"("employeeId", "status");
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
