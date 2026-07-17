"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listJobsAction } from "@/app/actions/jobs/listJobs";
import { listCrews } from "@/app/actions/crews/management";

const filters = ["All", "Unscheduled", "Scheduled", "InProgress", "Completed", "Cancelled"] as const;
type Filter = typeof filters[number];
type Sort = "scheduled_asc" | "scheduled_desc" | "updated_desc" | "updated_asc";
type JobsResult = Awaited<ReturnType<typeof listJobsAction>>;

function labelStatus(status: string) { return status === "InProgress" ? "In Progress" : status; }

export default function JobManagement() {
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("scheduled_asc");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<JobsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crewId, setCrewId] = useState("");
  const [unassigned, setUnassigned] = useState(false);
  const [crews, setCrews] = useState<Awaited<ReturnType<typeof listCrews>>>([]);

  useEffect(() => { void listCrews().then(setCrews); }, []);

  useEffect(() => {
    let active = true;
    void listJobsAction({ status: filter === "All" ? undefined : filter, search, sort, page, ...(crewId ? { crewId } : {}), ...(unassigned ? { unassigned: true } : {}) })
      .then((next) => { if (active) { setResult(next); setError(null); } })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load jobs."); });
    return () => { active = false; };
  }, [crewId, filter, page, search, sort, unassigned]);

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  return <div className="mx-auto max-w-6xl p-6 sm:p-10"><div><h1 className="text-3xl font-bold">Jobs</h1><p className="mt-1 text-slate-600">Schedule approved estimates and track job progress.</p></div><div className="mt-7 flex flex-wrap gap-2">{filters.map((item) => <button key={item} type="button" onClick={() => { setFilter(item); setPage(1); }} className={`rounded-full px-4 py-2 text-sm font-medium ${filter === item ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"}`}>{labelStatus(item)}</button>)}</div><div className="mt-6 flex flex-wrap gap-3"><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search customer, address, or estimate ID" className="min-w-64 flex-1 rounded-xl border border-slate-300 p-3" /><select value={sort} onChange={(event) => { setSort(event.target.value as Sort); setPage(1); }} className="rounded-xl border border-slate-300 p-3"><option value="scheduled_asc">Scheduled soonest</option><option value="scheduled_desc">Scheduled latest</option><option value="updated_desc">Newest updated</option><option value="updated_asc">Oldest updated</option></select><select value={crewId} onChange={(event) => { setCrewId(event.target.value); setUnassigned(false); setPage(1); }} className="rounded-xl border border-slate-300 p-3"><option value="">All crews</option>{crews.map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}</select><label className="flex items-center gap-2 rounded-xl border px-3"><input type="checkbox" checked={unassigned} onChange={(event) => { setUnassigned(event.target.checked); if (event.target.checked) setCrewId(""); setPage(1); }} />Unassigned</label></div>{error && <p className="mt-4 text-red-600">{error}</p>}<div className="mt-6 space-y-3">{result?.jobs.map((job) => <article key={job.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="min-w-52 flex-1"><h2 className="font-semibold">{job.customer.firstName} {job.customer.lastName}</h2><p className="text-sm text-slate-600">{job.property.address}, {job.property.city}, {job.property.state} {job.property.zip}</p><p className="mt-1 text-xs text-slate-500">Estimate: {job.estimateId}</p><p className="mt-2 text-sm font-medium">{job.assignments.length ? job.assignments.map((assignment) => assignment.crew?.name || `${assignment.employee?.firstName} ${assignment.employee?.lastName}`).join(", ") : "Unassigned"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{labelStatus(job.status)}</span><div className="text-sm text-slate-600"><p>{job.scheduledStart ? new Date(job.scheduledStart).toLocaleString() : "Not scheduled"}</p><p>{formatCurrency(job.estimate.pricingTotal)}</p><p className="text-xs">Updated {new Date(job.updatedAt).toLocaleString()}</p></div><Link href={`/jobs/${job.id}`} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Open</Link></article>)}{result && result.jobs.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">No jobs found.</div>}</div><div className="mt-6 flex items-center justify-between"><span className="text-sm text-slate-500">{result?.total ?? 0} jobs</span><div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-50">Previous</button><button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-50">Next</button></div></div></div>;
}

function formatCurrency(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }
