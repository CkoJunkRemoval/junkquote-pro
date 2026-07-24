"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OfflinePhotoType } from "@/lib/fieldOperations/offlinePhotoQueue";
import type { OfflinePackageData } from "@/lib/offlineField/contracts";
import {
  createPhotoPreview,
  deleteOfflineRecord,
  listOfflineRecords,
  putOfflineRecord,
  saveOfflinePackage,
  stageOfflinePhoto,
  type LocalRecord,
  type StagedMediaRecord,
} from "@/lib/offlineField/store";
import {
  probeOfflineFieldServer,
  syncOfflineFieldData,
} from "@/lib/offlineField/sync";
import { captureNativePhoto } from "@/lib/native/camera";
import PhotoAnnotator from "./PhotoAnnotator";

export default function PhotoWorkspace({
  jobId,
  companyId,
  userId,
  manager,
}: {
  jobId: string;
  companyId: string;
  userId: string;
  manager: boolean;
}) {
  const [rows, setRows] = useState<StagedMediaRecord[]>([]);
  const [category, setCategory] = useState<OfflinePhotoType>("During");
  const [caption, setCaption] = useState("");
  const [message, setMessage] = useState("");
  const [annotating, setAnnotating] = useState<StagedMediaRecord | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const scope = { companyId, userId };
  const refresh = useCallback(
    () =>
      listOfflineRecords<StagedMediaRecord>("media", { companyId, userId }).then(
        (all) => setRows(all.filter((row) => row.jobId === jobId)),
      ),
    [companyId, userId, jobId],
  );
  const sync = useCallback(
    () => syncOfflineFieldData({ companyId, userId }).then(refresh),
    [companyId, userId, refresh],
  );
  useEffect(() => {
    void refresh().then(() => {
      if (navigator.onLine) return sync();
    });
    const online = () => void sync();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [refresh, sync]);

  async function packageForJob() {
    let pkg = (
      await listOfflineRecords<OfflinePackageData & LocalRecord>("packages", scope)
    ).find((row) => row.jobId === jobId);
    if (!pkg && (await probeOfflineFieldServer())) {
      const response = await fetch(`/api/field/offline/package/${jobId}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as OfflinePackageData & { error?: string };
      if (!response.ok)
        throw new Error(body.error ?? "Could not prepare offline photo storage.");
      pkg = await saveOfflinePackage(body);
    }
    if (!pkg)
      throw new Error("Make this job available offline before staging photos.");
    return pkg;
  }

  async function stage(files: FileList | File[]) {
    try {
      const pkg = await packageForJob();
      for (const file of Array.from(files)) {
        await stageOfflinePhoto({
          companyId,
          userId,
          jobId,
          packageId: pkg.id,
          blob: file,
          preview: await createPhotoPreview(file),
          fileName: file.name,
          mimeType: file.type,
          category,
          captureTime: new Date(file.lastModified || Date.now()).toISOString(),
          caption,
        });
      }
      setCaption("");
      await refresh();
      setMessage("Saved on this device.");
      if (await probeOfflineFieldServer()) await sync();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to stage photo.");
    }
  }

  async function cameraOrPhotos() {
    try {
      const nativePhoto = await captureNativePhoto();
      if (nativePhoto) await stage([nativePhoto]);
      else input.current?.click();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Camera is unavailable.");
    }
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Photo workspace</h2>
          <p className="text-sm text-slate-500">
            Originals stay on this device until an idempotent upload succeeds.
          </p>
        </div>
        <button className="min-h-11 rounded border px-3" onClick={() => void sync()}>
          Sync now
        </button>
      </div>
      {message && <p role="status" className="mt-2 text-sm">{message}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as OfflinePhotoType)}
          className="min-h-12 rounded border p-3"
        >
          {["Before", "During", "After", "Damage", "AdditionalItems", "Receipt"].map(
            (value) => <option key={value}>{value}</option>,
          )}
        </select>
        <input
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Caption"
          className="min-h-12 rounded border p-3"
        />
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic"
          capture="environment"
          multiple
          onChange={(event) => event.target.files && void stage(event.target.files)}
        />
        <button
          className="min-h-12 rounded bg-blue-600 px-4 text-white"
          onClick={() => void cameraOrPhotos()}
        >
          Camera or choose photos
        </button>
        {manager && (
          <p className="text-xs text-slate-500">
            Offline-staged photos remain internal until reviewed after sync.
          </p>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {rows.map((row) => (
          <QueuedPhoto
            key={row.localId}
            row={row}
            onAnnotate={() => setAnnotating(row)}
            onRetry={() =>
              void putOfflineRecord("media", {
                ...row,
                syncStatus: "Pending",
                failureMessage: undefined,
                updatedAt: new Date().toISOString(),
              }).then(sync)
            }
            onRemove={() =>
              void deleteOfflineRecord("media", scope, row.localId).then(refresh)
            }
          />
        ))}
      </div>
      {annotating && (
        <PhotoAnnotator
          file={annotating.blob}
          onCancel={() => setAnnotating(null)}
          onSave={(file) =>
            void createPhotoPreview(file)
              .then((preview) =>
                stageOfflinePhoto({
                  companyId,
                  userId,
                  jobId,
                  packageId: annotating.packageId,
                  blob: file,
                  preview,
                  fileName: file.name,
                  mimeType: file.type,
                  category: annotating.category,
                  captureTime: new Date().toISOString(),
                  caption: `Annotated: ${annotating.caption ?? ""}`,
                  areaId: annotating.areaId,
                }),
              )
              .then(() => {
                setAnnotating(null);
                return refresh();
              })
              .then(sync)
          }
        />
      )}
    </section>
  );
}

function QueuedPhoto({
  row,
  onAnnotate,
  onRetry,
  onRemove,
}: {
  row: StagedMediaRecord;
  onAnnotate: () => void;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const value = URL.createObjectURL(row.preview);
    if (image.current) image.current.src = value;
    return () => URL.revokeObjectURL(value);
  }, [row.preview]);
  return (
    <figure className="rounded-lg border p-2">
      <img
        ref={image}
        loading="lazy"
        alt={row.caption || row.fileName}
        className="aspect-square w-full rounded object-cover"
      />
      <figcaption className="mt-2 text-xs">
        <strong>{row.category}</strong> · {row.syncStatus}
        {row.failureMessage && <span className="block text-red-700">{row.failureMessage}</span>}
      </figcaption>
      <div className="mt-2 flex flex-wrap gap-1">
        <button className="min-h-11 rounded border px-2" onClick={onAnnotate}>
          Annotate
        </button>
        {row.syncStatus === "FailedRetryable" && (
          <button className="min-h-11 rounded border px-2" onClick={onRetry}>Retry</button>
        )}
        {!["Syncing", "Synced"].includes(row.syncStatus) && (
          <button className="min-h-11 rounded border px-2" onClick={onRemove}>Cancel</button>
        )}
      </div>
    </figure>
  );
}
