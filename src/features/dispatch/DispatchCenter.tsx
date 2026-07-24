"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock3, GripVertical,
  MapPin, Move, Route, Settings2, Truck, Users,
} from "lucide-react";
import {
  inspectScheduleConflictsAction, scheduleJobAction, unassignDispatchResourcesAction, updateSchedulingStatusAction,
} from "@/app/actions/dispatch/dispatch";
import type { getDispatchData } from "@/lib/dispatch/dispatch";
import type { DispatchLaneGrouping } from "@/lib/dispatch/board";
import type { JobAssignmentRole, SchedulingStatus } from "@/generated/prisma/client";

type Data = Awaited<ReturnType<typeof getDispatchData>>;
type Job = Data["jobs"][number] | Data["unscheduled"][number];
type Density = "compact" | "comfortable" | "expanded";
type MoveIntent = { start?: Date; employeeId?: string; vehicleId?: string };
const statuses: SchedulingStatus[] = ["Unscheduled","Tentative","Scheduled","Confirmed","EnRoute","Arrived","InProgress","Completed","Delayed","Cancelled","NoShow"];
const control = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50";

export default function DispatchCenter({ initial, date }: { initial: Data; date: string }) {
  const [editing, setEditing] = useState<{ job: Job; intent?: MoveIntent } | null>(null);
  const [density, setDensity] = usePreference<Density>("dispatch:density", "comfortable");
  const [hideCompleted, setHideCompleted] = usePreference("dispatch:hide-completed", false);
  const [businessHoursOnly, setBusinessHoursOnly] = usePreference("dispatch:business-hours-only", true);
  const [laneWidth, setLaneWidth] = usePreference<"narrow"|"standard"|"wide">("dispatch:lane-width", "standard");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const jobs = useMemo(() => initial.jobs.filter((job) => {
    if (hideCompleted && job.schedulingStatus === "Completed") return false;
    if (businessHoursOnly && job.scheduledStart) { const hour = new Date(job.scheduledStart).getHours(); return hour >= 7 && hour < 19; }
    return true;
  }), [initial.jobs, hideCompleted, businessHoursOnly]);
  const jobById = useMemo(() => new Map([...initial.jobs, ...initial.unscheduled].map((job) => [job.id, job])), [initial]);
  const open = (job: Job, intent?: MoveIntent) => {
    history.pushState({ dispatchSheet: true }, "");
    setEditing({ job, intent });
  };
  useEffect(() => {
    const close = () => setEditing(null);
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);
  const navigate = (days: number) => {
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + days);
    window.location.href = href({ date: next.toISOString().slice(0, 10), view: initial.view });
  };
  const drop = (laneId: string, grouping: DispatchLaneGrouping) => {
    const job = draggingId ? jobById.get(draggingId) : undefined;
    setDraggingId(null);
    if (!job) return;
    const base = job.scheduledStart ? new Date(job.scheduledStart) : new Date(`${date}T08:00:00`);
    open(job, {
      start: base,
      ...(grouping === "vehicle" && laneId !== "unassigned" ? { vehicleId: laneId } : {}),
      ...(["crewLead", "crewMember"].includes(grouping) && laneId !== "unassigned" ? { employeeId: laneId } : {}),
    });
  };
  return <main className="mx-auto max-w-[1800px] p-3 sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="font-semibold text-blue-700 dark:text-blue-300">Dispatch command center</p><h1 className="text-3xl font-bold">Dispatch & Scheduling</h1><p className="text-slate-600 dark:text-slate-300">Today&apos;s work, availability, conflicts, and assignments in one place.</p></div>
      <Link href={href({ date: new Date().toISOString().slice(0,10), view: initial.view })} className={control}><CalendarDays size={18}/>Today</Link>
    </header>
    <nav aria-label="Dispatch views" className="mt-5 flex flex-wrap items-center gap-2">
      <button aria-label="Previous date range" className={control} onClick={() => navigate(initial.view === "week" ? -7 : -1)}><ChevronLeft/></button>
      <input aria-label="Schedule date" type="date" value={date} onChange={(event) => window.location.href = href({ date: event.target.value, view: initial.view })} className="min-h-11 rounded-xl border bg-[var(--surface)] px-3"/>
      <button aria-label="Next date range" className={control} onClick={() => navigate(initial.view === "week" ? 7 : 1)}><ChevronRight/></button>
      {(["board","day","week","list"] as const).map((view) => <Link key={view} href={href({ view, date })} aria-current={initial.view === view ? "page" : undefined} className={`${control} ${initial.view === view ? "bg-blue-700 text-white dark:bg-blue-500 dark:text-slate-950" : ""}`}>{title(view)}</Link>)}
    </nav>

    <Summary summary={initial.board.summary}/>
    <Filters initial={initial}/>
    {!initial.readOnly && <UnscheduledPanel data={initial} open={open} setDraggingId={setDraggingId}/>}

    <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-bold">{initial.view === "board" ? "Operational board" : initial.view === "week" ? "Week schedule" : "Chronological agenda"}</h2><p className="text-sm text-slate-600 dark:text-slate-300">Travel gaps are deterministic estimates, not optimized routes.</p></div>
          <div className="flex flex-wrap gap-2">
            <label className="grid text-xs font-semibold">Card density<select aria-label="Card density" className="min-h-11 rounded-xl border bg-[var(--surface)] px-3" value={density} onChange={(event) => setDensity(event.target.value as Density)}><option>compact</option><option>comfortable</option><option>expanded</option></select></label>
            <label className="grid text-xs font-semibold">Lane width<select aria-label="Lane width" className="min-h-11 rounded-xl border bg-[var(--surface)] px-3" value={laneWidth} onChange={(event) => setLaneWidth(event.target.value as typeof laneWidth)}><option>narrow</option><option>standard</option><option>wide</option></select></label>
            <label className="flex min-h-11 items-center gap-2 rounded-xl border px-3"><input type="checkbox" checked={hideCompleted} onChange={(event) => setHideCompleted(event.target.checked)}/>Hide completed</label>
            <label className="flex min-h-11 items-center gap-2 rounded-xl border px-3"><input type="checkbox" checked={businessHoursOnly} onChange={(event) => setBusinessHoursOnly(event.target.checked)}/>Business hours only</label>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:hidden" aria-label="Mobile chronological agenda">
          {jobs.map((job) => <JobCard key={job.id} job={job} density={density} readOnly={initial.readOnly} onMove={() => open(job)}/>)}
        </div>
        {initial.view === "board"
          ? <Board data={initial} jobs={jobs} density={density} laneWidth={laneWidth} readOnly={initial.readOnly} onMove={open} setDraggingId={setDraggingId} onDrop={drop}/>
          : <CalendarView data={initial} jobs={jobs} density={density} onMove={open}/>}
        {!jobs.length && <p className="mt-4 rounded-2xl border border-dashed p-8 text-center text-slate-500">No scheduled jobs in this range.</p>}
      </div>
      <AlertsPanel alerts={initial.board.alerts} jobs={jobById} onAction={(job) => open(job)}/>
    </section>
    {editing && <ScheduleSheet job={editing.job} intent={editing.intent} data={initial} onClose={() => history.state?.dispatchSheet ? history.back() : setEditing(null)}/>}
  </main>;
}

