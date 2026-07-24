import "server-only";
import { createHash } from "node:crypto";
import type { FieldJobStage, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import {
  uploadJobPhotoIdempotent,
  validateJobPhotoFile,
} from "@/lib/jobPhotos/jobPhotos";
import {
  assertFieldJobAccess,
  addFieldNote,
  confirmFieldCompletion,
  resolveFieldActor,
  saveCompletionSignature,
  transitionFieldStage,
  updateFieldChecklist,
  type FieldActor,
} from "@/lib/fieldOperations/fieldOperations";
import type { TenantContext } from "@/lib/auth/tenant";
import {
  OFFLINE_MUTATION_TYPES,
  OFFLINE_PACKAGE_VERSION,
  OFFLINE_SCHEMA_VERSION,
  parseOfflineMutation,
  sortMutationsByDependencies,
  type OfflineMutationInput,
  type OfflinePackageData,
} from "./contracts";

const MAX_BATCH = 50;
const DEFAULT_PACKAGE_HOURS = 72;
const SIGNATURE_LIMIT = 1_000_000;
const NOTE_LIMIT = 5_000;

class OfflineConflict extends Error {
  constructor(
    message: string,
    readonly classification:
      | "VERSION_CONFLICT"
      | "ASSIGNMENT_REVOKED"
      | "JOB_CANCELLED"
      | "CHECKLIST_CONFLICT"
      | "SIGNATURE_CONFLICT"
      | "DEPENDENCY_CONFLICT",
  ) {
    super(message);
  }
}

function packageHours() {
  const value = Number(process.env.OFFLINE_FIELD_PACKAGE_MAX_HOURS ?? DEFAULT_PACKAGE_HOURS);
  return Number.isFinite(value) && value >= 1 && value <= 168
    ? value
    : DEFAULT_PACKAGE_HOURS;
}

function authorizationVersion(parts: string[]) {
  return createHash("sha256").update(parts.sort().join("|")).digest("hex");
}

async function fieldIdentity(context: TenantContext) {
  const actor = await resolveFieldActor(context);
  if (actor.employeeId.startsWith("unlinked:"))
    throw new Error("An active employee profile is required for offline field mode.");
  return actor;
}

async function assignmentAuthorization(
  companyId: string,
  jobId: string,
  actor: FieldActor,
) {
  const job = await assertFieldJobAccess(companyId, jobId, actor);
  const assignments = await prisma.jobAssignment.findMany({
    where: {
      companyId,
      jobId,
      status: { not: "Removed" },
      OR: [
        { employeeId: actor.employeeId },
        { crew: { members: { some: { employeeId: actor.employeeId } } } },
      ],
    },
    select: { id: true, employeeId: true, crewId: true, updatedAt: true },
  });
  const assignedThrough = actor.manager && !assignments.length
    ? "manager"
    : assignments.some((row) => row.employeeId === actor.employeeId)
      ? "employee"
      : "crew";
  return {
    job,
    assignedThrough: assignedThrough as "manager" | "employee" | "crew",
    authorizationVersion: authorizationVersion([
      companyId,
      actor.userId,
      actor.employeeId,
      jobId,
      ...assignments.map((row) => `${row.id}:${row.updatedAt.toISOString()}`),
      assignedThrough,
    ]),
  };
}

const offlineJobSelect = {
  id: true,
  jobNumber: true,
  status: true,
  fieldStage: true,
  fieldVersion: true,
  scheduledStart: true,
  scheduledEnd: true,
  arrivalWindowStart: true,
  arrivalWindowEnd: true,
  customerInstructions: true,
  customerNotes: true,
  crewNotes: true,
  completionNotes: true,
  crewConfirmedAt: true,
  completedAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
    },
  },
  property: {
    select: {
      id: true,
      address: true,
      addressLine2: true,
      city: true,
      state: true,
      zip: true,
      gateCode: true,
      accessNotes: true,
    },
  },
  estimate: {
    select: {
      id: true,
      displayNumber: true,
      status: true,
      jobSites: {
        select: {
          id: true,
          name: true,
          items: {
            select: {
              id: true,
              name: true,
              quantity: true,
              notes: true,
            },
          },
        },
      },
    },
  },
  assignments: {
    where: { status: { not: "Removed" } },
    select: {
      role: true,
      lead: true,
      employee: { select: { id: true, firstName: true, lastName: true } },
      crew: {
        select: {
          id: true,
          name: true,
          members: {
            select: {
              isLead: true,
              employee: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  },
  fieldChecklistItems: {
    select: {
      id: true,
      key: true,
      label: true,
      required: true,
      completedAt: true,
      notes: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
  photos: {
    select: {
      id: true,
      category: true,
      fileUrl: true,
      thumbnailUrl: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      caption: true,
      sortOrder: true,
      takenAt: true,
    },
    orderBy: [{ category: "asc" as const }, { sortOrder: "asc" as const }],
    take: 100,
  },
} satisfies Prisma.JobSelect;

export async function downloadOfflinePackage(
  context: TenantContext,
  jobId: string,
): Promise<OfflinePackageData> {
  const actor = await fieldIdentity(context);
  const authorization = await assignmentAuthorization(context.companyId, jobId, actor);
  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId: context.companyId },
    select: offlineJobSelect,
  });
  if (!job) throw new Error("Assigned job was not found.");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + packageHours() * 60 * 60 * 1000);
  const saved = await prisma.$transaction(async (tx) => {
    const pkg = await tx.offlineFieldPackage.upsert({
      where: {
        companyId_userId_jobId: {
          companyId: context.companyId,
          userId: context.user.id,
          jobId,
        },
      },
      create: {
        companyId: context.companyId,
        userId: context.user.id,
        jobId,
        employeeId: actor.employeeId,
        authorizationVersion: authorization.authorizationVersion,
        sourceRecordVersion: job.fieldVersion,
        expiresAt,
      },
      update: {
        employeeId: actor.employeeId,
        packageVersion: OFFLINE_PACKAGE_VERSION,
        schemaVersion: OFFLINE_SCHEMA_VERSION,
        authorizationVersion: authorization.authorizationVersion,
        sourceRecordVersion: job.fieldVersion,
        downloadedAt: now,
        expiresAt,
        revokedAt: null,
        revokedByUserId: null,
        revocationReason: null,
      },
    });
    await tx.auditEvent.create({
      data: {
        companyId: context.companyId,
        actingUserId: context.user.id,
        eventType: "offline.package.downloaded",
        entityType: "Job",
        entityId: jobId,
        metadata: { packageId: pkg.id, expiresAt, schemaVersion: OFFLINE_SCHEMA_VERSION },
      },
    });
    return pkg;
  });
  logger.info("offline_package_downloaded", {
    companyId: context.companyId,
    userId: context.user.id,
    jobId,
    packageId: saved.id,
  });
  return {
    id: saved.id,
    localId: saved.id,
    companyId: context.companyId,
    userId: context.user.id,
    sourceType: "Job",
    sourceId: jobId,
    jobId,
    packageVersion: saved.packageVersion,
    schemaVersion: saved.schemaVersion,
    authorizationVersion: saved.authorizationVersion,
    downloadedAt: saved.downloadedAt.toISOString(),
    expiresAt: saved.expiresAt.toISOString(),
    sourceRecordVersions: {
      job: job.fieldVersion,
      checklist: Object.fromEntries(
        job.fieldChecklistItems.map((item) => [item.key, item.updatedAt.toISOString()]),
      ),
    },
    syncCapabilities: {
      mutationTypes: OFFLINE_MUTATION_TYPES,
      maxBatchSize: MAX_BATCH,
      photoMaxBytes: 10 * 1024 * 1024,
      signatureMaxBytes: SIGNATURE_LIMIT,
    },
    assignment: {
      employeeId: actor.employeeId,
      authorized: true,
      assignedThrough: authorization.assignedThrough,
    },
    job: job as unknown as Record<string, unknown>,
    createdAt: saved.createdAt.toISOString(),
    updatedAt: saved.updatedAt.toISOString(),
    syncStatus: "Synced",
  };
}

async function validatePackage(
  context: TenantContext,
  actor: FieldActor,
  input: OfflineMutationInput,
) {
  if (input.companyId !== context.companyId || input.userId !== context.user.id)
    throw new Error("Offline data belongs to a different account.");
  const pkg = await prisma.offlineFieldPackage.findFirst({
    where: {
      id: input.packageId,
      companyId: context.companyId,
      userId: context.user.id,
      jobId: input.jobId,
    },
  });
  if (!pkg) throw new OfflineConflict("Offline package was not found.", "ASSIGNMENT_REVOKED");
  if (pkg.revokedAt)
    throw new OfflineConflict("Offline access was revoked by the office.", "ASSIGNMENT_REVOKED");
  if (pkg.expiresAt <= new Date())
    throw new OfflineConflict("Offline package expired. Reconnect and download it again.", "ASSIGNMENT_REVOKED");
  const current = await assignmentAuthorization(context.companyId, input.jobId, actor).catch(() => null);
  if (!current || current.authorizationVersion !== pkg.authorizationVersion) {
    await prisma.offlineFieldPackage.update({
      where: { id: pkg.id },
      data: { revokedAt: new Date(), revocationReason: "Assignment authorization changed." },
    });
    throw new OfflineConflict(
      "Crew assignment changed after this job was downloaded.",
      "ASSIGNMENT_REVOKED",
    );
  }
  return pkg;
}

function payloadText(payload: Record<string, unknown>, key: string, max: number) {
  const value = typeof payload[key] === "string" ? payload[key].trim() : "";
  if (!value || value.length > max) throw new Error(`${key} is required and must be ${max} characters or fewer.`);
  return value;
}

async function applyMutation(
  context: TenantContext,
  actor: FieldActor,
  input: OfflineMutationInput,
) {
  const job = await prisma.job.findFirst({
    where: { id: input.jobId, companyId: context.companyId },
    select: { id: true, status: true, fieldStage: true, fieldVersion: true, updatedAt: true },
  });
  if (!job) throw new OfflineConflict("Job is no longer available.", "ASSIGNMENT_REVOKED");
  if (job.status === "Cancelled")
    throw new OfflineConflict("The office cancelled this job while the device was offline.", "JOB_CANCELLED");

  if (input.mutationType === "JOB_FIELD_NOTE_ADD") {
    const note = payloadText(input.payload, "note", NOTE_LIMIT);
    await addFieldNote(context.companyId, job.id, actor, note);
    return { merged: true, kind: "field-note" };
  }

  if (input.mutationType === "JOB_CHECKLIST_UPDATE") {
    const key = payloadText(input.payload, "key", 100);
    const item = await prisma.fieldChecklistItem.findFirst({
      where: { companyId: context.companyId, jobId: job.id, key },
    });
    if (!item) throw new OfflineConflict("Checklist item no longer exists.", "CHECKLIST_CONFLICT");
    const baseUpdatedAt = String(input.payload.baseUpdatedAt ?? "");
    const completed = input.payload.completed === true;
    if (
      baseUpdatedAt &&
      item.updatedAt.toISOString() !== baseUpdatedAt &&
      Boolean(item.completedAt) !== completed
    )
      throw new OfflineConflict(
        "The office changed this checklist item after it was downloaded.",
        "CHECKLIST_CONFLICT",
      );
    const updated = await updateFieldChecklist(
      context.companyId,
      job.id,
      actor,
      key,
      completed,
      typeof input.payload.notes === "string" ? input.payload.notes : "",
    );
    return { checklistItemId: updated.id, merged: item.updatedAt.toISOString() !== baseUpdatedAt };
  }

  if (input.mutationType === "JOB_SIGNATURE_STAGE") {
    if (job.fieldVersion !== input.baseRecordVersion)
      throw new OfflineConflict(
        "Job status changed before the signature reached the server.",
        "SIGNATURE_CONFLICT",
      );
    const signatureData = payloadText(input.payload, "signatureData", SIGNATURE_LIMIT);
    const existing = await prisma.jobCompletionSignature.findUnique({ where: { jobId: job.id } });
    if (existing)
      throw new OfflineConflict("A completion signature is already attached.", "SIGNATURE_CONFLICT");
    const signature = await saveCompletionSignature(context.companyId, job.id, actor, {
      printedName: payloadText(input.payload, "signerName", 200),
      signatureData,
      device: payloadText(input.payload, "device", 500),
      notes: "Captured offline and received after connectivity returned.",
      deviceSignedAt: new Date(payloadText(input.payload, "signedAtDevice", 100)),
      deviceTimeZone: payloadText(input.payload, "deviceTimezone", 100),
      consentTextSnapshot: payloadText(input.payload, "consentText", 5_000),
      offlineIdempotencyKey: input.idempotencyKey,
    });
    return { signatureId: signature.id, receivedAt: new Date().toISOString() };
  }

  if (job.fieldVersion !== input.baseRecordVersion)
    throw new OfflineConflict(
      "The job changed on the server while this device was offline.",
      "VERSION_CONFLICT",
    );

  if (input.mutationType === "JOB_STATUS_UPDATE") {
    const stage = payloadText(input.payload, "stage", 50) as FieldJobStage;
    const updated = await transitionFieldStage(context.companyId, job.id, actor, stage, {
      baseVersion: input.baseRecordVersion,
      latitude: typeof input.payload.latitude === "number" ? input.payload.latitude : undefined,
      longitude: typeof input.payload.longitude === "number" ? input.payload.longitude : undefined,
    });
    return { fieldStage: updated.fieldStage, fieldVersion: updated.fieldVersion };
  }

  if (input.mutationType === "JOB_COMPLETION_STAGE") {
    const confirmed = await confirmFieldCompletion(
      context.companyId,
      job.id,
      actor,
      payloadText(input.payload, "notes", NOTE_LIMIT),
    );
    const completed = await transitionFieldStage(
      context.companyId,
      job.id,
      actor,
      "Completed",
      { baseVersion: confirmed.fieldVersion },
    );
    return {
      staged: false,
      completed: true,
      message: "Completion synced and confirmed by the server.",
      fieldVersion: completed.fieldVersion,
    };
  }

  throw new Error("Media mutations must use the staged media upload endpoint.");
}

function errorResult(error: unknown) {
  if (error instanceof OfflineConflict)
    return {
      status: "Conflict" as const,
      classification: error.classification,
      message: error.message,
    };
  const message = error instanceof Error ? error.message : "Offline mutation failed.";
  const retryable = /timeout|temporar|connection|unavailable|retry/i.test(message);
  return {
    status: retryable ? ("FailedRetryable" as const) : ("FailedPermanent" as const),
    classification: retryable ? "TRANSIENT" : "VALIDATION",
    message,
  };
}

export async function pushOfflineMutationBatch(
  context: TenantContext,
  values: unknown[],
) {
  if (!Array.isArray(values) || values.length > MAX_BATCH)
    throw new Error(`Offline sync batches are limited to ${MAX_BATCH} mutations.`);
  const actor = await fieldIdentity(context);
  const inputs = sortMutationsByDependencies(values.map(parseOfflineMutation));
  const results: Array<Record<string, unknown>> = [];
  for (const input of inputs) {
    const replay = await prisma.offlineFieldMutation.findUnique({
      where: {
        companyId_idempotencyKey: {
          companyId: context.companyId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (replay) {
      results.push({
        localMutationId: input.localMutationId,
        status: replay.status,
        replayed: true,
        serverResult: replay.serverResult,
        failureMessage: replay.failureMessage,
      });
      continue;
    }
    let packageId: string | undefined;
    let claimed = false;
    try {
      packageId = (await validatePackage(context, actor, input)).id;
      const persistedDependencies = input.dependencyIds.length
        ? await prisma.offlineFieldMutation.findMany({
            where: {
              companyId: context.companyId,
              userId: context.user.id,
              localMutationId: { in: input.dependencyIds },
            },
            select: { localMutationId: true, status: true },
          })
        : [];
      const conflictedDependency = persistedDependencies.find((row) =>
        ["Conflict", "FailedPermanent", "Cancelled"].includes(row.status),
      );
      if (conflictedDependency)
        throw new OfflineConflict(
          `Required change ${conflictedDependency.localMutationId} needs review before completion can sync.`,
          "DEPENDENCY_CONFLICT",
        );
      const missingDependency = input.dependencyIds.find(
        (id) =>
          !results.some(
            (row) => row.localMutationId === id && row.status === "Synced",
          ) &&
          !persistedDependencies.some(
            (row) => row.localMutationId === id && row.status === "Synced",
          ),
      );
      if (missingDependency)
        throw new Error(`Dependency ${missingDependency} has not synced.`);
      await prisma.offlineFieldMutation.create({
        data: {
          companyId: context.companyId,
          userId: context.user.id,
          employeeId: actor.employeeId,
          jobId: input.jobId,
          packageId,
          localMutationId: input.localMutationId,
          idempotencyKey: input.idempotencyKey,
          mutationType: input.mutationType,
          payload: input.payload as Prisma.InputJsonValue,
          baseRecordVersion: input.baseRecordVersion,
          dependencyIds: input.dependencyIds,
          status: "Syncing",
          attemptCount: 1,
          lastAttemptAt: new Date(),
          createdAt: new Date(input.createdAt),
        },
      });
      claimed = true;
      const serverResult = await applyMutation(context, actor, input);
      await prisma.$transaction([
        prisma.offlineFieldMutation.update({
          where: {
            companyId_idempotencyKey: {
              companyId: context.companyId,
              idempotencyKey: input.idempotencyKey,
            },
          },
          data: {
            status: "Synced",
            serverResult: serverResult as Prisma.InputJsonValue,
            appliedAt: new Date(),
          },
        }),
        prisma.auditEvent.create({
          data: {
            companyId: context.companyId,
            actingUserId: context.user.id,
            eventType: "offline.mutation.synced",
            entityType: "Job",
            entityId: input.jobId,
            metadata: {
              mutationType: input.mutationType,
              idempotencyKey: input.idempotencyKey,
            },
          },
        }),
      ]);
      results.push({ localMutationId: input.localMutationId, status: "Synced", serverResult });
    } catch (error) {
      if (!claimed) {
        const raced = await prisma.offlineFieldMutation.findUnique({
          where: {
            companyId_idempotencyKey: {
              companyId: context.companyId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (raced) {
          results.push({
            localMutationId: input.localMutationId,
            status: raced.status,
            replayed: true,
            serverResult: raced.serverResult,
            failureMessage: raced.failureMessage,
          });
          continue;
        }
      }
      const failure = errorResult(error);
      await prisma.offlineFieldMutation.upsert({
        where: {
          companyId_idempotencyKey: {
            companyId: context.companyId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        create: {
          companyId: context.companyId,
          userId: context.user.id,
          employeeId: actor.employeeId,
          jobId: input.jobId,
          packageId,
          localMutationId: input.localMutationId,
          idempotencyKey: input.idempotencyKey,
          mutationType: input.mutationType,
          payload: input.payload as Prisma.InputJsonValue,
          baseRecordVersion: input.baseRecordVersion,
          dependencyIds: input.dependencyIds,
          status: failure.status,
          attemptCount: 1,
          lastAttemptAt: new Date(),
          failureClassification: failure.classification,
          failureMessage: failure.message.slice(0, 1_000),
          createdAt: new Date(input.createdAt),
        },
        update: {
          status: failure.status,
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
          failureClassification: failure.classification,
          failureMessage: failure.message.slice(0, 1_000),
        },
      });
      logger.warn("offline_mutation_failed", {
        companyId: context.companyId,
        userId: context.user.id,
        jobId: input.jobId,
        mutationType: input.mutationType,
        classification: failure.classification,
      });
      results.push({ localMutationId: input.localMutationId, ...failure });
    }
  }
  return results;
}

export async function getAuthoritativeOfflineJob(context: TenantContext, jobId: string) {
  const actor = await fieldIdentity(context);
  await assignmentAuthorization(context.companyId, jobId, actor);
  return prisma.job.findFirstOrThrow({
    where: { id: jobId, companyId: context.companyId },
    select: offlineJobSelect,
  });
}

export async function acknowledgeOfflineSync(
  context: TenantContext,
  packageId: string,
  mutationIds: string[],
) {
  const now = new Date();
  const [pkg, mutations] = await prisma.$transaction([
    prisma.offlineFieldPackage.updateMany({
      where: { id: packageId, companyId: context.companyId, userId: context.user.id, revokedAt: null },
      data: { lastAcknowledgedAt: now },
    }),
    prisma.offlineFieldMutation.updateMany({
      where: {
        companyId: context.companyId,
        userId: context.user.id,
        localMutationId: { in: mutationIds.slice(0, 100) },
        status: "Synced",
      },
      data: { acknowledgedAt: now },
    }),
  ]);
  if (!pkg.count) throw new Error("Offline package not found.");
  return { acknowledged: mutations.count, acknowledgedAt: now };
}

export async function revokeOfflinePackage(
  context: TenantContext,
  packageId: string,
  reason = "Removed from device",
) {
  const manager = ["Owner", "Admin", "Manager", "Office"].includes(context.role);
  const result = await prisma.offlineFieldPackage.updateMany({
    where: {
      id: packageId,
      companyId: context.companyId,
      ...(manager ? {} : { userId: context.user.id }),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedByUserId: context.user.id,
      revocationReason: reason.slice(0, 500),
    },
  });
  if (!result.count) throw new Error("Offline package not found or already revoked.");
  logger.info("offline_package_revoked", {
    companyId: context.companyId,
    userId: context.user.id,
    packageId,
  });
  return { revoked: true };
}

export async function listOfflineSyncStatus(context: TenantContext) {
  return prisma.offlineFieldPackage.findMany({
    where: {
      companyId: context.companyId,
      ...(["Owner", "Admin", "Manager", "Office"].includes(context.role)
        ? {}
        : { userId: context.user.id }),
    },
    orderBy: { downloadedAt: "desc" },
    take: 100,
    select: {
      id: true,
      userId: true,
      jobId: true,
      downloadedAt: true,
      expiresAt: true,
      revokedAt: true,
      lastAcknowledgedAt: true,
      job: { select: { jobNumber: true, fieldStage: true } },
      mutations: {
        where: { status: { not: "Synced" } },
        select: {
          localMutationId: true,
          mutationType: true,
          status: true,
          failureClassification: true,
          failureMessage: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function uploadOfflineFieldPhoto(
  context: TenantContext,
  input: {
    packageId: string;
    jobId: string;
    localMutationId: string;
    idempotencyKey: string;
    file: File;
    category: "Before" | "During" | "After" | "Damage" | "AdditionalItems" | "Receipt";
    caption?: string;
    capturedAtDevice?: string;
  },
) {
  const actor = await fieldIdentity(context);
  if (!input.localMutationId || !input.idempotencyKey)
    throw new Error("Photo mutation identifiers are required.");
  const synthetic: OfflineMutationInput = {
    companyId: context.companyId,
    userId: context.user.id,
    packageId: input.packageId,
    jobId: input.jobId,
    localMutationId: input.localMutationId,
    idempotencyKey: input.idempotencyKey,
    mutationType: "JOB_PHOTO_STAGE",
    payload: {},
    baseRecordVersion: 0,
    dependencyIds: [],
    createdAt: input.capturedAtDevice ?? new Date().toISOString(),
    schemaVersion: OFFLINE_SCHEMA_VERSION,
  };
  const pkg = await validatePackage(context, actor, synthetic);
  validateJobPhotoFile(input.file);
  const replay = await prisma.offlineFieldMutation.findUnique({
    where: {
      companyId_idempotencyKey: {
        companyId: context.companyId,
        idempotencyKey: input.idempotencyKey,
      },
    },
  });
  if (replay?.status === "Synced") return replay.serverResult;
  const photo = await uploadJobPhotoIdempotent(context.companyId, input.jobId, {
    file: input.file,
    category: input.category,
    clientOperationId: input.idempotencyKey,
    caption: input.caption,
    customerVisible: false,
  });
  const result = {
    photoId: photo.id,
    capturedAtDevice: input.capturedAtDevice ?? null,
    receivedAt: new Date().toISOString(),
  };
  await prisma.$transaction([
    prisma.offlineFieldMutation.upsert({
      where: {
        companyId_idempotencyKey: {
          companyId: context.companyId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      create: {
        companyId: context.companyId,
        userId: context.user.id,
        employeeId: actor.employeeId,
        jobId: input.jobId,
        packageId: pkg.id,
        localMutationId: input.localMutationId,
        idempotencyKey: input.idempotencyKey,
        mutationType: "JOB_PHOTO_STAGE",
        payload: {
          fileName: input.file.name,
          mimeType: input.file.type,
          size: input.file.size,
          capturedAtDevice: input.capturedAtDevice,
        },
        baseRecordVersion: pkg.sourceRecordVersion,
        dependencyIds: [],
        status: "Synced",
        attemptCount: 1,
        lastAttemptAt: new Date(),
        serverResult: result,
        appliedAt: new Date(),
        createdAt: new Date(input.capturedAtDevice ?? Date.now()),
      },
      update: {
        status: "Synced",
        serverResult: result,
        appliedAt: new Date(),
      },
    }),
    prisma.auditEvent.create({
      data: {
        companyId: context.companyId,
        actingUserId: context.user.id,
        eventType: "offline.photo.synced",
        entityType: "JobPhoto",
        entityId: photo.id,
        metadata: { jobId: input.jobId, idempotencyKey: input.idempotencyKey },
      },
    }),
  ]);
  return result;
}
