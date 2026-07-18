"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getCalendarJobsAction,
  getUnscheduledCalendarJobsAction,
} from "@/app/actions/jobs/getCalendarJobs";
import { scheduleJobAction } from "@/app/actions/jobs/scheduleJob";
import type { JobWorkflowStatus } from "@/lib/jobs/statusWorkflow";
import { listCrews } from "@/app/actions/crews/management";
import { findAssignmentConflicts } from "@/lib/crews/overlap";

type CalendarJob = Awaited<ReturnType<typeof getCalendarJobsAction>>[number];
export type CalendarConflict = ReturnType<typeof findAssignmentConflicts>[number];
type View = "month" | "week" | "day";
const visibleStatuses: JobWorkflowStatus[] = [
  "Scheduled",
  "InProgress",
  "Completed",
  "Cancelled",
];

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}
function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}
function weekStart(value: Date) {
  const next = startOfDay(value);
  next.setDate(next.getDate() - next.getDay());
  return next;
}
function sameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}
function toDateTimeInput(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}
function statusLabel(status: string) {
  return status === "InProgress" ? "In Progress" : status;
}
function statusClass(status: string) {
  return status === "Scheduled"
    ? "border-blue-300 bg-blue-50 text-blue-950"
    : status === "InProgress"
      ? "border-amber-300 bg-amber-50 text-amber-950"
      : status === "Completed"
        ? "border-green-300 bg-green-50 text-green-950"
        : "border-slate-300 bg-slate-100 text-slate-700";
}

export function getJobConflicts(jobId: string, conflicts: CalendarConflict[]) {
  return conflicts.filter(
    (conflict) => conflict.jobId === jobId || conflict.otherJobId === jobId,
  );
}

