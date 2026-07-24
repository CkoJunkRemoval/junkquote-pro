import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/auth/tenant";
import {
  downloadOfflinePackage,
  pushOfflineMutationBatch,
} from "@/lib/offlineField/server";
import { OFFLINE_SCHEMA_VERSION } from "@/lib/offlineField/contracts";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";

describe("offline field mode foundation", () => {
  let fixtures: Awaited<ReturnType<typeof createTenantFixtures>>;
  let context: TenantContext;
  beforeAll(async () => {
    await resetIntegrationDatabase();
    fixtures = await createTenantFixtures();
    const crewUser = await prisma.user.findFirstOrThrow({
      where: { memberships: { some: { id: fixtures.a.crewMembership.id } } },
    });
    await prisma.employee.update({
      where: { id: fixtures.a.employee.id },
      data: { userId: crewUser.id },
    });
    await prisma.jobAssignment.create({
      data: {
        companyId: fixtures.a.company.id,
        jobId: fixtures.a.job.id,
        employeeId: fixtures.a.employee.id,
      },
    });
    context = {
      user: {
        id: crewUser.id,
        email: crewUser.email,
        firstName: crewUser.firstName,
        lastName: crewUser.lastName,
        platformAdmin: false,
      },
      membership: {
        id: fixtures.a.crewMembership.id,
        role: "Crew",
        status: "Active",
        billingAdmin: false,
      },
      company: { id: fixtures.a.company.id, name: fixtures.a.company.name },
      companyId: fixtures.a.company.id,
      role: "Crew",
    };
  });
  afterAll(resetIntegrationDatabase);

  it("downloads only the assigned, redacted tenant package", async () => {
    await prisma.property.update({
      where: { id: fixtures.a.property.id },
      data: { hazardNotes: "private office hazard", notes: "private office note" },
    });
    const pkg = await downloadOfflinePackage(context, fixtures.a.job.id);
    expect(pkg.companyId).toBe(fixtures.a.company.id);
    expect(pkg.userId).toBe(context.user.id);
    expect(pkg.assignment.authorized).toBe(true);
    expect(JSON.stringify(pkg.job)).not.toContain("private office hazard");
    expect(JSON.stringify(pkg.job)).not.toContain("private office note");
    await expect(downloadOfflinePackage(context, fixtures.b.job.id)).rejects.toThrow(
      "not assigned",
    );
  });

  it("persists an idempotent mutation result without duplicate notes or audits", async () => {
    const pkg = await downloadOfflinePackage(context, fixtures.a.job.id);
    const input = {
      localMutationId: "note-local-1",
      idempotencyKey: "note-idempotency-1",
      companyId: context.companyId,
      userId: context.user.id,
      jobId: fixtures.a.job.id,
      packageId: pkg.id,
      mutationType: "JOB_FIELD_NOTE_ADD" as const,
      payload: { note: "Offline note once" },
      baseRecordVersion: pkg.sourceRecordVersions.job,
      dependencyIds: [],
      createdAt: new Date().toISOString(),
      schemaVersion: OFFLINE_SCHEMA_VERSION,
    };
    expect((await pushOfflineMutationBatch(context, [input]))[0].status).toBe("Synced");
    expect((await pushOfflineMutationBatch(context, [input]))[0].replayed).toBe(true);
    const job = await prisma.job.findUniqueOrThrow({ where: { id: fixtures.a.job.id } });
    expect(job.crewNotes.match(/Offline note once/g)).toHaveLength(1);
    expect(
      await prisma.auditEvent.count({
        where: {
          companyId: context.companyId,
          eventType: "offline.mutation.synced",
          entityId: fixtures.a.job.id,
        },
      }),
    ).toBe(1);
    const concurrent = {
      ...input,
      localMutationId: "note-local-concurrent",
      idempotencyKey: "note-idempotency-concurrent",
      payload: { note: "Concurrent note once" },
    };
    await Promise.all([
      pushOfflineMutationBatch(context, [concurrent]),
      pushOfflineMutationBatch(context, [concurrent]),
    ]);
    const afterRace = await prisma.job.findUniqueOrThrow({ where: { id: fixtures.a.job.id } });
    expect(afterRace.crewNotes.match(/Concurrent note once/g)).toHaveLength(1);
  });

  it("refuses a stale incompatible status and preserves the server state", async () => {
    const pkg = await downloadOfflinePackage(context, fixtures.a.job.id);
    await prisma.job.update({
      where: { id: fixtures.a.job.id },
      data: { fieldVersion: { increment: 1 } },
    });
    const [result] = await pushOfflineMutationBatch(context, [{
      localMutationId: "status-local-1",
      idempotencyKey: "status-idempotency-1",
      companyId: context.companyId,
      userId: context.user.id,
      jobId: fixtures.a.job.id,
      packageId: pkg.id,
      mutationType: "JOB_STATUS_UPDATE",
      payload: { stage: "EnRoute" },
      baseRecordVersion: pkg.sourceRecordVersions.job,
      dependencyIds: [],
      createdAt: new Date().toISOString(),
      schemaVersion: OFFLINE_SCHEMA_VERSION,
    }]);
    expect(result).toMatchObject({ status: "Conflict", classification: "VERSION_CONFLICT" });
    expect((await prisma.job.findUniqueOrThrow({ where: { id: fixtures.a.job.id } })).fieldStage).toBe("Scheduled");
  });

  it("invalidates packages after assignment removal or expiration", async () => {
    const pkg = await downloadOfflinePackage(context, fixtures.a.job.id);
    await prisma.jobAssignment.updateMany({
      where: { companyId: context.companyId, jobId: fixtures.a.job.id },
      data: { status: "Removed" },
    });
    const base = {
      companyId: context.companyId,
      userId: context.user.id,
      jobId: fixtures.a.job.id,
      packageId: pkg.id,
      mutationType: "JOB_FIELD_NOTE_ADD" as const,
      payload: { note: "Must not apply" },
      baseRecordVersion: pkg.sourceRecordVersions.job,
      dependencyIds: [],
      createdAt: new Date().toISOString(),
      schemaVersion: OFFLINE_SCHEMA_VERSION,
    };
    const [revoked] = await pushOfflineMutationBatch(context, [{
      ...base,
      localMutationId: "revoked-local",
      idempotencyKey: "revoked-key",
    }]);
    expect(revoked).toMatchObject({ status: "Conflict", classification: "ASSIGNMENT_REVOKED" });
    expect((await prisma.offlineFieldPackage.findUniqueOrThrow({ where: { id: pkg.id } })).revokedAt).not.toBeNull();
  });
});
