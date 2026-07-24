"use client";

import type {
  OfflineMutationInput,
  OfflineMutationStatus,
  OfflinePackageData,
  OfflineScope,
} from "./contracts";

const DB_NAME = "junkquote-offline-field-v1";
const DB_VERSION = 1;
export const OFFLINE_STORES = [
  "packages",
  "mutations",
  "media",
  "signatures",
  "syncResults",
  "conflicts",
  "metadata",
] as const;
type StoreName = (typeof OFFLINE_STORES)[number];
export const LOCAL_OFFLINE_DATA_LIMIT_BYTES = 250 * 1024 * 1024;

export interface LocalRecord extends OfflineScope {
  localId: string;
  sourceType: string;
  sourceId: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
  schemaVersion: number;
}

export interface LocalMutationRecord extends LocalRecord, OfflineMutationInput {
  status: OfflineMutationStatus;
  attemptCount: number;
  lastAttemptAt?: string;
  failureClassification?: string;
  failureMessage?: string;
}

export interface StagedMediaRecord extends LocalRecord {
  jobId: string;
  packageId: string;
  idempotencyKey: string;
  blob: Blob;
  preview: Blob;
  fileName: string;
  mimeType: string;
  captureTime: string;
  areaId?: string;
  caption?: string;
  order: number;
  byteSize: number;
  category: string;
  failureMessage?: string;
}

export interface StagedSignatureRecord extends LocalRecord {
  jobId: string;
  idempotencyKey: string;
  signerName: string;
  signerRole: string;
  signatureData: string;
  signedAtDevice: string;
  deviceTimezone: string;
  context: string;
  consentText: string;
}

function request<T>(input: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    input.onsuccess = () => resolve(input.result);
    input.onerror = () => reject(input.error ?? new Error("IndexedDB operation failed."));
  });
}

function completed(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed."));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction was cancelled."));
  });
}

export async function openOfflineFieldDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      for (const name of OFFLINE_STORES) {
        if (db.objectStoreNames.contains(name)) continue;
        const store = db.createObjectStore(name, { keyPath: "localId" });
        store.createIndex("scope", ["companyId", "userId"]);
        store.createIndex("source", ["companyId", "userId", "sourceType", "sourceId"]);
        store.createIndex("sync", ["companyId", "userId", "syncStatus"]);
        store.createIndex("updatedAt", "updatedAt");
      }
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () =>
      reject(open.error ?? new Error("Offline field storage is unavailable."));
  });
}

async function withStore<T>(
  name: StoreName,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => Promise<T> | T,
) {
  const db = await openOfflineFieldDatabase();
  const tx = db.transaction(name, mode);
  try {
    const result = await operation(tx.objectStore(name));
    await completed(tx);
    return result;
  } finally {
    db.close();
  }
}

export function belongsToScope(record: OfflineScope, scope: OfflineScope) {
  return record.companyId === scope.companyId && record.userId === scope.userId;
}

export async function putOfflineRecord<T extends LocalRecord>(
  store: StoreName,
  record: T,
) {
  return withStore(store, "readwrite", async (objectStore) => {
    await request(objectStore.put(record));
    return record;
  });
}

export async function deleteOfflineRecord(
  storeName: StoreName,
  scope: OfflineScope,
  localId: string,
) {
  return withStore(storeName, "readwrite", async (store) => {
    const row = (await request(store.get(localId))) as LocalRecord | undefined;
    if (row && !belongsToScope(row, scope))
      throw new Error("Offline record does not belong to this account.");
    if (row) store.delete(localId);
  });
}

export async function stageOfflinePhoto(
  input: Omit<
    StagedMediaRecord,
    "localId" | "idempotencyKey" | "sourceType" | "sourceId" | "createdAt" | "updatedAt" | "syncStatus" | "schemaVersion" | "order" | "byteSize"
  >,
) {
  if (!["image/jpeg", "image/png", "image/webp", "image/heic"].includes(input.mimeType))
    throw new Error("Only JPEG, PNG, WebP, and HEIC photos are supported.");
  if (input.blob.size <= 0 || input.blob.size > 10 * 1024 * 1024)
    throw new Error("Photo must be no larger than 10 MB.");
  const existing = await listOfflineRecords<StagedMediaRecord>("media", input);
  const pending = existing.filter((row) => row.syncStatus !== "Synced");
  if (pending.length >= 50) throw new Error("Sync or remove photos before staging more than 50.");
  const total = pending.reduce((sum, row) => sum + row.byteSize, 0) + input.blob.size;
  if (total > 200 * 1024 * 1024)
    throw new Error("Offline photo storage limit of 200 MB would be exceeded.");
  const now = new Date().toISOString();
  const localId = crypto.randomUUID();
  const row: StagedMediaRecord = {
    ...input,
    localId,
    idempotencyKey: `offline-photo:${input.jobId}:${localId}`,
    sourceType: "Job",
    sourceId: input.jobId,
    createdAt: now,
    updatedAt: now,
    syncStatus: "Pending",
    schemaVersion: 1,
    order: existing.length,
    byteSize: input.blob.size,
  };
  return putOfflineRecord("media", row);
}

export async function createPhotoPreview(file: Blob, maxDimension = 480) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file.slice();
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create photo preview."))),
      "image/jpeg",
      0.72,
    ),
  );
}

