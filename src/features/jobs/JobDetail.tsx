"use client";

import Link from "next/link";
import { useState } from "react";
import { updateJobAction } from "@/app/actions/jobs/updateJob";
import {
  jobStatusTransitions,
  type JobWorkflowStatus,
} from "@/lib/jobs/statusWorkflow";
import type { getJobDetail } from "@/lib/jobs/getJobDetail";
import CreateInvoiceButton from "@/features/invoices/CreateInvoiceButton";
import { listJobPhotosAction } from "@/app/actions/jobPhotos/jobPhotos";
import ActualCosts from "./ActualCosts";

type JobDetailData = NonNullable<Awaited<ReturnType<typeof getJobDetail>>>;
function localInput(value: Date | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}
function labelStatus(status: string) {
  return status === "InProgress" ? "In Progress" : status;
}

export default function JobDetail({
  initialJob,
}: {
  initialJob: JobDetailData;
}) {
  const [job, setJob] = useState(initialJob);
  const [scheduledStart, setScheduledStart] = useState(
    localInput(job.scheduledStart),
  );
  const [scheduledEnd, setScheduledEnd] = useState(
    localInput(job.scheduledEnd),
  );
  const [crewNotes, setCrewNotes] = useState(job.crewNotes);
  const [customerNotes, setCustomerNotes] = useState(job.customerNotes);
  const [completionNotes, setCompletionNotes] = useState(job.completionNotes);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save(nextStatus?: JobWorkflowStatus) {
    if (nextStatus === "Completed") {
      const photos = await listJobPhotosAction(job.id);
      if (
        !photos.some((photo) => photo.category === "After") &&
        !window.confirm(
          "No After photos are attached. Complete this job anyway?",
        )
      )
        return;
    }
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateJobAction({
        id: job.id,
        ...(nextStatus ? { status: nextStatus } : {}),
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
        crewNotes,
        customerNotes,
        completionNotes,
      });
      setJob((current) => ({
        ...current,
        ...updated,
        estimate: {
          ...current.estimate,
          status:
            updated.scheduledStart && current.estimate.status === "Approved"
              ? "Scheduled"
              : current.estimate.status,
        },
      }));
      setScheduledStart(localInput(updated.scheduledStart));
      setScheduledEnd(localInput(updated.scheduledEnd));
      setMessage("Job saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save job.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const availableTransitions =
    jobStatusTransitions[job.status as JobWorkflowStatus];
  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-10">
      <Link href="/jobs" className="text-sm font-semibold text-blue-700">
        Back to Jobs
      </Link>
      <div className="mt-3">
        <h1 className="text-3xl font-bold">
          {job.customer.firstName} {job.customer.lastName}
        </h1>
        <p className="mt-1 text-slate-600">
          {job.property.address}, {job.property.city}, {job.property.state}{" "}
          {job.property.zip}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {job.customer.phone}
          {job.customer.email ? ` · ${job.customer.email}` : ""}
        </p>
      </div>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {message && <p className="mt-4 text-green-700">{message}</p>}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold">Job schedule and status</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field
            label="Scheduled start"
            value={scheduledStart}
            onChange={setScheduledStart}
            type="datetime-local"
          />
          <Field
            label="Scheduled end"
            value={scheduledEnd}
            onChange={setScheduledEnd}
            type="datetime-local"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void save()}
            className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:bg-slate-400"
          >
            {isSaving ? "Saving..." : "Save Job"}
          </button>
          {availableTransitions.map((status) => (
            <button
              key={status}
              type="button"
              disabled={isSaving}
              onClick={() => void save(status)}
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold"
            >
              Mark {labelStatus(status)}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Current status: <strong>{labelStatus(job.status)}</strong>
        </p>
      </section>
      {job.status === "Completed" && <ActualCosts jobId={job.id} initial={job} />}
      {job.status === "Completed" && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold">Invoice</h2>
          <p className="mt-1 text-slate-500">
            Generate an invoice from this completed job.
          </p>
          <div className="mt-4">
            <CreateInvoiceButton estimateId={job.estimateId} jobId={job.id} />
          </div>
        </section>
      )}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold">Notes</h2>
        <div className="mt-4 grid gap-4">
          <TextArea
            label="Crew notes"
            value={crewNotes}
            onChange={setCrewNotes}
          />
          <TextArea
            label="Customer notes"
            value={customerNotes}
            onChange={setCustomerNotes}
          />
          <TextArea
            label="Completion notes"
            value={completionNotes}
            onChange={setCompletionNotes}
          />
        </div>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold">Linked estimate</h2>
        <div className="mt-4 flex flex-wrap gap-4">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
            {job.estimate.status}
          </span>
          <span className="font-semibold">
            {formatCurrency(job.estimate.pricingTotal)}
          </span>
          <Link
            href={`/estimates/${job.estimateId}`}
            className="text-sm font-semibold text-blue-700"
          >
            View estimate
          </Link>
        </div>
        <div className="mt-5 space-y-3">
          {job.estimate.jobSites.map((site) => (
            <article
              key={site.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <h3 className="font-semibold">{site.name}</h3>
              {site.customerNotes && (
                <p className="mt-1 text-sm text-slate-600">
                  {site.customerNotes}
                </p>
              )}
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {site.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity} x {item.name}
                    {item.notes ? ` - ${item.notes}` : ""}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-300 p-3"
      />
    </label>
  );
}
function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-24 rounded-xl border border-slate-300 p-3"
      />
    </label>
  );
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
