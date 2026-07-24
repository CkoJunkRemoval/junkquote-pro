"use client";

import { useEffect, useRef, useState } from "react";
import type { OfflinePackageData } from "@/lib/offlineField/contracts";
import {
  enqueueOfflineMutation,
  createPhotoPreview,
  openOfflineFieldDatabase,
  stageOfflinePhoto,
  type LocalRecord,
  type StagedMediaRecord,
} from "@/lib/offlineField/store";
import { OFFLINE_SCHEMA_VERSION } from "@/lib/offlineField/contracts";
import { FIELD_STAGE_ORDER } from "@/lib/fieldOperations/policy";
import SignaturePad from "@/components/estimate/SignaturePad";

export default function OfflineFieldShell() {
  const [packages, setPackages] = useState<Array<OfflinePackageData & LocalRecord>>([]);
  const [media, setMedia] = useState<StagedMediaRecord[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("Loading jobs saved on this device…");
  useEffect(() => {
    let active = true;
    void (async () => {
      const db = await openOfflineFieldDatabase();
      const tx = db.transaction(["packages", "media"], "readonly");
      const packageRequest = tx.objectStore("packages").getAll();
      const mediaRequest = tx.objectStore("media").getAll();
      tx.oncomplete = () => {
        if (!active) return;
        const valid = (packageRequest.result as Array<OfflinePackageData & LocalRecord>)
          .filter((row) => new Date(row.expiresAt) > new Date());
        setPackages(valid);
        setMedia(mediaRequest.result as StagedMediaRecord[]);
        const routeJob = window.location.pathname.match(/^\/field\/jobs\/([^/]+)/)?.[1];
        if (routeJob && valid.some((row) => row.jobId === routeJob)) setSelected(routeJob);
        setMessage(valid.length ? "" : "No jobs are currently available offline.");
        db.close();
      };
      tx.onerror = () => setMessage("Offline job storage could not be opened.");
    })();
    return () => { active = false; };
  }, []);
  const current = packages.find((pkg) => pkg.jobId === selected);
  if (current)
    return (
      <OfflineJobDetail
        pkg={current}
        photos={media.filter((row) => row.jobId === current.jobId)}
        back={() => setSelected("")}
      />
    );
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <header>
        <p className="text-sm font-semibold uppercase text-amber-700">Offline field mode</p>
        <h1 className="text-3xl font-bold">Saved jobs</h1>
        <p className="mt-1 text-sm text-slate-600">Only jobs previously made available on this device appear here.</p>
      </header>
      {message && <p role="status" className="rounded-xl border bg-white p-5">{message}</p>}
      {packages.map((pkg) => {
        const job = pkg.job as { jobNumber?: string; customer?: { firstName?: string; lastName?: string }; property?: { address?: string; city?: string } };
        return (
          <article className="rounded-xl border bg-white p-4 shadow-sm" key={pkg.id}>
            <h2 className="font-semibold">{job.jobNumber ?? "Field job"} · {job.customer?.firstName} {job.customer?.lastName}</h2>
            <p className="text-sm text-slate-600">{job.property?.address}, {job.property?.city}</p>
            <p className="mt-1 text-xs text-slate-500">Package expires {new Date(pkg.expiresAt).toLocaleString()}</p>
            <button className="mt-3 min-h-11 rounded bg-blue-700 px-4 font-semibold text-white" onClick={() => setSelected(pkg.jobId)}>Open saved job</button>
          </article>
        );
      })}
    </main>
  );
}

