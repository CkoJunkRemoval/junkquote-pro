"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { uploadQueuedFieldPhotoAction } from "@/app/actions/field/fieldOperations";
import {
  compressPhoto,
  enqueueOfflinePhoto,
  listOfflinePhotos,
  removeOfflinePhoto,
  retryOfflinePhoto,
  syncOfflinePhotos,
  type OfflinePhotoRecord,
  type OfflinePhotoType,
} from "@/lib/fieldOperations/offlinePhotoQueue";
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
  const [rows, setRows] = useState<OfflinePhotoRecord[]>([]),
    [category, setCategory] = useState<OfflinePhotoType>("During"),
    [caption, setCaption] = useState(""),
    [visible, setVisible] = useState(false),
    [message, setMessage] = useState(""),
    [annotating, setAnnotating] = useState<OfflinePhotoRecord | null>(null),
    input = useRef<HTMLInputElement>(null);
  const refresh = useCallback(
    () => listOfflinePhotos({ companyId, userId, jobId }).then(setRows),
    [companyId, userId, jobId],
  );
  const upload = useCallback(
    async (row: OfflinePhotoRecord) => {
      const form = new FormData();
      form.set("jobId", jobId);
      form.set(
        "file",
        new File([row.file], row.fileName, { type: row.mimeType }),
      );
      form.set("category", row.photoType);
      form.set("clientOperationId", row.clientOperationId);
      form.set("caption", row.caption);
      form.set("customerVisible", String(row.customerVisible));
      if (row.annotationMetadata)
        form.set("annotationMetadata", JSON.stringify(row.annotationMetadata));
      return uploadQueuedFieldPhotoAction(form);
    },
    [jobId],
  );
  const sync = useCallback(
    () => syncOfflinePhotos({ companyId, userId, jobId }, upload).then(refresh),
    [companyId, userId, jobId, refresh, upload],
  );
  useEffect(() => {
    void refresh().then(() => { if (navigator.onLine) return sync(); });
    const online = () => void sync();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [refresh, sync]);
  async function add(files: FileList | File[]) {
    try {
      for (const original of Array.from(files)) {
        const file = await compressPhoto(original);
        await enqueueOfflinePhoto({
          companyId,
          userId,
          jobId,
          file,
          fileName: file.name,
          mimeType: file.type,
          photoType: category,
          customerVisible: manager && visible,
          caption,
        });
      }
      setCaption("");
      await refresh();
      if (navigator.onLine) await sync();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to queue photo.");
    }
  }
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Photo workspace</h2>
          <p className="text-sm text-slate-500">
            {typeof navigator === "undefined" || navigator.onLine
              ? "Online · uploads resume automatically"
              : "Offline · photos are safely stored on this device"}
          </p>
        </div>
        <button
          className="min-h-11 rounded border px-3"
          onClick={() => void sync()}
        >
          Sync now
        </button>
      </div>
      {message && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {message}
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as OfflinePhotoType)}
          className="min-h-12 rounded border p-3"
        >
          {[
            ["Before", "Before"],
            ["During", "During"],
            ["After", "After"],
            ["Damage", "Damage"],
            ["AdditionalItems", "Additional items"],
            ["Receipt", "Receipt"],
          ].map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption"
          className="min-h-12 rounded border p-3"
        />
        {manager && (
          <label className="flex min-h-12 items-center gap-3">
            <input
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
              type="checkbox"
            />{" "}
            Customer visible
          </label>
        )}
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic"
          capture="environment"
          multiple
          onChange={(e) => e.target.files && void add(e.target.files)}
        />
        <button
          className="min-h-12 rounded bg-blue-600 px-4 text-white"
          onClick={() => input.current?.click()}
        >
          Camera or choose photos
        </button>
      </div>
      <div
        tabIndex={0}
        role="button"
        aria-label="Drop photos to upload"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void add(e.dataTransfer.files);
        }}
        className="mt-3 grid min-h-24 place-items-center rounded-xl border-2 border-dashed border-slate-300 p-4 text-center text-slate-600"
      >
        Drag and drop multiple photos here
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {rows.map((row) => (
          <QueuedPhoto
            key={row.localId}
            row={row}
            onAnnotate={() => setAnnotating(row)}
            onRetry={() => void retryOfflinePhoto(row.localId).then(sync)}
            onRemove={() =>
              void removeOfflinePhoto(row.localId, { companyId, userId }).then(
                refresh,
              )
            }
          />
        ))}
      </div>
      {annotating && (
        <PhotoAnnotator
          file={annotating.file}
          onCancel={() => setAnnotating(null)}
          onSave={(file, metadata) =>
            void enqueueOfflinePhoto({
              companyId,
              userId,
              jobId,
              file,
              fileName: file.name,
              mimeType: file.type,
              photoType: annotating.photoType,
              customerVisible: annotating.customerVisible,
              caption: `Annotated: ${annotating.caption}`,
              annotationMetadata: metadata,
              originalLocalId: annotating.localId,
            })
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
  row: OfflinePhotoRecord;
  onAnnotate: () => void;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const value = URL.createObjectURL(row.file);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [row.file]);
  return (
    <figure className="rounded-lg border p-2">
      <img
        loading="lazy"
        src={url}
        alt={row.caption || row.fileName}
        className="aspect-square w-full rounded object-cover"
      />
      <figcaption className="mt-2 text-xs">
        <strong>{row.photoType}</strong> · {row.syncState}
        {row.retryCount > 0 && ` · retry ${row.retryCount}`}
        {row.error && <span className="block text-red-700">{row.error}</span>}
      </figcaption>
      <div className="mt-2 flex flex-wrap gap-1">
        <button className="min-h-10 rounded border px-2" onClick={onAnnotate}>
          Annotate
        </button>
        {row.syncState === "failed" && (
          <button className="min-h-10 rounded border px-2" onClick={onRetry}>
            Retry
          </button>
        )}
        {row.syncState !== "uploading" && row.syncState !== "synced" && (
          <button className="min-h-10 rounded border px-2" onClick={onRemove}>
            Cancel
          </button>
        )}
      </div>
    </figure>
  );
}
