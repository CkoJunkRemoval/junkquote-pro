export const OFFLINE_SCHEMA_VERSION = 1;
export const OFFLINE_PACKAGE_VERSION = 1;
export const OFFLINE_MUTATION_TYPES = [
  "JOB_STATUS_UPDATE",
  "JOB_FIELD_NOTE_ADD",
  "JOB_CHECKLIST_UPDATE",
  "JOB_COMPLETION_STAGE",
  "JOB_PHOTO_STAGE",
  "JOB_SIGNATURE_STAGE",
] as const;
export const OFFLINE_MUTATION_STATUSES = [
  "Pending",
  "Syncing",
  "Synced",
  "Conflict",
  "FailedRetryable",
  "FailedPermanent",
  "Cancelled",
] as const;

export type OfflineMutationType = (typeof OFFLINE_MUTATION_TYPES)[number];
export type OfflineMutationStatus = (typeof OFFLINE_MUTATION_STATUSES)[number];

export interface OfflineScope {
  companyId: string;
  userId: string;
}

export interface OfflineMutationInput extends OfflineScope {
  localMutationId: string;
  idempotencyKey: string;
  jobId: string;
  packageId: string;
  mutationType: OfflineMutationType;
  payload: Record<string, unknown>;
  baseRecordVersion: number;
  dependencyIds: string[];
  createdAt: string;
  schemaVersion: number;
}

export interface OfflinePackageData extends OfflineScope {
  id: string;
  localId: string;
  sourceType: "Job";
  sourceId: string;
  jobId: string;
  packageVersion: number;
  schemaVersion: number;
  authorizationVersion: string;
  downloadedAt: string;
  expiresAt: string;
  sourceRecordVersions: {
    job: number;
    checklist: Record<string, string>;
  };
  syncCapabilities: {
    mutationTypes: readonly OfflineMutationType[];
    maxBatchSize: number;
    photoMaxBytes: number;
    signatureMaxBytes: number;
  };
  assignment: {
    employeeId: string;
    authorized: true;
    assignedThrough: "employee" | "crew" | "manager";
  };
  job: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  syncStatus: "Synced";
}

export function parseOfflineMutation(value: unknown): OfflineMutationInput {
  if (!value || typeof value !== "object")
    throw new Error("Offline mutation must be an object.");
  const row = value as Record<string, unknown>;
  for (const key of [
    "localMutationId",
    "idempotencyKey",
    "jobId",
    "packageId",
    "companyId",
    "userId",
    "createdAt",
  ])
    if (typeof row[key] !== "string" || !String(row[key]).trim())
      throw new Error(`Offline mutation ${key} is required.`);
  if (!OFFLINE_MUTATION_TYPES.includes(row.mutationType as OfflineMutationType))
    throw new Error("Unsupported offline mutation type.");
  if (
    !Number.isInteger(row.baseRecordVersion) ||
    Number(row.baseRecordVersion) < 0
  )
    throw new Error("Offline mutation record version is invalid.");
  if (row.schemaVersion !== OFFLINE_SCHEMA_VERSION)
    throw new Error("Offline mutation schema is no longer supported.");
  if (!Array.isArray(row.dependencyIds) || row.dependencyIds.length > 25)
    throw new Error("Offline mutation dependencies are invalid.");
  if (!row.payload || typeof row.payload !== "object" || Array.isArray(row.payload))
    throw new Error("Offline mutation payload is invalid.");
  if (String(row.localMutationId).length > 100 || String(row.idempotencyKey).length > 160)
    throw new Error("Offline mutation identifier is too long.");
  const created = new Date(String(row.createdAt));
  if (!Number.isFinite(created.getTime()))
    throw new Error("Offline mutation creation time is invalid.");
  return row as unknown as OfflineMutationInput;
}

export function sortMutationsByDependencies(rows: OfflineMutationInput[]) {
  const remaining = new Map(rows.map((row) => [row.localMutationId, row]));
  const result: OfflineMutationInput[] = [];
  while (remaining.size) {
    const ready = [...remaining.values()]
      .filter((row) =>
        row.dependencyIds.every(
          (id) => !remaining.has(id) || result.some((done) => done.localMutationId === id),
        ),
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (!ready.length) throw new Error("Offline mutation dependencies contain a cycle.");
    for (const row of ready) {
      remaining.delete(row.localMutationId);
      result.push(row);
    }
  }
  return result;
}