function OfflineJobDetail({
  pkg,
  photos,
  back,
}: {
  pkg: OfflinePackageData;
  photos: StagedMediaRecord[];
  back: () => void;
}) {
  const originalJob = pkg.job as {
    jobNumber?: string;
    fieldStage?: string;
    scheduledStart?: string;
    arrivalWindowStart?: string;
    arrivalWindowEnd?: string;
    customer?: { firstName?: string; lastName?: string; phone?: string; email?: string };
    property?: { address?: string; addressLine2?: string; city?: string; state?: string; zip?: string; gateCode?: string; accessNotes?: string };
    estimate?: { jobSites?: Array<{ id: string; name: string; items: Array<{ id: string; name: string; quantity: number; notes?: string }> }> };
    fieldChecklistItems?: Array<{ id: string; key: string; label: string; completedAt?: string; updatedAt?: string }>;
    customerInstructions?: string;
    customerNotes?: string;
    crewNotes?: string;
    fieldVersion: number;
    completionNotes?: string;
  };
  const [job, setJob] = useState(originalJob);
  const [notice, setNotice] = useState("");
  const [signatureMutationId, setSignatureMutationId] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [jobPhotos, setJobPhotos] = useState(photos);
  const [photoCategory, setPhotoCategory] = useState("During");
  const next = FIELD_STAGE_ORDER[FIELD_STAGE_ORDER.indexOf(job.fieldStage as (typeof FIELD_STAGE_ORDER)[number]) + 1];
  async function queue(
    mutationType: "JOB_STATUS_UPDATE" | "JOB_FIELD_NOTE_ADD" | "JOB_CHECKLIST_UPDATE" | "JOB_COMPLETION_STAGE" | "JOB_SIGNATURE_STAGE",
    payload: Record<string, unknown>,
    dependencyIds: string[] = [],
  ) {
    const id = crypto.randomUUID();
    await enqueueOfflineMutation({
      localMutationId: id,
      idempotencyKey: `offline:${pkg.jobId}:${id}`,
      companyId: pkg.companyId,
      userId: pkg.userId,
      jobId: pkg.jobId,
      packageId: pkg.id,
      mutationType,
      payload,
      baseRecordVersion: job.fieldVersion,
      dependencyIds,
      createdAt: new Date().toISOString(),
      schemaVersion: OFFLINE_SCHEMA_VERSION,
    });
    setNotice("Saved on this device — waiting to sync.");
    return id;
  }
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <button className="min-h-11 rounded border px-4" onClick={back}>Back to saved jobs</button>
      <header className="rounded-xl bg-slate-950 p-5 text-white">
        <p className="text-sm text-amber-300">Offline · saved on this device</p>
        <h1 className="text-2xl font-bold">{job.jobNumber ?? "Field job"} · {job.customer?.firstName} {job.customer?.lastName}</h1>
        <p>{job.property?.address} {job.property?.addressLine2}, {job.property?.city}, {job.property?.state} {job.property?.zip}</p>
        {job.customer?.phone && <a className="inline-flex min-h-11 items-center underline" href={`tel:${job.customer.phone}`}>{job.customer.phone}</a>}
      </header>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Appointment and access</h2>
        <p>{job.scheduledStart ? new Date(job.scheduledStart).toLocaleString() : "No appointment time"}</p>
        <p>Gate: {job.property?.gateCode || "None"}</p>
        <p>{job.property?.accessNotes || job.customerInstructions || "No crew access instructions."}</p>
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Operational status · {job.fieldStage}</h2>
        {next && (
          <button
            className="mt-3 min-h-11 rounded bg-blue-700 px-4 font-semibold text-white"
            onClick={() => void queue("JOB_STATUS_UPDATE", { stage: next }).then(() => setJob((current) => ({ ...current, fieldStage: next, fieldVersion: current.fieldVersion + 1 })))}
          >
            Move to {next}
          </button>
        )}
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Approved items</h2>
        {job.estimate?.jobSites?.flatMap((site) => site.items).map((item) => (
          <p key={item.id}>{item.quantity} × {item.name}{item.notes ? ` — ${item.notes}` : ""}</p>
        ))}
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Checklist</h2>
        {job.fieldChecklistItems?.map((item) => (
          <label key={item.id} className="flex min-h-11 items-center gap-3 border-b">
            <input
              type="checkbox"
              checked={Boolean(item.completedAt)}
              onChange={(event) => {
                const completed = event.target.checked;
                void queue("JOB_CHECKLIST_UPDATE", {
                  key: item.key,
                  completed,
                  baseUpdatedAt: item.updatedAt ?? "",
                }).then(() => setJob((current) => ({
                  ...current,
                  fieldChecklistItems: current.fieldChecklistItems?.map((row) =>
                    row.id === item.id ? { ...row, completedAt: completed ? new Date().toISOString() : undefined } : row,
                  ),
                })));
              }}
            />
            {item.label}
          </label>
        ))}
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Field notes</h2>
        <p>{job.customerNotes || job.crewNotes || "No field notes."}</p>
        <form
          className="mt-3"
          action={(form) => void queue("JOB_FIELD_NOTE_ADD", { note: String(form.get("note")) })}
        >
          <textarea required maxLength={5000} name="note" className="min-h-24 w-full rounded border p-3" placeholder="Add field note" />
          <button className="mt-2 min-h-11 rounded border px-4">Save on this device</button>
        </form>
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Stage photos</h2>
        <select className="mt-3 min-h-11 rounded border px-3" value={photoCategory} onChange={(event) => setPhotoCategory(event.target.value)}>
          {["Before", "During", "After", "Damage", "AdditionalItems", "Receipt"].map((value) => <option key={value}>{value}</option>)}
        </select>
        <input
          className="mt-2 block min-h-11 w-full"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          capture="environment"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void createPhotoPreview(file)
              .then((preview) => stageOfflinePhoto({
                companyId: pkg.companyId,
                userId: pkg.userId,
                jobId: pkg.jobId,
                packageId: pkg.id,
                blob: file,
                preview,
                fileName: file.name,
                mimeType: file.type,
                category: photoCategory,
                captureTime: new Date().toISOString(),
              }))
              .then((row) => {
                setJobPhotos((current) => [...current, row]);
                setNotice("Photo saved on this device — waiting to sync.");
              })
              .catch((error) => setNotice(error instanceof Error ? error.message : "Could not stage photo."));
          }}
        />
      </section>
      {jobPhotos.length > 0 && (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold">Downloaded photos</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {jobPhotos.map((photo) => <SavedPhoto key={photo.localId} photo={photo} />)}
          </div>
        </section>
      )}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Customer completion signature</h2>
        <form
          className="mt-3 space-y-2"
          action={(form) =>
            void queue("JOB_SIGNATURE_STAGE", {
              signerName: String(form.get("name")),
              signerRole: "Customer",
              signatureData,
              device: navigator.userAgent,
              signedAtDevice: new Date().toISOString(),
              deviceTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              consentText: "Customer confirmed job completion on this device.",
            }).then(setSignatureMutationId)
          }
        >
          <input required name="name" className="min-h-11 w-full rounded border px-3" placeholder="Signer name" />
          <SignaturePad onChange={setSignatureData} />
          <button disabled={!signatureData} className="min-h-11 rounded border px-4 disabled:opacity-60">Save signature on this device</button>
        </form>
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Stage completion</h2>
        <form
          className="mt-3"
          action={(form) => {
            const missingChecklist = job.fieldChecklistItems?.some((item) => !item.completedAt);
            const categories = new Set(jobPhotos.map((photo) => photo.category));
            if (missingChecklist || !categories.has("Before") || !categories.has("After") || !signatureMutationId) {
              setNotice("Completion needs the required checklist, before and after photos, and a signature.");
              return;
            }
            void queue(
              "JOB_COMPLETION_STAGE",
              { notes: String(form.get("completionNotes")) },
              [signatureMutationId],
            ).then(() => setNotice("Completed on this device — waiting to sync."));
          }}
        >
          <textarea required name="completionNotes" className="min-h-24 w-full rounded border p-3" placeholder="Completion notes" />
          <button className="mt-2 min-h-11 rounded bg-green-700 px-4 font-semibold text-white">Complete on this device</button>
        </form>
      </section>
      {notice && <p role="status" className="rounded-xl bg-blue-50 p-4 text-blue-950">{notice}</p>}
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
        Changes made offline are saved on this device and are not visible to the office until sync succeeds.
      </p>
    </main>
  );
}

function SavedPhoto({ photo }: { photo: StagedMediaRecord }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(photo.preview);
    if (image.current) image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [photo.preview]);
  return <img ref={image} alt={photo.caption || photo.fileName} className="aspect-square w-full rounded object-cover" />;
}
