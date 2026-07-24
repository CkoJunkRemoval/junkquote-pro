"use client";

import { CloudDownload, HardDrive, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cleanupOfflineData,
  cacheOfflinePackagePhotos,
  estimateOfflineStorage,
  listOfflineRecords,
  patchOfflineMutation,
  removeOfflinePackage,
  saveOfflinePackage,
  type LocalMutationRecord,
  type LocalRecord,
} from "@/lib/offlineField/store";
import type { OfflinePackageData, OfflineScope } from "@/lib/offlineField/contracts";
import {
  deriveConnectivityState,
  probeOfflineFieldServer,
  syncOfflineFieldData,
} from "@/lib/offlineField/sync";

type JobSummary = {
  id: string;
  jobNumber: string | null;
  customerName: string;
};

export default function OfflineSyncCenter({
  companyId,
  userId,
  jobs,
}: OfflineScope & { jobs: JobSummary[] }) {
  const scope = useMemo(() => ({ companyId, userId }), [companyId, userId]);
  const [packages, setPackages] = useState<Array<OfflinePackageData & LocalRecord>>([]);
  const [mutations, setMutations] = useState<LocalMutationRecord[]>([]);
  const [reachable, setReachable] = useState(true);
  const [checking, setChecking] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [storageBytes, setStorageBytes] = useState(0);

  const refreshLocal = useCallback(async () => {
    setPackages(await listOfflineRecords<OfflinePackageData & LocalRecord>("packages", scope));
    setMutations(await listOfflineRecords<LocalMutationRecord>("mutations", scope));
    setStorageBytes((await estimateOfflineStorage(scope)).fieldBytes);
  }, [scope]);

  const probe = useCallback(async () => {
    setChecking(true);
    const next = await probeOfflineFieldServer();
    setReachable(next);
    setChecking(false);
    return next;
  }, []);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setMessage("");
    try {
      const results = await syncOfflineFieldData(scope);
      setReachable(true);
      setMessage(
        results.some((result) => result.status === "Conflict")
          ? "Some changes need review."
          : results.some((result) => String(result.status).startsWith("Failed"))
            ? "Some changes could not sync."
            : results.length
              ? "Changes synced."
              : "Everything is already synced.",
      );
    } catch (error) {
      setReachable(false);
      setMessage(error instanceof Error ? error.message : "Could not sync.");
    } finally {
      setSyncing(false);
      await refreshLocal();
    }
  }, [refreshLocal, scope, syncing]);

  useEffect(() => {
    let cancelled = false;
    void cleanupOfflineData(scope).then(refreshLocal);
    const initial = window.setTimeout(() => void probe(), 0);
    const online = () => void probe().then((ok) => { if (ok) void sync(); });
    const offline = () => setReachable(false);
    const resume = () => void probe().then((ok) => { if (ok) void sync(); });
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("junkquote:app-resume", resume);
    const timer = window.setInterval(() => {
      if (!cancelled) void probe().then((ok) => { if (ok) void sync(); });
    }, 5 * 60_000);
    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("junkquote:app-resume", resume);
    };
  }, [probe, refreshLocal, scope, sync]);

  const pending = mutations.filter((row) =>
    ["Pending", "Syncing", "FailedRetryable"].includes(row.status),
  ).length;
  const conflicts = mutations.filter((row) => row.status === "Conflict").length;
  const failed = mutations.filter((row) => row.status === "FailedPermanent").length;
  const state = deriveConnectivityState({
    reachable,
    checking,
    syncing,
    pending,
    conflicts,
    failed,
  });

  async function download(jobId: string) {
    setMessage("");
    const response = await fetch(`/api/field/offline/package/${jobId}`, {
      cache: "no-store",
    });
    const body = (await response.json()) as OfflinePackageData & { error?: string };
    if (!response.ok) {
      setMessage(body.error ?? "Could not make this job available offline.");
      return;
    }
    await saveOfflinePackage(body);
    const cachedPhotos = await cacheOfflinePackagePhotos(body);
    await refreshLocal();
    setMessage(`Job saved on this device${cachedPhotos ? ` with ${cachedPhotos} photo(s)` : ""}.`);
  }

  async function remove(pkg: OfflinePackageData) {
    if (reachable)
      await fetch("/api/field/offline/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id, reason: "Removed from device" }),
      }).catch(() => undefined);
    await removeOfflinePackage(scope, pkg.jobId);
    await refreshLocal();
    setMessage("Downloaded job data removed.");
  }

  async function cancelMutation(row: LocalMutationRecord) {
    await patchOfflineMutation(scope, row.localId, {
      status: "Cancelled",
      syncStatus: "Cancelled",
      failureMessage: undefined,
    });
    await refreshLocal();
  }

  const packageByJob = new Map(packages.map((pkg) => [pkg.jobId, pkg]));
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Offline field mode
          </p>
          <h2 className="text-lg font-bold">Device sync</h2>
        </div>
        <div className="flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm" role="status" aria-live="polite">
          {reachable ? <Wifi size={17} /> : <WifiOff size={17} />}
          {state}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <p><strong>{pending}</strong><span className="block text-slate-500">Pending</span></p>
        <p><strong>{conflicts}</strong><span className="block text-slate-500">Needs review</span></p>
        <p><strong>{packages.length}</strong><span className="block text-slate-500">Offline jobs</span></p>
        <p><strong>{(storageBytes / 1024 / 1024).toFixed(1)} MB</strong><span className="block text-slate-500">Staged media</span></p>
      </div>
      <button
        type="button"
        onClick={() => void sync()}
        disabled={syncing || !reachable}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 font-semibold text-white outline-offset-2 focus-visible:outline-2 disabled:opacity-60"
      >
        <RefreshCw className={syncing ? "animate-spin motion-reduce:animate-none" : ""} size={18} />
        Sync now
      </button>
      {message && <p className="mt-3 text-sm" role="status">{message}</p>}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {jobs.map((job) => {
          const pkg = packageByJob.get(job.id);
          const count = mutations.filter(
            (mutation) => mutation.jobId === job.id && mutation.status !== "Synced",
          ).length;
          return (
            <article key={job.id} className="rounded-lg border p-3">
              <p className="font-semibold">{job.jobNumber ?? "Job"} · {job.customerName}</p>
              {pkg ? (
                <>
                  <p className="mt-1 text-xs text-slate-500">
                    Downloaded {new Date(pkg.downloadedAt).toLocaleString()} · {count} pending
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Link className="inline-flex min-h-11 items-center rounded border px-3" href={`/field/jobs/${job.id}`}>Open</Link>
                    <button className="inline-flex min-h-11 items-center gap-1 rounded border border-red-300 px-3 text-red-700" onClick={() => void remove(pkg)}>
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                </>
              ) : (
                <button
                  className="mt-2 inline-flex min-h-11 items-center gap-2 rounded border px-3"
                  onClick={() => void download(job.id)}
                  disabled={!reachable}
                >
                  <CloudDownload size={17} /> Make available offline
                </button>
              )}
            </article>
          );
        })}
      </div>

      {(conflicts > 0 || failed > 0) && (
        <div className="mt-5 space-y-3">
          <h3 className="font-semibold">Changes needing review</h3>
          {mutations
            .filter((row) => ["Conflict", "FailedPermanent"].includes(row.status))
            .map((row) => (
              <article className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950" key={row.localId}>
                <p className="font-medium">{row.mutationType.replaceAll("_", " ")}</p>
                <p className="text-sm">{row.failureMessage ?? "The server refused this local change."}</p>
                <p className="mt-1 text-xs">Local version {row.baseRecordVersion}. Server data was preserved.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="min-h-11 rounded border px-3" onClick={() => void cancelMutation(row)}>Keep server version</button>
                  <Link className="inline-flex min-h-11 items-center rounded border px-3" href={`/field/jobs/${row.jobId}`}>Open after reconnecting</Link>
                  <span className="inline-flex min-h-11 items-center rounded border px-3 text-sm">Request office review</span>
                </div>
              </article>
            ))}
        </div>
      )}
      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <HardDrive size={14} />
        Offline records are stored in browser-managed IndexedDB. Browser storage is not guaranteed to be encrypted at rest.
      </p>
    </section>
  );
}