export async function cacheOfflinePackagePhotos(pkg: OfflinePackageData) {
  const job = pkg.job as {
    photos?: Array<{
      id: string;
      fileUrl: string;
      thumbnailUrl?: string | null;
      fileName: string;
      mimeType: string;
      category: string;
      caption?: string | null;
      takenAt?: string | Date | null;
      sortOrder: number;
    }>;
  };
  const existing = await listOfflineRecords<StagedMediaRecord>("media", pkg);
  let used = existing.reduce((sum, row) => sum + row.byteSize, 0);
  let cached = 0;
  for (const photo of (job.photos ?? []).slice(0, 100)) {
    if (existing.some((row) => row.localId === `server-photo:${photo.id}`)) continue;
    try {
      const response = await fetch(photo.fileUrl, { credentials: "same-origin" });
      if (!response.ok) continue;
      const blob = await response.blob();
      if (blob.size > 10 * 1024 * 1024 || used + blob.size > 200 * 1024 * 1024) break;
      const now = new Date().toISOString();
      await putOfflineRecord("media", {
        localId: `server-photo:${photo.id}`,
        companyId: pkg.companyId,
        userId: pkg.userId,
        sourceType: "JobPhoto",
        sourceId: photo.id,
        jobId: pkg.jobId,
        packageId: pkg.id,
        idempotencyKey: `server-photo:${photo.id}`,
        blob,
        preview: await createPhotoPreview(blob),
        fileName: photo.fileName,
        mimeType: photo.mimeType,
        captureTime: photo.takenAt ? new Date(photo.takenAt).toISOString() : now,
        caption: photo.caption ?? undefined,
        order: photo.sortOrder,
        byteSize: blob.size,
        category: photo.category,
        createdAt: now,
        updatedAt: now,
        syncStatus: "Synced",
        schemaVersion: 1,
      } satisfies StagedMediaRecord);
      used += blob.size;
      cached += 1;
    } catch {
      // A missing optional photo must not prevent the core job package download.
    }
  }
  return cached;
}

export async function listOfflineRecords<T extends LocalRecord>(
  store: StoreName,
  scope: OfflineScope,
) {
  return withStore(store, "readonly", async (objectStore) =>
    (await request(objectStore.getAll()) as T[])
      .filter((row) => belongsToScope(row, scope))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  );
}

export function saveOfflinePackage(pkg: OfflinePackageData) {
  return putOfflineRecord("packages", pkg as OfflinePackageData & LocalRecord);
}

export async function removeOfflinePackage(scope: OfflineScope, jobId: string) {
  const packageRows = await listOfflineRecords<OfflinePackageData & LocalRecord>("packages", scope);
  const matching = packageRows.filter((row) => row.jobId === jobId);
  const dependentStores: StoreName[] = ["packages", "mutations", "media", "signatures", "syncResults", "conflicts"];
  for (const storeName of dependentStores) {
    await withStore(storeName, "readwrite", async (store) => {
      const rows = (await request(store.getAll())) as LocalRecord[];
      for (const row of rows)
        if (belongsToScope(row, scope) && (row.sourceId === jobId || matching.some((pkg) => pkg.id === row.sourceId)))
          store.delete(row.localId);
    });
  }
}

export function enqueueOfflineMutation(
  input: OfflineMutationInput,
): Promise<LocalMutationRecord> {
  const row: LocalMutationRecord = {
    ...input,
    localId: input.localMutationId,
    sourceType: "Job",
    sourceId: input.jobId,
    updatedAt: input.createdAt,
    syncStatus: "Pending",
    status: "Pending",
    attemptCount: 0,
  };
  return putOfflineRecord("mutations", row);
}

export async function patchOfflineMutation(
  scope: OfflineScope,
  localId: string,
  changes: Partial<LocalMutationRecord>,
) {
  return withStore("mutations", "readwrite", async (store) => {
    const row = (await request(store.get(localId))) as LocalMutationRecord | undefined;
    if (!row || !belongsToScope(row, scope))
      throw new Error("Offline mutation does not belong to this account.");
    const next = {
      ...row,
      ...changes,
      localId: row.localId,
      companyId: row.companyId,
      userId: row.userId,
      updatedAt: new Date().toISOString(),
    };
    await request(store.put(next));
    return next;
  });
}

export async function cleanupOfflineData(
  activeScope?: OfflineScope,
  now = Date.now(),
) {
  let removed = 0;
  for (const storeName of OFFLINE_STORES) {
    await withStore(storeName, "readwrite", async (store) => {
      const rows = (await request(store.getAll())) as Array<LocalRecord & { expiresAt?: string }>;
      for (const row of rows) {
        const expired = row.expiresAt ? new Date(row.expiresAt).getTime() <= now : false;
        const priorSession = activeScope ? !belongsToScope(row, activeScope) : true;
        const completedOld =
          row.syncStatus === "Synced" &&
          new Date(row.updatedAt).getTime() < now - 7 * 24 * 60 * 60 * 1000;
        if (expired || priorSession || completedOld) {
          store.delete(row.localId);
          removed += 1;
        }
      }
    });
  }
  return removed;
}

export async function clearAllOfflineFieldData() {
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve, reject) => {
    const deletion = indexedDB.deleteDatabase(DB_NAME);
    deletion.onsuccess = () => resolve();
    deletion.onerror = () =>
      reject(deletion.error ?? new Error("Could not clear offline field data."));
    deletion.onblocked = () => resolve();
  });
  await new Promise<void>((resolve, reject) => {
    const deletion = indexedDB.deleteDatabase("junkquote-field-photos-v1");
    deletion.onsuccess = () => resolve();
    deletion.onerror = () => reject(deletion.error ?? new Error("Could not clear legacy photo data."));
    deletion.onblocked = () => resolve();
  });
}

export async function estimateOfflineStorage(scope: OfflineScope) {
  const media = await listOfflineRecords<StagedMediaRecord>("media", scope);
  const usage = media.reduce((total, row) => total + row.byteSize, 0);
  const estimate = await navigator.storage?.estimate?.();
  return { fieldBytes: usage, browserUsage: estimate?.usage ?? usage, browserQuota: estimate?.quota };
}