function Summary({ summary }: { summary: Data["board"]["summary"] }) {
  const metrics = [
    ["Scheduled", summary.totalScheduled, {}], ["Tentative", summary.tentative, { status: "Tentative" }],
    ["Confirmed", summary.confirmed, { status: "Confirmed" }], ["En route", summary.enRoute, { status: "EnRoute" }],
    ["Arrived", summary.arrived, { status: "Arrived" }], ["In progress", summary.inProgress, { status: "InProgress" }],
    ["Delayed", summary.delayed, { delayedOnly: "1" }], ["Completed", summary.completed, { status: "Completed" }],
    ["Cancelled", summary.cancelled, { status: "Cancelled" }], ["Unscheduled", summary.unscheduled, { unscheduledOnly: "1" }],
    ["Crews available", summary.crewsAvailable, {}], ["Vehicles available", summary.vehiclesAvailable, {}],
    ["Needs attention", summary.unresolvedConflicts, { conflictOnly: "1" }],
  ] as const;
  return <section aria-label="Daily dispatch summary" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
    {metrics.map(([label, value, filter]) => <Link key={label} href={href({ view: "board", ...filter })} aria-label={`${label}: ${value}. Filter dispatch board.`} className="min-h-20 rounded-xl border bg-[var(--surface)] p-3 transition-shadow motion-reduce:transition-none hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><strong className="block text-2xl">{value}</strong><span className="text-xs">{label}</span></Link>)}
  </section>;
}

function Board({ data, jobs, density, laneWidth, readOnly, onMove, setDraggingId, onDrop }: { data: Data; jobs: Job[]; density: Density; laneWidth: "narrow"|"standard"|"wide"; readOnly: boolean; onMove: (job: Job, intent?: MoveIntent) => void; setDraggingId: (id: string | null) => void; onDrop: (laneId: string, grouping: DispatchLaneGrouping) => void }) {
  const visible = new Set(jobs.map((job) => job.id));
  const byId = new Map(jobs.map((job) => [job.id, job]));
  return <div className="mt-4 hidden gap-3 overflow-x-auto pb-3 md:flex" aria-label={`Dispatch board grouped by ${title(data.grouping)}`}>
    {data.board.lanes.map((lane) => <section key={lane.id} className={`${laneWidth === "narrow" ? "w-64" : laneWidth === "wide" ? "w-96" : "w-80"} shrink-0 rounded-2xl border bg-[var(--surface)] p-3`} onDragOver={(event) => { if (!readOnly) event.preventDefault(); }} onDrop={() => onDrop(lane.id, data.grouping)}>
      <header className="border-b pb-3"><div className="flex items-center justify-between gap-2"><h3 className="font-bold">{lane.name}</h3><span className={`rounded-full border px-2 py-1 text-xs ${lane.available ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>{lane.available ? "Available" : "Assigned"}</span></div><p className="mt-1 text-xs">{lane.jobCount} jobs · {lane.scheduledHours.toFixed(1)}h · {money(lane.totalValue)}</p><p className="text-xs">{lane.idleGaps.length} idle gaps · {lane.travelRisks} travel warnings</p>{lane.capacityCubicYards && <p className="text-xs">{lane.estimatedVolume.toFixed(1)} / {lane.capacityCubicYards.toFixed(1)} yd³ estimated capacity</p>}{lane.overbooked && <p className="mt-1 font-semibold text-red-700 dark:text-red-300">Excessive scheduled hours</p>}{lane.capacityRisk && <p className="mt-1 font-semibold text-amber-700 dark:text-amber-300">Vehicle capacity risk</p>}</header>
      <div className="mt-3 space-y-3">{lane.jobs.filter((row) => visible.has(row.id)).map((row) => {
        const job = byId.get(row.id)!;
        return <div key={job.id} draggable={!readOnly} onDragStart={() => setDraggingId(job.id)} onDragEnd={() => setDraggingId(null)}><JobCard job={job} density={density} readOnly={readOnly} onMove={() => onMove(job)} drag/></div>;
      })}</div>
      {!lane.jobs.some((row) => visible.has(row.id)) && <p className="rounded-xl border border-dashed p-5 text-center text-sm text-slate-500">Drop a job here or use Move.</p>}
    </section>)}
  </div>;
}

function CalendarView({ data, jobs, density, onMove }: { data: Data; jobs: Job[]; density: Density; onMove: (job: Job) => void }) {
  const days = Array.from({ length: data.view === "week" ? 7 : 1 }, (_, index) => { const day = new Date(data.start); day.setDate(day.getDate() + index); return day; });
  return <div className={`mt-4 hidden gap-3 md:grid ${data.view === "week" ? "grid-cols-7" : "grid-cols-1"}`}>{days.map((day) => <section key={day.toISOString()} className="min-w-0 rounded-2xl border bg-[var(--surface)] p-3"><h3 className="font-semibold">{day.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}</h3><div className="mt-3 space-y-3">{jobs.filter((job) => job.scheduledStart && new Date(job.scheduledStart).toDateString() === day.toDateString()).map((job) => <JobCard key={job.id} job={job} density={density} readOnly={data.readOnly} onMove={() => onMove(job)}/>)}</div></section>)}</div>;
}

function UnscheduledPanel({ data, open, setDraggingId }: { data: Data; open: (job: Job) => void; setDraggingId: (id: string | null) => void }) {
  return <section className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Unscheduled Jobs</h2><p className="text-sm">{data.unscheduledCount} jobs need attention.</p></div>
      <form className="flex flex-wrap gap-2"><input type="hidden" name="view" value="board"/><input aria-label="Search unscheduled jobs" name="unscheduledSearch" placeholder="Search customer, job, city, ZIP" className="min-h-11 rounded-xl border bg-[var(--surface)] px-3 text-[var(--foreground)]"/><select aria-label="Sort unscheduled jobs" name="unscheduledSort" className="min-h-11 rounded-xl border bg-[var(--surface)] px-3 text-[var(--foreground)]"><option value="oldest">Oldest first</option><option value="newest">Newest first</option><option value="value">Highest value</option><option value="duration">Shortest duration</option><option value="priority">Priority</option></select><button className={control}>Apply</button></form>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.unscheduled.map((job) => <div key={job.id} draggable onDragStart={() => setDraggingId(job.id)} onDragEnd={() => setDraggingId(null)}><JobCard job={job} density="comfortable" readOnly={false} onMove={() => open(job)} drag unscheduled/></div>)}</div>
    {!data.unscheduled.length && <p className="mt-3 text-sm">No unscheduled jobs.</p>}
    {data.unscheduledCount > data.unscheduled.length && <div className="mt-3 flex gap-2"><Link className={control} href={href({ page: String(Math.max(1, data.page - 1)) })}>Previous</Link><Link className={control} href={href({ page: String(data.page + 1) })}>Next</Link></div>}
  </section>;
}

function AlertsPanel({ alerts, jobs, onAction }: { alerts: Data["board"]["alerts"]; jobs: Map<string, Job>; onAction: (job: Job) => void }) {
  return <aside className="rounded-2xl border bg-[var(--surface)] p-4" aria-label="Dispatch alerts"><div className="flex items-center gap-2"><AlertTriangle size={20}/><h2 className="text-xl font-bold">Needs attention</h2></div><div className="mt-3 flex gap-2"><Link className={control} href={href({ alertSeverity: "critical" })}>Critical</Link><Link className={control} href={href({ alertSeverity: "warning" })}>Warnings</Link></div><div className="mt-4 space-y-3">{alerts.map((alert) => <article key={alert.id} className="rounded-xl border p-3"><p className="text-xs font-bold uppercase">{alert.severity} · {alert.jobNumber}</p><p className="mt-1 text-sm">{alert.explanation}</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Recommended: {alert.recommendedAction}</p>{jobs.get(alert.jobId) && <button className={`${control} mt-2 w-full`} onClick={() => onAction(jobs.get(alert.jobId)!)}>Take action</button>}</article>)}</div>{!alerts.length && <p className="mt-4 text-sm text-slate-500">No active alerts for this view.</p>}</aside>;
}

function JobCard({ job, density, readOnly, onMove, drag, unscheduled }: { job: Job; density: Density; readOnly: boolean; onMove: () => void; drag?: boolean; unscheduled?: boolean }) {
  const crew = job.assignments.flatMap((row) => row.employee ? [`${row.employee.firstName} ${row.employee.lastName}`] : row.crew ? [row.crew.name] : []);
  const vehicles = job.vehicleAssignments.map((row) => row.fleetAsset.name);
  const age = Math.max(0, Math.floor((Date.now() - new Date(job.createdAt).getTime()) / 86400000));
  return <article className={`rounded-xl border bg-[var(--surface)] shadow-sm ${density === "compact" ? "p-2" : density === "expanded" ? "p-5" : "p-3"}`}>
    <div className="flex items-start justify-between gap-2"><div className="flex min-w-0 gap-2">{drag && <GripVertical aria-label="Drag job" className="mt-1 shrink-0 cursor-grab" size={18}/>}<div><p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{job.jobNumber ?? `Job ${job.id.slice(0,8)}`}</p><h3 className="font-bold">{job.customer.firstName} {job.customer.lastName}</h3></div></div><span className="rounded-full border px-2 py-1 text-xs">{title(job.schedulingStatus)}</span></div>
    <p className="mt-2 flex gap-2 text-sm"><Clock3 size={16}/>{job.scheduledStart ? windowText(job) : `Unscheduled · ${age}d old`} · {job.estimatedDurationMinutes ?? "?"} min</p>
    <p className="mt-1 flex gap-2 text-sm"><MapPin size={16}/>{job.property.address}, {job.property.city} {job.property.zip}</p>
    {density !== "compact" && <><p className="mt-1 flex gap-2 text-sm"><Users size={16}/>{crew.join(", ") || "No crew"} ({job.requiredCrewSize} required)</p><p className="mt-1 flex gap-2 text-sm"><Truck size={16}/>{vehicles.join(", ") || "No vehicle"}</p><p className="mt-1 text-sm">Value: {money(job.estimate.pricingTotal)} · Priority: {title(job.priority)}</p></>}
    {density === "expanded" && job.requiresSpecialEquipment && <p className="mt-1 text-sm font-medium">Special equipment required</p>}
    {job.internalAccessNotes && <p className="mt-2 text-sm font-medium">Access notes available</p>}
    {job.conflicts.length > 0 && <p className="mt-2 flex gap-2 text-sm font-semibold text-red-700 dark:text-red-300"><AlertTriangle size={16}/>{job.conflicts.join(" · ")}</p>}
    <div className="mt-3 flex flex-wrap gap-2"><Link className={control} href={`/jobs/${job.id}`}>Open job</Link>{!readOnly && <button aria-label={`${unscheduled ? "Schedule" : "Move or assign"} ${job.jobNumber ?? "job"}`} className={control} onClick={onMove}><Move size={16}/>{unscheduled ? "Schedule" : "Move / assign"}</button>}{!readOnly && !unscheduled && <StatusActions job={job}/>}</div>
  </article>;
}

function StatusActions({ job }: { job: Job }) {
  async function set(status: SchedulingStatus) { const needsReason = ["Delayed","Cancelled","NoShow"].includes(status); const reason = needsReason ? window.prompt(`Reason for ${title(status).toLowerCase()}`) ?? "" : undefined; if (needsReason && !reason) return; await updateSchedulingStatusAction(job.id, status, reason); window.location.reload(); }
  async function unassign() { if (!window.confirm("Unassign all crew and vehicles from this job?")) return; await unassignDispatchResourcesAction(job.id, "both"); window.location.reload(); }
  return <details><summary className={`${control} cursor-pointer list-none`}><Settings2 size={16}/>Actions</summary><div className="mt-2 grid gap-2 rounded-xl border bg-[var(--surface)] p-2"><button className={control} onClick={() => void set("Confirmed")}>Confirm</button><button className={control} onClick={() => void set("Delayed")}>Mark delayed</button><button className={control} onClick={() => void set("Cancelled")}>Cancel</button><button className={control} onClick={() => void unassign()}>Unassign</button></div></details>;
}

function Filters({ initial }: { initial: Data }) {
  return <form method="get" className="mt-5 grid gap-2 rounded-2xl border bg-[var(--surface)] p-4 sm:grid-cols-2 lg:grid-cols-6">
    <input type="hidden" name="view" value={initial.view}/><Select name="grouping" label="Group board" options={[["crewLead","Crew lead"],["crewMember","Crew member"],["vehicle","Vehicle"],["unassigned","Unassigned"]]}/><Select name="status" label="Status" options={statuses.map((value) => [value,title(value)])}/><Select name="employeeId" label="Crew member" options={initial.employees.map((row) => [row.id,`${row.firstName} ${row.lastName}`])}/><Select name="vehicleId" label="Vehicle" options={initial.vehicles.map((row) => [row.id,row.name])}/><Select name="assignment" label="Assignment" options={[["assigned","Assigned"],["unassigned","Unassigned"]]}/><Select name="alertSeverity" label="Alert severity" options={[["critical","Critical"],["warning","Warning"],["info","Info"]]}/>
    <label className="grid gap-1 text-sm font-medium">City<input name="city" className="min-h-11 rounded-xl border bg-[var(--surface)] px-3"/></label><label className="grid gap-1 text-sm font-medium">ZIP<input name="zip" className="min-h-11 rounded-xl border bg-[var(--surface)] px-3"/></label><label className="grid gap-1 text-sm font-medium">Starts within hours<input type="number" min="1" max="24" name="startsWithinHours" className="min-h-11 rounded-xl border bg-[var(--surface)] px-3"/></label>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="conflictOnly" value="1"/>Conflicts only</label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="delayedOnly" value="1"/>Delayed only</label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="highValue" value="1"/>High value</label><button className={control}>Apply filters</button>
  </form>;
}

function ScheduleSheet({ job, intent, data, onClose }: { job: Job; intent?: MoveIntent; data: Data; onClose: () => void }) {
  const startDate = intent?.start ?? (job.scheduledStart ? new Date(job.scheduledStart) : new Date());
  const durationDefault = job.estimatedDurationMinutes ?? 120;
  const endDate = job.scheduledEnd && !intent?.start ? new Date(job.scheduledEnd) : new Date(startDate.getTime() + durationDefault * 60000);
  const [start,setStart] = useState(local(startDate)), [end,setEnd] = useState(local(endDate));
  const [arrivalStart,setArrivalStart] = useState(job.arrivalWindowStart ? local(job.arrivalWindowStart) : ""), [arrivalEnd,setArrivalEnd] = useState(job.arrivalWindowEnd ? local(job.arrivalWindowEnd) : "");
  const [duration,setDuration] = useState(durationDefault), [status,setStatus] = useState<"Tentative"|"Scheduled"|"Confirmed">(job.schedulingStatus === "Tentative" || job.schedulingStatus === "Confirmed" ? job.schedulingStatus : "Scheduled");
  const currentEmployees = job.assignments.flatMap((row) => row.employeeId ? [row.employeeId] : []);
  const [employees,setEmployees] = useState(intent?.employeeId ? Array.from(new Set([...currentEmployees, intent.employeeId])) : currentEmployees);
  const currentVehicles = job.vehicleAssignments.map((row) => row.fleetAssetId);
  const [vehicles,setVehicles] = useState(intent?.vehicleId ? Array.from(new Set([...currentVehicles, intent.vehicleId])) : currentVehicles);
  const [dispatchNotes,setDispatchNotes] = useState(job.dispatchNotes), [accessNotes,setAccessNotes] = useState(job.internalAccessNotes), [instructions,setInstructions] = useState(job.customerInstructions);
  const [conflicts,setConflicts] = useState<Array<{code:string;severity:string;message:string}>>([]), [overrideReason,setOverrideReason] = useState(""), [busy,setBusy] = useState(false), [error,setError] = useState("");
  const previousAssignment = [...data.jobs].filter((row) => row.id !== job.id && row.scheduledStart && new Date(row.scheduledStart) < startDate && (row.assignments.some((item) => item.employeeId) || row.vehicleAssignments.length)).sort((a,b) => new Date(b.scheduledStart!).getTime() - new Date(a.scheduledStart!).getTime())[0];
  const input = () => ({ scheduledStart:new Date(start), scheduledEnd:new Date(end), arrivalWindowStart:arrivalStart?new Date(arrivalStart):null, arrivalWindowEnd:arrivalEnd?new Date(arrivalEnd):null, estimatedDurationMinutes:duration, schedulingStatus:status, employeeAssignments:employees.map((employeeId,index)=>({employeeId,role:(index===0?"CrewLead":"Helper") as JobAssignmentRole,lead:index===0})), vehicleIds:vehicles, dispatchNotes, internalAccessNotes:accessNotes, customerInstructions:instructions, allDay:false, timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone, expectedVersion:job.scheduleVersion, overrideReason });
  async function review() { setBusy(true); setError(""); try { setConflicts((await inspectScheduleConflictsAction(job.id,input())).conflicts); } catch (reason) { setError(message(reason)); } finally { setBusy(false); } }
  async function save() { setBusy(true); setError(""); try { await scheduleJobAction(job.id,input()); window.location.reload(); } catch (reason) { setError(message(reason)); setBusy(false); } }
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-3 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="move-job-title"><section className="mx-auto max-w-3xl rounded-2xl bg-[var(--surface)] p-4 shadow-2xl sm:p-6"><div className="flex justify-between gap-3"><div><h2 id="move-job-title" className="text-2xl font-bold">Move / assign {job.jobNumber ?? "job"}</h2><p>{job.customer.firstName} {job.customer.lastName}</p></div><button className={control} onClick={onClose}>Close</button></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><DateField label="Start" value={start} onChange={setStart}/><DateField label="End" value={end} onChange={setEnd}/><DateField label="Arrival window start" value={arrivalStart} onChange={setArrivalStart}/><DateField label="Arrival window end" value={arrivalEnd} onChange={setArrivalEnd}/><label className="grid gap-1 font-medium">Expected duration (minutes)<input className="min-h-11 rounded-xl border px-3" type="number" min="1" max="1440" value={duration} onChange={(event)=>setDuration(Number(event.target.value))}/></label><label className="grid gap-1 font-medium">Save as<select className="min-h-11 rounded-xl border px-3" value={status} onChange={(event)=>setStatus(event.target.value as typeof status)}><option>Tentative</option><option>Scheduled</option><option>Confirmed</option></select></label></div>
    {previousAssignment && <button className={`${control} mt-5`} onClick={() => { setEmployees(previousAssignment.assignments.flatMap((row) => row.employeeId ? [row.employeeId] : [])); setVehicles(previousAssignment.vehicleAssignments.map((row) => row.fleetAssetId)); }}>Copy assignment from {previousAssignment.jobNumber ?? "previous job"}</button>}
    <fieldset className="mt-5"><legend className="font-bold">Crew</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{data.employees.map((row)=><Check key={row.id} checked={employees.includes(row.id)} label={`${row.firstName} ${row.lastName} · ${title(row.role)}`} onChange={(checked)=>setEmployees((current)=>checked?[...current,row.id]:current.filter((id)=>id!==row.id))}/>)}</div></fieldset>
    <fieldset className="mt-5"><legend className="font-bold">Vehicles</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{data.vehicles.map((row)=><Check key={row.id} checked={vehicles.includes(row.id)} label={`${row.name} · ${title(row.type)}`} onChange={(checked)=>setVehicles((current)=>checked?[...current,row.id]:current.filter((id)=>id!==row.id))}/>)}</div></fieldset>
    <div className="mt-5 grid gap-3"><Area label="Dispatch notes (internal)" value={dispatchNotes} onChange={setDispatchNotes}/><Area label="Internal access notes" value={accessNotes} onChange={setAccessNotes}/><Area label="Customer instructions" value={instructions} onChange={setInstructions}/></div>
    {conflicts.length > 0 && <section className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950"><h3 className="font-bold">Conflict preview</h3>{conflicts.map((row)=><p className="mt-1 text-sm" key={row.code}><strong>{row.severity==="blocking"?"Blocking":"Warning"}:</strong> {row.message}</p>)}{conflicts.some((row)=>row.severity==="warning")&&<label className="mt-3 grid gap-1 font-medium">Owner/Admin override reason<textarea className="rounded-xl border p-3" value={overrideReason} onChange={(event)=>setOverrideReason(event.target.value)}/></label>}</section>}
    {error && <p role="alert" className="mt-4 text-red-700 dark:text-red-300">{error}</p>}<div className="mt-5 flex flex-wrap gap-2"><button className={control} disabled={busy} onClick={()=>void review()}><Route size={16}/>Preview conflicts</button><button className={`${control} bg-blue-700 text-white`} disabled={busy||conflicts.some((row)=>row.severity==="blocking")} onClick={()=>void save()}>{busy?"Saving…":"Save move"}</button></div>
  </section></div>;
}

function Select({name,label,options}:{name:string;label:string;options:ReadonlyArray<readonly [string,string]>}) { return <label className="grid gap-1 text-sm font-medium">{label}<select name={name} className="min-h-11 rounded-xl border bg-[var(--surface)] px-3"><option value="">All</option>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>; }
function DateField({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}) { return <label className="grid gap-1 font-medium">{label}<input type="datetime-local" className="min-h-11 rounded-xl border px-3" value={value} onChange={(event)=>onChange(event.target.value)}/></label>; }
function Check({label,checked,onChange}:{label:string;checked:boolean;onChange:(value:boolean)=>void}) { return <label className="flex min-h-11 items-center gap-2 rounded-xl border px-3"><input type="checkbox" checked={checked} onChange={(event)=>onChange(event.target.checked)}/>{label}</label>; }
function Area({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}) { return <label className="grid gap-1 font-medium">{label}<textarea className="min-h-20 rounded-xl border p-3" value={value} onChange={(event)=>onChange(event.target.value)}/></label>; }
function usePreference<T>(key:string, fallback:T):[T,(value:T)=>void] { const [value,setValue]=useState<T>(fallback); useEffect(()=>{try{const saved=localStorage.getItem(key);if(saved!==null)setValue(JSON.parse(saved) as T)}catch{}},[key]);const update=(next:T)=>{setValue(next);localStorage.setItem(key,JSON.stringify(next))};return[value,update]; }
const href=(changes:Record<string,string>)=>`/dispatch?${new URLSearchParams(changes)}`;
const local=(value:Date|string)=>{const date=new Date(value);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16)};
const windowText=(job:Job)=>job.arrivalWindowStart&&job.arrivalWindowEnd?`${new Date(job.arrivalWindowStart).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}–${new Date(job.arrivalWindowEnd).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})} arrival`:job.scheduledStart?`${new Date(job.scheduledStart).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}–${job.scheduledEnd?new Date(job.scheduledEnd).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"?"}`:"Unscheduled";
const title=(value:string)=>value.replace(/([A-Z])/g," $1").replace(/^./,(letter)=>letter.toUpperCase()).trim();
const money=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
const message=(reason:unknown)=>reason instanceof Error?reason.message:"Scheduling could not be saved.";
