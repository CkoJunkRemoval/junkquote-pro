"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listInvoicesAction } from "@/app/actions/invoices/listInvoices";
import {invoiceManagementStatuses,type InvoiceManagementStatus} from "./invoiceListFilters";
import type {InvoiceListPeriod} from "@/lib/invoices/listInvoices";

type Sort = "issued_desc" | "issued_asc" | "total_desc" | "balance_desc";
type InvoiceResult = Awaited<ReturnType<typeof listInvoicesAction>>;
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export default function InvoiceManagement({initialStatus="All",initialPeriod}:{initialStatus?:InvoiceManagementStatus;initialPeriod?:InvoiceListPeriod}) {
  const [status, setStatus] = useState<InvoiceManagementStatus>(initialStatus);
  const [period, setPeriod] = useState<InvoiceListPeriod|undefined>(initialPeriod);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("issued_desc");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listInvoicesAction({ status: status === "All" ? undefined : status, period, search, sort, page })
      .then((next) => { if (active) { setResult(next); setError(null); } })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load invoices."); });
    return () => { active = false; };
  }, [page, period, search, sort, status]);

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  return <div className="mx-auto max-w-6xl p-6 sm:p-10">
    <div><h1 className="text-3xl font-bold">Invoices</h1><p className="mt-1 text-slate-600">Generated invoices and outstanding balances.</p></div>
    <div className="mt-7 flex flex-wrap gap-2">{invoiceManagementStatuses.map((item) => <button key={item} type="button" onClick={() => { setStatus(item); setPeriod(undefined); setPage(1); }} className={`rounded-full px-4 py-2 text-sm font-medium ${status === item ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"}`}>{item}</button>)}</div>
    {period==="ThisMonth"&&<p className="mt-3 text-sm font-medium text-blue-700">Showing invoices paid this month.</p>}
    <div className="mt-6 flex flex-wrap gap-3"><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search invoice number, customer, or property" className="min-w-64 flex-1 rounded-xl border border-slate-300 p-3" /><select value={sort} onChange={(event) => { setSort(event.target.value as Sort); setPage(1); }} className="rounded-xl border border-slate-300 p-3"><option value="issued_desc">Newest issued</option><option value="issued_asc">Oldest issued</option><option value="total_desc">Highest total</option><option value="balance_desc">Highest balance</option></select></div>
    {error && <p className="mt-4 text-red-600">{error}</p>}
    <div className="mt-6 space-y-3">{result?.invoices.map((invoice) => <article key={invoice.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="min-w-48 flex-1"><h2 className="font-semibold">Invoice #{invoice.invoiceNumber}</h2><p className="text-sm text-slate-600">{invoice.customer.firstName} {invoice.customer.lastName}</p><p className="text-sm text-slate-600">{invoice.property.address}</p></div><div className="text-sm"><p>Total {money(invoice.total)}</p><p>Paid {money(invoice.total - invoice.balanceDue)}</p><p>Balance {money(invoice.balanceDue)}</p><p className="text-slate-500">Issued {invoice.issuedDate ? new Date(invoice.issuedDate).toLocaleDateString() : "—"}</p><p className="text-slate-500">Due {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{invoice.status}</span><Link href={`/invoices/${invoice.id}`} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">View</Link></article>)}{result && result.invoices.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">No invoices found.</div>}</div>
    <div className="mt-6 flex items-center justify-between"><span className="text-sm text-slate-500">{result?.total ?? 0} invoices</span><div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-50">Previous</button><button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-50">Next</button></div></div>
  </div>;
}
