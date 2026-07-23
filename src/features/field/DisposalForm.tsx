"use client";
import { useState, useTransition } from "react";
import { recordDisposalAction } from "@/app/actions/field/fieldOperations";

const defaultOccurredAt = new Date(
  Date.now() - new Date().getTimezoneOffset() * 60_000,
)
  .toISOString()
  .slice(0, 16);

export default function DisposalForm({ jobId, initialTotal }: { jobId: string; initialTotal: number }) {
  const [total, setTotal] = useState(initialTotal);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  function submit(form: FormData) {
    start(() => void recordDisposalAction(jobId, {
      category: String(form.get("category")) as "Landfill",
      facility: String(form.get("facility")),
      occurredAt: new Date(String(form.get("occurredAt"))),
      weight: Number(form.get("weight")) || undefined,
      weightUnit: String(form.get("unit")),
      cost: Number(form.get("cost")),
      paymentMethod: String(form.get("paymentMethod")) as "Other",
      notes: String(form.get("notes")),
    }).then(row => { setTotal(row.totalCost); setMessage("Disposal entry saved."); }).catch(error => setMessage(error instanceof Error ? error.message : "Unable to save.")));
  }
  return <section className="rounded-xl bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between"><h2 className="font-semibold">Disposal entries</h2><strong>Total: ${total.toFixed(2)}</strong></div>
    <form className="mt-3 grid gap-3 sm:grid-cols-2" action={submit}>
      <select name="category" className="min-h-12 rounded border p-3">{[["Landfill","Landfill"],["Recycling","Recycling"],["Donation","Donation"],["ScrapMetal","Scrap"],["HazardousWaste","Hazardous"],["Other","Other"]].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select>
      <input required name="facility" placeholder="Facility" className="min-h-12 rounded border p-3" />
      <input required name="occurredAt" type="datetime-local" defaultValue={defaultOccurredAt} className="min-h-12 rounded border p-3" />
      <div className="flex"><input name="weight" min="0" max="1000000" step="0.01" type="number" placeholder="Weight" className="min-h-12 min-w-0 flex-1 rounded-l border p-3"/><select name="unit" className="min-h-12 rounded-r border p-3"><option>lb</option><option>kg</option><option>ton</option></select></div>
      <input required name="cost" min="0" step="0.01" type="number" placeholder="Cost" className="min-h-12 rounded border p-3" />
      <select name="paymentMethod" className="min-h-12 rounded border p-3"><option>Other</option><option>Cash</option><option>Check</option><option>CreditCard</option><option>DebitCard</option><option>ACH</option></select>
      <textarea name="notes" placeholder="Notes" className="min-h-24 rounded border p-3 sm:col-span-2" />
      <p className="text-sm sm:col-span-2">Add a Receipt photo in the photo workspace to attach receipt evidence.</p>
      <button disabled={pending} className="min-h-12 rounded bg-slate-900 px-4 text-white sm:col-span-2">Save disposal entry</button>
    </form>{message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </section>;
}
