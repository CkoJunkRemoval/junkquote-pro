"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { getFieldJob } from "@/lib/fieldOperations/fieldOperations";
import { FIELD_STAGE_ORDER } from "@/lib/fieldOperations/policy";
import {
  addFieldNoteAction,
  confirmFieldCompletionAction,
  deleteFieldPhotoAction,
  recordFieldTimeEventAction,
  requestFieldChangeOrderAction,
  reorderFieldPhotosAction,
  saveCompletionSignatureAction,
  transitionFieldStageAction,
  updateFieldChecklistAction,
  updateFieldPhotoAction,
} from "@/app/actions/field/fieldOperations";
import PhotoWorkspace from "./PhotoWorkspace";
import DisposalForm from "./DisposalForm";
import {
  enqueueOfflineMutation,
  listOfflineRecords,
  type LocalMutationRecord,
  type LocalRecord,
  type StagedMediaRecord,
} from "@/lib/offlineField/store";
import {
  OFFLINE_SCHEMA_VERSION,
  type OfflineMutationType,
  type OfflinePackageData,
} from "@/lib/offlineField/contracts";
import { probeOfflineFieldServer } from "@/lib/offlineField/sync";
import SignaturePad from "@/components/estimate/SignaturePad";

type Job = NonNullable<Awaited<ReturnType<typeof getFieldJob>>>;
export default function FieldJobClient({ initialJob, companyId, userId, manager }: { initialJob: Job; companyId: string; userId: string; manager: boolean }) {
  const [job, setJob] = useState(initialJob);
  const [message, setMessage] = useState("");
  const [offlinePackage, setOfflinePackage] = useState<(OfflinePackageData & LocalRecord) | null>(null);
  const [reachable, setReachable] = useState(true);
  const [completionSignature, setCompletionSignature] = useState("");
  const [pending, start] = useTransition();
  const next = FIELD_STAGE_ORDER[FIELD_STAGE_ORDER.indexOf(job.fieldStage) + 1];
  const address = `${job.property.address}, ${job.property.city}, ${job.property.state} ${job.property.zip}`;
  const scope = useMemo(() => ({ companyId, userId }), [companyId, userId]);
  useEffect(() => {
    let active = true;
    void listOfflineRecords<OfflinePackageData & LocalRecord>("packages", scope).then((rows) => {
      if (active) setOfflinePackage(rows.find((row) => row.jobId === job.id) ?? null);
    });
    const offline = () => setReachable(false);
    const online = () => void probeOfflineFieldServer().then(setReachable);
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    void online();
    return () => {
      active = false;
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, [job.id, scope]);
  const run = (fn: () => Promise<unknown>) =>
    start(
      () =>
        void fn()
          .then(() => location.reload())
          .catch((e) =>
            setMessage(e instanceof Error ? e.message : "Action failed."),
          ),
    );
  const labor = useMemo(
    () =>
      job.fieldTimeEvents.length
        ? `${job.fieldTimeEvents.length} time events recorded`
        : "No time recorded",
    [job.fieldTimeEvents],
  );
  const queue = async (
    mutationType: OfflineMutationType,
    payload: Record<string, unknown>,
    dependencies: string[] = [],
  ) => {
    if (!offlinePackage || new Date(offlinePackage.expiresAt) <= new Date())
      throw new Error("This job is not available offline. Reconnect and download it first.");
    const localMutationId = crypto.randomUUID();
    await enqueueOfflineMutation({
      localMutationId,
      idempotencyKey: `offline:${job.id}:${localMutationId}`,
      companyId,
      userId,
      jobId: job.id,
      packageId: offlinePackage.id,
      mutationType,
      payload,
      baseRecordVersion: job.fieldVersion,
      dependencyIds: dependencies,
      createdAt: new Date().toISOString(),
      schemaVersion: OFFLINE_SCHEMA_VERSION,
    });
    setMessage("Saved on this device — waiting to sync.");
    return localMutationId;
  };
  const offlineCapable = (
    onlineAction: () => Promise<unknown>,
    mutationType: OfflineMutationType,
    payload: Record<string, unknown>,
    afterQueue?: () => void,
  ) =>
    start(() => void (async () => {
      try {
        const canReach = await probeOfflineFieldServer();
        setReachable(canReach);
        if (canReach) {
          await onlineAction();
          location.reload();
        } else {
          await queue(mutationType, payload);
          afterQueue?.();
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Action failed.");
      }
    })());
  const advanceStage = () => {
    if (!next) return;
    const apply = (latitude?: number, longitude?: number) =>
      offlineCapable(
        () => transitionFieldStageAction(job.id, next, job.fieldVersion, latitude, longitude),
        "JOB_STATUS_UPDATE",
        { stage: next, latitude, longitude },
        () => setJob({ ...job, fieldStage: next, fieldVersion: job.fieldVersion + 1 }),
      );
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        (position) => apply(position.coords.latitude, position.coords.longitude),
        () => apply(),
      );
    else apply();
  };
  const stageCompletion = async (notes: string) => {
    const [queued, media] = await Promise.all([
      listOfflineRecords<LocalMutationRecord>("mutations", scope),
      listOfflineRecords<StagedMediaRecord>("media", scope),
    ]);
    const missingChecklist = job.fieldChecklistItems.some((item) => item.required && !item.completedAt);
    const hasSignature =
      Boolean(job.completionSignature) ||
      queued.some((row) => row.jobId === job.id && row.mutationType === "JOB_SIGNATURE_STAGE" && row.status !== "Cancelled");
    const photoCategories = new Set([
      ...job.photos.map((photo) => photo.category),
      ...media.filter((row) => row.jobId === job.id).map((row) => (row as StagedMediaRecord & { category?: string }).category),
    ]);
    const missing: string[] = [];
    if (missingChecklist) missing.push("required checklist");
    if (!photoCategories.has("Before") || !photoCategories.has("After")) missing.push("before and after photos");
    if (!hasSignature) missing.push("customer signature");
    if (!notes.trim()) missing.push("completion notes");
    if (missing.length) throw new Error(`Cannot stage completion. Missing: ${missing.join(", ")}.`);
    const signatureDependencies = queued
      .filter((row) => row.jobId === job.id && row.mutationType === "JOB_SIGNATURE_STAGE")
      .map((row) => row.localMutationId);
    await queue("JOB_COMPLETION_STAGE", { notes: notes.trim() }, signatureDependencies);
    setMessage("Completed on this device — waiting to sync.");
  };
  return (
    <main className="mx-auto max-w-6xl space-y-5 p-5">
      <header className="rounded-xl bg-slate-950 p-5 text-white">
        <p className="mb-2 text-sm" role="status">
          {reachable ? "Online" : offlinePackage ? "Offline · saved job available" : "Offline · job not downloaded"}
        </p>
        <p className="text-sm text-slate-300">{job.jobNumber ?? "Field job"}</p>
        <h1 className="text-2xl font-bold">
          {job.customer.firstName} {job.customer.lastName}
        </h1>
        <a
          className="mt-2 block text-blue-300 underline"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
        >
          {address} · Navigate
        </a>
        <a
          href={`tel:${job.customer.phone}`}
          className="text-blue-300 underline"
        >
          {job.customer.phone}
        </a>
      </header>
      {message && (
        <p role="alert" className="rounded-lg bg-amber-100 p-3 text-amber-900">
          {message}
        </p>
      )}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Status · {job.fieldStage}</h2>
        {next && (
          <button
            disabled={pending}
            onClick={advanceStage}
            className="mt-3 min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Move to {next}
          </button>
        )}
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Approved scope</h2>
          {job.estimate.jobSites.map((site) => (
            <div key={site.id} className="mt-3">
              <p className="font-medium">{site.name}</p>
              {site.items.map((i) => (
                <p key={i.id} className="text-sm text-slate-600">
                  {i.quantity} × {i.name} {i.notes && `— ${i.notes}`}
                </p>
              ))}
            </div>
          ))}
        </section>
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Site instructions</h2>
          <p>Gate: {job.property.gateCode || "None"}</p>
          <p>
            {job.property.accessNotes ||
              "No access, hazard, or parking instructions."}
          </p>
          <p>{job.customerNotes || "No customer notes."}</p>
          <p>{job.crewNotes || "No crew notes."}</p>
        </section>
      </div>
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Completion checklist</h2>
        {job.fieldChecklistItems.map((item) => (
          <label key={item.id} className="flex gap-3 border-b py-3">
            <input
              type="checkbox"
              checked={Boolean(item.completedAt)}
              onChange={(e) => {
                setJob({
                  ...job,
                  fieldChecklistItems: job.fieldChecklistItems.map((x) =>
                    x.id === item.id
                      ? {
                          ...x,
                          completedAt: e.target.checked ? new Date() : null,
                        }
                      : x,
                  ),
                });
                offlineCapable(
                  () => updateFieldChecklistAction(job.id, item.key, e.target.checked),
                  "JOB_CHECKLIST_UPDATE",
                  {
                    key: item.key,
                    completed: e.target.checked,
                    baseUpdatedAt: item.updatedAt.toISOString(),
                  },
                );
              }}
            />
            {item.label}
          </label>
        ))}
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <form
          className="rounded-xl bg-white p-5 shadow-sm"
          action={(form) =>
            run(() =>
              requestFieldChangeOrderAction(job.id, {
                type: form.get("type") as "AdditionalItems",
                description: String(form.get("description")),
                proposedAmount: Number(form.get("amount")),
              }),
            )
          }
        >
          <h2 className="font-semibold">Request change order</h2>
          <select name="type" className="mt-3 w-full rounded border p-2">
            <option value="AdditionalItems">Additional items</option>
            <option value="AdditionalLabor">Additional labor</option>
            <option value="ExtraDumpFees">Extra dump fees</option>
            <option value="UnexpectedObstacle">Unexpected obstacle</option>
          </select>
          <textarea
            required
            name="description"
            placeholder="Describe the change"
            className="mt-2 w-full rounded border p-2"
          />
          <input
            required
            min="0"
            step="0.01"
            name="amount"
            type="number"
            placeholder="Proposed amount"
            className="mt-2 w-full rounded border p-2"
          />
          <button className="mt-2 rounded bg-slate-900 px-3 py-2 text-white">
            Notify manager
          </button>
        </form>
        <form
          className="rounded-xl bg-white p-5 shadow-sm"
          action={(form) => {
            const input = {
                printedName: String(form.get("name")),
                signatureData: completionSignature,
                device: navigator.userAgent,
                notes: String(form.get("notes")),
              };
            offlineCapable(
              () => saveCompletionSignatureAction(job.id, input),
              "JOB_SIGNATURE_STAGE",
              {
                signerName: input.printedName,
                signerRole: "Customer",
                signatureData: input.signatureData,
                device: input.device,
                signedAtDevice: new Date().toISOString(),
                deviceTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                consentText: input.notes || "Customer confirmed completion.",
              },
            );
          }}
        >
          <h2 className="font-semibold">Customer completion signature</h2>
          <input
            required
            name="name"
            placeholder="Printed name"
            className="mt-3 w-full rounded border p-2"
          />
          <div className="mt-2"><SignaturePad onChange={setCompletionSignature} /></div>
          <textarea
            name="notes"
            placeholder="Optional notes"
            className="mt-2 w-full rounded border p-2"
          />
          <button disabled={!completionSignature} className="mt-2 min-h-11 rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-60">
            Save signature
          </button>
        </form>
      </div>
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Time tracking</h2>
        <p className="text-sm text-slate-500">{labor}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["ClockIn", "BreakStart", "BreakEnd", "ClockOut"] as const).map(
            (type) => (
              <button
                key={type}
                onClick={() =>
                  run(() => recordFieldTimeEventAction(job.id, type))
                }
                className="rounded border px-3 py-2"
              >
                {type}
              </button>
            ),
          )}
        </div>
      </section>
      <form
        className="rounded-xl bg-white p-5 shadow-sm"
        action={(form) => {
          const notes = String(form.get("notes"));
          start(() => void probeOfflineFieldServer().then(async (online) => {
            setReachable(online);
            if (online) {
              await confirmFieldCompletionAction(job.id, notes);
              location.reload();
            } else {
              await stageCompletion(notes);
            }
          }).catch((error) => setMessage(error instanceof Error ? error.message : "Could not stage completion.")));
        }}
      >
        <h2 className="font-semibold">Completion notes & crew confirmation</h2>
        <textarea
          required
          name="notes"
          defaultValue={job.completionNotes}
          className="mt-3 w-full rounded border p-2"
        />
        <button className="mt-2 min-h-11 rounded bg-green-700 px-3 py-2 text-white">
          {reachable ? "Confirm completion" : "Complete on this device"}
        </button>
      </form>
      <form
        className="rounded-xl bg-white p-5 shadow-sm"
        action={(form) => {
          const note = String(form.get("fieldNote"));
          offlineCapable(
            () => addFieldNoteAction(job.id, note),
            "JOB_FIELD_NOTE_ADD",
            { note },
          );
        }}
      >
        <h2 className="font-semibold">Field notes</h2>
        <textarea name="fieldNote" required maxLength={5000} className="mt-3 min-h-24 w-full rounded border p-3" />
        <button className="mt-2 min-h-11 rounded border px-4">Save field note</button>
      </form>
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Change-order status</h2>
        <div className="mt-3 space-y-2">{job.fieldChangeOrders.map(order=><div key={order.id} className="rounded border p-3"><div className="flex justify-between gap-3"><strong>{order.type}</strong><span>{order.status}</span></div><p className="text-sm">{order.description}</p><p className="text-sm text-slate-500">${order.originalAmount.toFixed(2)} to ${order.proposedAmount.toFixed(2)}</p>{order.managerNote&&<p className="text-sm text-amber-800">Manager: {order.managerNote}</p>}</div>)}{!job.fieldChangeOrders.length&&<p className="text-sm text-slate-500">No change orders.</p>}</div>
      </section>
      <DisposalForm jobId={job.id} initialTotal={job.disposalRecords.reduce((sum,row)=>sum+row.cost,0)} />
      <PhotoWorkspace jobId={job.id} companyId={companyId} userId={userId} manager={manager} />
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Photos</h2>
        <p className="text-sm text-slate-500">
          {job.photos.length} photo(s). Before, during, after, damage, disposal,
          annotations, and customer visibility use the centralized job photo
          system. Offline files remain queued on this device until sync.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {job.photos.map((photo,index) => (
            <figure key={photo.id} className="rounded border p-2">
              <img loading="lazy" src={photo.thumbnailUrl ?? photo.fileUrl} alt={photo.caption ?? photo.fileName} className="aspect-square w-full rounded object-cover" />
              <form className="mt-2 space-y-2" action={form=>run(()=>updateFieldPhotoAction(job.id,photo.id,{caption:String(form.get("caption")),customerVisible:manager&&form.get("visible")==="on"}))}>
                <input name="caption" defaultValue={photo.caption??""} aria-label="Photo caption" className="min-h-10 w-full rounded border px-2" />
                {manager&&<label className="flex min-h-10 items-center gap-2 text-xs"><input name="visible" type="checkbox" defaultChecked={photo.customerVisible}/>Customer visible</label>}
                <button className="min-h-10 w-full rounded border">Save details</button>
              </form>
              <div className="mt-2 grid grid-cols-3 gap-1"><button aria-label="Move photo earlier" disabled={index===0} className="min-h-10 rounded border" onClick={()=>{const ids=job.photos.map(row=>row.id);[ids[index-1],ids[index]]=[ids[index],ids[index-1]];run(()=>reorderFieldPhotosAction(job.id,ids))}}>↑</button><button aria-label="Move photo later" disabled={index===job.photos.length-1} className="min-h-10 rounded border" onClick={()=>{const ids=job.photos.map(row=>row.id);[ids[index+1],ids[index]]=[ids[index],ids[index+1]];run(()=>reorderFieldPhotosAction(job.id,ids))}}>↓</button><button aria-label="Delete photo" className="min-h-10 rounded border text-red-700" onClick={()=>run(()=>deleteFieldPhotoAction(job.id,photo.id))}>×</button></div>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
