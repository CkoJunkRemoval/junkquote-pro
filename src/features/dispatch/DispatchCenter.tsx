"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  assignDispatchCrewAction,
  assignDispatchEmployeeAction,
  sendDispatchMessageAction,
  updateDispatchJobAction,
} from "@/app/actions/dispatch/dispatch";
import type { getDispatchData } from "@/lib/dispatch/dispatch";
import { filterDispatchJobs } from "@/lib/dispatch/calculations";
type Data = Awaited<ReturnType<typeof getDispatchData>>;
type Job = Data["jobs"][number];
const columns = [
  "Unscheduled",
  "Scheduled",
  "InProgress",
  "Completed",
  "Cancelled",
] as const;
export default function DispatchCenter({ initial }: { initial: Data }) {
  const [jobs, setJobs] = useState(initial.jobs);
  const [filters, setFilters] = useState({
    crewId: "",
    employeeId: "",
    estimatorId: "",
    status: "",
    priority: "",
    recurring: "",
    customer: "",
  });
  useEffect(() => {
    const saved = localStorage.getItem("dispatch:filters");
    if (saved)
      try {
        queueMicrotask(() => setFilters(JSON.parse(saved)));
      } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem("dispatch:filters", JSON.stringify(filters));
  }, [filters]);
  const visible = useMemo(
    () => filterDispatchJobs(jobs, filters),
    [jobs, filters],
  );
  async function move(job: Job, status: (typeof columns)[number]) {
    if (initial.readOnly || job.status === status) return;
    try {
      const updated = await updateDispatchJobAction(job.id, {
        status,
        scheduledStart: job.scheduledStart,
        scheduledEnd: job.scheduledEnd,
      });
      setJobs((current) =>
        current.map((row) =>
          row.id === job.id ? { ...row, ...updated } : row,
        ),
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to move job.");
    }
  }
  async function progress(job: Job, value: "EnRoute" | "Arrived") {
    const updated = await updateDispatchJobAction(job.id, {
      dispatchProgress: value,
    });
    setJobs((current) =>
      current.map((row) => (row.id === job.id ? { ...row, ...updated } : row)),
    );
  }
  async function schedule(job: Job) {
    const start = prompt(
      "Start (YYYY-MM-DDTHH:mm)",
      job.scheduledStart
        ? new Date(job.scheduledStart).toISOString().slice(0, 16)
        : "",
    );
    if (!start) return;
    const end = prompt(
      "End (YYYY-MM-DDTHH:mm)",
      job.scheduledEnd
        ? new Date(job.scheduledEnd).toISOString().slice(0, 16)
        : "",
    );
    if (!end) return;
    const updated = await updateDispatchJobAction(job.id, {
      scheduledStart: new Date(start),
      scheduledEnd: new Date(end),
    });
    setJobs((current) =>
      current.map((row) => (row.id === job.id ? { ...row, ...updated } : row)),
    );
  }
  return (
    <main className="mx-auto max-w-[1600px] p-4 sm:p-6">
      <div>
        <h1 className="text-3xl font-bold">Dispatch & Operations Center</h1>
        <p className="text-slate-600">
          Today’s workload, assignments, alerts, and financial status.
        </p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {Object.entries(initial.metrics).map(([key, value]) => (
          <div key={key} className="rounded-xl border bg-white p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
              {label(key)}
            </p>
            <p className="text-xl font-bold">
              {key.toLowerCase().includes("revenue") ||
              key.toLowerCase().includes("balance")
                ? money(Number(value))
                : Math.round(Number(value))}
            </p>
          </div>
        ))}
      </div>
      <section className="mt-5 rounded-xl border bg-white p-4">
        <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-9">
          <Select
            value={filters.crewId}
            onChange={(v) => setFilters((f) => ({ ...f, crewId: v }))}
            label="Crew"
            options={initial.crews.map((x) => ({ value: x.id, label: x.name }))}
          />
          <Select
            value={filters.employeeId}
            onChange={(v) => setFilters((f) => ({ ...f, employeeId: v }))}
            label="Employee"
            options={initial.employees.map((x) => ({
              value: x.id,
              label: `${x.firstName} ${x.lastName}`,
            }))}
          />
          <Select
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            label="Status"
            options={columns.map((x) => ({ value: x, label: x }))}
          />
          <Select
            value={filters.estimatorId}
            onChange={(v) => setFilters((f) => ({ ...f, estimatorId: v }))}
            label="Estimator"
            options={jobs
              .flatMap((job) =>
                job.estimator
                  ? [
                      {
                        value: job.estimator.id,
                        label:
                          [job.estimator.firstName, job.estimator.lastName]
                            .filter(Boolean)
                            .join(" ") || job.estimator.email,
                      },
                    ]
                  : [],
              )
              .filter(
                (option, index, all) =>
                  all.findIndex((entry) => entry.value === option.value) ===
                  index,
              )}
          />
          <Select
            value={filters.priority}
            onChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
            label="Priority"
            options={["Low", "Normal", "High", "Urgent"].map((x) => ({
              value: x,
              label: x,
            }))}
          />
          <Select
            value={filters.recurring}
            onChange={(v) => setFilters((f) => ({ ...f, recurring: v }))}
            label="Recurring"
            options={[
              { value: "yes", label: "Recurring" },
              { value: "no", label: "One-time" },
            ]}
          />
          <label className="grid gap-1 text-xs font-semibold">
            Customer
            <input
              className="rounded border p-2 text-sm"
              value={filters.customer}
              onChange={(e) =>
                setFilters((f) => ({ ...f, customer: e.target.value }))
              }
            />
          </label>
          <button
            className="self-end rounded border p-2 text-sm"
            onClick={() =>
              setFilters({
                crewId: "",
                employeeId: "",
                estimatorId: "",
                status: "",
                priority: "",
                recurring: "",
                customer: "",
              })
            }
          >
            Clear
          </button>
          <label className="grid gap-1 text-xs font-semibold">
            Date
            <input
              type="date"
              className="rounded border p-2 text-sm"
              defaultValue={new Date(initial.start).toISOString().slice(0, 10)}
              onChange={(event) => {
                window.location.href = `/dispatch?date=${event.target.value}`;
              }}
            />
          </label>
        </div>
      </section>
      <div className="mt-5 grid gap-4 xl:grid-cols-5">
        {columns.map((status) => (
          <section
            key={status}
            className="min-h-64 rounded-xl bg-slate-100 p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const job = jobs.find(
                (x) => x.id === e.dataTransfer.getData("jobId"),
              );
              if (job) void move(job, status);
            }}
          >
            <h2 className="mb-3 font-bold">
              {status}{" "}
              <span className="text-sm text-slate-500">
                ({visible.filter((j) => j.status === status).length})
              </span>
            </h2>
            <div className="space-y-3">
              {visible
                .filter((j) => j.status === status)
                .map((job) => (
                  <article
                    draggable={!initial.readOnly}
                    onDragStart={(e) => e.dataTransfer.setData("jobId", job.id)}
                    key={job.id}
                    className={`rounded-xl border-l-4 bg-white p-3 shadow-sm ${job.priority === "Urgent" ? "border-l-red-600" : job.priority === "High" ? "border-l-orange-500" : "border-l-blue-500"}`}
                  >
                    <div className="flex justify-between">
                      <strong>
                        {job.customer.firstName} {job.customer.lastName}
                      </strong>
                      {job.servicePlan && (
                        <span className="rounded bg-violet-100 px-1 text-xs">
                          Recurring
                        </span>
                      )}
                    </div>
                    <p className="text-sm">{job.property.address}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {windowText(job)} ·{" "}
                      {job.assignments
                        .flatMap((a) => (a.crew ? [a.crew.name] : []))
                        .join(", ") || "Unassigned"}
                    </p>
                    <p className="text-xs">
                      Invoice: {job.invoice?.status ?? "None"} · Payment:{" "}
                      {job.paymentStatus} · Comms: {job.communicationStatus}
                    </p>
                    {job.notifications.length > 0 && (
                      <p className="mt-2 text-xs font-semibold text-red-700">
                        ⚠ {job.notifications.join(" · ")}
                      </p>
                    )}
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {job.crewNotes || job.customerNotes || "No notes"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1 text-xs">
                      <a
                        href={`tel:${job.customer.phone}`}
                        className="rounded border px-2 py-1"
                      >
                        Call
                      </a>
                      <a
                        target="_blank"
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${job.property.address}, ${job.property.city}, ${job.property.state} ${job.property.zip}`)}`}
                        className="rounded border px-2 py-1"
                      >
                        Navigate
                      </a>
                      <Link
                        href={`/customers/${job.customerId}`}
                        className="rounded border px-2 py-1"
                      >
                        Customer
                      </Link>
                      <Link
                        href={`/estimates/${job.estimateId}`}
                        className="rounded border px-2 py-1"
                      >
                        Estimate
                      </Link>
                      {job.invoice && (
                        <Link
                          href={`/invoices/${job.invoice.id}`}
                          className="rounded border px-2 py-1"
                        >
                          Invoice
                        </Link>
                      )}
                      {!initial.readOnly && (
                        <>
                          <label className="sr-only" htmlFor={`dispatch-status-${job.id}`}>Move job status</label>
                          <select id={`dispatch-status-${job.id}`} aria-label={`Move ${job.customer.firstName} ${job.customer.lastName} job`} value={job.status} onChange={(event)=>void move(job,event.target.value as (typeof columns)[number])} className="rounded border px-2 py-1">
                            {columns.map(option=><option key={option}>{option}</option>)}
                          </select>
                          <button
                            onClick={() =>
                              void sendDispatchMessageAction(
                                job.id,
                                "Your crew is on the way.",
                              )
                            }
                            className="rounded border px-2 py-1"
                          >
                            Message
                          </button>
                          <button
                            onClick={() => void progress(job, "EnRoute")}
                            className="rounded border px-2 py-1"
                          >
                            En route
                          </button>
                          <button
                            onClick={() => void progress(job, "Arrived")}
                            className="rounded border px-2 py-1"
                          >
                            Arrived
                          </button>
                          <button
                            onClick={() => void schedule(job)}
                            className="rounded border px-2 py-1"
                          >
                            Schedule
                          </button>
                          {job.status === "InProgress" && (
                            <button
                              onClick={() => void move(job, "Completed")}
                              className="rounded bg-green-700 px-2 py-1 text-white"
                            >
                              Complete
                            </button>
                          )}
                          <select
                            aria-label="Assign crew"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value)
                                void assignDispatchCrewAction(
                                  job.id,
                                  e.target.value,
                                );
                            }}
                            className="rounded border"
                          >
                            <option value="">+ Crew</option>
                            {initial.crews.map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.name}
                              </option>
                            ))}
                          </select>
                          <select
                            aria-label="Assign employee"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value)
                                void assignDispatchEmployeeAction(
                                  job.id,
                                  e.target.value,
                                );
                            }}
                            className="rounded border"
                          >
                            <option value="">+ Employee</option>
                            {initial.employees.map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.firstName}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </div>
      <section className="mt-6 rounded-xl border bg-white p-5">
        <h2 className="text-xl font-bold">Crew workload & daily timeline</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {initial.workloads.map((workload) => (
            <div
              key={workload.crewId}
              className={`rounded border p-3 ${workload.overloaded ? "border-red-400 bg-red-50" : workload.idle ? "border-amber-300" : ""}`}
            >
              <strong>{workload.name}</strong>
              <p className="text-sm">
                {workload.assignedHours.toFixed(1)}h assigned ·{" "}
                {workload.remainingCapacity.toFixed(1)}h remaining
              </p>
              <p className="text-xs text-slate-500">
                Finish{" "}
                {workload.estimatedCompletion?.toLocaleTimeString() ?? "—"} ·
                Idle gaps {workload.idleGapHours.toFixed(1)}h · Overlaps{" "}
                {workload.overlaps}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold">
      {label}
      <select
        className="rounded border p-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All</option>
        {options.map((x) => (
          <option key={x.value} value={x.value}>
            {x.label}
          </option>
        ))}
      </select>
    </label>
  );
}
const label = (v: string) => v.replace(/([A-Z])/g, " $1").trim();
const money = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    v,
  );
const windowText = (job: Job) =>
  job.scheduledStart
    ? `${new Date(job.scheduledStart).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}–${job.scheduledEnd ? new Date(job.scheduledEnd).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "?"}`
    : "Unscheduled";
