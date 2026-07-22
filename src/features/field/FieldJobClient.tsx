"use client";
import { useMemo, useState, useTransition } from "react";
import type { getFieldJob } from "@/lib/fieldOperations/fieldOperations";
import { FIELD_STAGE_ORDER } from "@/lib/fieldOperations/policy";
import {
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

type Job = NonNullable<Awaited<ReturnType<typeof getFieldJob>>>;
export default function FieldJobClient({ initialJob, companyId, userId, manager }: { initialJob: Job; companyId: string; userId: string; manager: boolean }) {
  const [job, setJob] = useState(initialJob);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const next = FIELD_STAGE_ORDER[FIELD_STAGE_ORDER.indexOf(job.fieldStage) + 1];
  const address = `${job.property.address}, ${job.property.city}, ${job.property.state} ${job.property.zip}`;
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
  return (
    <main className="mx-auto max-w-6xl space-y-5 p-5">
      <header className="rounded-xl bg-slate-950 p-5 text-white">
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
            onClick={() =>
              navigator.geolocation?.getCurrentPosition(
                (p) =>
                  run(() =>
                    transitionFieldStageAction(
                      job.id,
                      next,
                      job.fieldVersion,
                      p.coords.latitude,
                      p.coords.longitude,
                    ),
                  ),
                () =>
                  run(() =>
                    transitionFieldStageAction(job.id, next, job.fieldVersion),
                  ),
              )
            }
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-white"
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
                run(() =>
                  updateFieldChecklistAction(
                    job.id,
                    item.key,
                    e.target.checked,
                  ),
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
          action={(form) =>
            run(() =>
              saveCompletionSignatureAction(job.id, {
                printedName: String(form.get("name")),
                signatureData: String(form.get("signature")),
                device: navigator.userAgent,
                notes: String(form.get("notes")),
              }),
            )
          }
        >
          <h2 className="font-semibold">Customer completion signature</h2>
          <input
            required
            name="name"
            placeholder="Printed name"
            className="mt-3 w-full rounded border p-2"
          />
          <textarea
            required
            name="signature"
            placeholder="Signature confirmation"
            className="mt-2 w-full rounded border p-2"
          />
          <textarea
            name="notes"
            placeholder="Optional notes"
            className="mt-2 w-full rounded border p-2"
          />
          <button className="mt-2 rounded bg-slate-900 px-3 py-2 text-white">
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
        action={(form) =>
          run(() =>
            confirmFieldCompletionAction(job.id, String(form.get("notes"))),
          )
        }
      >
        <h2 className="font-semibold">Completion notes & crew confirmation</h2>
        <textarea
          required
          name="notes"
          defaultValue={job.completionNotes}
          className="mt-3 w-full rounded border p-2"
        />
        <button className="mt-2 rounded bg-green-700 px-3 py-2 text-white">
          Confirm completion
        </button>
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
