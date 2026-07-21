"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteEstimateAction } from "@/app/actions/estimates/deleteEstimate";
import { listEstimatesAction } from "@/app/actions/estimates/listEstimates";
import { updateEstimateStatusAction } from "@/app/actions/estimates/updateEstimateStatus";
import { isEstimateLocked } from "@/lib/estimates/isEstimateLocked";

const statuses = ["All", "Draft", "Ready", "Sent", "Approved", "Declined", "Scheduled", "Completed", "Archived"] as const;
type Status = typeof statuses[number];

export default function EstimateManagement() {
  const [status, setStatus] = useState<Status>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"updated_desc" | "updated_asc" | "total_desc" | "total_asc">("updated_desc");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Awaited<ReturnType<typeof listEstimatesAction>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listEstimatesAction({ status: status === "All" ? undefined : status, search, sort, page })
      .then((next) => { if (active) { setError(null); setResult(next); } })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load estimates."); });
    return () => { active = false; };
  }, [page, search, sort, status]);

  async function removeEstimate(id: string) {
    if (!window.confirm("Delete this estimate? This cannot be undone.")) return;
    try {
      await deleteEstimateAction(id);
      setPage(1);
      setResult((current) => current ? { ...current, estimates: current.estimates.filter((estimate) => estimate.id !== id), total: current.total - 1 } : current);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete the estimate.");
    }
  }

  async function archive(id: string) {
    await updateEstimateStatusAction(id, "Archived");
    setResult((current) => current ? { ...current, estimates: current.estimates.map((estimate) => estimate.id === id ? { ...estimate, status: "Archived" } : estimate) } : current);
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  return <div className="mx-auto max-w-6xl p-6 sm:p-10"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Estimates</h1><p className="mt-1 text-slate-600">Create, resume, and track customer estimates.</p></div><Link href="/estimates?new=1" className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">New Estimate</Link></div>
    <div className="mt-8 flex flex-wrap gap-2">{statuses.map((item) => <button key={item} onClick={() => { setStatus(item); setPage(1); }} className={`rounded-full px-4 py-2 text-sm font-medium ${status === item ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"}`}>{item}</button>)}</div>
    <div className="mt-6 flex flex-wrap gap-3"><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search customer, address, or estimate ID" className="min-w-64 flex-1 rounded-xl border border-slate-300 p-3" /><select value={sort} onChange={(event) => { setSort(event.target.value as typeof sort); setPage(1); }} className="rounded-xl border border-slate-300 p-3"><option value="updated_desc">Newest updated</option><option value="updated_asc">Oldest updated</option><option value="total_desc">Highest total</option><option value="total_asc">Lowest total</option></select></div>
    {error && <p className="mt-4 text-red-600">{error}</p>}
    <div className="mt-6 space-y-3">{result?.estimates.map((estimate) => { const locked = isEstimateLocked(estimate); return <div key={estimate.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="min-w-52 flex-1"><p className="font-semibold">{estimate.customer.firstName} {estimate.customer.lastName}</p><p className="text-sm text-slate-600">{estimate.property.address}, {estimate.property.city}, {estimate.property.state} {estimate.property.zip}</p><p className="mt-1 text-xs text-slate-500">{estimate.id}</p></div><p className="font-bold">${estimate.pricingTotal.toFixed(2)}</p><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">{estimate.status}</span><p className="text-sm text-slate-500">Updated {new Date(estimate.updatedAt).toLocaleString()}</p><div className="flex gap-2">{locked ? <Link href={`/estimates/${estimate.id}`} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">View</Link> : <Link href={`/estimates?estimateId=${estimate.id}`} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Edit</Link>}{!locked && <button onClick={() => void removeEstimate(estimate.id)} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700">Delete</button>}{estimate.status === "Completed" && <button onClick={() => void archive(estimate.id)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Archive</button>}</div></div>; })}{result && result.estimates.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">No estimates found.</div>}</div>
    <div className="mt-6 flex items-center justify-between"><span className="text-sm text-slate-500">{result?.total ?? 0} estimates</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-50">Previous</button><button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-50">Next</button></div></div>
  </div>;
}