export default function SchedulingCalendar() {
  const router = useRouter();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<JobWorkflowStatus[]>([
    "Scheduled",
    "InProgress",
  ]);
  const [jobs, setJobs] = useState<CalendarJob[]>([]);
  const [unscheduled, setUnscheduled] = useState<CalendarJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [crewId, setCrewId] = useState("");
  const [crews, setCrews] = useState<Awaited<ReturnType<typeof listCrews>>>([]);

  useEffect(() => { void listCrews(true).then(setCrews); }, []);

  const range = useMemo(() => {
    if (view === "day") {
      const start = startOfDay(cursor);
      return { start, end: addDays(start, 1), days: [start] };
    }
    if (view === "week") {
      const start = weekStart(cursor);
      return {
        start,
        end: addDays(start, 7),
        days: Array.from({ length: 7 }, (_, index) => addDays(start, index)),
      };
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = weekStart(first);
    const end = addDays(start, 42);
    return {
      start,
      end,
      days: Array.from({ length: 42 }, (_, index) => addDays(start, index)),
    };
  }, [cursor, view]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      getCalendarJobsAction({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        statuses,
        search,
        ...(crewId ? { crewId } : {}),
      }),
      getUnscheduledCalendarJobsAction(search),
    ])
      .then(([calendarJobs, unscheduledJobs]) => {
        if (active) {
          setJobs(calendarJobs);
          setUnscheduled(unscheduledJobs);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load schedule.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [crewId, range.end, range.start, search, statuses]);

  const conflicts = findAssignmentConflicts(jobs.filter((job) => job.scheduledStart && job.scheduledEnd).map((job) => ({ jobId: job.id, jobName: `${job.customer.firstName} ${job.customer.lastName}`, start: new Date(job.scheduledStart!), end: new Date(job.scheduledEnd!), employeeIds: job.assignments.flatMap((assignment) => assignment.employee ? [assignment.employee.id] : []), crewIds: job.assignments.flatMap((assignment) => assignment.crew ? [assignment.crew.id] : []) })));

  function moveCursor(amount: number) {
    setCursor((current) =>
      view === "month"
        ? new Date(current.getFullYear(), current.getMonth() + amount, 1)
        : addDays(current, amount * (view === "week" ? 7 : 1)),
    );
  }

  function toggleStatus(status: JobWorkflowStatus) {
    setStatuses((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    );
  }

  async function scheduleOnDay(job: CalendarJob, day: Date) {
    const previousStart = job.scheduledStart
      ? new Date(job.scheduledStart)
      : null;
    const start = startOfDay(day);
    start.setHours(
      previousStart?.getHours() ?? 9,
      previousStart?.getMinutes() ?? 0,
    );
    const duration =
      previousStart && job.scheduledEnd
        ? Math.max(
            30 * 60_000,
            new Date(job.scheduledEnd).getTime() - previousStart.getTime(),
          )
        : 60 * 60_000;
    const end = new Date(start.getTime() + duration);
    if (!window.confirm(`Schedule this job for ${start.toLocaleString()}?`))
      return;
    try {
      const updated = await scheduleJobAction({
        id: job.id,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
      });
      setJobs((current) => [
        ...current.filter((item) => item.id !== job.id),
        { ...job, ...updated },
      ]);
      setUnscheduled((current) => current.filter((item) => item.id !== job.id));
      setError(null);
    } catch (scheduleError) {
      setError(
        scheduleError instanceof Error
          ? scheduleError.message
          : "Unable to schedule job.",
      );
    }
  }

  async function resizeJob(job: CalendarJob) {
    if (!job.scheduledStart) return;
    const currentEnd = job.scheduledEnd
      ? new Date(job.scheduledEnd)
      : new Date(new Date(job.scheduledStart).getTime() + 60 * 60_000);
    const proposed = window.prompt(
      "New end date/time (YYYY-MM-DDTHH:mm)",
      toDateTimeInput(currentEnd),
    );
    if (!proposed) return;
    const end = new Date(proposed);
    if (
      Number.isNaN(end.getTime()) ||
      !window.confirm(`Change job end to ${end.toLocaleString()}?`)
    )
      return;
    try {
      const updated = await scheduleJobAction({
        id: job.id,
        scheduledStart: new Date(job.scheduledStart).toISOString(),
        scheduledEnd: end.toISOString(),
      });
      setJobs((current) =>
        current.map((item) =>
          item.id === job.id ? { ...item, ...updated } : item,
        ),
      );
      setError(null);
    } catch (resizeError) {
      setError(
        resizeError instanceof Error
          ? resizeError.message
          : "Unable to resize job.",
      );
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>, day: Date) {
    event.preventDefault();
    const id = event.dataTransfer.getData("application/job-id");
    const job = [...jobs, ...unscheduled].find((item) => item.id === id);
    if (job) void scheduleOnDay(job, day);
  }

  const title =
    view === "month"
      ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : view === "week"
        ? `${range.start.toLocaleDateString()} – ${addDays(range.end, -1).toLocaleDateString()}`
        : cursor.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          });
  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="mt-1 text-slate-600">
            Drag jobs to schedule or reschedule them.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCursor(startOfDay(new Date()))}
            className="rounded-lg border px-4 py-2"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => moveCursor(-1)}
            className="rounded-lg border px-4 py-2"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => moveCursor(1)}
            className="rounded-lg border px-4 py-2"
          >
            Next
          </button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border p-1">
          {(["month", "week", "day"] as View[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={`rounded-md px-3 py-2 text-sm font-medium ${view === item ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search customer or property"
          className="min-w-56 flex-1 rounded-lg border border-slate-300 p-2"
        />
        <select value={crewId} onChange={(event) => setCrewId(event.target.value)} className="rounded-lg border border-slate-300 p-2">
          <option value="">All crews</option>
          {crews.map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}
        </select>
        <div className="flex flex-wrap gap-2">
          {visibleStatuses.map((status) => (
            <label key={status} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={statuses.includes(status)}
                onChange={() => toggleStatus(status)}
              />
              {statusLabel(status)}
            </label>
          ))}
        </div>
      </div>
      {conflicts.length > 0 && <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">⚠ Conflicts detected: {conflicts.map((conflict) => `${conflict.jobId} overlaps ${conflict.otherJobName} (${conflict.start.toLocaleString()}–${conflict.end.toLocaleTimeString()})`).join("; ")}</p>}
      {error && <p className="mt-3 text-red-600">{error}</p>}
      <h2 className="mt-6 text-xl font-bold">{title}</h2>
      <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <div
            className={`grid min-w-[700px] ${view === "month" || view === "week" ? "grid-cols-7" : "grid-cols-1"}`}
          >
            {(view === "month" || view === "week") &&
              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="border-b border-r bg-slate-50 p-2 text-center text-xs font-semibold text-slate-500"
                >
                  {day}
                </div>
              ))}
            {range.days.map((day) => (
              <CalendarDay
                key={day.toISOString()}
                day={day}
                isCurrentMonth={
                  view !== "month" || day.getMonth() === cursor.getMonth()
                }
                jobs={jobs.filter(
                  (job) =>
                    job.scheduledStart &&
                    sameDay(new Date(job.scheduledStart), day),
                )}
                onDrop={onDrop}
                onOpen={(id) => router.push(`/jobs/${id}`)}
                onResize={resizeJob}
                conflicts={conflicts}
              />
            ))}
          </div>
          {loading && (
            <p className="p-3 text-sm text-slate-500">Loading visible dates…</p>
          )}
        </section>
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="font-bold">Unscheduled jobs</h2>
          <p className="mt-1 text-sm text-slate-500">
            Drag a job onto a calendar date.
          </p>
          <div className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto">
            {unscheduled.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                compact
                draggable
                onOpen={() => router.push(`/jobs/${job.id}`)}
                onResize={() => undefined}
                conflicts={[]}
              />
            ))}
            {unscheduled.length === 0 && (
              <p className="text-sm text-slate-500">No unscheduled jobs.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function CalendarDay({
  day,
  isCurrentMonth,
  jobs,
  onDrop,
  onOpen,
  onResize,
  conflicts,
}: {
  day: Date;
  isCurrentMonth: boolean;
  jobs: CalendarJob[];
  onDrop: (event: DragEvent<HTMLDivElement>, day: Date) => void;
  onOpen: (id: string) => void;
  onResize: (job: CalendarJob) => void;
  conflicts: CalendarConflict[];
}) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDrop(event, day)}
      className={`min-h-36 border-b border-r p-2 ${isCurrentMonth ? "bg-white" : "bg-slate-50 text-slate-400"}`}
    >
      <p className="text-sm font-semibold">{day.getDate()}</p>
      <div className="mt-2 space-y-2">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onOpen={() => onOpen(job.id)}
            onResize={() => onResize(job)}
            conflicts={getJobConflicts(job.id, conflicts)}
          />
        ))}
      </div>
    </div>
  );
}
function JobCard({
  job,
  draggable = true,
  compact = false,
  onOpen,
  onResize,
  conflicts,
}: {
  job: CalendarJob;
  draggable?: boolean;
  compact?: boolean;
  onOpen: () => void;
  onResize: () => void;
  conflicts: CalendarConflict[];
}) {
  const start = job.scheduledStart ? new Date(job.scheduledStart) : null;
  const end = job.scheduledEnd ? new Date(job.scheduledEnd) : null;
  const conflict = conflicts[0];
  return (
    <div
      draggable={draggable}
      onDragStart={(event) =>
        event.dataTransfer.setData("application/job-id", job.id)
      }
      style={{ borderLeftWidth: job.assignments.find((assignment) => assignment.crew?.color)?.crew?.color ? 4 : undefined, borderLeftColor: job.assignments.find((assignment) => assignment.crew?.color)?.crew?.color ?? undefined }}
      className={`cursor-grab rounded-lg border p-2 text-left text-xs shadow-sm ${statusClass(job.status)}`}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <strong>
          {job.customer.firstName} {job.customer.lastName}
        </strong>
        {job.servicePlan && <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-800">Recurring</span>}
        <span className="mt-1 block truncate">{job.property.address}</span>
        {start && (
          <span className="mt-1 block">
            {start.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
            {end
              ? ` – ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : ""}
          </span>
        )}
        <span className="mt-1 block">
          {statusLabel(job.status)} ·{" "}
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(job.estimate.pricingTotal)}
        </span>
        <span className="mt-1 block rounded bg-white/60 px-1 font-medium">{job.assignments.length ? job.assignments.map((assignment) => assignment.crew?.name || `${assignment.employee?.firstName} ${assignment.employee?.lastName}`).join(", ") : "Unassigned"}</span>
        {conflict && <span title={`Conflicts with ${conflict.otherJobName}: ${conflict.start.toLocaleString()}–${conflict.end.toLocaleTimeString()}`} className="mt-1 block text-amber-800">⚠ Conflict with {conflict.otherJobName}</span>}
      </button>
      {!compact && start && (
        <button
          type="button"
          onClick={onResize}
          className="mt-2 text-xs font-semibold underline"
        >
          Resize
        </button>
      )}
    </div>
  );
}
