"use client";
import { useState } from "react";
import Link from "next/link";
import {
  generateJobFromServicePlanAction,
  generateServicePlanJobsThroughAction,
  previewServicePlanOccurrencesAction,
  setServicePlanStatusAction,
} from "@/app/actions/servicePlans/servicePlans";
import type { getServicePlan } from "@/lib/servicePlans/servicePlans";
type Plan = NonNullable<Awaited<ReturnType<typeof getServicePlan>>>;
export default function ServicePlanDetail({ initial }: { initial: Plan }) {
  const [plan, setPlan] = useState(initial);
  const [occurrences, setOccurrences] = useState<Date[]>([]);
  const [message, setMessage] = useState("");
  async function preview() {
    const through = new Date();
    through.setMonth(through.getMonth() + 3);
    setOccurrences(await previewServicePlanOccurrencesAction(plan.id, through));
  }
  async function status(next: "Active" | "Paused" | "Cancelled") {
    const updated = await setServicePlanStatusAction(plan.id, next);
    setPlan((current) => ({
      ...current,
      ...updated,
    }));
  }
  async function generate() {
    const occurrence = occurrences[0] ?? plan.nextRunAt;
    if (!occurrence) {
      setMessage("No upcoming occurrence.");
      return;
    }
    const job = await generateJobFromServicePlanAction(
      plan.id,
      new Date(occurrence),
    );
    setMessage(`Generated job ${job.id}. Existing jobs were not changed.`);
  }
  async function generateThrough() { const raw=window.prompt("Generate jobs through date (YYYY-MM-DD)"); if(!raw)return; const jobs=await generateServicePlanJobsThroughAction(plan.id,new Date(`${raw}T23:59:59`)); setMessage(`Generated or found ${jobs.length} scheduled job(s).`); }
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-6">
        <div className="flex justify-between">
          <div>
            <h1 className="text-3xl font-bold">{plan.name}</h1>
            <p className="text-slate-600">
              {plan.customer.firstName} {plan.customer.lastName} ·{" "}
              {plan.property?.address ?? "Property required before generation"}
            </p>
          </div>
          <span className="h-fit rounded-full bg-violet-100 px-3 py-1 font-semibold text-violet-800">
            {plan.status}
          </span>
        </div>
        <p className="mt-4">{plan.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {plan.status === "Active" ? (
            <button
              className="rounded border px-3 py-2"
              onClick={() => void status("Paused")}
            >
              Pause
            </button>
          ) : plan.status === "Paused" || plan.status === "Draft" ? (
            <button
              className="rounded bg-green-700 px-3 py-2 text-white"
              onClick={() => void status("Active")}
            >
              Activate
            </button>
          ) : null}
          <button
            className="rounded border border-red-300 px-3 py-2 text-red-700"
            onClick={() => void status("Cancelled")}
          >
            Cancel
          </button>
          <button
            className="rounded border px-3 py-2"
            onClick={() => void preview()}
          >
            Preview upcoming
          </button>
          <button
            className="rounded bg-blue-700 px-3 py-2 text-white"
            onClick={() => void generate()}
          >
              Generate Next Job
            </button>
            <button className="rounded border border-blue-300 px-3 py-2 text-blue-800" onClick={() => void generateThrough()}>Generate Jobs Through Date</button>
        </div>
        {message && <p className="mt-3 text-green-700">{message}</p>}
      </section>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-bold">Plan settings</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <Item
            label="Recurrence"
            value={`${plan.recurrenceType} every ${plan.interval}`}
          />
          <Item
            label="Default price"
            value={
              plan.defaultPrice === null
                ? "Manual"
                : `$${plan.defaultPrice.toFixed(2)}`
            }
          />
          <Item
            label="Assigned crew"
            value={plan.assignedCrew?.name ?? "None"}
          />
          <Item
            label="Auto-create jobs"
            value={plan.autoCreateJobs ? "Yes" : "No"}
          />
          <Item
            label="Invoice on completion"
            value={plan.autoCreateInvoices ? "Yes" : "No"}
          />
          <Item
            label="Next service"
            value={plan.nextRunAt?.toLocaleString() ?? "None"}
          />
        </dl>
      </section>
      {occurrences.length > 0 && (
        <section className="rounded-2xl border bg-white p-6">
          <h2 className="text-xl font-bold">Upcoming occurrences</h2>
          <ul className="mt-3 list-disc pl-5">
            {occurrences.map((date) => (
              <li key={String(date)}>{new Date(date).toLocaleString()}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-bold">Generated jobs</h2>
        <div className="mt-3 space-y-2">
          {plan.jobs.map((job) => (
            <Link
              className="block rounded border p-3"
              key={job.id}
              href={`/jobs/${job.id}`}
            >
              {job.servicePlanOccurrence?.toLocaleString()} · {job.status}
              {job.invoice ? " · Invoice prepared" : ""}
            </Link>
          ))}
          {!plan.jobs.length && (
            <p className="text-slate-500">No generated jobs yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
