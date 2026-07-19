"use client";
import { useState } from "react";
import type { BackgroundJobStatus } from "@/generated/prisma/client";
import {
  cancelBackgroundJobAction,
  listBackgroundJobsAction,
  retryBackgroundJobAction,
} from "@/app/actions/admin/backgroundJobs";

type Data = Awaited<ReturnType<typeof listBackgroundJobsAction>>;
const statuses: Array<BackgroundJobStatus | "All"> = [
  "All",
  "Pending",
  "Running",
  "Failed",
  "Completed",
  "Cancelled",
];
export default function BackgroundJobsAdmin({
  initialData,
}: {
  initialData: Data;
}) {
  const [data, setData] = useState(initialData);
  const [status, setStatus] = useState<BackgroundJobStatus | "All">("All");
  const [selected, setSelected] = useState<Data["jobs"][number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function refresh(next = status) {
    setStatus(next);
    setData(
      await listBackgroundJobsAction({
        status: next === "All" ? undefined : next,
      }),
    );
  }
  async function mutate(id: string, action: "retry" | "cancel") {
    try {
      if (action === "retry") await retryBackgroundJobAction(id);
      else await cancelBackgroundJobAction(id);
      await refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to update job.",
      );
    }
  }
  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="text-3xl font-bold">Background Jobs</h1>
      <p className="mt-1 text-slate-600">
        Inspect queued automation and retry or cancel tenant-owned work.
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Worker:{" "}
        {data.workerHealth.running
          ? `${data.workerHealth.running} running`
          : "idle"}{" "}
        · Last success:{" "}
        {data.workerHealth.lastSuccessAt
          ? new Date(data.workerHealth.lastSuccessAt).toLocaleString()
          : "none recorded"}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {statuses.map((item) => (
          <button
            key={item}
            onClick={() => void refresh(item)}
            className={`rounded-lg px-3 py-2 text-sm ${status === item ? "bg-slate-900 text-white" : "border bg-white"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {error && <p className="mt-4 text-red-700">{error}</p>}
      <div className="mt-5 overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
              <th className="p-3">Priority</th>
              <th className="p-3">Attempts</th>
              <th className="p-3">Created</th>
              <th className="p-3">Duration</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.jobs.map((job) => (
              <tr key={job.id} className="border-t">
                <td className="p-3">{job.type}</td>
                <td className="p-3">{job.status}</td>
                <td className="p-3">{job.priority}</td>
                <td className="p-3">
                  {job.attempts}/{job.maxAttempts}
                </td>
                <td className="p-3">
                  {new Date(job.createdAt).toLocaleString()}
                </td>
                <td className="p-3">
                  {job.startedAt && job.completedAt
                    ? `${new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()} ms`
                    : "—"}
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      className="underline"
                      onClick={() => setSelected(job)}
                    >
                      Inspect
                    </button>
                    {(job.status === "Failed" ||
                      job.status === "Cancelled") && (
                      <button
                        className="underline"
                        onClick={() => void mutate(job.id, "retry")}
                      >
                        Retry
                      </button>
                    )}
                    {(job.status === "Pending" ||
                      job.status === "Running" ||
                      job.status === "Failed") && (
                      <button
                        className="text-red-700 underline"
                        onClick={() => void mutate(job.id, "cancel")}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <div
          role="dialog"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-bold">{selected.type}</h2>
            <p className="mt-2">
              <strong>Error:</strong> {selected.lastError || "None"}
            </p>
            <pre className="mt-4 overflow-auto rounded bg-slate-950 p-4 text-xs text-white">
              {JSON.stringify(selected.payload, null, 2)}
            </pre>
            <button
              className="mt-4 rounded border px-3 py-2"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
