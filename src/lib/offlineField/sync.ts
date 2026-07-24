"use client";

import type { OfflineScope } from "./contracts";
import {
  listOfflineRecords,
  patchOfflineMutation,
  putOfflineRecord,
  type LocalMutationRecord,
  type LocalRecord,
  type StagedMediaRecord,
} from "./store";

export type ConnectivityState =
  | "Online"
  | "Offline"
  | "Reconnecting"
  | "Syncing"
  | "Changes Pending"
  | "Conflict"
  | "Sync Failed";

export async function probeOfflineFieldServer(signal?: AbortSignal) {
  if (!navigator.onLine) return false;
  try {
    const response = await fetch("/api/field/offline/health", {
      cache: "no-store",
      credentials: "same-origin",
      signal,
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function pushMutations(scope: OfflineScope, rows: LocalMutationRecord[]) {
  if (!rows.length) return [];
  for (const row of rows)
    await patchOfflineMutation(scope, row.localId, {
      status: "Syncing",
      syncStatus: "Syncing",
      lastAttemptAt: new Date().toISOString(),
      attemptCount: row.attemptCount + 1,
    });
  const response = await fetch("/api/field/offline/mutations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mutations: rows }),
  });
  const body = (await response.json()) as {
    results?: Array<{
      localMutationId: string;
      status: LocalMutationRecord["status"];
      classification?: string;
      message?: string;
    }>;
    error?: string;
  };
  if (!response.ok) throw new Error(body.error ?? "Mutation sync failed.");
  for (const result of body.results ?? [])
    await patchOfflineMutation(scope, result.localMutationId, {
      status: result.status,
      syncStatus: result.status,
      failureClassification: result.classification,
      failureMessage: result.message,
    });
  return body.results ?? [];
}

async function uploadMedia(scope: OfflineScope, rows: StagedMediaRecord[]) {
  const results = [];
  for (const row of rows) {
    const form = new FormData();
    const metadata = row as StagedMediaRecord & { packageId?: string; category?: string };
    form.set("file", row.blob, row.fileName);
    form.set("packageId", metadata.packageId ?? "");
    form.set("jobId", row.jobId);
    form.set("localMutationId", row.localId);
    form.set("idempotencyKey", row.idempotencyKey);
    form.set("category", metadata.category ?? "During");
    form.set("caption", row.caption ?? "");
    form.set("capturedAtDevice", row.captureTime);
    const response = await fetch("/api/field/offline/media", { method: "POST", body: form });
    const body = (await response.json()) as { photoId?: string; error?: string };
    await putOfflineRecord("media", {
      ...row,
      updatedAt: new Date().toISOString(),
      syncStatus: response.ok ? "Synced" : "FailedRetryable",
      ...(response.ok ? {} : { failureMessage: body.error ?? "Photo upload failed." }),
    } as StagedMediaRecord & LocalRecord);
    results.push({ localId: row.localId, status: response.ok ? "Synced" : "FailedRetryable" });
    if (!response.ok) break;
  }
  return results;
}

export async function syncOfflineFieldData(scope: OfflineScope) {
  if (!(await probeOfflineFieldServer())) throw new Error("The server is not reachable.");
  const mutations = (await listOfflineRecords<LocalMutationRecord>("mutations", scope))
    .filter((row) => ["Pending", "FailedRetryable"].includes(row.status));
  const media = (await listOfflineRecords<StagedMediaRecord>("media", scope))
    .filter((row) => row.syncStatus !== "Synced");
  const ordinary = mutations.filter(
    (row) =>
      !["JOB_SIGNATURE_STAGE", "JOB_COMPLETION_STAGE", "JOB_PHOTO_STAGE"].includes(
        row.mutationType,
      ),
  );
  const signatures = mutations.filter((row) => row.mutationType === "JOB_SIGNATURE_STAGE");
  const completion = mutations.filter((row) => row.mutationType === "JOB_COMPLETION_STAGE");
  const results = [
    ...(await pushMutations(scope, ordinary)),
    ...(await uploadMedia(scope, media)),
    ...(await pushMutations(scope, signatures)),
    ...(await pushMutations(scope, completion)),
  ];
  const packages = await listOfflineRecords<LocalRecord & { id: string }>("packages", scope);
  const syncedIds = (await listOfflineRecords<LocalMutationRecord>("mutations", scope))
    .filter((row) => row.status === "Synced")
    .map((row) => row.localMutationId);
  for (const pkg of packages) {
    await fetch("/api/field/offline/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId: pkg.id, mutationIds: syncedIds }),
    }).catch(() => undefined);
  }
  return results;
}

export function deriveConnectivityState(input: {
  reachable: boolean;
  checking: boolean;
  syncing: boolean;
  pending: number;
  conflicts: number;
  failed: number;
}): ConnectivityState {
  if (input.syncing) return "Syncing";
  if (input.conflicts) return "Conflict";
  if (input.failed) return "Sync Failed";
  if (!input.reachable) return input.checking ? "Reconnecting" : "Offline";
  if (input.pending) return "Changes Pending";
  return "Online";
}

